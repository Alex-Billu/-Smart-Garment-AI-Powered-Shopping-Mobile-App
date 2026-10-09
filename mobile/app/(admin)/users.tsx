import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import { Skeleton } from '../../src/components/Skeleton';

export default function AdminUsersScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminService.listUsers()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    Alert.alert('Delete User Account', `Are you sure you want to delete user account '${userName}'?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteUser(userId);
            refetch();
          } catch (e: any) {
            Alert.alert('Error', e.response?.data?.error?.message || 'Failed to delete user.');
          }
        }
      }
    ]);
  };

  const users = data?.data?.users || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(admin)/dashboard')} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Admin Dashboard</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>User Account Management</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={80} isDark={isDark} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.userCard}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 16 }}>{item.name}</Text>
                    {item.role === 'admin' ? <Badge label="ADMIN" type="category" /> : null}
                  </View>
                  <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>{item.email}</Text>
                  <Text style={{ color: colors.goldPrimary, fontSize: 12, marginTop: 2 }}>📞 {item.phone}</Text>
                </View>

                {item.role !== 'admin' ? (
                  <TouchableOpacity onPress={() => handleDeleteUser(item.id, item.name)} style={styles.delBtn}>
                    <Text style={{ color: colors.crimsonAccent, fontSize: 12, fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
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
  userCard: { marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  delBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.crimsonAccent, borderRadius: 6 }
});
