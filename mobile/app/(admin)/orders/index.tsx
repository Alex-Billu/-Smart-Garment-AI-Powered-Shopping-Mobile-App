import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../../src/services';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../../src/theme';
import { Badge } from '../../../src/components/Badge';
import { Card } from '../../../src/components/Card';
import { Skeleton } from '../../../src/components/Skeleton';
import { OrderStatus } from '../../../src/types';

export default function AdminOrdersScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', selectedStatus],
    queryFn: () => adminService.listAllOrders(selectedStatus)
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleUpdateStatus = (orderId: number, currentStatus: OrderStatus) => {
    const statusOptions: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

    Alert.alert(
      `Update Order #${orderId}`,
      `Current Status: ${currentStatus}\nSelect new status:`,
      statusOptions.map((st) => ({
        text: st,
        onPress: async () => {
          try {
            await adminService.updateOrderStatus(orderId, st);
            refetch();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error?.message || 'Failed to update order status.');
          }
        }
      })),
      { cancelable: true }
    );
  };

  const orders = data?.data?.orders || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(admin)/dashboard')} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Admin Dashboard</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Global Customer Orders</Text>
      </View>

      {/* Filter Status Pills */}
      <View style={{ height: 42 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isSelected = item === 'All' ? selectedStatus === '' : selectedStatus === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedStatus(item === 'All' ? '' : item)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? colors.goldPrimary : theme.card,
                    borderColor: isSelected ? colors.goldPrimary : theme.cardBorder
                  }
                ]}
              >
                <Text style={{ color: isSelected ? '#0F172A' : theme.textPrimary, fontSize: 12, fontWeight: '700' }}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={110} isDark={isDark} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.orderCard}>
              <View style={styles.row}>
                <View>
                  <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 16 }}>
                    Order #{item.id} - {item.customer_name || `User #${item.user_id}`}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {item.customer_email} | 📞 {item.phone}
                  </Text>
                  <Text style={{ color: colors.goldPrimary, fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>
                    ₹{Number(item.total_amount).toFixed(2)}
                  </Text>
                </View>

                <TouchableOpacity onPress={() => handleUpdateStatus(item.id, item.status)}>
                  <Badge label={item.status} status={item.status} />
                  <Text style={{ color: colors.goldPrimary, fontSize: 10, textAlign: 'center', marginTop: 4 }}>
                    Tap to Change ✎
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ color: theme.textMuted, fontSize: 11, marginTop: 6 }}>
                Address: {item.address}, {item.city} - {item.pincode}
              </Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: spacing.md, paddingTop: spacing.xl },
  backBtn: { marginBottom: spacing.xs },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  filterList: { paddingHorizontal: spacing.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, height: 32, justifyContent: 'center' },
  orderCard: { marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }
});
