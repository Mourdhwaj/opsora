import axios, { AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'android') return 'http://10.0.2.2:3001';
  return 'http://localhost:3001';
};

const API_BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('opsora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      SecureStore.deleteItemAsync('opsora_token');
      SecureStore.deleteItemAsync('opsora_role');
    }
    return Promise.reject(error);
  }
);

export { api, API_BASE_URL };

export interface ApiResponse<T> {
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: any;
}

export async function apiGet<T>(endpoint: string, params?: PaginatedParams): Promise<ApiResponse<T>> {
  const res = await api.get<ApiResponse<T>>(endpoint, { params });
  return res.data;
}

export async function apiPost<T>(endpoint: string, body?: any): Promise<T> {
  const res = await api.post<T>(endpoint, body);
  return res.data;
}

export async function apiPatch<T>(endpoint: string, body?: any): Promise<T> {
  const res = await api.patch<T>(endpoint, body);
  return res.data;
}

export async function apiDel<T = any>(endpoint: string): Promise<T> {
  const res = await api.delete<T>(endpoint);
  return res.data;
}
