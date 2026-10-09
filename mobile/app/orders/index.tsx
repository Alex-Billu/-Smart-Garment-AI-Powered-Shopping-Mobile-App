import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { Skeleton } from '../../src/components/Skeleton';
import { EmptyState } from '../../src/components/EmptyState';
import { Order } from '../../src/types';

export default function OrdersHistoryScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders-history'],
    queryFn: () => orderService.listOrders()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const orders = data?.data?.orders || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>My Orders</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={100} isDark={isDark} />
          <Skeleton height={100} isDark={isDark} />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="You haven't placed any garment orders yet."
          actionTitle="Browse Shop"
          onAction={() => router.push('/(tabs)/shop')}
          isDark={isDark}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => router.push(`/orders/${item.id}`)} activeOpacity={0.88}>
              <Card isDark={isDark} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 16 }}>
                      Order #{item.id}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                    </Text>
                  </View>
                  <Badge label={item.status} status={item.status} />
                </View>

                <View style={styles.orderFooter}>
                  <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                    {item.total_quantity || 1} {(item.total_quantity || 1) === 1 ? 'Item' : 'Items'}
                  </Text>
                  <Text style={{ color: colors.goldPrimary, fontSize: 18, fontWeight: 'bold' }}>
                    ₹{Number(item.total_amount).toFixed(2)}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
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
  orderCard: { marginVertical: 6 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: '#334155' }
});
