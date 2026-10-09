import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { sizeService } from '../../src/services';
import { useSettingsStore } from '../../src/store/settingsStore';
import { colors, spacing, typography, radius } from '../../src/theme';
import { Input } from '../../src/components/Input';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { SizePrediction } from '../../src/types';

export default function SizeFinderScreen() {
  const router = useRouter();
  const themeMode = useSettingsStore((state) => state.themeMode);
  const isDark = themeMode === 'dark';
  const theme = isDark ? colors.dark : colors.light;

  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [fitPref, setFitPref] = useState<'Slim' | 'Regular' | 'Loose'>('Regular');

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<SizePrediction | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePredict = async () => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    const c = parseFloat(chest);
    const wst = parseFloat(waist);

    if (isNaN(h) || isNaN(w) || isNaN(c) || isNaN(wst) || h <= 0 || w <= 0 || c <= 0 || wst <= 0) {
      setErrorMsg('Please enter valid numeric body measurements.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await sizeService.predictSize({
        height: h,
        weight: w,
        chest: c,
        waist: wst,
        fit_preference: fitPref
      });

      if (res.success && res.data) {
        setPrediction(res.data);
      } else {
        setErrorMsg(res.error?.message || 'Failed to generate size recommendation.');
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || 'Error communicating with size predictor model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.brandTitle}>RANDOM FOREST ML</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Garment Size Recommender</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your body measurements below for automated sizing confidence
        </Text>
      </View>

      {errorMsg ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      <Card isDark={isDark} style={styles.formCard}>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Input
              label="Height (cm) *"
              placeholder="e.g. 175"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
              isDark={isDark}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Input
              label="Weight (kg) *"
              placeholder="e.g. 70"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Input
              label="Chest (cm) *"
              placeholder="e.g. 98"
              keyboardType="numeric"
              value={chest}
              onChangeText={setChest}
              isDark={isDark}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 6 }}>
            <Input
              label="Waist (cm) *"
              placeholder="e.g. 82"
              keyboardType="numeric"
              value={waist}
              onChangeText={setWaist}
              isDark={isDark}
            />
          </View>
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Fit Preference</Text>
        <View style={styles.prefRow}>
          {(['Slim', 'Regular', 'Loose'] as const).map((pref) => {
            const isSelected = fitPref === pref;
            return (
              <TouchableOpacity
                key={pref}
                onPress={() => setFitPref(pref)}
                style={[
                  styles.prefBtn,
                  {
                    backgroundColor: isSelected ? colors.goldPrimary : theme.inputBg,
                    borderColor: isSelected ? colors.goldPrimary : theme.inputBorder
                  }
                ]}
              >
                <Text style={{ color: isSelected ? '#0F172A' : theme.textPrimary, fontWeight: '700' }}>
                  {pref}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Predict Garment Size"
          onPress={handlePredict}
          loading={loading}
          variant="primary"
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {/* Prediction Result Section */}
      {prediction ? (
        <Card isDark={isDark} style={styles.resultCard}>
          <Text style={styles.resultBadge}>PREDICTION READY</Text>
          <Text style={[styles.resultTitle, { color: theme.textPrimary }]}>
            Recommended Size
          </Text>

          <View style={styles.sizeCircle}>
            <Text style={styles.sizeCircleText}>{prediction.predicted_size}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Confidence</Text>
              <Text style={styles.statVal}>{prediction.confidence}%</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>BMI Index</Text>
              <Text style={styles.statVal}>{prediction.bmi}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Fit Mode</Text>
              <Text style={styles.statVal}>{prediction.fit_preference}</Text>
            </View>
          </View>

          <Button
            title="Shop Recommended Garments →"
            onPress={() => router.push('/(tabs)/shop')}
            variant="outline"
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: { marginTop: spacing.md, marginBottom: spacing.md },
  brandTitle: { color: colors.goldPrimary, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold },
  subtitle: { fontSize: typography.fontSize.sm, marginTop: 4 },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.crimsonAccent,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.md
  },
  errorText: { color: colors.crimsonAccent, fontSize: typography.fontSize.sm },
  formCard: { marginBottom: spacing.lg },
  row: { flexDirection: 'row' },
  label: { fontSize: typography.fontSize.sm, fontWeight: '500', marginVertical: spacing.xs },
  prefRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  prefBtn: {
    flex: 1,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultCard: {
    borderColor: colors.goldPrimary,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingVertical: spacing.lg
  },
  resultBadge: { color: colors.goldPrimary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  resultTitle: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, marginVertical: 4 },
  sizeCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.goldPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.md
  },
  sizeCircleText: { fontSize: 36, fontWeight: 'bold', color: '#0F172A' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: spacing.sm },
  statBox: { alignItems: 'center' },
  statLabel: { color: '#94A3B8', fontSize: 12 },
  statVal: { color: colors.goldPrimary, fontSize: typography.fontSize.md, fontWeight: 'bold', marginTop: 2 }
});
