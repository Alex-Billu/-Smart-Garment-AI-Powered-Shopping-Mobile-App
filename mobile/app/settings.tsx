import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../src/store/settingsStore';
import { useAuthStore } from '../src/store/authStore';
import { authService, profileService } from '../src/services';
import { colors, spacing, typography } from '../src/theme';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';

export default function SettingsScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled);
  const logout = useAuthStore((state) => state.logout);

  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  // Change password modal / state
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currPassword || !newPassword || newPassword.length < 6) {
      Alert.alert('Validation Error', 'Please enter your current password and new password (min 6 chars).');
      return;
    }

    setChangingPw(true);
    try {
      const res = await profileService.changePassword(currPassword, newPassword);
      if (res.success) {
        Alert.alert('Password Changed', 'Your password has been updated successfully.');
        setCurrPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  };

  const handleLogoutAll = () => {
    Alert.alert('Security Check', 'Are you sure you want to log out of all active devices?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout All',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logoutAll();
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ color: colors.goldPrimary, fontWeight: 'bold' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Settings & Preferences</Text>
      </View>

      {/* Theme Settings */}
      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Appearance</Text>
        <View style={styles.row}>
          <View>
            <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Dark Mode</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Use luxury slate dark color tokens</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#475569', true: colors.goldPrimary }}
          />
        </View>
      </Card>

      {/* Notification Preferences */}
      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Notifications</Text>
        <View style={styles.row}>
          <View>
            <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>Push Notifications</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Receive order status updates and stock alerts</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#475569', true: colors.goldPrimary }}
          />
        </View>
      </Card>

      {/* Security & Password */}
      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Security & Credentials</Text>
        <Input
          label="Current Password"
          placeholder="Enter current password"
          secureTextEntry
          value={currPassword}
          onChangeText={setCurrPassword}
          isDark={isDark}
        />
        <Input
          label="New Password"
          placeholder="Min 6 characters"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          isDark={isDark}
        />
        <Button
          title="Update Password"
          onPress={handleChangePassword}
          loading={changingPw}
          variant="outline"
          style={{ marginTop: spacing.sm }}
        />
      </Card>

      {/* Revoke All Sessions */}
      <Card isDark={isDark} style={styles.card}>
        <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Session Security</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12, marginBottom: spacing.sm }}>
          Revoke all active refresh tokens across all mobile and web devices.
        </Text>
        <Button
          title="Sign Out of All Devices"
          onPress={handleLogoutAll}
          variant="danger"
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: { paddingTop: spacing.xl, marginBottom: spacing.md },
  backBtn: { marginBottom: spacing.xs },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  card: { marginBottom: spacing.md },
  cardTitle: { fontSize: typography.fontSize.md, fontWeight: '700', marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 }
});
