# Opsora Android App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-feature-parity React Native (Expo) Android app for Opsora PG/hostel management SaaS.

**Architecture:** New `apps/mobile` Expo workspace in the existing Turborepo. Consumes the existing Fastify API with JWT auth. Three role-based navigation stacks (owner, tenant, staff).

**Tech Stack:** Expo SDK 52, expo-router (file-based), Axios, @tanstack/react-query, expo-secure-store, react-native-chart-kit

## Global Constraints

- Add `apps/mobile` under existing Turborepo workspace (already supports `apps/*`)
- Do NOT modify `apps/api` or `apps/web` — the mobile app consumes the existing API
- All API calls target the same endpoints the web app uses
- JWT stored in `expo-secure-store` (not AsyncStorage)
- Types mirror `apps/web/src/lib/types.ts` and `apps/web/src/lib/api.ts`
- All text in English

---

### Task 1: Expo Project Scaffolding

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/app/_layout.tsx`
- Modify: root `.gitignore` (add mobile expo entries)

**Interfaces:**
- Produces: Runnable Expo project with expo-router, empty root layout, and turborepo integration

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@opsora/mobile",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "dev": "expo start",
    "lint": "eslint ."
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-secure-store": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "expo-image-picker": "~16.0.0",
    "expo-local-authentication": "~14.0.0",
    "expo-haptics": "~14.0.0",
    "expo-constants": "~17.0.0",
    "expo-status-bar": "~2.0.0",
    "expo-linking": "~7.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.0.0",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.0",
    "@react-native-async-storage/async-storage": "1.23.1",
    "react-native-chart-kit": "^6.12.0",
    "react-native-svg": "^15.0.0",
    "date-fns": "^3.6.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.0",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create app.json**

```json
{
  "expo": {
    "name": "Opsora",
    "slug": "opsora",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "opsora",
    "userInterfaceStyle": "light",
    "splash": { "backgroundColor": "#ffffff" },
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.opsora.app" },
    "android": {
      "adaptiveIcon": { "backgroundColor": "#ffffff" },
      "package": "com.opsora.app",
      "permissions": ["CAMERA", "INTERNET"]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      "expo-notifications",
      "expo-image-picker"
    ]
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 4: Create babel.config.js**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Create root layout `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/services/auth';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 6: Create assets directory and .gitignore entry**

```bash
mkdir -p apps/mobile/assets
```

Add to root `.gitignore`:
```
# Expo
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
```

- [ ] **Step 7: Install dependencies**

```bash
cd apps/mobile && npm install
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): scaffold Expo project with expo-router"
```

---

### Task 2: Types, API Client & Auth Service

**Files:**
- Create: `apps/mobile/src/types/index.ts`
- Create: `apps/mobile/src/services/api.ts`
- Create: `apps/mobile/src/services/auth.tsx`
- Create: `apps/mobile/src/services/websocket.ts`
- Create: `apps/mobile/src/lib/utils.ts`

**Interfaces:**
- Produces: `api.get/post/put/patch/del<T>()`, `useAuth()`, `AuthProvider`, `WebSocketClient`
- Consumed by: All screen components

- [ ] **Step 1: Create types file**

```typescript
// src/types/index.ts
export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'staff' | 'resident';
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface Property {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  propertyType: string;
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  status: string;
}

export interface Floor {
  id: string;
  propertyId: string;
  floorNumber: number;
  floorName?: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
}

export interface Room {
  id: string;
  propertyId: string;
  floorId: string;
  roomNumber: string;
  roomType: string;
  sharingType: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  depositAmount: number;
  status: string;
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: string;
  bedType: string;
  status: string;
  rentAmount: number;
}

export interface TenantProfile {
  id: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  occupation?: string;
  companyName?: string;
  moveInDate: string;
  moveOutDate?: string;
  rentAmount: number;
  depositPaid: number;
  status: string;
  roomNumber?: string;
  floorNumber?: number;
}

export interface RentPayment {
  id: string;
  propertyId: string;
  tenantProfileId: string;
  monthYear: string;
  dueDate: string;
  paidDate?: string;
  rentAmount: number;
  electricityCharge: number;
  waterCharge: number;
  foodCharge: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  tenantName?: string;
  roomNumber?: string;
}

export interface Complaint {
  id: string;
  propertyId: string;
  ticketNumber: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  tenantName?: string;
  roomNumber?: string;
}

export interface DashboardOverview {
  totalProperties: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  totalRevenue: number;
  pendingPayments: number;
  activeComplaints: number;
  totalResidents: number;
  recentActivity: ActivityLog[];
  occupancyTrend: { month: string; occupied: number; vacant: number }[];
  revenueTrend: { month: string; revenue: number }[];
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  actorName: string;
  createdAt: string;
}

export interface WaterReading {
  id: string;
  tankId: string;
  levelPercentage: number;
  levelLiters: number;
  consumptionLiters: number;
  timestamp: string;
}

export interface ElectricityReading {
  id: string;
  meterId: string;
  powerKw: number;
  totalKwh: number;
  dailyKwh: number;
  estimatedCost: number;
  timestamp: string;
}

export interface FoodMenu {
  id: string;
  propertyId: string;
  date: string;
  mealType: string;
  items: string[];
  isSpecial: boolean;
}

export interface StaffMember {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  salary?: number;
  isActive: boolean;
  joinedDate: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}
```

- [ ] **Step 2: Create API client**

```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001';

const api: AxiosInstance = axios.create({
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
```

- [ ] **Step 3: Create Auth context**

```tsx
// src/services/auth.tsx
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ role: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const token = await SecureStore.getItemAsync('opsora_token');
      if (token) {
        try {
          const res = await api.get<{ data: User }>('/auth/me');
          setUser(res.data.data || res.data);
        } catch {
          await SecureStore.deleteItemAsync('opsora_token');
          await SecureStore.deleteItemAsync('opsora_role');
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    await SecureStore.setItemAsync('opsora_token', res.data.token);
    await SecureStore.setItemAsync('opsora_role', res.data.user.role);
    setUser(res.data.user);
    return { role: res.data.user.role };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    await SecureStore.deleteItemAsync('opsora_token');
    await SecureStore.deleteItemAsync('opsora_role');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

- [ ] **Step 4: Create WebSocket service**

```typescript
// src/services/websocket.ts
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api';

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, MessageHandler[]>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  async connect() {
    const token = await SecureStore.getItemAsync('opsora_token');
    if (!token) return;

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl, [], { headers: { Authorization: `Bearer ${token}` } } as any);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handlers = this.handlers.get(data.type) || [];
        handlers.forEach((fn) => fn(data.data));
      } catch {}
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 2000 * this.reconnectAttempts);
      }
    };
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  on(event: string, handler: MessageHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event)!.push(handler);
  }

  off(event: string, handler: MessageHandler) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      this.handlers.set(event, handlers.filter((h) => h !== handler));
    }
  }
}

export const wsClient = new WebSocketClient();
```

- [ ] **Step 5: Create utils**

```typescript
// src/lib/utils.ts
export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#22c55e',
    pending: '#eab308',
    paid: '#22c55e',
    overdue: '#ef4444',
    vacant: '#6b7280',
    occupied: '#3b82f6',
    open: '#f97316',
    resolved: '#22c55e',
    closed: '#6b7280',
  };
  return colors[status.toLowerCase()] || '#6b7280';
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/
git commit -m "feat(mobile): add types, API client, auth, websocket, and utils"
```

---

### Task 3: Shared UI Components

**Files:**
- Create: `apps/mobile/src/components/Button.tsx`
- Create: `apps/mobile/src/components/Card.tsx`
- Create: `apps/mobile/src/components/Input.tsx`
- Create: `apps/mobile/src/components/Badge.tsx`
- Create: `apps/mobile/src/components/StatusBadge.tsx`
- Create: `apps/mobile/src/components/LoadingSkeleton.tsx`
- Create: `apps/mobile/src/components/EmptyState.tsx`
- Create: `apps/mobile/src/components/Header.tsx`
- Create: `apps/mobile/src/components/index.ts`

**Interfaces:**
- Produces: Reusable UI primitives consumed by all screen components

- [ ] **Step 1: Create Button component**

```tsx
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, type ViewStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: '#3b82f6' },
  secondary: { backgroundColor: '#6b7280' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#3b82f6' },
  danger: { backgroundColor: '#ef4444' },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineText: { color: '#3b82f6' },
});
```

- [ ] **Step 2: Create Card component**

```tsx
import { View, StyleSheet, type ViewStyle, type ReactNode } from 'react-native';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
});
```

- [ ] **Step 3: Create Input component**

```tsx
import { View, TextInput, Text, StyleSheet, type KeyboardTypeOptions } from 'react-native';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
}

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, error }: InputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, color: '#111827', backgroundColor: '#fff' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: '#ef4444' },
  error: { color: '#ef4444', fontSize: 12, marginTop: 4 },
});
```

- [ ] **Step 4: Create Badge and StatusBadge**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor } from '../lib/utils';

interface BadgeProps {
  label: string;
  color?: string;
}

export function Badge({ label, color = '#6b7280' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} color={getStatusColor(status)} />;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '500' },
});
```

- [ ] **Step 5: Create LoadingSkeleton and EmptyState**

```tsx
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export function LoadingSkeleton() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#3b82f6" />
    </View>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginTop: 12 },
  emptyMessage: { fontSize: 14, color: '#9ca3af', marginTop: 4, textAlign: 'center' },
});
```

- [ ] **Step 6: Create Header component**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: { icon: string; onPress: () => void };
}

export function Header({ title, showBack, rightAction }: HeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress}>
            <Text style={styles.actionText}>{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  left: { width: 40 },
  backButton: { padding: 4 },
  backText: { fontSize: 24, color: '#374151' },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center' },
  right: { width: 40, alignItems: 'flex-end' },
  actionText: { fontSize: 20, color: '#3b82f6' },
});
```

