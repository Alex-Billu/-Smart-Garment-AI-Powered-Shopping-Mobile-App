import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { productService, cartService, orderService, reviewService, sizeService, notificationService, adminService } from '../services';
import { useAuthStore } from '../store/authStore';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const useMe = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await import('../services').then(m => m.authService.getMe());
      return res.data?.user;
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const useProducts = (params?: { search?: string; category?: string; min_price?: number; max_price?: number; sort_by?: string }) => {
  return useInfiniteQuery({
    queryKey: ['products', params],
    queryFn: ({ pageParam = 1 }) =>
      productService.listProducts({ ...params, page: pageParam as number, limit: 20 }),
    getNextPageParam: (lastPage) => {
      const p = lastPage.data?.pagination;
      if (!p) return undefined;
      return p.page < (p.pages ?? p.total_pages) ? p.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
  });
};

export const useProduct = (id: number) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productService.getProductDetail(id),
    staleTime: 2 * 60 * 1000,
    enabled: !!id,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories(),
    staleTime: 10 * 60 * 1000,
  });
};

// ─── Cart ─────────────────────────────────────────────────────────────────────
export const useCart = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => cartService.getCart(),
    enabled: !!token,
    staleTime: 30 * 1000,
  });
};

export const useAddToCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, size, quantity }: { productId: number; size: string; quantity?: number }) =>
      cartService.addToCart(productId, size, quantity),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
};

export const useUpdateCartItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cartId, quantity, size }: { cartId: number; quantity?: number; size?: string }) =>
      cartService.updateCartItem(cartId, quantity, size),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
};

export const useRemoveFromCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cartId: number) => cartService.removeFromCart(cartId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
};

export const useClearCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const useOrders = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.listOrders(),
    enabled: !!token,
  });
};

export const useOrder = (id: number) => {
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderDetail(id),
    enabled: !!id,
  });
};

export const useCheckout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { address: string; city: string; state: string; pincode: string; phone: string; payment_method?: string }) =>
      orderService.checkout(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });
};

export const useCancelOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => orderService.cancelOrder(orderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const useMyReviews = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['reviews', 'my'],
    queryFn: () => reviewService.getMyReviews(),
    enabled: !!token,
  });
};

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, rating, review }: { productId: number; rating: number; review: string }) =>
      reviewService.createReview(productId, rating, review),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
};

export const useDeleteReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => reviewService.deleteReview(reviewId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  });
};

// ─── Size ─────────────────────────────────────────────────────────────────────
export const useSizeHistory = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['size-history'],
    queryFn: () => sizeService.getSizeHistory(),
    enabled: !!token,
  });
};

export const usePredictSize = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { height: number; weight: number; chest: number; waist: number; fit_preference?: string }) =>
      sizeService.predictSize(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['size-history'] }),
  });
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const useNotifications = () => {
  const token = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    enabled: !!token,
    refetchInterval: 60 * 1000,
  });
};

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useMarkAllRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const useAdminDashboard = () => {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.getDashboardMetrics(),
    staleTime: 2 * 60 * 1000,
  });
};

export const useAdminOrders = (status?: string) => {
  return useQuery({
    queryKey: ['admin', 'orders', status],
    queryFn: () => adminService.listAllOrders(status),
  });
};

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminService.listUsers(),
  });
};

export const useAdminReviews = () => {
  return useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: () => adminService.listAllReviews(),
  });
};

export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminService.updateOrderStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
};

export const useDeleteAdminReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminService.deleteReview(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'reviews'] }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => adminService.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
};
