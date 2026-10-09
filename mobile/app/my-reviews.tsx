import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { reviewService } from '../src/services';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, spacing, typography } from '../src/theme';
import { Card } from '../src/components/Card';
import { Rating } from '../src/components/Rating';
import { Skeleton } from '../src/components/Skeleton';
import { EmptyState } from '../src/components/EmptyState';

export default function MyReviewsScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: () => reviewService.getMyReviews()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDelete = (reviewId: number) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await reviewService.deleteReview(reviewId);
          refetch();
        }
      }
    ]);
  };

  const reviews = data?.data?.reviews || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>My Posted Reviews</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={90} isDark={isDark} />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyState
          title="No Reviews Found"
          description="You haven't posted any garment reviews yet."
          isDark={isDark}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.reviewCard}>
              <View style={styles.row}>
                <Text style={{ color: theme.textPrimary, fontWeight: 'bold', fontSize: 16 }}>
                  {item.product_name || 'Garment Item'}
                </Text>
                <Rating value={item.rating} size={14} />
              </View>
              <Text style={{ color: theme.textSecondary, marginVertical: 6 }}>{item.review}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ alignSelf: 'flex-end' }}>
                <Text style={{ color: colors.crimsonAccent, fontSize: 12, fontWeight: 'bold' }}>Delete Review</Text>
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
