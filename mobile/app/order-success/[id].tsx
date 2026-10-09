import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Button } from '@/components/Button';
import { formatPrice } from '@/utils';

const { width } = Dimensions.get('window');

export default function OrderSuccessScreen() {
  const { id, total } = useLocalSearchParams<{ id: string; total: string }>();
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 150 }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Bounce animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: -10, duration: 600, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        {/* Success Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }, { translateY: bounceAnim }] }]}>
          <View style={[styles.iconBg, { backgroundColor: '#22c55e20' }]}>
            <Text style={styles.icon}>✅</Text>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Text style={[styles.title, { color: colors.text }]}>Order Placed!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your order #{id} has been placed successfully and is being processed.
          </Text>

          {total && (
            <View style={[styles.totalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Amount Paid</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                {formatPrice(Number(total))}
              </Text>
            </View>
          )}

          <View style={[styles.steps, { backgroundColor: colors.card }]}>
            {[
              { icon: '📦', label: 'Order Confirmed', done: true },
              { icon: '🔄', label: 'Being Processed', done: true },
              { icon: '🚚', label: 'Out for Delivery', done: false },
              { icon: '🏠', label: 'Delivered', done: false },
            ].map((step, i) => (
              <View key={i} style={styles.step}>
                <Text style={{ opacity: step.done ? 1 : 0.4 }}>{step.icon}</Text>
                <Text style={[styles.stepLabel, { color: step.done ? colors.primary : colors.textSecondary }]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>

          <Button
            title="Track My Order"
            onPress={() => router.push(`/orders/${id}` as any)}
            style={{ width: '100%', marginTop: 16 }}
          />
          <Button
            title="Continue Shopping"
            variant="outline"
            onPress={() => router.replace('/(tabs)/' as any)}
            style={{ width: '100%', marginTop: 12 }}
          />
          <Button
            title="View All Orders"
            variant="outline"
            onPress={() => router.replace('/orders' as any)}
            style={{ marginTop: 8, borderWidth: 0 }}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  iconContainer: { marginBottom: 28 },
  iconBg: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 52 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  totalCard: {
    width: '100%', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 20,
  },
  totalLabel: { fontSize: 13, marginBottom: 6 },
  totalAmount: { fontSize: 28, fontWeight: '900' },
  steps: {
    width: '100%', borderRadius: 16, padding: 20, flexDirection: 'row',
    justifyContent: 'space-between', marginBottom: 8,
  },
  step: { alignItems: 'center', gap: 6, flex: 1 },
  stepLabel: { fontSize: 10, textAlign: 'center' },
});
