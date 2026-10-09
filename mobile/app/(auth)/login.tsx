import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import * as SecureStore from '../../src/utils/storage';
import { STORAGE_KEYS } from '../../src/constants/config';

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setTokens = useAuthStore((state) => state.setTokens);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authService.login(email.trim(), password);
      if (res.success && res.data) {
        const { user, access_token, refresh_token } = res.data;
        await setTokens(access_token, refresh_token);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        setUser(user);
        router.replace('/(tabs)');
      } else {
        setErrorMsg(res.error?.message || 'Login failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Server connection error. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.brandBadge}>✨ SMART GARMENT</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Sign in to access your AI sizing profile and orders
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Email Address"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          isDark={isDark}
        />

        <Input
          label="Password"
          placeholder="Enter password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          isDark={isDark}
        />

        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={styles.forgotBtn}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          variant="primary"
          style={{ marginTop: spacing.md }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textSecondary }}>Don't have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={{ color: colors.goldPrimary, fontWeight: '700' }}>Register Now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center'
  },
  header: {
    marginBottom: spacing.xl
  },
  brandBadge: {
    color: colors.goldPrimary,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 2,
    marginBottom: spacing.xs
  },
  title: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold
  },
  subtitle: {
    fontSize: typography.fontSize.md,
    marginTop: 4
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.crimsonAccent,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md
  },
  errorText: {
    color: colors.crimsonAccent,
    fontSize: typography.fontSize.sm
  },
  form: {
    width: '100%'
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginVertical: spacing.xs
  },
  forgotText: {
    color: colors.goldPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl
  }
});
