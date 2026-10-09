import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../src/services';
import { useAuthStore } from '../../src/store/authStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../../src/constants/config';

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const setTokens = useAuthStore((state) => state.setTokens);
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authService.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        address: address.trim(),
        city: city.trim()
      });

      if (res.success && res.data) {
        const { user, access_token, refresh_token } = res.data;
        await setTokens(access_token, refresh_token);
        await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        setUser(user);
        router.replace('/(tabs)');
      } else {
        setErrorMsg(res.error?.message || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Server connection error.';
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
        <Text style={[styles.title, { color: theme.textPrimary }]}>Create Account</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Join Smart Garment for AI size recommendations
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Full Name *"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          isDark={isDark}
        />

        <Input
          label="Email Address *"
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          isDark={isDark}
        />

        <Input
          label="Phone Number *"
          placeholder="9876543210"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          isDark={isDark}
        />

        <Input
          label="Password *"
          placeholder="Min 6 characters"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          isDark={isDark}
        />

        <Input
          label="Shipping Address (Optional)"
          placeholder="Flat / Street / Locality"
          value={address}
          onChangeText={setAddress}
          isDark={isDark}
        />

        <Button
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          variant="primary"
          style={{ marginTop: spacing.md }}
        />
      </View>

      <View style={styles.footer}>
        <Text style={{ color: theme.textSecondary }}>Already registered? </Text>
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={{ color: colors.goldPrimary, fontWeight: '700' }}>Sign In</Text>
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
    marginBottom: spacing.lg
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl
  }
});
