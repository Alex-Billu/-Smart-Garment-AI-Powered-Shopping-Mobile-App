export type Role = 'user' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: Role;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at?: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  image: string;
  sizes: string;
  sizes_list?: string[];
  stock: number;
  created_at?: string;
  rating?: {
    average: number;
    count: number;
  };
  reviews?: Review[];
}

export interface CartItem {
  cart_id: number;
  user_id: number;
  product_id: number;
  product_name: string;
  price: number;
  size: string;
  quantity: number;
  image?: string;
  stock?: number;
  category?: string;
}

export interface CartSummary {
  total_items: number;
  subtotal: number;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  size: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: number;
  user_id: number;
  total_amount: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  payment_method: string;
  status: OrderStatus;
  created_at: string;
  item_count?: number;
  total_quantity?: number;
  items?: OrderItem[];
  customer_name?: string;
  customer_email?: string;
}

export interface Review {
  id: number;
  user_id: number;
  product_id: number;
  rating: number;
  review: string;
  created_at: string;
  user_name?: string;
  product_name?: string;
  product_image?: string;
}

export interface SizePrediction {
  id?: number;
  user_id?: number;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  fit_preference: string;
  predicted_size: string;
  confidence: number;
  bmi: number;
  created_at?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  body: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  pages?: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
