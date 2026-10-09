import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isDark?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  secureTextEntry,
  isDark = true,
  style,
  ...rest
}) => {
  const theme = isDark ? colors.dark : colors.light;
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!secureTextEntry);

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.inputBg,
            borderColor: error
              ? colors.crimsonAccent
              : isFocused
              ? colors.goldPrimary
              : theme.inputBorder
          }
        ]}
      >
        <TextInput
          style={[styles.input, { color: theme.textPrimary }, style]}
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secureTextEntry && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...rest}
        />
        {secureTextEntry ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.toggleBtn}
          >
            <Text style={{ color: colors.goldPrimary, fontSize: 12 }}>
              {showPassword ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    width: '100%'
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md
  },
  toggleBtn: {
    paddingLeft: spacing.sm
  },
  errorText: {
    color: colors.crimsonAccent,
    fontSize: typography.fontSize.xs,
    marginTop: 4
  }
});
