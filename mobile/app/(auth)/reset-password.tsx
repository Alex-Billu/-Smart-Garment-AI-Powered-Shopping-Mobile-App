import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!token.trim() || !newPassword || newPassword.length < 6) {
      setErrorMsg('Valid token and new password (min 6 chars) are required.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authService.resetPassword(token.trim(), newPassword);
      if (res.success) {
        Alert.alert('Success', 'Password reset successful! Please login with your new password.');
        router.replace('/(auth)/login');
      } else {
        setErrorMsg(res.error?.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Error processing password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Reset Password</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your token and set a new password
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Input
        label="Reset Token"
        placeholder="Paste token from email/log"
        value={token}
        onChangeText={setToken}
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
        onPress={handleReset}
        loading={loading}
        variant="primary"
        style={{ marginTop: spacing.md }}
      />

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ marginTop: spacing.xl, alignSelf: 'center' }}>
        <Text style={{ color: colors.goldPrimary, fontWeight: '600' }}>← Back to Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  header: { marginBottom: spacing.xl },
  title: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold },
  subtitle: { fontSize: typography.fontSize.md, marginTop: 4 },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.crimsonAccent, borderWidth: 1, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  errorText: { color: colors.crimsonAccent, fontSize: typography.fontSize.sm }
});
