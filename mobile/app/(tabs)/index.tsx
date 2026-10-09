import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { ProductCard } from '../../src/components/ProductCard';
import { Skeleton } from '../../src/components/Skeleton';
import { ErrorState } from '../../src/components/ErrorState';
import { Product } from '../../src/types';

export default function HomeScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const user = useAuthStore((state) => state.user);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productService.listProducts({ limit: 8, sort_by: 'newest' })
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories()
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const products = data?.data?.products || [];
  const categories = catData?.data?.categories || ['Men\'s Wear', 'Shirts', 'Dresses', 'Pants'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />
      }
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>SMART GARMENT</Text>
          <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>
            Hello, {user ? user.name.split(' ')[0] : 'Guest'} ✨
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications')}
          style={[styles.iconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      {/* AI Size Banner */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(tabs)/size-finder')}
        style={styles.aiBanner}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.aiBadge}>AI FIT ADVISOR</Text>
          <Text style={styles.aiTitle}>Find Your Perfect Fit</Text>
          <Text style={styles.aiSubtitle}>Random Forest ML Sizing Predictor</Text>
          <View style={styles.aiBtn}>
            <Text style={styles.aiBtnText}>Start Measurement →</Text>
          </View>
        </View>
        <Text style={{ fontSize: 50, marginLeft: 8 }}>📐</Text>
      </TouchableOpacity>

      {/* Categories Horizontal */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Categories</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
        {categories.map((cat, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => router.push({ pathname: '/(tabs)/shop', params: { category: cat } })}
            style={[styles.catChip, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.catText, { color: theme.textPrimary }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured Products Grid */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Featured Garments</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/shop')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <ErrorState onRetry={refetch} isDark={isDark} />
      ) : isLoading ? (
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ width: '48%', marginVertical: 8 }}>
              <Skeleton height={150} isDark={isDark} />
              <Skeleton height={20} width="80%" isDark={isDark} />
              <Skeleton height={16} width="40%" isDark={isDark} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={handleProductPress}
              isDark={isDark}
            />
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
    marginTop: spacing.md,
    marginBottom: spacing.md
  },
  brandTitle: {
    color: colors.goldPrimary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2
  },
  welcomeText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  aiBanner: {
    backgroundColor: '#1E1B4B',
    borderColor: colors.goldPrimary,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  aiBadge: {
    color: colors.goldPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4
  },
  aiTitle: {
    color: '#FFFFFF',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold
  },
  aiSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2
  },
  aiBtn: {
    backgroundColor: colors.goldPrimary,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginTop: 10
  },
  aiBtnText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: spacing.sm
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold
  },
  seeAllText: {
    color: colors.goldPrimary,
    fontWeight: '600',
    fontSize: typography.fontSize.sm
  },
  catScroll: {
    gap: 8,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1
  },
  catText: {
    fontSize: 13,
    fontWeight: '600'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  }
});
