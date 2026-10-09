import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { offlineStorage } from './storage';
import { cartService, reviewService, profileService } from '../services';
import { useOfflineQueueStore, executeMutation } from '../store/offlineQueueStore';

export interface OfflineMutation {
  id: string;
  type: 'cart_add' | 'cart_update' | 'review_create' | 'profile_update';
  payload: any;
  timestamp: number;
}

let isSyncing = false;

export const syncEngine = {
  queueMutation: async (type: OfflineMutation['type'], payload: any) => {
    const queue = await offlineStorage.getQueue();
    const newMutation: OfflineMutation = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      timestamp: Date.now()
    };
    queue.push(newMutation);
    await offlineStorage.saveQueue(queue);
    console.log(`[OFFLINE QUEUE] Mutation queued: ${type}`, payload);
  },

  flushQueue: async () => {
    if (isSyncing) return;
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await offlineStorage.getQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    console.log(`[OFFLINE SYNC] Connectivity restored. Processing ${queue.length} queued mutations...`);

    const remainingQueue: OfflineMutation[] = [];

    for (const mutation of queue) {
      try {
        switch (mutation.type) {
          case 'cart_add':
            await cartService.addToCart(
              mutation.payload.product_id,
              mutation.payload.size,
              mutation.payload.quantity
            );
            break;
          case 'cart_update':
            await cartService.updateCartItem(
              mutation.payload.cart_id,
              mutation.payload.quantity,
              mutation.payload.size
            );
            break;
          case 'review_create':
            await reviewService.createReview(
              mutation.payload.product_id,
              mutation.payload.rating,
              mutation.payload.review
            );
            break;
          case 'profile_update':
            await profileService.updateProfile(mutation.payload);
            break;
        }
        console.log(`[OFFLINE SYNC] Successfully synced mutation ${mutation.id}`);
      } catch (err: any) {
        console.warn(`[OFFLINE SYNC] Failed syncing mutation ${mutation.id}:`, err);
        // Server wins conflict handling: if 4xx client error, drop mutation with message
        if (err.response?.status && err.response.status >= 400 && err.response.status < 500) {
          console.warn(`[OFFLINE SYNC] Server rejected mutation ${mutation.id} (${err.response.data?.error?.message}). Dropping.`);
        } else {
          remainingQueue.push(mutation);
        }
      }
    }

    await offlineStorage.saveQueue(remainingQueue);
    isSyncing = false;
  },

  /** Drain the Zustand offlineQueueStore — used by useNetworkStatus hook */
  syncPendingMutations: async () => {
    const store = useOfflineQueueStore.getState();
    if (store.isSyncing || store.queue.length === 0) return;

    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    store.setIsSyncing(true);
    const remaining = [];

    for (const mutation of store.queue) {
      try {
        await executeMutation(mutation);
        store.removeMutation(mutation.id);
        console.log(`[ZUSTAND SYNC] Synced: ${mutation.type} (${mutation.id})`);
      } catch (err: any) {
        const is4xx = err.response?.status >= 400 && err.response?.status < 500;
        if (is4xx) {
          console.warn(`[ZUSTAND SYNC] Server rejected ${mutation.type} — dropping.`);
          store.removeMutation(mutation.id);
        } else {
          remaining.push(mutation);
        }
      }
    }

    store.setIsSyncing(false);
    // Also flush the AsyncStorage-based legacy queue
    await syncEngine.flushQueue();
  },

  initConnectivityListener: (onConnectivityChange?: (isConnected: boolean) => void) => {
    return NetInfo.addEventListener((state: NetInfoState) => {
      const connected = !!state.isConnected;
      if (onConnectivityChange) {
        onConnectivityChange(connected);
      }
      if (connected) {
        syncEngine.flushQueue();
        syncEngine.syncPendingMutations();
      }
    });
  }
};
