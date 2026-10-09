import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme';

interface RatingProps {
  value: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readOnly?: boolean;
}

export const Rating: React.FC<RatingProps> = ({
  value,
  onRatingChange,
  size = 18,
  readOnly = true
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((star) => (
        <TouchableOpacity
          key={star}
          disabled={readOnly}
          onPress={() => onRatingChange && onRatingChange(star)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: size, color: star <= Math.round(value) ? colors.goldPrimary : '#475569' }}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  }
});
