import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { ToastProvider } from '../src/components/Toast';
import { NotificationSetup } from '../src/notifications/setup';
import { useSocket } from '../src/hooks/useSocket';
import { syncEngine } from '../src/offline/syncEngine';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
});

function AppInner() {
  const loadSession = useAuthStore((state) => state.loadSession);
  const themeMode = useSettingsStore((state) => state.themeMode);
  useSocket(); // Real-time events + cache invalidation

  useEffect(() => {
    loadSession();
    // Start connectivity listener for offline sync
    const unsub = syncEngine.initConnectivityListener();
    return () => unsub();
  }, []);

  return (
    <>
      <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
      <NotificationSetup />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: themeMode === 'dark' ? '#0F172A' : '#F8FAFC' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="checkout" options={{ presentation: 'card' }} />
        <Stack.Screen name="order-success/[id]" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="size-history" />
        <Stack.Screen name="my-reviews" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="settings" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