- [ ] **Step 7: Create barrel export**

```typescript
// src/components/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Badge, StatusBadge } from './Badge';
export { LoadingSkeleton, EmptyState } from './LoadingSkeleton';
export { Header } from './Header';
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/src/components/
git commit -m "feat(mobile): add shared UI components"
```

---

### Task 4: Login Screen & Auth Navigation

**Files:**
- Create: `apps/mobile/app/index.tsx`
- Create: `apps/mobile/app/login.tsx`
- Create: `apps/mobile/app/(owner)/_layout.tsx`
- Create: `apps/mobile/app/(tenant)/_layout.tsx`
- Create: `apps/mobile/app/(staff)/_layout.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

**Interfaces:**
- Produces: Login flow + role-based tab navigation layouts. Login route, owner/tenant/staff tab layouts.

- [ ] **Step 1: Create app entry point with auth redirect**

```tsx
// app/index.tsx
import { Redirect } from 'expo-router';
import { useAuth } from '../src/services/auth';
import { LoadingSkeleton } from '../src/components';

export default function Index() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingSkeleton />;
  if (!isAuthenticated) return <Redirect href="/login" />;

  if (user?.role === 'owner' || user?.role === 'admin') return <Redirect href="/(owner)/dashboard" />;
  if (user?.role === 'resident') return <Redirect href="/(tenant)/dashboard" />;
  if (user?.role === 'staff') return <Redirect href="/(staff)/dashboard" />;

  return <Redirect href="/login" />;
}
```

- [ ] **Step 2: Create login screen**

```tsx
// app/login.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input } from '../src/components';
import { useAuth } from '../src/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      const { role } = await login(email, password);
      if (role === 'owner' || role === 'admin') router.replace('/(owner)/dashboard');
      else if (role === 'resident') router.replace('/(tenant)/dashboard');
      else if (role === 'staff') router.replace('/(staff)/dashboard');
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.error || err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        <Text style={styles.title}>Opsora</Text>
        <Text style={styles.subtitle}>PG & Hostel Management</Text>
        <View style={styles.form}>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="admin@sunshinepg.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Password" value={password} onChangeText={setPassword} placeholder="Enter password" secureTextEntry />
          <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.button} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 48 },
  form: { marginTop: 16 },
  button: { marginTop: 8 },
});
```

- [ ] **Step 3: Update root _layout.tsx to use auth gate**

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/services/auth';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 4: Create Owner tab layout**

```tsx
// app/(owner)/_layout.tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function OwnerLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#3b82f6', tabBarInactiveTintColor: '#9ca3af', tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingBottom: 8, paddingTop: 8, height: 60 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '500' } }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="properties" options={{ title: 'Properties', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="residents" options={{ title: 'Residents', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text> }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text> }} />
    </Tabs>
  );
}
```

- [ ] **Step 5: Create Tenant tab layout**

```tsx
// app/(tenant)/_layout.tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TenantLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#3b82f6', tabBarInactiveTintColor: '#9ca3af', tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingBottom: 8, paddingTop: 8, height: 60 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '500' } }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text> }} />
      <Tabs.Screen name="payments" options={{ title: 'Payments', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💰</Text> }} />
      <Tabs.Screen name="food" options={{ title: 'Food', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🍽️</Text> }} />
      <Tabs.Screen name="complaints" options={{ title: 'Complaints', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎫</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Create Staff tab layout**

```tsx
// app/(staff)/_layout.tsx
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function StaffLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#3b82f6', tabBarInactiveTintColor: '#9ca3af', tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingBottom: 8, paddingTop: 8, height: 60 }, tabBarLabelStyle: { fontSize: 11, fontWeight: '500' } }}>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📊</Text> }} />
      <Tabs.Screen name="residents" options={{ title: 'Residents', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👥</Text> }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>✅</Text> }} />
      <Tabs.Screen name="complaints" options={{ title: 'Complaints', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎫</Text> }} />
    </Tabs>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/
git commit -m "feat(mobile): add login screen and role-based tab navigation"
```

---

### Task 5: Owner Dashboard & Properties Screens

**Files:**
- Create: `apps/mobile/app/(owner)/dashboard.tsx`
- Create: `apps/mobile/app/(owner)/properties.tsx`
- Create: `apps/mobile/app/(owner)/properties/[id].tsx`
- Create: `apps/mobile/app/(owner)/residents.tsx`
- Create: `apps/mobile/app/(owner)/residents/[id].tsx`
- Create: `apps/mobile/app/(owner)/payments.tsx`
- Create: `apps/mobile/app/(owner)/complaints.tsx`
- Create: `apps/mobile/app/(owner)/more.tsx`

- [ ] **Step 1: Owner Dashboard**

```tsx
// app/(owner)/dashboard.tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency } from '../../src/lib/utils';
import type { DashboardOverview } from '../../src/types';

export default function OwnerDashboard() {
  const { data, isLoading, refetch } = useQuery<DashboardOverview>({
    queryKey: ['owner-dashboard'],
    queryFn: () => api.get('/dashboard/overview').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Dashboard</Text>

      <View style={styles.metricsRow}>
        <MetricCard label="Occupancy" value={`${data?.occupancyRate || 0}%`} color="#3b82f6" />
        <MetricCard label="Revenue" value={formatCurrency(data?.totalRevenue || 0)} color="#22c55e" />
        <MetricCard label="Pending" value={`₹${data?.pendingPayments || 0}`} color="#eab308" />
        <MetricCard label="Complaints" value={`${data?.activeComplaints || 0}`} color="#ef4444" />
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Properties</Text>
          <Text style={styles.statValue}>{data?.totalProperties || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Beds</Text>
          <Text style={styles.statValue}>{data?.totalBeds || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Occupied Beds</Text>
          <Text style={styles.statValue}>{data?.occupiedBeds || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Vacant Beds</Text>
          <Text style={styles.statValue}>{data?.vacantBeds || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Residents</Text>
          <Text style={styles.statValue}>{data?.totalResidents || 0}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metricCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderTopWidth: 3, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statLabel: { fontSize: 14, color: '#6b7280' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
```

- [ ] **Step 2: Properties List**

```tsx
// app/(owner)/properties.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import type { Property } from '../../src/types';

export default function PropertiesList() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { data: properties, isLoading, refetch } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (properties || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Properties</Text>
      <TextInput style={styles.search} placeholder="Search properties..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />

      {filtered.length === 0 ? (
        <EmptyState title="No properties found" message="Add a property to get started" />
      ) : (
        filtered.map((property) => (
          <TouchableOpacity key={property.id} onPress={() => router.push(`/(owner)/properties/${property.id}`)}>
            <Card style={styles.propertyCard}>
              <Text style={styles.propertyName}>{property.name}</Text>
              <Text style={styles.propertyAddress}>{property.city}, {property.state}</Text>
              <View style={styles.propertyStats}>
                <Stat label="Rooms" value={property.totalRooms} />
                <Stat label="Beds" value={property.totalBeds} />
                <Stat label="Occupied" value={property.occupiedBeds} color="#22c55e" />
                <Stat label="Vacant" value={property.vacantBeds} color={property.vacantBeds > 0 ? '#eab308' : '#6b7280'} />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  propertyCard: { marginBottom: 12 },
  propertyName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  propertyAddress: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  propertyStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
});
```

- [ ] **Step 3: Property Detail**

```tsx
// app/(owner)/properties/[id].tsx
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, LoadingSkeleton } from '../../../src/components';
import { api } from '../../../src/services/api';
import type { Floor, Room } from '../../../src/types';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: property } = useQuery({
    queryKey: ['property', id],
    queryFn: () => api.get(`/properties/${id}`).then(r => r.data || r),
  });

  const { data: floors } = useQuery<Floor[]>({
    queryKey: ['floors', id],
    queryFn: () => api.get(`/properties/${id}/floors`).then(r => r.data || r),
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ['rooms', id],
    queryFn: () => api.get(`/properties/${id}/rooms`).then(r => r.data || r),
  });

  if (!property) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.detailCard}>
        <Text style={styles.name}>{property.name}</Text>
        <Text style={styles.address}>{property.address}</Text>
        <View style={styles.infoRow}>
          <InfoItem label="Type" value={property.propertyType} />
          <InfoItem label="Floors" value={property.totalFloors} />
          <InfoItem label="Status" value={property.status} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Floors</Text>
      {floors?.map((floor) => (
        <Card key={floor.id} style={styles.floorCard}>
          <Text style={styles.floorName}>Floor {floor.floorNumber}{floor.floorName ? ` - ${floor.floorName}` : ''}</Text>
          <View style={styles.floorStats}>
            <InfoItem label="Rooms" value={floor.totalRooms} />
            <InfoItem label="Beds" value={floor.totalBeds} />
            <InfoItem label="Occupied" value={floor.occupiedBeds} />
          </View>
        </Card>
      ))}

      <Text style={styles.sectionTitle}>Rooms</Text>
      {rooms?.map((room) => (
        <Card key={room.id} style={styles.roomCard}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
            <Text style={[styles.roomStatus, { color: room.status === 'available' ? '#22c55e' : '#6b7280' }]}>{room.status}</Text>
          </View>
          <View style={styles.roomStats}>
            <InfoItem label="Type" value={room.roomType} />
            <InfoItem label="Sharing" value={`${room.sharingType}`} />
            <InfoItem label="Occupied" value={`${room.occupiedBeds}/${room.totalBeds}`} />
            <InfoItem label="Rent" value={`₹${room.rentPerBed}`} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  detailCard: { marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '800', color: '#111827' },
  address: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#9ca3af' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 12 },
  floorCard: { marginBottom: 8 },
  floorName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  floorStats: { flexDirection: 'row', justifyContent: 'space-around' },
  roomCard: { marginBottom: 8 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNumber: { fontSize: 16, fontWeight: '600' },
  roomStatus: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  roomStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
```

- [ ] **Step 4: Residents List**

```tsx
// app/(owner)/residents.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { TenantProfile } from '../../src/types';

export default function ResidentsList() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { data: residents, isLoading, refetch } = useQuery<TenantProfile[]>({
    queryKey: ['residents'],
    queryFn: () => api.get('/residents').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (residents || []).filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.roomNumber?.includes(search)
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Residents</Text>
      <TextInput style={styles.search} placeholder="Search by name, phone, or room..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />

      {filtered.length === 0 ? (
        <EmptyState title="No residents found" />
      ) : (
        filtered.map((resident) => (
          <TouchableOpacity key={resident.id} onPress={() => router.push(`/(owner)/residents/${resident.id}`)}>
            <Card style={styles.residentCard}>
              <View style={styles.residentHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{resident.fullName.charAt(0)}</Text>
                </View>
                <View style={styles.residentInfo}>
                  <Text style={styles.residentName}>{resident.fullName}</Text>
                  <Text style={styles.residentDetail}>{resident.phone} · Room {resident.roomNumber}</Text>
                </View>
                <StatusBadge status={resident.status} />
              </View>
              <View style={styles.residentFooter}>
                <Text style={styles.footerText}>Move in: {formatDate(resident.moveInDate)}</Text>
                <Text style={styles.footerText}>Rent: ₹{resident.rentAmount}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  residentCard: { marginBottom: 10 },
  residentHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  residentDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  residentFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  footerText: { fontSize: 12, color: '#9ca3af' },
});
```

- [ ] **Step 5: Payments List**

```tsx
// app/(owner)/payments.tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import type { RentPayment } from '../../src/types';

export default function PaymentsList() {
  const { data: payments, isLoading, refetch } = useQuery<RentPayment[]>({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Payments</Text>

      {(!payments || payments.length === 0) ? (
        <EmptyState title="No payments yet" />
      ) : (
        payments.map((payment) => (
          <Card key={payment.id} style={styles.paymentCard}>
            <View style={styles.header}>
              <View>
                <Text style={styles.tenantName}>{payment.tenantName || 'N/A'}</Text>
                <Text style={styles.monthYear}>{payment.monthYear}</Text>
              </View>
              <StatusBadge status={payment.paymentStatus} />
            </View>
            <View style={styles.amountRow}>
              <View>
                <Text style={styles.amountLabel}>Total</Text>
                <Text style={styles.amount}>{formatCurrency(payment.totalAmount)}</Text>
              </View>
              <View>
                <Text style={styles.amountLabel}>Paid</Text>
                <Text style={[styles.amount, { color: '#22c55e' }]}>{formatCurrency(payment.paidAmount)}</Text>
              </View>
              <View>
                <Text style={styles.amountLabel}>Balance</Text>
                <Text style={[styles.amount, { color: payment.balanceAmount > 0 ? '#ef4444' : '#22c55e' }]}>{formatCurrency(payment.balanceAmount)}</Text>
              </View>
            </View>
            <Text style={styles.dueDate}>Due: {formatDate(payment.dueDate)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  paymentCard: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tenantName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  monthYear: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 11, color: '#9ca3af' },
  amount: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 2 },
  dueDate: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
});
```

- [ ] **Step 6: Complaints List**

```tsx
// app/(owner)/complaints.tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

export default function ComplaintsList() {
  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['complaints'],
    queryFn: () => api.get('/complaints').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Complaints</Text>

      {(!complaints || complaints.length === 0) ? (
        <EmptyState title="No complaints" message="All clear!" />
      ) : (
        complaints.map((complaint) => (
          <Card key={complaint.id} style={styles.card}>
            <View style={styles.header}>
              <StatusBadge status={complaint.status} />
              <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
            </View>
            <Text style={styles.title}>{complaint.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{complaint.description}</Text>
            <View style={styles.footer}>
              <Text style={styles.meta}>{complaint.category}</Text>
              <Text style={styles.meta}>{formatDate(complaint.createdAt)}</Text>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  description: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  meta: { fontSize: 12, color: '#9ca3af' },
});
```

- [ ] **Step 7: More Screen**

```tsx
// app/(owner)/more.tsx
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../src/components';
import { useAuth } from '../../src/services/auth';

export default function MoreScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.pageTitle}>More</Text>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'O'}</Text>
        </View>
        <Text style={styles.userName}>{user?.fullName || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
      </Card>

      <Card style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} onPress={() => {}}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </Card>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const menuItems = [
  { icon: '📁', label: 'Archive' },
  { icon: '🔔', label: 'Notifications' },
  { icon: '👥', label: 'Staff Portal' },
  { icon: '⚙️', label: 'Settings' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  profileCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  userName: { fontSize: 20, fontWeight: '700', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 2 },
  userRole: { fontSize: 12, color: '#3b82f6', fontWeight: '600', marginTop: 4 },
  menuCard: { marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuText: { fontSize: 16, color: '#374151' },
  logoutButton: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#ef4444' },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 8: Commit**

```bash
git add apps/mobile/app/(owner)/
git commit -m "feat(mobile): add owner screens - dashboard, properties, residents, payments, complaints, more"
```

---

### Task 6: Tenant Portal Screens

**Files:**
- Create: `apps/mobile/app/(tenant)/dashboard.tsx`
- Create: `apps/mobile/app/(tenant)/payments.tsx`
- Create: `apps/mobile/app/(tenant)/food.tsx`
- Create: `apps/mobile/app/(tenant)/complaints.tsx`
- Create: `apps/mobile/app/(tenant)/profile.tsx`

- [ ] **Step 1: Tenant Dashboard**

```tsx
// app/(tenant)/dashboard.tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';

export default function TenantDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['tenant-dashboard'],
    queryFn: () => api.get('/tenant/dashboard').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.greeting}>Good Morning!</Text>

      <Card style={styles.rentCard}>
        <Text style={styles.cardTitle}>Rent Due</Text>
        <Text style={styles.rentAmount}>{formatCurrency(data?.rentDue?.amount || 0)}</Text>
        <Text style={styles.dueDate}>Due: {formatDate(data?.rentDue?.dueDate || '')}</Text>
      </Card>

      <View style={styles.row}>
        <Card style={[styles.smallCard, { flex: 1, marginRight: 4 }]}>
          <Text style={styles.cardTitle}>Water Level</Text>
          <Text style={[styles.percentage, { color: (data?.waterLevel || 0) > 20 ? '#3b82f6' : '#ef4444' }]}>
            {data?.waterLevel || 0}%
          </Text>
        </Card>
        <Card style={[styles.smallCard, { flex: 1, marginLeft: 4 }]}>
          <Text style={styles.cardTitle}>Today's Menu</Text>
          <Text style={styles.menuText}>{data?.todayMenu || 'Not set'}</Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 20 },
  rentCard: { marginBottom: 12 },
  cardTitle: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  rentAmount: { fontSize: 36, fontWeight: '800', color: '#111827', marginTop: 8 },
  dueDate: { fontSize: 13, color: '#ef4444', marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 12 },
  smallCard: { padding: 16 },
  percentage: { fontSize: 32, fontWeight: '800', marginTop: 8 },
  menuText: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 8 },
});
```

- [ ] **Step 2: Tenant Payments**

```tsx
// app/(tenant)/payments.tsx
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import type { RentPayment } from '../../src/types';

