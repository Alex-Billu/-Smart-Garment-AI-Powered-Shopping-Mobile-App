import { apiClient } from '../api/client';
import {
  ApiResponse, User, Product, CartItem, CartSummary, Order, Review,
  SizePrediction, NotificationItem, PaginationMeta, AuthTokens
} from '../types';

export const authService = {
  login: async (email: string, password: string): Promise<ApiResponse<{ user: User } & AuthTokens>> => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (payload: { name: string; email: string; phone: string; password: string; address?: string; city?: string; state?: string; pincode?: string }): Promise<ApiResponse<{ user: User } & AuthTokens>> => {
    const res = await apiClient.post('/auth/register', payload);
    return res.data;
  },
  logout: async (refreshToken: string): Promise<ApiResponse> => {
    const res = await apiClient.post('/auth/logout', { refresh_token: refreshToken });
    return res.data;
  },
  logoutAll: async (): Promise<ApiResponse> => {
    const res = await apiClient.post('/auth/logout-all');
    return res.data;
  },
  forgotPassword: async (email: string): Promise<ApiResponse> => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse> => {
    const res = await apiClient.post('/auth/reset-password', { token, new_password: newPassword });
    return res.data;
  },
  getMe: async (): Promise<ApiResponse<{ user: User }>> => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  }
};

export const productService = {
  listProducts: async (params?: { page?: number; limit?: number; search?: string; category?: string; min_price?: number; max_price?: number; sort_by?: string }): Promise<ApiResponse<{ products: Product[]; pagination: PaginationMeta }>> => {
    const res = await apiClient.get('/products', { params });
    return res.data;
  },
  getProductDetail: async (id: number): Promise<ApiResponse<{ product: Product }>> => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data;
  },
  getCategories: async (): Promise<ApiResponse<{ categories: string[] }>> => {
    const res = await apiClient.get('/products/categories');
    return res.data;
  }
};

export const cartService = {
  getCart: async (): Promise<ApiResponse<{ items: CartItem[]; summary: CartSummary }>> => {
    const res = await apiClient.get('/cart');
    return res.data;
  },
  addToCart: async (productId: number, size: string, quantity: number = 1): Promise<ApiResponse<{ cart_id: number }>> => {
    const res = await apiClient.post('/cart/add', { product_id: productId, size, quantity });
    return res.data;
  },
  updateCartItem: async (cartId: number, quantity?: number, size?: string): Promise<ApiResponse> => {
    const res = await apiClient.put('/cart/update', { cart_id: cartId, quantity, size });
    return res.data;
  },
  removeFromCart: async (cartId: number): Promise<ApiResponse> => {
    const res = await apiClient.delete(`/cart/remove/${cartId}`);
    return res.data;
  },
  clearCart: async (): Promise<ApiResponse> => {
    const res = await apiClient.delete('/cart/clear');
    return res.data;
  }
};

export const orderService = {
  checkout: async (payload: { address: string; city: string; state: string; pincode: string; phone: string; payment_method?: string }): Promise<ApiResponse<{ order_id: number; total_amount: number; status: string }>> => {
    const res = await apiClient.post('/orders/checkout', payload);
    return res.data;
  },
  listOrders: async (): Promise<ApiResponse<{ orders: Order[] }>> => {
    const res = await apiClient.get('/orders');
    return res.data;
  },
  getOrderDetail: async (orderId: number): Promise<ApiResponse<{ order: Order }>> => {
    const res = await apiClient.get(`/orders/${orderId}`);
    return res.data;
  },
  cancelOrder: async (orderId: number): Promise<ApiResponse<{ order_id: number; status: string }>> => {
    const res = await apiClient.post(`/orders/${orderId}/cancel`);
    return res.data;
  }
};

