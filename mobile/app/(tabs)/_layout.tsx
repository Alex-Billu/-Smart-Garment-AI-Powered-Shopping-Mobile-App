import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useCartStore } from '../../src/store/cartStore';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  const themeMode = useSettingsStore((state) => state.themeMode);
  const totalItems = useCartStore((state) => state.totalItems);
  const isDark = themeMode === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.goldPrimary,
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600'
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛍️</Text>
        }}
      />
      <Tabs.Screen
        name="size-finder"
        options={{
          title: 'AI Size',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📐</Text>
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <Text style={{ fontSize: 20, color }}>🛒</Text>
              {totalItems > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -8,
                    backgroundColor: colors.goldPrimary,
                    borderRadius: 10,
                    width: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#0F172A', fontSize: 10, fontWeight: 'bold' }}>
                    {totalItems > 99 ? '99+' : totalItems}
                  </Text>
                </View>
              ) : null}
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text>
        }}
      />
    </Tabs>
  );
}
