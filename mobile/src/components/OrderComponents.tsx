import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme';

interface StatusBadgeProps {
  status: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Pending:   { bg: '#fef3c7', text: '#92400e' },
  Confirmed: { bg: '#dbeafe', text: '#1e40af' },
  Shipped:   { bg: '#ede9fe', text: '#5b21b6' },
  Delivered: { bg: '#dcfce7', text: '#166534' },
  Cancelled: { bg: '#fee2e2', text: '#991b1b' },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colors = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
};

interface OrderTimelineProps {
  status: string;
}

const STEPS = ['Pending', 'Confirmed', 'Shipped', 'Delivered'];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status }) => {
  const { colors } = useTheme();
  const currentIndex = status === 'Cancelled' ? -1 : STEPS.indexOf(status);

  if (status === 'Cancelled') {
    return (
      <View style={[styles.cancelledContainer, { borderColor: '#ef4444' }]}>
        <Text style={styles.cancelledText}>❌ Order Cancelled</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {STEPS.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isActive = index === currentIndex;
        return (
          <React.Fragment key={step}>
            <View style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: isCompleted ? colors.primary : colors.border,
                    borderColor: isActive ? colors.primary : 'transparent',
                    borderWidth: isActive ? 3 : 0,
                  },
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  { color: isCompleted ? colors.primary : colors.textSecondary, fontWeight: isActive ? '700' : '400' },
                ]}
              >
                {step}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View style={[styles.connector, { backgroundColor: index < currentIndex ? colors.primary : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = '#6366f1', onPress }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={styles.statInfo}>
        <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
  timeline: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  step: { alignItems: 'center', gap: 6, width: 60 },
  stepDot: { width: 16, height: 16, borderRadius: 8 },
  stepLabel: { fontSize: 10, textAlign: 'center' },
  connector: { flex: 1, height: 2, marginBottom: 20 },
  cancelledContainer: {
    borderWidth: 1, borderRadius: 12, padding: 16, alignItems: 'center', marginVertical: 12,
  },
  cancelledText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  statCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 12,
  },
  statIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statInfo: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 2 },
});
