import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOrder, useCancelOrder } from '@/hooks';
import { useTheme } from '@/theme';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { ConfirmModal } from '@/components/Modal';
import { OrderTimeline, StatusBadge } from '@/components/OrderComponents';
import { formatPrice, formatDateTime } from '@/utils';
import { useState } from 'react';
import { useToast } from '@/components/Toast';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const { colors } = useTheme();
  const { show } = useToast();
  const { data, isLoading, isError, refetch } = useOrder(orderId);
  const cancelMutation = useCancelOrder();
  const [showCancel, setShowCancel] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Skeleton height={60} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !data?.data?.order) {
    return <ErrorState onRetry={refetch} />;
  }

  const order = data.data.order as any;
  const canCancel = ['Pending', 'Confirmed'].includes(order.status);

  const handleCancel = async () => {
    setShowCancel(false);
    const res = await cancelMutation.mutateAsync(orderId);
    if ((res as any).success) {
      show({ message: 'Order cancelled successfully', type: 'success' });
      refetch();
    } else {
      show({ message: 'Could not cancel order', type: 'error' });
    }
  };

  const handleShare = async () => {
    await Share.share({ message: `My Smart Garment order #${order.id} — Status: ${order.status}` });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order #{order.id}</Text>
        <TouchableOpacity onPress={handleShare}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>Share</Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Status & Timeline */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.statusRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Status</Text>
              <StatusBadge status={order.status} />
            </View>
            <OrderTimeline status={order.status} />
          </View>

          {/* Summary */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Order Date</Text>
              <Text style={[styles.value, { color: colors.text }]}>{formatDateTime(order.created_at)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Payment</Text>
              <Text style={[styles.value, { color: colors.text }]}>{order.payment_method ?? 'COD'}</Text>
            </View>
            <View style={[styles.row, styles.totalRow]}>
              <Text style={[styles.label, { color: colors.text, fontWeight: '700' }]}>Total</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatPrice(order.total_amount)}</Text>
            </View>
          </View>

          {/* Items */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Items Ordered</Text>
            {(order.items ?? []).map((item: any, idx: number) => (
              <View key={idx} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.text }]}>{item.product_name}</Text>
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                    Size: {item.size} · Qty: {item.quantity}
                  </Text>
                </View>
                <Text style={[styles.itemPrice, { color: colors.text }]}>
                  {formatPrice(item.price * item.quantity)}
                </Text>
              </View>
            ))}
          </View>

          {/* Delivery Address */}
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Delivery Address</Text>
            <Text style={[styles.address, { color: colors.textSecondary }]}>
              {order.address}, {order.city}, {order.state} – {order.pincode}
            </Text>
            <Text style={[styles.address, { color: colors.textSecondary }]}>📞 {order.phone}</Text>
          </View>

          {/* Cancel Button */}
          {canCancel && (
            <Button
              title="Cancel Order"
              onPress={() => setShowCancel(true)}
              variant="outline"
              style={{ marginBottom: 32, borderColor: '#ef4444' }}
              textStyle={{ color: '#ef4444' }}
            />
          )}
        </View>
      </Animated.ScrollView>

      <ConfirmModal
        visible={showCancel}
        title="Cancel Order?"
        message={`Are you sure you want to cancel order #${order.id}? This action cannot be undone.`}
        confirmText="Yes, Cancel"
        cancelText="Keep Order"
        confirmDestructive
        onConfirm={handleCancel}
        onCancel={() => setShowCancel(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  container: { padding: 16, gap: 12 },
  section: { borderRadius: 16, padding: 18, marginBottom: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalRow: { borderTopWidth: 1, marginTop: 8, paddingTop: 12 },
  label: { fontSize: 14 },
  value: { fontSize: 14 },
  totalAmount: { fontSize: 18, fontWeight: '800' },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1,
  },
  itemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  itemMeta: { fontSize: 12 },
  itemPrice: { fontSize: 14, fontWeight: '700' },
  address: { fontSize: 14, lineHeight: 22 },
});
