import { create } from 'zustand';
import { CartItem } from '../types';

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  setCart: (items: CartItem[], totalItems: number, subtotal: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  totalItems: 0,
  subtotal: 0,

  setCart: (items, totalItems, subtotal) => set({ items, totalItems, subtotal }),
  clearCart: () => set({ items: [], totalItems: 0, subtotal: 0 })
}));
