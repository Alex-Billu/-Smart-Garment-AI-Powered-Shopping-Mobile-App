import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { productService, cartService, reviewService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAuthStore } from '../../src/store/authStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { IMAGE_BASE_URL } from '../../src/constants/config';
import { Button } from '../../src/components/Button';
import { Rating } from '../../src/components/Rating';
import { Badge } from '../../src/components/Badge';
import { Card } from '../../src/components/Card';
import { Skeleton } from '../../src/components/Skeleton';
import { Input } from '../../src/components/Input';

export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = parseInt(id || '0', 10);

  const themeMode = useSettingsStore((state) => state.themeMode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [addingToCart, setAddingToCart] = useState(false);

  // Review submission modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newReviewText, setNewReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productService.getProductDetail(productId),
    enabled: !!productId
  });

  const product = data?.data?.product;
  const sizesArr = product?.sizes_list || (product?.sizes ? product.sizes.split(',') : []);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please log in to add garments to your shopping cart.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    if (!selectedSize) {
      Alert.alert('Select Size', 'Please choose a garment size before adding to cart.');
      return;
    }

    setAddingToCart(true);
    try {
      const res = await cartService.addToCart(productId, selectedSize, 1);
      if (res.success) {
        Alert.alert('Added to Cart', `'${product?.name}' (${selectedSize}) added to your cart!`, [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'Go to Cart', onPress: () => router.push('/(tabs)/cart') }
        ]);
      }
    } catch (err: any) {
      Alert.alert('Cart Error', err.response?.data?.error?.message || 'Failed to add item to cart.');
    } finally {
      setAddingToCart(false);
    }
  };

  const handlePostReview = async () => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to write a product review.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await reviewService.createReview(productId, newRating, newReviewText.trim());
      if (res.success) {
        Alert.alert('Review Posted', 'Thank you for your feedback!');
        setShowReviewModal(false);
        setNewReviewText('');
        refetch();
      }
    } catch (err: any) {
      Alert.alert('Review Error', err.response?.data?.error?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (isLoading || !product) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, padding: spacing.md }]}>
        <Skeleton height={300} isDark={isDark} />
        <Skeleton height={28} width="70%" isDark={isDark} />
        <Skeleton height={20} width="40%" isDark={isDark} />
      </View>
    );
  }

  const imageUrl = product.image.startsWith('http')
    ? product.image
    : `${IMAGE_BASE_URL}/${product.image}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header Back Button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>

        {/* Hero Image */}
        <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />

        {/* Content Section */}
        <View style={styles.content}>
          <View style={styles.categoryRow}>
            <Badge label={product.category} type="category" />
            {product.stock <= 5 ? (
              <Text style={{ color: colors.crimsonAccent, fontSize: 12, fontWeight: 'bold' }}>
                Only {product.stock} items remaining
              </Text>
            ) : null}
          </View>

          <Text style={[styles.title, { color: theme.textPrimary }]}>{product.name}</Text>
          <Text style={styles.price}>₹{Number(product.price).toFixed(2)}</Text>

          {/* Sizing Picker */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Select Garment Size</Text>
          <View style={styles.sizeGrid}>
            {sizesArr.map((s, idx) => {
              const sz = s.trim();
              const isSelected = selectedSize === sz;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => setSelectedSize(sz)}
                  style={[
                    styles.sizeBtn,
                    {
                      backgroundColor: isSelected ? colors.goldPrimary : theme.card,
                      borderColor: isSelected ? colors.goldPrimary : theme.cardBorder
                    }
                  ]}
                >
                  <Text style={{ color: isSelected ? '#0F172A' : theme.textPrimary, fontWeight: 'bold' }}>
                    {sz}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description */}
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Garment Description</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>{product.description}</Text>

          {/* Customer Reviews Section */}
          <View style={styles.reviewsHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Customer Reviews</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Rating value={product.rating?.average || 0} size={16} />
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                  {product.rating?.average || '0.0'} ({product.rating?.count || 0} reviews)
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setShowReviewModal(true)}>
              <Text style={{ color: colors.goldPrimary, fontWeight: '700', fontSize: 13 }}>+ Write Review</Text>
            </TouchableOpacity>
          </View>

          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map((r) => (
              <Card key={r.id} isDark={isDark} style={{ marginVertical: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.textPrimary, fontWeight: 'bold' }}>{r.user_name || 'Customer'}</Text>
                  <Rating value={r.rating} size={14} />
                </View>
                <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{r.review}</Text>
              </Card>
            ))
          ) : (
            <Text style={{ color: theme.textMuted, fontStyle: 'italic', marginVertical: 8 }}>
              No reviews yet. Be the first to review this garment!
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Add to Cart CTA */}
      <View style={[styles.stickyFooter, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Button
          title={addingToCart ? 'Adding to Cart...' : selectedSize ? `Add Size ${selectedSize} to Cart` : 'Select Size to Add'}
          onPress={handleAddToCart}
          loading={addingToCart}
          variant="primary"
          disabled={!selectedSize}
        />
      </View>

      {/* Write Review Modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <Card isDark={isDark} style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Write a Review</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: spacing.md }}>Rating (1 - 5 Stars):</Text>

            <Rating value={newRating} onRatingChange={setNewRating} readOnly={false} size={28} />

            <Input
              placeholder="Share your experience with this garment..."
              multiline
              numberOfLines={4}
              value={newReviewText}
              onChangeText={setNewReviewText}
              isDark={isDark}
              style={{ height: 90, textAlignVertical: 'top', marginTop: spacing.md }}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.md }}>
              <Button
                title="Cancel"
                onPress={() => setShowReviewModal(false)}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title="Submit Review"
                onPress={handlePostReview}
                loading={submittingReview}
                variant="primary"
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute',
    top: 40,
    left: spacing.md,
    zIndex: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full
  },
  heroImage: { width: '100%', height: 360, backgroundColor: '#1E293B' },
  content: { padding: spacing.md },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold },
  price: { fontSize: typography.fontSize.xl, fontWeight: 'bold', color: colors.goldPrimary, marginVertical: 6 },
  sectionTitle: { fontSize: typography.fontSize.md, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.xs },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeBtn: {
    width: 50,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  description: { fontSize: typography.fontSize.sm, lineHeight: 22 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  stickyFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, borderTopWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.md },
  modalContent: { padding: spacing.lg },
  modalTitle: { fontSize: typography.fontSize.lg, fontWeight: 'bold' }
});
