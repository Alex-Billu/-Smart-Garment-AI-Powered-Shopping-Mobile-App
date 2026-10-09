import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { notificationService } from '../src/services';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, spacing, typography } from '../src/theme';
import { Card } from '../src/components/Card';
import { Skeleton } from '../src/components/Skeleton';
import { EmptyState } from '../src/components/EmptyState';

export default function NotificationsScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    refetch();
  };

  const notifications = data?.data?.notifications || [];
  const unreadCount = data?.data?.unread_count || 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Notification Center</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead}>
              <Text style={{ color: colors.goldPrimary, fontWeight: '700', fontSize: 12 }}>Mark All Read</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={70} isDark={isDark} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState
          title="No Notifications"
          description="You're all caught up! Order status alerts and low stock notifications will appear here."
          isDark={isDark}
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => (
            <Card
              isDark={isDark}
              style={[
                styles.notifCard,
                { backgroundColor: item.is_read ? theme.card : isDark ? '#1E1B4B' : '#FEF3C7' }
              ] as any}
            >
              <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 14 }}>{item.title}</Text>
              <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>{item.body}</Text>
              <Text style={{ color: theme.textMuted, fontSize: 10, marginTop: 4 }}>
                {new Date(item.created_at).toLocaleString()}
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
  notifCard: { marginVertical: 4 }
});
