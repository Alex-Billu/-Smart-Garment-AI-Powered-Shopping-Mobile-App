import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Product } from '../types';
import { IMAGE_BASE_URL } from '../constants/config';
import { colors, radius, spacing, typography } from '../theme';
import { Badge } from './Badge';

interface ProductCardProps {
  product: Product;
  onPress: (product: Product) => void;
  onAddToCart?: (product: Product) => void;
  isDark?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  isDark = true
}) => {
  const theme = isDark ? colors.dark : colors.light;
  const imageUrl = product.image.startsWith('http')
    ? product.image
    : `${IMAGE_BASE_URL}/${product.image}`;

  const sizesArr = product.sizes_list || product.sizes.split(',');

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(product)}
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder }
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.categoryBadge}>
          <Badge label={product.category} type="category" />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
          {product.name}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>₹{Number(product.price).toFixed(2)}</Text>
          {product.stock <= 5 ? (
            <Text style={styles.lowStock}>Only {product.stock} left</Text>
          ) : null}
        </View>

        <View style={styles.sizesRow}>
          {sizesArr.slice(0, 4).map((s, idx) => (
            <View key={idx} style={styles.sizeChip}>
              <Text style={styles.sizeChipText}>{s.trim()}</Text>
            </View>
          ))}
          {sizesArr.length > 4 ? (
            <Text style={{ color: theme.textMuted, fontSize: 10 }}>+{sizesArr.length - 4}</Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginVertical: spacing.xs,
    width: '48%'
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E293B'
  },
  image: {
    width: '100%',
    height: '100%'
  },
  categoryBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs
  },
  content: {
    padding: spacing.sm
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 4
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4
  },
  price: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.goldPrimary
  },
  lowStock: {
    fontSize: 10,
    color: colors.crimsonAccent,
    fontWeight: typography.fontWeight.medium
  },
  sizesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  sizeChip: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4
  },
  sizeChipText: {
    fontSize: 10,
    color: colors.goldPrimary,
    fontWeight: '600'
  }
});
