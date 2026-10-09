import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';
import { ErrorState } from '../../src/components/ErrorState';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminService.getDashboardMetrics()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const metrics = data?.data?.metrics || {
    total_revenue: 0,
    total_orders: 0,
    total_customers: 0,
    low_stock_count: 0,
    orders_by_status: {}
  };
  const recentOrders = data?.data?.recent_orders || [];
  const lowStockItems = data?.data?.low_stock_items || [];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.badgeLabel}>ADMIN CONTROL CENTER</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Dashboard Analytics</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          style={[styles.exitBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <Text style={{ color: colors.goldPrimary, fontSize: 12, fontWeight: '700' }}>Customer App →</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorState onRetry={refetch} isDark={isDark} />
      ) : isLoading ? (
        <View>
          <Skeleton height={100} isDark={isDark} />
          <Skeleton height={150} isDark={isDark} />
        </View>
      ) : (
        <View>
          {/* Revenue Metric Highlight */}
          <Card isDark={isDark} style={styles.revenueCard}>
            <Text style={styles.revLabel}>TOTAL STORE REVENUE</Text>
            <Text style={styles.revVal}>₹{Number(metrics.total_revenue).toFixed(2)}</Text>
            <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
              Active customer orders revenue
            </Text>
          </Card>

          {/* Metric Grid */}
          <View style={styles.metricsGrid}>
            <Card isDark={isDark} style={styles.metricItem}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>📦</Text>
              <Text style={styles.metricVal}>{metrics.total_orders}</Text>
              <Text style={styles.metricLabel}>Total Orders</Text>
            </Card>

            <Card isDark={isDark} style={styles.metricItem}>
              <Text style={{ fontSize: 24, marginBottom: 4 }}>👥</Text>
              <Text style={styles.metricVal}>{metrics.total_customers}</Text>
              <Text style={styles.metricLabel}>Customers</Text>
            </Card>
          </View>

          {/* Low Stock Warning Alert */}
          {metrics.low_stock_count > 0 ? (
            <TouchableOpacity
              onPress={() => router.push('/(admin)/products/index' as any)}
              style={styles.alertBanner}
            >
              <Text style={{ fontSize: 22, marginRight: 10 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.crimsonAccent, fontWeight: 'bold' }}>
                  Low Stock Warning ({metrics.low_stock_count} items)
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                  Some garments have fewer than 10 items in inventory. Tap to edit stock.
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Admin Navigation Hub */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Administrative Hub</Text>
          <View style={styles.navGrid}>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/products/index' as any)}
              style={[styles.navCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Text style={{ fontSize: 26, marginBottom: 4 }}>👗</Text>
              <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Products CRUD</Text>
              <Text style={styles.navSub}>Catalog & Stock</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(admin)/orders/index' as any)}
              style={[styles.navCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Text style={{ fontSize: 26, marginBottom: 4 }}>🚚</Text>
              <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Manage Orders</Text>
              <Text style={styles.navSub}>Update Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(admin)/users')}
              style={[styles.navCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Text style={{ fontSize: 26, marginBottom: 4 }}>👤</Text>
              <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Manage Users</Text>
              <Text style={styles.navSub}>Accounts & Roles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(admin)/reviews')}
              style={[styles.navCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Text style={{ fontSize: 26, marginBottom: 4 }}>⭐</Text>
              <Text style={[styles.navTitle, { color: theme.textPrimary }]}>Moderation</Text>
              <Text style={styles.navSub}>Delete Reviews</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Orders List */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recent Customer Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/orders/index' as any)}>
              <Text style={{ color: colors.goldPrimary, fontWeight: '600' }}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.map((ord: any) => (
            <Card key={ord.id} isDark={isDark} style={styles.orderRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>
                  Order #{ord.id} - {ord.user_name}
                </Text>
                <Text style={{ color: colors.goldPrimary, fontWeight: '700', marginTop: 2 }}>
                  ₹{Number(ord.total_amount).toFixed(2)}
                </Text>
              </View>
              <Badge label={ord.status} status={ord.status} />
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  badgeLabel: { color: colors.goldPrimary, fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  exitBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1 },
  revenueCard: {
    backgroundColor: '#1E1B4B',
    borderColor: colors.goldPrimary,
    borderWidth: 1.5,
    padding: spacing.lg,
    marginVertical: spacing.xs
  },
  revLabel: { color: colors.goldPrimary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  revVal: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  metricsGrid: { flexDirection: 'row', gap: 10, marginVertical: spacing.xs },
  metricItem: { flex: 1, alignItems: 'center', padding: spacing.md },
  metricVal: { fontSize: 24, fontWeight: 'bold', color: colors.goldPrimary },
  metricLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  alertBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.crimsonAccent,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { fontSize: typography.fontSize.md, fontWeight: '700', marginVertical: spacing.sm },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  navCard: { width: '48%', borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginVertical: 2 },
  navTitle: { fontSize: 14, fontWeight: 'bold' },
  navSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }
});
