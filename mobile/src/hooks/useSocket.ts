import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { initSocket, disconnectSocket } from '../realtime/socketClient';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const qc = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const connect = useCallback(() => {
    if (!accessToken) return;
    // Pass query client to let initSocket handle the invalidations
    initSocket(qc);
  }, [accessToken, qc]);

  const disconnect = useCallback(() => {
    disconnectSocket();
  }, []);

  useEffect(() => {
    connect();

    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        connect(); // Reconnect when foregrounded
      } else if (nextState.match(/inactive|background/)) {
        disconnect(); // Disconnect in background to save battery
      }
      appState.current = nextState;
    });

    return () => {
      sub.remove();
      disconnect();
    };
  }, [connect, disconnect]);
};
