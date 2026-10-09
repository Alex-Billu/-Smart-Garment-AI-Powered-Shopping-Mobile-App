import { io, Socket } from 'socket.io-client';
import * as SecureStore from '../utils/storage';
import { SOCKET_URL, STORAGE_KEYS } from '../constants/config';
import { QueryClient } from '@tanstack/react-query';

let socket: Socket | null = null;

export const initSocket = async (queryClient?: QueryClient) => {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

  socket = io(SOCKET_URL, {
    transports: ['polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000
  });

  socket.on('connect', () => {
    console.log('[SOCKET CLIENT] Connected to backend real-time server');
  });

  socket.on('disconnect', (reason: any) => {
    console.log('[SOCKET CLIENT] Disconnected:', reason);
  });

  if (queryClient) {
    socket.on('order.created', (data: any) => {
      console.log('[SOCKET EVENT] order.created', data);
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    });

    socket.on('order.status_changed', (data: any) => {
      console.log('[SOCKET EVENT] order.status_changed', data);
      queryClient.invalidateQueries({ queryKey: ['orders-history'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail', data.order_id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('product.created', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    });

    socket.on('product.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    });

    socket.on('product.deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    });

    socket.on('cart.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    });

    socket.on('notification.new', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[SOCKET CLIENT] Connection closed.');
  }
};
