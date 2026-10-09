import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useAdminOrders, useUpdateOrderStatus } from '@/hooks';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/OrderComponents';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { formatPrice, formatDateTime } from '@/utils';
import { useToast } from '@/components/Toast';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { show } = useToast();
  const { data, isLoading, isError, refetch, isRefetching } = useAdminOrders();
  const updateStatusMutation = useUpdateOrderStatus();

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const orders = (data as any)?.data?.orders ?? [];
  const order = id ? orders.find((o: any) => String(o.id) === String(id)) : null;
  const displayOrders = order ? [order] : orders;

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrderId) return;
    setStatusModalVisible(false);
    const res = await updateStatusMutation.mutateAsync({ id: selectedOrderId, status: newStatus });
    if ((res as any).success) {
      show({ message: `Order status updated to ${newStatus}`, type: 'success' });
      refetch();
    } else {
      show({ message: 'Failed to update status', type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          {[...Array(4)].map((_, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Skeleton height={80} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  if (isError) return <ErrorState onRetry={refetch} />;

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.orderCard, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.orderId, { color: colors.text }]}>Order #{item.id}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>{formatDateTime(item.created_at)}</Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>Customer: {item.user_name ?? item.user_id}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.amount, { color: colors.primary }]}>{formatPrice(item.total_amount)}</Text>
        <Button
          title="Update Status"
          size="sm"
          onPress={() => { setSelectedOrderId(item.id); setStatusModalVisible(true); }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {id ? `Order #${id}` : 'All Orders'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={displayOrders}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<EmptyState title="No orders found" description="There are no orders here yet." />}
      />

      {/* Status update modal */}
      <Modal visible={statusModalVisible} onClose={() => setStatusModalVisible(false)} title="Update Order Status">
        <View style={{ padding: 16, gap: 10 }}>
          {ORDER_STATUSES.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusOption, { backgroundColor: colors.border }]}
              onPress={() => handleUpdateStatus(status)}
            >
              <StatusBadge status={status} />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
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
  container: { padding: 16 },
  list: { padding: 16, gap: 12 },
  orderCard: {
    borderRadius: 16, padding: 16, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 13 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  amount: { fontSize: 16, fontWeight: '800' },
  statusOption: {
    padding: 14, borderRadius: 12, alignItems: 'center',
  },
});
