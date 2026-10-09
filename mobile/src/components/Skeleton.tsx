import React from 'react';
import { View, StyleSheet, DimensionValue } from 'react-native';
import { colors, radius } from '../theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  isDark?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  isDark = true
}) => {
  const bg = isDark ? '#1E293B' : '#E2E8F0';

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: bg
        }
      ]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    marginVertical: 4,
    opacity: 0.7
  }
});
