import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { orderService, cartService } from '../src/services';
import { useAuthStore } from '../src/store/authStore';
import { useCartStore } from '../src/store/cartStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../src/theme';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';

export default function CheckoutScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearCart = useCartStore((state) => state.clearCart);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Card'>('COD');

  const [loading, setLoading] = useState(false);
  const [cartSummary, setCartSummary] = useState<{ subtotal: number; total_items: number }>({ subtotal: 0, total_items: 0 });

  useEffect(() => {
    cartService.getCart().then((res) => {
      if (res.data?.summary) {
        setCartSummary(res.data.summary);
      }
    }).catch(() => {});
  }, []);

  const handlePlaceOrder = async () => {
    if (!address.trim() || !city.trim() || !state.trim() || !pincode.trim() || !phone.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all shipping address and contact fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await orderService.checkout({
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        phone: phone.trim(),
        payment_method: paymentMethod
      });

      if (res.success && res.data) {
        clearCart();
        router.replace(`/order-success/${res.data.order_id}`);
      } else {
        Alert.alert('Checkout Failed', res.error?.message || 'Failed to place order.');
      }
    } catch (err: any) {
      Alert.alert('Checkout Error', err.response?.data?.error?.message || 'Error processing order transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Back to Cart</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.textPrimary }]}>Order Checkout</Text>

      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Shipping Address</Text>
        <Input
          label="Street Address *"
          placeholder="Flat / Building / Street"
          value={address}
          onChangeText={setAddress}
          isDark={isDark}
        />
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Input label="City *" placeholder="City" value={city} onChangeText={setCity} isDark={isDark} />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Input label="State *" placeholder="State" value={state} onChangeText={setState} isDark={isDark} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Input label="Pincode *" placeholder="6-digit ZIP" keyboardType="numeric" value={pincode} onChangeText={setPincode} isDark={isDark} />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Input label="Phone Number *" placeholder="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} isDark={isDark} />
          </View>
        </View>
      </Card>

      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Payment Method</Text>
        {(['COD', 'Card'] as const).map((method) => {
          const isSelected = paymentMethod === method;
          return (
            <TouchableOpacity
              key={method}
              onPress={() => setPaymentMethod(method)}
              style={[
                styles.payOption,
                {
                  backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.15)' : theme.inputBg,
                  borderColor: isSelected ? colors.goldPrimary : theme.inputBorder
                }
              ]}
            >
              <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>
                {method === 'COD' ? '💵 Cash on Delivery (COD)' : '💳 Credit / Debit Card'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </Card>

      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={{ color: theme.textSecondary }}>Total Items ({cartSummary.total_items})</Text>
          <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>₹{Number(cartSummary.subtotal).toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: theme.textSecondary }}>Standard Delivery</Text>
          <Text style={{ color: colors.emeraldAccent, fontWeight: 'bold' }}>FREE</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingTop: 8, marginTop: 8 }]}>
          <Text style={{ color: theme.textPrimary, fontSize: 16, fontWeight: 'bold' }}>Grand Total</Text>
          <Text style={{ color: colors.goldPrimary, fontSize: 22, fontWeight: 'bold' }}>₹{Number(cartSummary.subtotal).toFixed(2)}</Text>
        </View>
      </Card>

      <Button
        title="Confirm & Place Order"
        onPress={handlePlaceOrder}
        loading={loading}
        variant="primary"
        style={{ marginTop: spacing.md }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  backBtn: { marginTop: spacing.lg, marginBottom: spacing.sm },
  title: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  sectionTitle: { fontSize: typography.fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  payOption: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginVertical: 4
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 }
});
