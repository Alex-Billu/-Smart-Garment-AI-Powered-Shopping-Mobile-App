import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { productService, adminService } from '../../../src/services';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../../src/theme';
import { IMAGE_BASE_URL } from '../../../src/constants/config';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { Skeleton } from '../../../src/components/Skeleton';
import { Product } from '../../../src/types';

export default function AdminProductsScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productService.listProducts({ limit: 100 })
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDeleteProduct = (productId: number, productName: string) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete '${productName}' from catalog?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminService.deleteProduct(productId);
              refetch();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete product.');
            }
          }
        }
      ]
    );
  };

  const products = data?.data?.products || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(admin)/dashboard')} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Admin Dashboard</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Garment Catalog</Text>
          <Button
            title="+ Add Product"
            onPress={() => router.push('/(admin)/products/add')}
            size="sm"
            variant="primary"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={80} isDark={isDark} />
          <Skeleton height={80} isDark={isDark} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => {
            const img = item.image.startsWith('http')
              ? item.image
              : `${IMAGE_BASE_URL}/${item.image}`;

            return (
              <Card isDark={isDark} style={styles.productCard}>
                <Image source={{ uri: img }} style={styles.img} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={{ color: colors.goldPrimary, fontWeight: 'bold', marginVertical: 2 }}>
                    ₹{Number(item.price).toFixed(2)} | Stock: {item.stock}
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 11 }}>Sizes: {item.sizes}</Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => router.push(`/(admin)/products/edit/${item.id}`)}
                    style={styles.editBtn}
                  >
                    <Text style={{ color: colors.goldPrimary, fontSize: 12, fontWeight: '700' }}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDeleteProduct(item.id, item.name)}
                    style={styles.deleteBtn}
                  >
                    <Text style={{ color: colors.crimsonAccent, fontSize: 12, fontWeight: '700' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: spacing.md, paddingTop: spacing.xl },
  backBtn: { marginBottom: spacing.xs },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  productCard: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  img: { width: 60, height: 60, borderRadius: 6, backgroundColor: '#1E293B' },
  actions: { flexDirection: 'column', gap: 6, marginLeft: spacing.xs },
  editBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.goldPrimary },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.crimsonAccent }
});
