import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { productService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { ProductCard } from '../../src/components/ProductCard';
import { Skeleton } from '../../src/components/Skeleton';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { Product } from '../../src/types';

export default function ShopScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(params.category || '');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [refreshing, setRefreshing] = useState(false);

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories()
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['products', search, selectedCategory, sortBy],
    queryFn: () => productService.listProducts({
      search,
      category: selectedCategory,
      sort_by: sortBy,
      limit: 50
    })
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const categories = catData?.data?.categories || ['Men\'s Wear', 'Shirts', 'Dresses', 'Pants', 'Night Wear', 'Inner Wear'];
  const products = data?.data?.products || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Garment Shop</Text>
        <Input
          placeholder="Search jacket, shirt, dress..."
          value={search}
          onChangeText={setSearch}
          isDark={isDark}
          style={{ height: 42 }}
        />
      </View>

      {/* Category Pills */}
      <View style={{ height: 44 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...categories]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.catList}
          renderItem={({ item }) => {
            const isSelected = item === 'All' ? selectedCategory === '' : selectedCategory === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCategory(item === 'All' ? '' : item)}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isSelected ? colors.goldPrimary : theme.card,
                    borderColor: isSelected ? colors.goldPrimary : theme.cardBorder
                  }
                ]}
              >
                <Text
                  style={[
                    styles.catText,
                    { color: isSelected ? '#0F172A' : theme.textPrimary }
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Sort Row */}
      <View style={styles.sortRow}>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
          Showing {products.length} items
        </Text>
        <View style={styles.sortButtons}>
          <TouchableOpacity
            onPress={() => setSortBy(sortBy === 'price_asc' ? 'price_desc' : 'price_asc')}
            style={[styles.sortBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Text style={{ color: colors.goldPrimary, fontSize: 11, fontWeight: '600' }}>
              Sort Price {sortBy === 'price_asc' ? '↑' : sortBy === 'price_desc' ? '↓' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Products Grid */}
      {error ? (
        <ErrorState onRetry={refetch} isDark={isDark} />
      ) : isLoading ? (
        <View style={styles.gridContainer}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={{ width: '48%', marginVertical: 8 }}>
              <Skeleton height={150} isDark={isDark} />
              <Skeleton height={20} width="80%" isDark={isDark} />
            </View>
          ))}
        </View>
      ) : products.length === 0 ? (
        <EmptyState
          title="No Garments Found"
          description="No items matched your search query or selected category filter."
          actionTitle="Reset Filters"
          onAction={() => { setSearch(''); setSelectedCategory(''); }}
          isDark={isDark}
        />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.goldPrimary} />
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={handleProductPress}
              isDark={isDark}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: spacing.md,
    paddingTop: spacing.lg
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs
  },
  catList: {
    paddingHorizontal: spacing.md,
    gap: 8
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center'
  },
  catText: {
    fontSize: 12,
    fontWeight: '600'
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: spacing.md
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md
  },
  listContent: {
    paddingBottom: 40
  }
});
