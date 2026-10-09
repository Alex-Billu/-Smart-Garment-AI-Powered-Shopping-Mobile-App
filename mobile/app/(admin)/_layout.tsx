import React from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../src/theme';
import { Button } from '../../src/components/Button';

export default function AdminLayout() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  if (!user || user.role !== 'admin') {
    return (
      <View style={styles.forbiddenContainer}>
        <Text style={{ fontSize: 50, marginBottom: spacing.md }}>⛔</Text>
        <Text style={styles.forbiddenTitle}>Access Restricted</Text>
        <Text style={styles.forbiddenText}>
          Administrative permissions are required to access this dashboard.
        </Text>
        <Button
          title="Return to Home"
          onPress={() => router.replace('/(tabs)')}
          variant="primary"
          style={{ marginTop: spacing.md }}
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="products/index" />
      <Stack.Screen name="products/add" />
      <Stack.Screen name="products/edit/[id]" />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="reviews" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  forbiddenContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl
  },
  forbiddenTitle: {
    color: colors.crimsonAccent,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: spacing.xs
  },
  forbiddenText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20
  }
});