export const profileService = {
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const res = await apiClient.get('/profile');
    return res.data;
  },
  updateProfile: async (payload: { name: string; phone: string; address?: string; city?: string; state?: string; pincode?: string }): Promise<ApiResponse<{ user: User }>> => {
    const res = await apiClient.put('/profile', payload);
    return res.data;
  },
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse> => {
    const res = await apiClient.post('/profile/change-password', { current_password: currentPassword, new_password: newPassword });
    return res.data;
  }
};

export const reviewService = {
  createReview: async (productId: number, rating: number, review: string): Promise<ApiResponse<{ review: Review }>> => {
    const res = await apiClient.post('/reviews', { product_id: productId, rating, review });
    return res.data;
  },
  getMyReviews: async (): Promise<ApiResponse<{ reviews: Review[] }>> => {
    const res = await apiClient.get('/reviews/my');
    return res.data;
  },
  deleteReview: async (reviewId: number): Promise<ApiResponse> => {
    const res = await apiClient.delete(`/reviews/${reviewId}`);
    return res.data;
  }
};

export const sizeService = {
  predictSize: async (payload: { height: number; weight: number; chest: number; waist: number; fit_preference?: string }): Promise<ApiResponse<SizePrediction>> => {
    const res = await apiClient.post('/size/predict', payload);
    return res.data;
  },
  getSizeHistory: async (): Promise<ApiResponse<{ predictions: SizePrediction[] }>> => {
    const res = await apiClient.get('/size/history');
    return res.data;
  }
};

export const adminService = {
  getDashboardMetrics: async (): Promise<ApiResponse> => {
    const res = await apiClient.get('/admin/dashboard');
    return res.data;
  },
  createProduct: async (formData: FormData): Promise<ApiResponse<{ product: Product }>> => {
    const res = await apiClient.post('/admin/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  updateProduct: async (id: number, formData: FormData): Promise<ApiResponse<{ product: Product }>> => {
    const res = await apiClient.put(`/admin/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },
  deleteProduct: async (id: number): Promise<ApiResponse> => {
    const res = await apiClient.delete(`/admin/products/${id}`);
    return res.data;
  },
  listAllOrders: async (status?: string): Promise<ApiResponse<{ orders: Order[] }>> => {
    const res = await apiClient.get('/admin/orders', { params: { status } });
    return res.data;
  },
  updateOrderStatus: async (id: number, status: string): Promise<ApiResponse<{ order: Order }>> => {
    const res = await apiClient.put(`/admin/orders/${id}/status`, { status });
    return res.data;
  },
  listUsers: async (): Promise<ApiResponse<{ users: User[] }>> => {
    const res = await apiClient.get('/admin/users');
    return res.data;
  },
  deleteUser: async (id: number): Promise<ApiResponse> => {
    const res = await apiClient.delete(`/admin/users/${id}`);
    return res.data;
  },
  listAllReviews: async (): Promise<ApiResponse<{ reviews: Review[] }>> => {
    const res = await apiClient.get('/admin/reviews');
    return res.data;
  },
  deleteReview: async (id: number): Promise<ApiResponse> => {
    const res = await apiClient.delete(`/admin/reviews/${id}`);
    return res.data;
  }
};

export const notificationService = {
  registerDeviceToken: async (fcmToken: string, platform: string = 'mobile'): Promise<ApiResponse> => {
    const res = await apiClient.post('/devices', { fcm_token: fcmToken, platform });
    return res.data;
  },
  unregisterDeviceToken: async (fcmToken: string): Promise<ApiResponse> => {
    const res = await apiClient.delete(`/devices/${encodeURIComponent(fcmToken)}`);
    return res.data;
  },
  getNotifications: async (): Promise<ApiResponse<{ notifications: NotificationItem[]; unread_count: number }>> => {
    const res = await apiClient.get('/notifications');
    return res.data;
  },
  markAsRead: async (id: number): Promise<ApiResponse> => {
    const res = await apiClient.post(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async (): Promise<ApiResponse> => {
    const res = await apiClient.post('/notifications/read-all');
    return res.data;
  }
};