export default function TenantPayments() {
  const { data: payments, isLoading, refetch } = useQuery<RentPayment[]>({
    queryKey: ['tenant-payments'],
    queryFn: () => api.get('/tenant/payments').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>My Payments</Text>

      {(!payments || payments.length === 0) ? (
        <EmptyState title="No payments" />
      ) : (
        payments.map((payment) => (
          <Card key={payment.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.month}>{payment.monthYear}</Text>
              <StatusBadge status={payment.paymentStatus} />
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.totalAmount}>{formatCurrency(payment.totalAmount)}</Text>
              <Text style={styles.statusText}>Paid: {formatCurrency(payment.paidAmount)}</Text>
            </View>
            <Text style={styles.due}>Due: {formatDate(payment.dueDate)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  month: { fontSize: 18, fontWeight: '700', color: '#111827' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statusText: { fontSize: 13, color: '#6b7280' },
  due: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
```

- [ ] **Step 3: Tenant Food**

```tsx
// app/(tenant)/food.tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import type { FoodMenu } from '../../src/types';

export default function TenantFood() {
  const { data, isLoading, refetch } = useQuery<FoodMenu[]>({
    queryKey: ['tenant-food'],
    queryFn: () => api.get('/tenant/food').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Today's Menu</Text>

      {(!data || data.length === 0) ? (
        <EmptyState title="No menu for today" />
      ) : (
        data.map((menu) => (
          <Card key={menu.id} style={styles.card}>
            <Text style={styles.mealType}>{menu.mealType.toUpperCase()}</Text>
            {menu.isSpecial && <Text style={styles.special}>✨ Special: {menu.items[0]}</Text>}
            {menu.items.map((item, i) => (
              <Text key={i} style={styles.item}>• {item}</Text>
            ))}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 12 },
  mealType: { fontSize: 16, fontWeight: '700', color: '#3b82f6', marginBottom: 8 },
  special: { fontSize: 14, fontWeight: '600', color: '#eab308', marginBottom: 4 },
  item: { fontSize: 14, color: '#374151', marginBottom: 2 },
});
```

- [ ] **Step 4: Tenant Complaints**

```tsx
// app/(tenant)/complaints.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge, Button } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

export default function TenantComplaints() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const queryClient = useQueryClient();

  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['tenant-complaints'],
    queryFn: () => api.get('/tenant/complaints').then(r => r.data || r),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/complaints', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-complaints'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      Alert.alert('Success', 'Complaint submitted');
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.error || 'Failed to submit'),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Complaints</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={styles.form}>
          <Text style={styles.formTitle}>New Complaint</Text>
          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} placeholderTextColor="#9ca3af" />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the issue..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#9ca3af" />
          <Button title="Submit" onPress={() => createMutation.mutate({ title, description, category })} loading={createMutation.isPending} />
        </Card>
      )}

      {(!complaints || complaints.length === 0) ? (
        <EmptyState title="No complaints" message="Submit your first complaint" />
      ) : (
        complaints.map((complaint) => (
          <Card key={complaint.id} style={styles.card}>
            <View style={styles.complaintHeader}>
              <StatusBadge status={complaint.status} />
              <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
            </View>
            <Text style={styles.complaintTitle}>{complaint.title}</Text>
            <Text style={styles.complaintDesc} numberOfLines={2}>{complaint.description}</Text>
            <Text style={styles.date}>{formatDate(complaint.createdAt)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  addButton: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  form: { marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12, color: '#111827' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  card: { marginBottom: 10 },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af' },
  complaintTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  complaintDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  date: { fontSize: 12, color: '#9ca3af' },
});
```

- [ ] **Step 5: Tenant Profile**

```tsx
// app/(tenant)/profile.tsx
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import { useAuth } from '../../src/services/auth';

export default function TenantProfile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.get('/tenant/profile').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.fullName?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName || user?.fullName}</Text>
        <Text style={styles.email}>{profile?.email || user?.email}</Text>
      </Card>

      <Card style={styles.detailsCard}>
        <DetailRow label="Phone" value={profile?.phone} />
        <DetailRow label="Room" value={profile?.roomNumber} />
        <DetailRow label="Move In" value={profile?.moveInDate ? formatDate(profile.moveInDate) : ''} />
        <DetailRow label="Rent" value={profile?.rentAmount ? `₹${profile.rentAmount}` : ''} />
        <DetailRow label="Deposit Paid" value={profile?.depositPaid ? `₹${profile.depositPaid}` : ''} />
        <DetailRow label="Status" value={profile?.status} />
      </Card>
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  profileCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  detailsCard: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/(tenant)/
git commit -m "feat(mobile): add tenant screens - dashboard, payments, food, complaints, profile"
```

---

### Task 7: Staff Portal Screens

**Files:**
- Create: `apps/mobile/app/(staff)/dashboard.tsx`
- Create: `apps/mobile/app/(staff)/residents.tsx`
- Create: `apps/mobile/app/(staff)/tasks.tsx`
- Create: `apps/mobile/app/(staff)/complaints.tsx`

- [ ] **Step 1: Staff Dashboard**

```tsx
// app/(staff)/dashboard.tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';

export default function StaffDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff-dashboard'],
    queryFn: () => api.get('/staff-portal/dashboard').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Staff Dashboard</Text>
      <View style={styles.metricsRow}>
        <MetricBox label="Tasks Today" value={data?.tasksToday || 0} color="#3b82f6" />
        <MetricBox label="Pending" value={data?.pendingTasks || 0} color="#eab308" />
        <MetricBox label="Complaints" value={data?.openComplaints || 0} color="#ef4444" />
        <MetricBox label="Completed" value={data?.completedToday || 0} color="#22c55e" />
      </View>
    </ScrollView>
  );
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.metric, { borderTopColor: color }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderTopWidth: 3, flex: 1, minWidth: '45%', alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
```

- [ ] **Step 2: Staff Residents**

```tsx
// app/(staff)/residents.tsx
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import type { TenantProfile } from '../../src/types';

export default function StaffResidents() {
  const [search, setSearch] = useState('');
  const { data: residents, isLoading, refetch } = useQuery<TenantProfile[]>({
    queryKey: ['staff-residents'],
    queryFn: () => api.get('/staff-portal/residents').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (residents || []).filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.roomNumber?.includes(search)
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Residents</Text>
      <TextInput style={styles.search} placeholder="Search..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />
      {filtered.length === 0 ? (
        <EmptyState title="No residents found" />
      ) : (
        filtered.map((r) => (
          <Card key={r.id} style={styles.card}>
            <Text style={styles.name}>{r.fullName}</Text>
            <Text style={styles.detail}>Room {r.roomNumber} · {r.phone}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  card: { marginBottom: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  detail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
```

- [ ] **Step 3: Staff Tasks**

```tsx
// app/(staff)/tasks.tsx
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';

export default function StaffTasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['staff-tasks'],
    queryFn: () => api.get('/staff-portal/tasks').then(r => r.data || r),
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.patch(`/staff-portal/tasks/${taskId}`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      Alert.alert('Done!', 'Task marked as completed');
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>My Tasks</Text>
      {(!tasks || tasks.length === 0) ? (
        <EmptyState title="No tasks assigned" />
      ) : (
        tasks.map((task: any) => (
          <Card key={task.id} style={styles.card}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <StatusBadge status={task.status} />
            </View>
            {task.description && <Text style={styles.taskDesc}>{task.description}</Text>}
            {task.status !== 'completed' && (
              <TouchableOpacity style={styles.completeButton} onPress={() => completeMutation.mutate(task.id)}>
                <Text style={styles.completeText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  taskDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  completeButton: { backgroundColor: '#22c55e', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 4: Staff Complaints**

```tsx
// app/(staff)/complaints.tsx
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

export default function StaffComplaints() {
  const queryClient = useQueryClient();
  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['staff-complaints'],
    queryFn: () => api.get('/staff-portal/complaints').then(r => r.data || r),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/complaints/${id}`, { status: 'resolved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-complaints'] });
      Alert.alert('Resolved', 'Complaint marked as resolved');
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Complaints</Text>
      {(!complaints || complaints.length === 0) ? (
        <EmptyState title="No complaints" />
      ) : (
        complaints.map((c) => (
          <Card key={c.id} style={styles.card}>
            <View style={styles.header}>
              <StatusBadge status={c.status} />
              <Text style={styles.ticket}>#{c.ticketNumber}</Text>
            </View>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>{c.description}</Text>
            <Text style={styles.meta}>{c.category} · {formatDate(c.createdAt)}</Text>
            {c.status === 'open' && (
              <TouchableOpacity style={styles.resolveButton} onPress={() => resolveMutation.mutate(c.id)}>
                <Text style={styles.resolveText}>Mark Resolved</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  desc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  meta: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  resolveButton: { backgroundColor: '#22c55e', borderRadius: 8, padding: 10, alignItems: 'center' },
  resolveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(staff)/
git commit -m "feat(mobile): add staff screens - dashboard, residents, tasks, complaints"
```
