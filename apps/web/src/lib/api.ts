import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

let authReady: Promise<void> | null = null;

function waitForAuth(): Promise<void> {
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, () => {
        unsub();
        resolve();
      });
    });
  }
  return authReady;
}

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  await waitForAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const token = await getToken();

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  });

  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || error.message || "Request failed");
  }

  return res.json();
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string>) =>
    request<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body: body ? JSON.stringify(body) : undefined }),

  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),

  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),

  del: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),

  suggestGroup: <T>(body: { males: number; females: number; couples: number; budget?: number; floorPreference?: number; propertyId?: string }) =>
    request<T>("/allocation/suggest-group", { method: "POST", body: JSON.stringify(body) }),

  checkinGroup: <T>(body: { propertyId: string; moveInDate: string; residents: any[] }) =>
    request<T>("/residents/checkin-group", { method: "POST", body: JSON.stringify(body) }),
};
