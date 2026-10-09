import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { cartService } from '../../src/services';
import { useCartStore } from '../../src/store/cartStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { IMAGE_BASE_URL } from '../../src/constants/config';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { EmptyState } from '../../src/components/EmptyState';
import { Skeleton } from '../../src/components/Skeleton';
import { CartItem } from '../../src/types';

export default function CartScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setCartState = useCartStore((state) => state.setCart);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart(),
    enabled: isAuthenticated
  });

  useEffect(() => {
    if (data?.data) {
      setCartState(data.data.items, data.data.summary.total_items, data.data.summary.subtotal);
    }
  }, [data]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUpdateQty = async (cartId: number, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    try {
      if (newQty <= 0) {
        await cartService.removeFromCart(cartId);
      } else {
        await cartService.updateCartItem(cartId, newQty);
      }
      refetch();
    } catch (e: any) {
      Alert.alert('Cart Error', e.response?.data?.error?.message || 'Failed to update item quantity.');
    }
  };

  const handleRemove = async (cartId: number) => {
    try {
      await cartService.removeFromCart(cartId);
      refetch();
    } catch (e) {
      Alert.alert('Cart Error', 'Failed to remove item.');
    }
  };

  const items = data?.data?.items || [];
  const summary = data?.data?.summary || { total_items: 0, subtotal: 0 };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          title="Sign In Required"
          description="Please sign in to your account to view your shopping cart."
          actionTitle="Sign In Now"
          onAction={() => router.push('/(auth)/login')}
          isDark={isDark}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Shopping Cart</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
          {summary.total_items} {summary.total_items === 1 ? 'Item' : 'Items'}
        </Text>
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={{ padding: spacing.md }}>
          <Skeleton height={90} isDark={isDark} />
          <Skeleton height={90} isDark={isDark} />
        </ScrollView>
      ) : items.length === 0 ? (
        <EmptyState
          title="Your Cart is Empty"
          description="Explore our luxury smart garment collection and add your favorite items."
          actionTitle="Explore Shop"
          onAction={() => router.push('/(tabs)/shop')}
          isDark={isDark}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />
            }
          >
            {items.map((item) => {
              const img = item.image ? `${IMAGE_BASE_URL}/${item.image}` : 'https://via.placeholder.com/150';
              return (
                <Card key={item.cart_id} isDark={isDark} style={styles.itemCard}>
                  <Image source={{ uri: img }} style={styles.itemImage} />
                  <View style={styles.itemDetails}>
                    <Text style={[styles.itemName, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.product_name}
                    </Text>
                    <Text style={{ color: colors.goldPrimary, fontWeight: '700', fontSize: 14 }}>
                      ₹{Number(item.price).toFixed(2)}
                    </Text>
                    <View style={styles.sizeBadge}>
                      <Text style={{ color: colors.goldPrimary, fontSize: 11, fontWeight: '600' }}>
                        Size: {item.size}
                      </Text>
                    </View>

                    <View style={styles.qtyRow}>
                      <View style={styles.qtyBox}>
                        <TouchableOpacity
                          onPress={() => handleUpdateQty(item.cart_id, item.quantity, -1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>-</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.textPrimary, fontWeight: '700', paddingHorizontal: 8 }}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleUpdateQty(item.cart_id, item.quantity, 1)}
                          style={styles.qtyBtn}
                        >
                          <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>+</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity onPress={() => handleRemove(item.cart_id)}>
                        <Text style={{ color: colors.crimsonAccent, fontSize: 12, fontWeight: '600' }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })}
          </ScrollView>

          {/* Sticky Bottom Order Summary & Checkout CTA */}
          <View style={[styles.summaryFooter, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.subtotalRow}>
              <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Subtotal</Text>
              <Text style={{ color: colors.goldPrimary, fontSize: 20, fontWeight: 'bold' }}>
                ₹{Number(summary.subtotal).toFixed(2)}
              </Text>
            </View>
            <Button
              title="Proceed to Checkout →"
              onPress={() => router.push('/checkout')}
              variant="primary"
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: spacing.md,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  itemCard: { flexDirection: 'row', padding: spacing.sm, alignItems: 'center' },
  itemImage: { width: 80, height: 80, borderRadius: radius.sm, backgroundColor: '#1E293B' },
  itemDetails: { flex: 1, marginLeft: spacing.sm },
  itemName: { fontSize: typography.fontSize.md, fontWeight: '600', marginBottom: 2 },
  sizeBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginVertical: 4
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4
  },
  qtyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: radius.sm
  },
  qtyBtn: { paddingHorizontal: 10, paddingVertical: 2 },
  summaryFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    borderTopWidth: 1
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  }
});
