// ─── useTheme hook ────────────────────────────────────────────────────────────
// Returns a flat color token object based on current theme mode from settingsStore.
// Usage: const { colors, spacing, typography } = useTheme();

import { useSettingsStore } from '../store/settingsStore';

export const colors = {
  // Brand luxury palette
  goldPrimary: '#D4AF37',
  goldDark: '#AA820A',
  goldLight: '#F3E5AB',
  
  emeraldAccent: '#10B981',
  crimsonAccent: '#EF4444',
  amberWarning: '#F59E0B',
  indigoInfo: '#6366F1',

  // Dark Mode Tokens (Default premium theme)
  dark: {
    background: '#0F172A', // Slate 900
    card: '#1E293B',       // Slate 800
    cardBorder: '#334155', // Slate 700
    textPrimary: '#F8FAFC',// Slate 50
    textSecondary: '#94A3B8',// Slate 400
    textMuted: '#64748B',  // Slate 500
    inputBg: '#1E293B',
    inputBorder: '#475569',
    primaryBtnBg: '#D4AF37',
    primaryBtnText: '#0F172A',
    badgePending: '#F59E0B',
    badgeConfirmed: '#6366F1',
    badgeShipped: '#3B82F6',
    badgeDelivered: '#10B981',
    badgeCancelled: '#EF4444'
  },

  // Light Mode Tokens
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    cardBorder: '#E2E8F0',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    inputBg: '#FFFFFF',
    inputBorder: '#CBD5E1',
    primaryBtnBg: '#0F172A',
    primaryBtnText: '#FFFFFF',
    badgePending: '#D97706',
    badgeConfirmed: '#4F46E5',
    badgeShipped: '#2563EB',
    badgeDelivered: '#059669',
    badgeCancelled: '#DC2626'
  }
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    display: 34
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const
  }
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
};

export interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  warning: string;
}

export function useTheme() {
  const themeMode = useSettingsStore((s) => s.themeMode);
  const isDark = themeMode === 'dark';

  const themeColors: ThemeColors = isDark
    ? {
        primary: '#6366f1',
        background: '#0F172A',
        card: '#1E293B',
        border: '#334155',
        text: '#F8FAFC',
        textSecondary: '#94A3B8',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      }
    : {
        primary: '#6366f1',
        background: '#F8FAFC',
        card: '#FFFFFF',
        border: '#E2E8F0',
        text: '#0F172A',
        textSecondary: '#64748B',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#f59e0b',
      };

  return { colors: themeColors, spacing, typography, radius, isDark };
}

