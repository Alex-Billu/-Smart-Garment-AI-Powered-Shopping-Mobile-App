import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleForgot = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your account email address.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setMessage('');

    try {
      const res = await authService.forgotPassword(email.trim());
      setMessage(res.data?.message || 'Password reset request sent successfully.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Forgot Password</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your email to receive a password reset token
        </Text>
      </View>

      {message ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Input
        label="Email Address"
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
        isDark={isDark}
      />

      <Button
        title="Send Reset Instructions"
        onPress={handleForgot}
        loading={loading}
        variant="primary"
        style={{ marginTop: spacing.md }}
      />

      {message ? (
        <Button
          title="I have a reset token"
          onPress={() => router.push('/(auth)/reset-password')}
          variant="outline"
          style={{ marginTop: spacing.sm }}
        />
      ) : null}

      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing.xl, alignSelf: 'center' }}>
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
  successBox: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.emeraldAccent, borderWidth: 1, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  successText: { color: colors.emeraldAccent, fontSize: typography.fontSize.sm },
  errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.crimsonAccent, borderWidth: 1, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  errorText: { color: colors.crimsonAccent, fontSize: typography.fontSize.sm }
});
