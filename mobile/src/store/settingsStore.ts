import { create } from 'zustand';

type ThemeMode = 'dark' | 'light';

interface SettingsState {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'dark',
  notificationsEnabled: true,
  setThemeMode: (mode) => set({ themeMode: mode }),
  toggleTheme: () => set((state) => ({ themeMode: state.themeMode === 'dark' ? 'light' : 'dark' })),
  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled })
}));
