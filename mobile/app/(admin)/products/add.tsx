import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { adminService } from '../../../src/services';
import { useSettingsStore } from '../../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../../src/theme';
import { Input } from '../../../src/components/Input';
import { Button } from '../../../src/components/Button';
import { Card } from '../../../src/components/Card';

export default function AddProductScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sizes, setSizes] = useState('S,M,L,XL,XXL');
  const [stock, setStock] = useState('50');

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission Denied', 'Camera roll permissions are required to select product images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreateProduct = async () => {
    if (!name.trim() || !category.trim() || !price.trim() || !sizes.trim()) {
      Alert.alert('Validation Error', 'Please fill in product name, category, price, and sizes.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('category', category.trim());
      formData.append('description', description.trim());
      formData.append('price', price.trim());
      formData.append('sizes', sizes.trim());
      formData.append('stock', stock.trim());

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'product.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type
        } as any);
      }

      const res = await adminService.createProduct(formData);
      if (res.success) {
        Alert.alert('Success', 'New product created successfully!');
        router.replace('/(admin)/products/index' as any);
      } else {
        Alert.alert('Error', res.error?.message || 'Failed to create product.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Error submitting product data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Cancel</Text>
      </TouchableOpacity>

      <Text style={[styles.title, { color: theme.textPrimary }]}>Add New Garment</Text>

      <Card isDark={isDark}>
        {/* Image Picker Box */}
        <TouchableOpacity onPress={handlePickImage} style={styles.imgPickerBox}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImg} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 32 }}>📷</Text>
              <Text style={{ color: colors.goldPrimary, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                Tap to Select Garment Image
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Input label="Garment Title *" placeholder="e.g. Classic Denim Jacket" value={name} onChangeText={setName} isDark={isDark} />
        <Input label="Category *" placeholder="e.g. Men's Wear / Shirts / Dresses" value={category} onChangeText={setCategory} isDark={isDark} />
        
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Input label="Price (₹) *" placeholder="1899.00" keyboardType="numeric" value={price} onChangeText={setPrice} isDark={isDark} />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Input label="Initial Stock *" placeholder="50" keyboardType="numeric" value={stock} onChangeText={setStock} isDark={isDark} />
          </View>
        </View>

        <Input label="Available Sizes (Comma-Separated) *" placeholder="S,M,L,XL,XXL" value={sizes} onChangeText={setSizes} isDark={isDark} />
        <Input label="Description" placeholder="Fabric material, fit, features..." multiline numberOfLines={3} value={description} onChangeText={setDescription} isDark={isDark} />

        <Button
          title="Save & Publish Garment"
          onPress={handleCreateProduct}
          loading={loading}
          variant="primary"
          style={{ marginTop: spacing.md }}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  backBtn: { marginTop: spacing.xl, marginBottom: spacing.xs },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, marginBottom: spacing.md },
  imgPickerBox: {
    height: 140,
    backgroundColor: '#1E293B',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden'
  },
  previewImg: { width: '100%', height: '100%' },
  row: { flexDirection: 'row' }
});
