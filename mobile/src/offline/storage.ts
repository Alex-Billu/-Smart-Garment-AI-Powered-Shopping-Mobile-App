import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, CartItem, Order, User } from '../types';

const KEYS = {
  PRODUCTS_CACHE: 'cache_products',
  CATEGORIES_CACHE: 'cache_categories',
  CART_CACHE: 'cache_cart',
  ORDERS_CACHE: 'cache_orders',
  PROFILE_CACHE: 'cache_profile',
  OFFLINE_QUEUE: 'offline_mutation_queue'
};

export const offlineStorage = {
  saveProducts: async (products: Product[]) => {
    try {
      await AsyncStorage.setItem(KEYS.PRODUCTS_CACHE, JSON.stringify(products));
    } catch (e) {
      console.warn('Error caching products', e);
    }
  },

  getProducts: async (): Promise<Product[] | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.PRODUCTS_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveCategories: async (categories: string[]) => {
    try {
      await AsyncStorage.setItem(KEYS.CATEGORIES_CACHE, JSON.stringify(categories));
    } catch (e) {}
  },

  getCategories: async (): Promise<string[] | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.CATEGORIES_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveCart: async (cart: CartItem[]) => {
    try {
      await AsyncStorage.setItem(KEYS.CART_CACHE, JSON.stringify(cart));
    } catch (e) {}
  },

  getCart: async (): Promise<CartItem[] | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.CART_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveOrders: async (orders: Order[]) => {
    try {
      await AsyncStorage.setItem(KEYS.ORDERS_CACHE, JSON.stringify(orders));
    } catch (e) {}
  },

  getOrders: async (): Promise<Order[] | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.ORDERS_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveProfile: async (user: User) => {
    try {
      await AsyncStorage.setItem(KEYS.PROFILE_CACHE, JSON.stringify(user));
    } catch (e) {}
  },

  getProfile: async (): Promise<User | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.PROFILE_CACHE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveQueue: async (queue: any[]) => {
    try {
      await AsyncStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (e) {}
  },

  getQueue: async (): Promise<any[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.OFFLINE_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
};
