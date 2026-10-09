import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartService, reviewService, profileService } from '../services';

export type MutationType = 'addToCart' | 'updateCart' | 'removeFromCart' | 'clearCart' | 'createReview' | 'deleteReview' | 'updateProfile';

export interface PendingMutation {
  id: string;
  type: MutationType;
  payload: any;
  createdAt: number;
  retryCount: number;
}

interface OfflineQueueState {
  queue: PendingMutation[];
  isSyncing: boolean;
  addMutation: (type: MutationType, payload: any) => void;
  removeMutation: (id: string) => void;
  clearQueue: () => void;
  setIsSyncing: (v: boolean) => void;
}

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isSyncing: false,
      addMutation: (type, payload) => {
        const mutation: PendingMutation = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type,
          payload,
          createdAt: Date.now(),
          retryCount: 0,
        };
        set((s) => ({ queue: [...s.queue, mutation] }));
      },
      removeMutation: (id) => {
        set((s) => ({ queue: s.queue.filter((m) => m.id !== id) }));
      },
      clearQueue: () => set({ queue: [] }),
      setIsSyncing: (v) => set({ isSyncing: v }),
    }),
    {
      name: 'sg-offline-queue',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ─── Executor: apply a pending mutation against the real API ────────────────
export async function executeMutation(mutation: PendingMutation): Promise<void> {
  const { type, payload } = mutation;
  switch (type) {
    case 'addToCart':
      await cartService.addToCart(payload.productId, payload.size, payload.quantity);
      break;
    case 'updateCart':
      await cartService.updateCartItem(payload.cartId, payload.quantity, payload.size);
      break;
    case 'removeFromCart':
      await cartService.removeFromCart(payload.cartId);
      break;
    case 'clearCart':
      await cartService.clearCart();
      break;
    case 'createReview':
      await reviewService.createReview(payload.productId, payload.rating, payload.review);
      break;
    case 'deleteReview':
      await reviewService.deleteReview(payload.reviewId);
      break;
    case 'updateProfile':
      await profileService.updateProfile(payload);
      break;
    default:
      throw new Error(`Unknown mutation type: ${type}`);
  }
}
