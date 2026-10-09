import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Rating } from '../../src/components/Rating';
import { Skeleton } from '../../src/components/Skeleton';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => adminService.listAllReviews()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDeleteReview = (reviewId: number) => {
    Alert.alert('Moderate Review', 'Are you sure you want to delete this customer review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Review',
        style: 'destructive',
        onPress: async () => {
          try {
            await adminService.deleteReview(reviewId);
            refetch();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete review.');
          }
        }
      }
    ]);
  };

  const reviews = data?.data?.reviews || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(admin)/dashboard')} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Admin Dashboard</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Customer Review Moderation</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={90} isDark={isDark} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.reviewCard}>
              <View style={styles.row}>
                <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 15 }}>
                  {item.product_name} - {item.user_name}
                </Text>
                <Rating value={item.rating} size={14} />
              </View>

              <Text style={{ color: theme.textSecondary, marginVertical: 6, fontSize: 13 }}>{item.review}</Text>

              <TouchableOpacity onPress={() => handleDeleteReview(item.id)} style={{ alignSelf: 'flex-end' }}>
                <Text style={{ color: colors.crimsonAccent, fontSize: 12, fontWeight: 'bold' }}>Delete / Remove Review</Text>
              </TouchableOpacity>
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
  reviewCard: { marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
