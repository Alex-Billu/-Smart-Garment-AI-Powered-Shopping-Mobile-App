import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../theme';

const { width } = Dimensions.get('window');

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  title?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, height = 160 }) => {
  const { colors } = useTheme();
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <View style={styles.container}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      <View style={[styles.chart, { height }]}>
        {data.map((item, index) => {
          const barHeight = (item.value / maxValue) * (height - 30);
          return (
            <View key={index} style={styles.barWrapper}>
              <Text style={[styles.valueLabel, { color: colors.textSecondary }]}>
                {item.value > 999 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
              </Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(barHeight, 4),
                    backgroundColor: item.color ?? colors.primary,
                  },
                ]}
              />
              <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

interface DonutChartProps {
  segments: { label: string; value: number; color: string }[];
  title?: string;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ segments, title, size = 120 }) => {
  const { colors } = useTheme();
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  return (
    <View style={styles.donutContainer}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      <View style={styles.donutRow}>
        {/* Simple segmented representation using colored blocks */}
        <View style={[styles.donutVisual, { width: size, height: size, borderRadius: size / 2 }]}>
          {segments.map((seg, i) => (
            <View
              key={i}
              style={{
                flex: seg.value / total,
                backgroundColor: seg.color,
                borderRadius: i === 0 ? size / 2 : 0,
              }}
            />
          ))}
          <View
            style={[
              styles.donutHole,
              { width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275, backgroundColor: colors.card },
            ]}
          />
        </View>
        <View style={styles.legendContainer}>
          {segments.map((seg, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                {seg.label}: {((seg.value / total) * 100).toFixed(0)}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

interface LineChartProps {
  data: { label: string; value: number }[];
  title?: string;
  color?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, title, color, height = 120 }) => {
  const { colors } = useTheme();
  const lineColor = color ?? colors.primary;
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const chartWidth = width - 80;
  const stepX = chartWidth / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: i * stepX,
    y: height - 30 - ((d.value / maxValue) * (height - 40)),
  }));

  return (
    <View style={styles.container}>
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      <View style={{ height, position: 'relative' }}>
        {/* Y-axis lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <View
            key={i}
            style={[
              styles.gridLine,
              { top: ratio * (height - 30), borderColor: colors.border },
            ]}
          />
        ))}
        {/* Data points */}
        {points.map((pt, i) => (
          <View
            key={i}
            style={[
              styles.dataPoint,
              { left: pt.x - 4, top: pt.y - 4, backgroundColor: lineColor },
            ]}
          />
        ))}
        {/* Labels */}
        <View style={styles.xLabels}>
          {data.map((d, i) => (
            <Text key={i} style={[styles.xLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {d.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 20 },
  barWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '100%', borderRadius: 6, minHeight: 4 },
  valueLabel: { fontSize: 10, fontWeight: '600' },
  label: { fontSize: 9, textAlign: 'center' },
  donutContainer: { marginVertical: 8 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donutVisual: { overflow: 'hidden', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  donutHole: { position: 'absolute' },
  legendContainer: { flex: 1, gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 12 },
  gridLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, borderStyle: 'dashed' },
  dataPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  xLabels: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between' },
  xLabel: { fontSize: 9, width: 40 },
});
