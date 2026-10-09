import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_URL as string) ??
  extra.apiUrl ??
  'http://10.0.2.2:5000/api/v1';

export const SOCKET_URL: string =
  (process.env.EXPO_PUBLIC_SOCKET_URL as string) ??
  extra.socketUrl ??
  'http://10.0.2.2:5000';

export const IMAGE_BASE_URL: string =
  (process.env.EXPO_PUBLIC_IMAGE_URL as string) ??
  extra.imageBaseUrl ??
  'http://10.0.2.2:5000/static/images';

export const REQUEST_TIMEOUT_MS = 15_000;
export const MAX_RETRY_ATTEMPTS = 3;
export const TOKEN_REFRESH_BUFFER_SECONDS = 60;

export const QUERY_STALE_TIME = {
  products: 2 * 60 * 1000,    // 2 minutes
  cart: 30 * 1000,             // 30 seconds
  orders: 60 * 1000,           // 1 minute
  profile: 5 * 60 * 1000,      // 5 minutes
  notifications: 60 * 1000,    // 1 minute
  categories: 10 * 60 * 1000,  // 10 minutes
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'smart_garment_access_token',
  REFRESH_TOKEN: 'smart_garment_refresh_token',
  USER_DATA: 'smart_garment_user_data',
  SETTINGS: 'smart_garment_settings',
  OFFLINE_QUEUE: 'smart_garment_offline_queue',
};
