import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Badge } from '../../src/components/Badge';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const handleLogout = () => {
    Alert.alert(
      'Logout Confirmation',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } }
      ]
    );
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: spacing.lg }]}>
        <Text style={{ fontSize: 50, marginBottom: spacing.md }}>👤</Text>
        <Text style={[styles.name, { color: theme.textPrimary, textAlign: 'center' }]}>Guest Profile</Text>
        <Text style={{ color: theme.textSecondary, textAlign: 'center', marginVertical: spacing.sm }}>
          Sign in to view your orders, size predictions, and account settings.
        </Text>
        <Button
          title="Sign In / Register"
          onPress={() => router.push('/(auth)/login')}
          variant="primary"
          style={{ width: '80%', marginTop: spacing.md }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <Card isDark={isDark} style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.name, { color: theme.textPrimary }]}>{user.name}</Text>
            {user.role === 'admin' ? (
              <Badge label="ADMIN" type="category" />
            ) : null}
          </View>
          <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>{user.email}</Text>
          <Text style={{ color: colors.goldPrimary, fontSize: 12, marginTop: 2 }}>📞 {user.phone}</Text>
        </View>
      </Card>

      {/* Admin Panel Quick Switch */}
      {user.role === 'admin' ? (
        <TouchableOpacity
          onPress={() => router.push('/(admin)/dashboard')}
          style={styles.adminSwitchBtn}
        >
          <Text style={styles.adminSwitchText}>⚡ Open Admin Control Dashboard →</Text>
        </TouchableOpacity>
      ) : null}

      {/* Account Quick Links */}
      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Account Overview</Text>

      <Card isDark={isDark} style={{ padding: 0, overflow: 'hidden' }}>
        <TouchableOpacity onPress={() => router.push('/orders/index')} style={[styles.menuItem, { borderBottomColor: theme.cardBorder }]}>
          <Text style={styles.menuIcon}>📦</Text>
          <Text style={[styles.menuText, { color: theme.textPrimary }]}>My Orders History</Text>
          <Text style={{ color: theme.textMuted }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/size-history')} style={[styles.menuItem, { borderBottomColor: theme.cardBorder }]}>
          <Text style={styles.menuIcon}>📐</Text>
          <Text style={[styles.menuText, { color: theme.textPrimary }]}>AI Size Prediction Logs</Text>
          <Text style={{ color: theme.textMuted }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/my-reviews')} style={[styles.menuItem, { borderBottomColor: theme.cardBorder }]}>
          <Text style={styles.menuIcon}>⭐</Text>
          <Text style={[styles.menuText, { color: theme.textPrimary }]}>My Posted Reviews</Text>
          <Text style={{ color: theme.textMuted }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/notifications')} style={[styles.menuItem, { borderBottomColor: theme.cardBorder }]}>
          <Text style={styles.menuIcon}>🔔</Text>
          <Text style={[styles.menuText, { color: theme.textPrimary }]}>Notification Center</Text>
          <Text style={{ color: theme.textMuted }}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={[styles.menuText, { color: theme.textPrimary }]}>Settings & Preferences</Text>
          <Text style={{ color: theme.textMuted }}>→</Text>
        </TouchableOpacity>
      </Card>

      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="danger"
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.goldPrimary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  name: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold },
  adminSwitchBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    borderColor: colors.goldPrimary,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.md,
    alignItems: 'center'
  },
  adminSwitchText: { color: colors.goldPrimary, fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { fontSize: typography.fontSize.md, fontWeight: '700', marginVertical: spacing.md },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1
  },
  menuIcon: { fontSize: 20, marginRight: spacing.md },
  menuText: { flex: 1, fontSize: typography.fontSize.md, fontWeight: '500' }
});
