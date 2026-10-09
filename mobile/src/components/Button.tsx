import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet,
  ViewStyle, TextStyle, Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isDark?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  isDark = true
}) => {
  const theme = isDark ? colors.dark : colors.light;

  const handlePress = () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      // Haptics optional fallback
    }
    onPress();
  };

  const getBgColor = () => {
    if (disabled) return isDark ? '#334155' : '#E2E8F0';
    switch (variant) {
      case 'primary': return colors.goldPrimary;
      case 'secondary': return theme.cardBorder;
      case 'outline': return 'transparent';
      case 'danger': return colors.crimsonAccent;
      default: return colors.goldPrimary;
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? '#64748B' : '#94A3B8';
    switch (variant) {
      case 'primary': return '#0F172A';
      case 'secondary': return theme.textPrimary;
      case 'outline': return colors.goldPrimary;
      case 'danger': return '#FFFFFF';
      default: return '#0F172A';
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm': return 38;
      case 'lg': return 54;
      default: return 46;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBgColor(),
          height: getHeight(),
          borderColor: variant === 'outline' ? colors.goldPrimary : 'transparent',
          borderWidth: variant === 'outline' ? 1.5 : 0
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs
  },
  text: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5
  }
});
