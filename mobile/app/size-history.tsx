import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { sizeService } from '../src/services';
import { useSettingsStore } from '../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../src/theme';
import { Card } from '../src/components/Card';
import { Skeleton } from '../src/components/Skeleton';
import { EmptyState } from '../src/components/EmptyState';

export default function SizeHistoryScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['size-history'],
    queryFn: () => sizeService.getSizeHistory()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const predictions = data?.data?.predictions || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>AI Size History</Text>
      </View>

      {isLoading ? (
        <View style={{ padding: spacing.md }}>
          <Skeleton height={80} isDark={isDark} />
        </View>
      ) : predictions.length === 0 ? (
        <EmptyState
          title="No Size History Found"
          description="Use the AI Size Recommender to find your ideal garment size."
          actionTitle="Open Size Recommender"
          onAction={() => router.push('/(tabs)/size-finder')}
          isDark={isDark}
        />
      ) : (
        <FlatList
          data={predictions}
          keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
          contentContainerStyle={{ padding: spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.historyCard}>
              <View style={styles.badgeBox}>
                <Text style={styles.sizeText}>{item.predicted_size}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>
                  Confidence: {item.confidence}% | BMI: {item.bmi}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  Measurements: {item.height}cm / {item.weight}kg / Chest {item.chest}cm
                </Text>
                <Text style={{ color: colors.goldPrimary, fontSize: 11, marginTop: 2 }}>
                  Fit: {item.fit_preference} | {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                </Text>
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
  historyCard: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  badgeBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.goldPrimary, justifyContent: 'center', alignItems: 'center' },
  sizeText: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' }
});
