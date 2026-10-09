import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { syncEngine } from '../offline/syncEngine';
import { colors, spacing } from '../theme';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = syncEngine.initConnectivityListener((isConnected) => {
      setIsOffline(!isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        📡 Offline Mode. Displaying cached data. Mutations will auto-sync on reconnect.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#B45309', // Amber 700
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
