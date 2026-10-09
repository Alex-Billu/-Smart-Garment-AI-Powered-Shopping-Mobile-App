import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Button } from './Button';

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  isDark?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'Unable to connect to server. Please check your internet connection.',
  onRetry,
  isDark = true
}) => {
  const theme = isDark ? colors.dark : colors.light;

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: theme.textPrimary }]}>Connection Issue</Text>
      <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>
      <Button
        title="Retry Request"
        onPress={onRetry}
        variant="outline"
        style={{ marginTop: spacing.md }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginVertical: spacing.xl
  },
  icon: {
    fontSize: 44,
    marginBottom: spacing.sm
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs
  },
  message: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20
  }
});
