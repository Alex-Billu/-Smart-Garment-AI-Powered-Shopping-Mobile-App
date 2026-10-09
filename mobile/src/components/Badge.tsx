import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { OrderStatus } from '../types';

interface BadgeProps {
  label: string;
  type?: 'status' | 'category' | 'size';
  status?: OrderStatus;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  type = 'status',
  status,
  style
}) => {
  const getStatusColor = (st?: OrderStatus) => {
    switch (st) {
      case 'Pending': return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.amberWarning };
      case 'Confirmed': return { bg: 'rgba(99, 102, 241, 0.15)', text: colors.indigoInfo };
      case 'Shipped': return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' };
      case 'Delivered': return { bg: 'rgba(16, 185, 129, 0.15)', text: colors.emeraldAccent };
      case 'Cancelled': return { bg: 'rgba(239, 68, 68, 0.15)', text: colors.crimsonAccent };
      default: return { bg: 'rgba(212, 175, 55, 0.15)', text: colors.goldPrimary };
    }
  };

  const colorsConfig = status ? getStatusColor(status) : { bg: 'rgba(212, 175, 55, 0.15)', text: colors.goldPrimary };

  return (
    <View style={[styles.badge, { backgroundColor: colorsConfig.bg }, style]}>
      <Text style={[styles.text, { color: colorsConfig.text }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start'
  },
  text: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize'
  }
});
