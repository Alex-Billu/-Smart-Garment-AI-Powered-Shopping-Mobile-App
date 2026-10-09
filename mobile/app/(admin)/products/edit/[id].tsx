import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/theme';
import { adminService } from '@/services';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { useQueryClient } from '@tanstack/react-query';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string; name: string; price: string; stock: string; category: string; description: string; sizes: string }>();
  const { colors } = useTheme();
  const { show } = useToast();
  const qc = useQueryClient();

  const [name, setName] = useState(String(id || ''));
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sizes, setSizes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !price || !stock || !category) {
      show({ message: 'Fill in all required fields', type: 'warning' });
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('category', category.trim());
      formData.append('description', description.trim());
      formData.append('sizes', sizes.trim());
      if (imageUri) {
        const filename = imageUri.split('/').pop() ?? 'product.jpg';
        const ext = filename.split('.').pop() ?? 'jpg';
        formData.append('image', { uri: imageUri, type: `image/${ext}`, name: filename } as any);
      }
      const productId = Number(id);
      const res = await adminService.updateProduct(productId, formData);
      if ((res as any).success) {
        show({ message: 'Product updated successfully', type: 'success' });
        qc.invalidateQueries({ queryKey: ['products'] });
        router.back();
      } else {
        show({ message: (res as any).error?.message || 'Update failed', type: 'error' });
      }
    } catch (e: any) {
      show({ message: e?.response?.data?.error?.message || 'Network error', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Product</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Picker */}
        <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          ) : (
            <>
              <Text style={{ fontSize: 36 }}>📷</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Tap to change image</Text>
            </>
          )}
        </TouchableOpacity>

        <Input label="Product Name *" value={name} onChangeText={setName} placeholder="Enter product name" />
        <Input label="Price (₹) *" value={price} onChangeText={setPrice} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="Stock *" value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
        <Input label="Category *" value={category} onChangeText={setCategory} placeholder="e.g. T-Shirts" />
        <Input label="Sizes (comma-separated)" value={sizes} onChangeText={setSizes} placeholder="S,M,L,XL" />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Product description..."
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
        />

        <Button
          title={loading ? 'Saving...' : 'Update Product'}
          onPress={handleSubmit}
          disabled={loading}
          loading={loading}
          style={{ marginVertical: 24 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  container: { padding: 20 },
  imagePicker: {
    height: 180, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20, overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
});
