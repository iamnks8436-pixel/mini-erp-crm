import axios, { AxiosError } from 'axios';
import { Customer, Product, StockMovement, Challan, DashboardStats, Pagination } from '../types';

const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.endsWith('/api')
    ? configuredApiUrl
    : `${configuredApiUrl}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: any[] }>) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on login check
      if (!error.config?.url?.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

// Customers API
export const customerApi = {
  getAll: async (params?: { search?: string; status?: string; type?: string; page?: number; limit?: number }) => {
    const res = await api.get<{ success: boolean; customers: Customer[]; pagination: Pagination }>('/customers', { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<{ success: boolean; customer: Customer; challans: Challan[] }>(`/customers/${id}`);
    return res.data;
  },
  create: async (data: Partial<Customer>) => {
    const res = await api.post<{ success: boolean; customer: Customer; message: string }>('/customers', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Customer>) => {
    const res = await api.put<{ success: boolean; customer: Customer; message: string }>(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/customers/${id}`);
    return res.data;
  },
};

// Products API
export const productApi = {
  getAll: async (params?: { search?: string; category?: string; stockStatus?: string }) => {
    const res = await api.get<{ success: boolean; products: Product[]; categories: string[] }>('/products', { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<{ success: boolean; product: Product; recentMovements: StockMovement[] }>(`/products/${id}`);
    return res.data;
  },
  create: async (data: Partial<Product>) => {
    const res = await api.post<{ success: boolean; product: Product; message: string }>('/products', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Product>) => {
    const res = await api.put<{ success: boolean; product: Product; message: string }>(`/products/${id}`, data);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/products/${id}`);
    return res.data;
  },
};

// Inventory API
export const inventoryApi = {
  getMovements: async (params?: { product_id?: number; limit?: number; offset?: number }) => {
    const res = await api.get<{ success: boolean; movements: StockMovement[] }>('/stock-movements', { params });
    return res.data;
  },
  createMovement: async (data: { product_id: number; quantity_changed: number; movement_type: 'IN' | 'OUT'; reason: string }) => {
    const res = await api.post<{ success: boolean; message: string; data: { movement: StockMovement; product: any } }>('/stock-movements', data);
    return res.data;
  },
};

// Challans API
export const challanApi = {
  getAll: async (params?: { status?: string; search?: string; customer_id?: number; page?: number; limit?: number }) => {
    const res = await api.get<{ success: boolean; challans: Challan[]; pagination: Pagination }>('/challans', { params });
    return res.data;
  },
  getById: async (id: number) => {
    const res = await api.get<{ success: boolean; challan: Challan }>(`/challans/${id}`);
    return res.data;
  },
  create: async (data: { customer_id: number; notes?: string | null; status?: 'Draft' | 'Confirmed'; items: { product_id: number; quantity: number }[] }) => {
    const res = await api.post<{ success: boolean; message: string; challan: Challan }>('/challans', data);
    return res.data;
  },
  update: async (id: number, data: { customer_id?: number; notes?: string | null; items?: { product_id: number; quantity: number }[] }) => {
    const res = await api.put<{ success: boolean; message: string; challan: Challan }>(`/challans/${id}`, data);
    return res.data;
  },
  confirm: async (id: number) => {
    const res = await api.post<{ success: boolean; message: string; challan: Challan }>(`/challans/${id}/confirm`);
    return res.data;
  },
  cancel: async (id: number) => {
    const res = await api.post<{ success: boolean; message: string; challan: Challan }>(`/challans/${id}/cancel`);
    return res.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async () => {
    const res = await api.get<{ success: boolean; stats: DashboardStats }>('/dashboard/stats');
    return res.data;
  },
};
