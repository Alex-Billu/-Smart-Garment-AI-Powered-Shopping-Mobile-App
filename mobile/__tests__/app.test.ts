/**
 * Mobile app test suite – Jest + React Native Testing Library
 * Run: npx jest --coverage
 */

// ─── Mock setup ───────────────────────────────────────────────────────────────
// ─── Imports ──────────────────────────────────────────────────────────────────
import { useAuthStore } from '../src/store/authStore';
import { useOfflineQueueStore, executeMutation, MutationType } from '../src/store/offlineQueueStore';
import { formatPrice, formatDate, timeAgo, isValidEmail, isValidPassword, parseSizes, truncate } from '../src/utils';
import { authService } from '../src/services';
import { apiClient } from '../src/api/client';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue('mock-refresh-token'),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
}));

jest.mock('../src/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  },
}));

// ─── Auth Store Tests ──────────────────────────────────────────────────────────

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setTokens updates accessToken and refreshToken', async () => {
    await useAuthStore.getState().setTokens('access123', 'refresh456');
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('access123');
    expect(state.refreshToken).toBe('refresh456');
  });

  it('setUser stores user object', () => {
    const user = { id: 1, name: 'Test', email: 'test@test.com', role: 'user' as const, phone: '', address: '' };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user?.email).toBe('test@test.com');
  });

  it('clearAuth resets all state', async () => {
    await useAuthStore.getState().setTokens('acc', 'ref');
    await useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });
});

// ─── Offline Queue Store Tests ─────────────────────────────────────────────────

describe('offlineQueueStore', () => {
  beforeEach(() => {
    useOfflineQueueStore.getState().clearQueue();
  });

  it('starts with empty queue', () => {
    expect(useOfflineQueueStore.getState().queue).toHaveLength(0);
  });

  it('addMutation enqueues a mutation', () => {
    useOfflineQueueStore.getState().addMutation('addToCart', { productId: 1, size: 'M', quantity: 1 });
    expect(useOfflineQueueStore.getState().queue).toHaveLength(1);
    expect(useOfflineQueueStore.getState().queue[0].type).toBe('addToCart');
  });

  it('removeMutation removes by id', () => {
    useOfflineQueueStore.getState().addMutation('addToCart', { productId: 2, size: 'L', quantity: 2 });
    const id = useOfflineQueueStore.getState().queue[0].id;
    useOfflineQueueStore.getState().removeMutation(id);
    expect(useOfflineQueueStore.getState().queue).toHaveLength(0);
  });

  it('clearQueue empties the queue', () => {
    useOfflineQueueStore.getState().addMutation('clearCart', {});
    useOfflineQueueStore.getState().addMutation('createReview', { productId: 1, rating: 5, review: 'Great' });
    useOfflineQueueStore.getState().clearQueue();
    expect(useOfflineQueueStore.getState().queue).toHaveLength(0);
  });
});

// ─── Utility Functions Tests ───────────────────────────────────────────────────

describe('utils/formatPrice', () => {
  it('formats number as INR currency', () => {
    const result = formatPrice(1500);
    expect(result).toContain('1,500');
    expect(result).toContain('₹');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toContain('0');
  });

  it('handles large amounts', () => {
    expect(formatPrice(100000)).toContain('1,00,000');
  });
});

describe('utils/formatDate', () => {
  it('parses ISO date string', () => {
    const result = formatDate('2024-01-15T10:00:00Z');
    expect(result).toMatch(/Jan|January/);
    expect(result).toContain('2024');
  });

  it('returns original string on invalid date', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date');
  });
});

describe('utils/timeAgo', () => {
  it('returns "just now" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(timeAgo(now)).toBe('just now');
  });

  it('returns minutes for recent timestamps', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(fiveMinAgo)).toBe('5m ago');
  });
});

describe('utils/validators', () => {
  it('validates correct email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
  });

  it('validates password strength', () => {
    expect(isValidPassword('Abcdefg1')).toBe(true);
    expect(isValidPassword('weakpass')).toBe(false);
    expect(isValidPassword('NOLOWER1')).toBe(false);
    expect(isValidPassword('Short1')).toBe(false);
  });
});

describe('utils/parseSizes', () => {
  it('parses comma-separated sizes', () => {
    expect(parseSizes('S,M,L,XL')).toEqual(['S', 'M', 'L', 'XL']);
  });

  it('trims whitespace', () => {
    expect(parseSizes(' S , M , L ')).toEqual(['S', 'M', 'L']);
  });

  it('returns empty array for null/undefined', () => {
    expect(parseSizes(null)).toEqual([]);
    expect(parseSizes(undefined)).toEqual([]);
  });
});

describe('utils/truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('does not truncate short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });
});

// ─── Service Layer Tests ───────────────────────────────────────────────────────

describe('authService.login', () => {
  it('calls POST /auth/login with correct payload', async () => {
    const mockResponse = {
      data: {
        success: true,
        data: { access_token: 'acc', refresh_token: 'ref', user: { id: 1 } },
      },
    };
    (apiClient.post as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await authService.login('user@test.com', 'pass123');
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
      email: 'user@test.com',
      password: 'pass123',
    });
    expect(result.success).toBe(true);
  });

  it('handles network error gracefully', async () => {
    (apiClient.post as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
    await expect(authService.login('u@u.com', 'pw')).rejects.toThrow('Network Error');
  });
});

// ─── Offline Mutation Executor Tests ──────────────────────────────────────────

describe('executeMutation', () => {
  it('throws for unknown mutation type', async () => {
    await expect(
      executeMutation({ id: '1', type: 'unknown' as MutationType, payload: {}, createdAt: 0, retryCount: 0 })
    ).rejects.toThrow(/Unknown mutation type/);
  });
});
