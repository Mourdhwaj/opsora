# Firebase Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Opsora from Fastify + SQLite to Firebase (Firestore, Auth, Cloud Functions, Storage) + Vercel, staying within Firebase free tier.

**Architecture:** Firebase Auth for authentication, Firestore for database (6 collections, denormalized), Cloud Functions for mobile API, Next.js API routes for web, Firebase Storage for files, FCM for push notifications, Firebase Analytics for tracking.

**Tech Stack:** Firebase JS SDK, Expo SDK 54, Next.js 16, React Native, TypeScript, Vercel

## Global Constraints

- Firebase Spark plan (free tier): 50K reads/day, 20K writes/day, 2M function invocations/month
- Email/password auth only (no phone OTP)
- Expo SDK 54, React Native 0.81
- Next.js 16 App Router
- No `react-native-reanimated` (TurboModule not linked)
- TypeScript strict mode
- All paths relative (no path aliases in mobile)

---

## Phase 1: Firebase Project Setup

### Task 1: Create Firebase Project & Install Dependencies

**Files:**
- Create: `apps/mobile/firebase.ts`
- Create: `apps/web/src/lib/firebase.ts`
- Create: `firebase.json`
- Create: `.firebaserc`
- Modify: `apps/mobile/package.json`
- Modify: `apps/web/package.json`

**Interfaces:**
- Produces: `firebaseApp` (initialized Firebase app) for both mobile and web

- [ ] **Step 1: Create Firebase project via CLI**

```bash
firebase login
firebase projects:create opsora --display-name "Opsora"
firebase use opsora
```

- [ ] **Step 2: Initialize Firebase config files**

Create `firebase.json` at repo root:
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "apps/api/functions",
    "runtime": "nodejs18",
    "ignore": ["node_modules", ".git"]
  },
  "hosting": {
    "public": "apps/web/.next",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

Create `.firebaserc`:
```json
{
  "projects": {
    "default": "opsora"
  }
}
```

- [ ] **Step 3: Enable Firebase services**

```bash
firebase firestore:databases:create --database-name="(default)"
firebase auth:export --format=json /dev/null  # enables Auth
```

Or enable via Firebase Console: Auth, Firestore, Storage, Functions, Cloud Messaging, Analytics

- [ ] **Step 4: Install Firebase SDK in Expo mobile**

```bash
cd apps/mobile
npx expo install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage @react-native-firebase/messaging @react-native-firebase/analytics
```

- [ ] **Step 5: Install Firebase SDK in Next.js web**

```bash
cd apps/web
npm install firebase firebase-admin
```

- [ ] **Step 6: Create Firebase init for mobile**

Create `apps/mobile/firebase.ts`:
```typescript
import { initializeApp } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export { app, auth, firestore, storage, messaging, analytics };
export default app;
```

- [ ] **Step 7: Create Firebase init for web**

Create `apps/web/src/lib/firebase.ts`:
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
```

- [ ] **Step 8: Add Firebase env vars**

Add to `apps/mobile/.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=opsora.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=opsora
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=opsora.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Add to `apps/web/.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=opsora.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=opsora
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=opsora.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

- [ ] **Step 9: Commit**

```bash
git add firebase.json .firebaserc apps/mobile/firebase.ts apps/web/src/lib/firebase.ts
git commit -m "chore: initialize Firebase project and SDK for mobile + web"
```

---

## Phase 2: Auth Migration

### Task 2: Firebase Auth — Login Screens

**Files:**
- Modify: `apps/mobile/app/login.tsx`
- Modify: `apps/mobile/src/services/auth.tsx`
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/lib/auth-context.tsx`
- Create: `apps/web/src/middleware.ts` (if not exists)

**Interfaces:**
- Consumes: `auth` from `firebase.ts` (both platforms)
- Produces: `login(email, password)` returns `User`, `logout()`, `user` state

- [ ] **Step 1: Rewrite mobile auth service**

Replace `apps/mobile/src/services/auth.tsx`:
```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        await SecureStore.setItemAsync('opsora_token', token);

        const userDoc = await firestore()
          .collection('tenants')
          .doc('default') // Will be replaced with actual tenantId from custom claims
          .collection('people')
          .doc(firebaseUser.uid)
          .get();

        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
        }
      } else {
        await SecureStore.deleteItemAsync('opsora_token');
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const result = await auth().signInWithEmailAndPassword(email, password);
    const token = await result.user.getIdToken();
    await SecureStore.setItemAsync('opsora_token', token);
  };

  const logout = async () => {
    await auth().signOut();
    await SecureStore.deleteItemAsync('opsora_token');
    await SecureStore.deleteItemAsync('opsora_role');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

- [ ] **Step 2: Update mobile login screen**

Modify `apps/mobile/app/login.tsx` — replace the API call with `useAuth().login()`:
```typescript
// The login screen should now call useAuth().login(email, password)
// instead of POST /auth/login
// The AuthProvider handles token storage and user state
```

- [ ] **Step 3: Rewrite web auth context**

Replace `apps/web/src/lib/auth-context.tsx` with Firebase Auth SDK:
```typescript
'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'tenants', 'default', 'people', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

- [ ] **Step 4: Update web login page**

Modify `apps/web/src/app/login/page.tsx` to use `useAuth().login()` instead of fetch to `/auth/login`.

- [ ] **Step 5: Update API client interceptor (mobile)**

Replace `apps/mobile/src/services/api.ts` — remove the old axios interceptors, use Firebase token:
```typescript
import axios from 'axios';
import auth from '@react-native-firebase/auth';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return 'http://localhost:3001';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const currentUser = auth().currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      auth().signOut();
    }
    return Promise.reject(error);
  }
);

export { api };
```

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/src/services/auth.tsx apps/mobile/app/login.tsx apps/web/src/lib/auth-context.tsx apps/web/src/app/login/page.tsx apps/mobile/src/services/api.ts
git commit -m "feat: migrate auth to Firebase Auth (email/password)"
```

---

### Task 3: Firebase Auth — Seed Users

**Files:**
- Create: `scripts/seed-firebase-auth.ts`

**Interfaces:**
- Consumes: Firebase Admin SDK
- Produces: Firebase Auth users + Firestore people documents

- [ ] **Step 1: Create seed script**

Create `scripts/seed-firebase-auth.ts`:
```typescript
import * as admin from 'firebase-admin';

admin.initializeApp({
  projectId: 'opsora',
});

const db = admin.firestore();
const auth = admin.auth();

const users = [
  { email: 'admin@sunshinepg.com', password: 'password123', fullName: 'Admin User', role: 'owner', tenantId: 'tenant-sunshine' },
  { email: 'staff@sunshinepg.com', password: 'password123', fullName: 'Staff User', role: 'staff', tenantId: 'tenant-sunshine' },
  { email: 'resident@sunshinepg.com', password: 'password123', fullName: 'Resident User', role: 'resident', tenantId: 'tenant-sunshine' },
];

async function seed() {
  for (const user of users) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.fullName,
      });

      await db.collection('tenants').doc(user.tenantId).collection('people').doc(userRecord.uid).set({
        id: userRecord.uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      });

      console.log(`Created: ${user.email} (${userRecord.uid})`);
    } catch (err: any) {
      console.log(`Skip ${user.email}: ${err.message}`);
    }
  }
}

seed().then(() => process.exit(0));
```

- [ ] **Step 2: Run seed**

```bash
npx tsx scripts/seed-firebase-auth.ts
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-firebase-auth.ts
git commit -m "chore: seed Firebase Auth users from SQLite data"
```

---

## Phase 3: Firestore Data Model

### Task 4: Firestore Security Rules

**Files:**
- Create: `firestore.rules`

**Interfaces:**
- Produces: Firestore security rules for all collections

- [ ] **Step 1: Write security rules**

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: check if user belongs to tenant
    function belongsToTenant(tenantId) {
      return isAuthenticated() && request.auth.token.tenantId == tenantId;
    }

    // Tenants
    match /tenants/{tenantId} {
      allow read: if belongsToTenant(tenantId);
      allow write: if false; // Admin only via Cloud Functions

      // Properties
      match /properties/{propertyId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if belongsToTenant(tenantId);
      }

      // People (users, residents, staff)
      match /people/{personId} {
        allow read: if belongsToTenant(tenantId);
        allow create: if belongsToTenant(tenantId);
        allow update: if belongsToTenant(tenantId);
        allow delete: if false;
      }

      // Financials (payments, invoices, receipts)
      match /financials/{docId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if belongsToTenant(tenantId);
      }

      // Operations (complaints, tasks, visitors)
      match /operations/{docId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if belongsToTenant(tenantId);
      }

      // IoT readings
      match /iot/{readingId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if false; // Only Cloud Functions write IoT data
      }

      // Food (polls, menus, attendance)
      match /food/{docId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if belongsToTenant(tenantId);
      }

      // Config
      match /config/{configId} {
        allow read: if belongsToTenant(tenantId);
        allow write: if false; // Admin only via Cloud Functions
      }
    }
  }
}
```

- [ ] **Step 2: Deploy rules**

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for all collections"
```

---

### Task 5: Firestore Indexes

**Files:**
- Create: `firestore.indexes.json`

- [ ] **Step 1: Define indexes**

Create `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "people",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "people",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "propertyId", "order": "ASCENDING" },
        { "fieldPath": "role", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "financials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "monthYear", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "financials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "personId", "order": "ASCENDING" },
        { "fieldPath": "monthYear", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "financials",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "paymentStatus", "order": "ASCENDING" },
        { "fieldPath": "monthYear", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "operations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "operations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "propertyId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "iot",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "propertyId", "order": "ASCENDING" },
        { "fieldPath": "time", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "food",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Deploy indexes**

```bash
firebase deploy --only firestore:indexes
```

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat: add Firestore composite indexes"
```

---

### Task 6: SQLite → Firestore Migration Script

**Files:**
- Create: `scripts/migrate-sqlite-to-firestore.ts`

**Interfaces:**
- Consumes: `apps/api/opsora.db` (SQLite, read-only)
- Produces: Firestore documents in all 6 collections

- [ ] **Step 1: Create migration script**

Create `scripts/migrate-sqlite-to-firestore.ts`:
```typescript
import Database from 'better-sqlite3';
import * as admin from 'firebase-admin';
import { v4 as uuid } from 'uuid';

admin.initializeApp({ projectId: 'opsora' });
const db = admin.firestore();
const sqlite = new Database('apps/api/opsora.db', { readonly: true });

interface Tenant { id: string; name: string; slug: string; email: string; phone: string; address?: string; city?: string; state?: string; pincode?: string; gst_number?: string; plan_type?: string; max_properties?: number; max_beds?: number; is_active?: number; created_at?: string; updated_at?: string; }

async function migrateTenants() {
  const rows = sqlite.prepare('SELECT * FROM tenants').all() as Tenant[];
  console.log(`Migrating ${rows.length} tenants...`);

  for (const row of rows) {
    await db.collection('tenants').doc(row.id).set({
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      phone: row.phone,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode || null,
      gstNumber: row.gst_number || null,
      planType: row.plan_type || 'free',
      maxProperties: row.max_properties || 1,
      maxBeds: row.max_beds || 50,
      isActive: row.is_active === 1,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    });
  }
}

async function migrateProperties(tenantId: string) {
  const properties = sqlite.prepare('SELECT * FROM properties WHERE tenant_id = ?').all(tenantId);

  for (const prop of properties) {
    // Get floors
    const floors = sqlite.prepare('SELECT * FROM floors WHERE property_id = ?').all(prop.id);

    // Get rooms with beds
    const rooms = sqlite.prepare('SELECT * FROM rooms WHERE property_id = ?').all(prop.id);
    const roomSummaries = [];

    for (const room of rooms) {
      const beds = sqlite.prepare('SELECT * FROM beds WHERE room_id = ?').all(room.id);
      const residents = sqlite.prepare(`
        SELECT tp.full_name FROM tenant_profiles tp
        WHERE tp.room_id = ? AND tp.status = 'active'
      `).all(room.id);

      roomSummaries.push({
        id: room.id,
        roomNumber: room.room_number,
        roomType: room.room_type,
        sharingType: room.sharing_type,
        rentPerBed: room.rent_per_bed,
        status: room.status,
        floorNumber: floors.find((f: any) => f.id === room.floor_id)?.floor_number || 0,
        beds: beds.map((bed: any, i: number) => ({
          id: bed.id,
          bedNumber: bed.bed_number,
          status: bed.status,
          rentAmount: bed.rent_amount,
          residentName: residents[i]?.full_name || null,
        })),
      });
    }

    const floorSummaries = floors.map((f: any) => ({
      id: f.id,
      floorNumber: f.floor_number,
      floorName: f.floor_name,
      roomCount: rooms.filter((r: any) => r.floor_id === f.id).length,
      occupiedCount: roomSummaries
        .filter(r => r.floorNumber === f.floor_number)
        .reduce((sum, r) => sum + r.beds.filter(b => b.status === 'occupied').length, 0),
    }));

    const totalBeds = roomSummaries.reduce((sum, r) => sum + r.beds.length, 0);
    const occupiedBeds = roomSummaries.reduce((sum, r) => sum + r.beds.filter(b => b.status === 'occupied').length, 0);

    await db.collection('tenants').doc(tenantId).collection('properties').doc(prop.id).set({
      id: prop.id,
      name: prop.name,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      pincode: prop.pincode,
      latitude: prop.latitude || null,
      longitude: prop.longitude || null,
      propertyType: prop.property_type || 'pg',
      totalFloors: prop.total_floors || 1,
      wifiSsid: prop.wifi_ssid || null,
      wifiPassword: prop.wifi_password || null,
      amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
      status: prop.status || 'active',
      floorSummaries,
      roomSummaries,
      stats: {
        totalBeds,
        occupiedBeds,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
        monthlyRevenue: 0, // Calculated from payments
      },
      createdAt: prop.created_at || new Date().toISOString(),
      updatedAt: prop.updated_at || new Date().toISOString(),
    });
  }
}

async function migratePeople(tenantId: string) {
  // Users
  const users = sqlite.prepare('SELECT * FROM users WHERE tenant_id = ?').all(tenantId);
  for (const user of users) {
    await db.collection('tenants').doc(tenantId).collection('people').doc(user.id).set({
      id: user.id,
      role: user.role || 'staff',
      email: user.email,
      phone: user.phone || null,
      fullName: user.full_name,
      passwordHash: user.password_hash,
      avatarUrl: user.avatar_url || null,
      isActive: user.is_active === 1,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: user.updated_at || new Date().toISOString(),
    });
  }

  // Residents (tenant_profiles)
  const residents = sqlite.prepare('SELECT * FROM tenant_profiles WHERE tenant_id = ?').all(tenantId);
  for (const res of residents) {
    await db.collection('tenants').doc(tenantId).collection('people').doc(res.id).set({
      id: res.id,
      role: 'resident',
      email: res.email || null,
      phone: res.phone,
      fullName: res.full_name,
      tenantProfileId: res.id,
      propertyId: res.property_id,
      roomId: res.room_id,
      bedId: res.bed_id,
      dateOfBirth: res.date_of_birth || null,
      gender: res.gender || null,
      bloodGroup: res.blood_group || null,
      occupation: res.occupation || null,
      companyName: res.company_name || null,
      emergencyName: res.emergency_name || null,
      emergencyPhone: res.emergency_phone || null,
      emergencyRelation: res.emergency_relation || null,
      moveInDate: res.move_in_date,
      moveOutDate: res.move_out_date || null,
      rentAmount: res.rent_amount,
      depositPaid: res.deposit_paid || 0,
      status: res.status || 'active',
      documents: {
        aadhaarFront: res.aadhaar_front_url || null,
        aadhaarBack: res.aadhaar_back_url || null,
        panCard: res.pan_card_url || null,
        photo: res.photo_url || null,
      },
      mealPreferences: res.meal_preferences ? JSON.parse(res.meal_preferences) : { breakfast: true, lunch: false, dinner: true },
      dietaryPreference: res.dietary_preference || null,
      createdAt: res.created_at || new Date().toISOString(),
      updatedAt: res.updated_at || new Date().toISOString(),
    });
  }

  // Staff
  const staffRows = sqlite.prepare('SELECT * FROM staff WHERE tenant_id = ?').all(tenantId);
  for (const staff of staffRows) {
    await db.collection('tenants').doc(tenantId).collection('people').doc(staff.id).set({
      id: staff.id,
      role: 'staff',
      email: staff.email || null,
      phone: staff.phone,
      fullName: staff.full_name,
      isActive: staff.is_active === 1,
      staffDetails: {
        propertyId: staff.property_id,
        staffRole: staff.role,
        salary: staff.salary || null,
        shiftStart: staff.shift_start || null,
        shiftEnd: staff.shift_end || null,
        weeklyOff: staff.weekly_off || 'sunday',
        joinedDate: staff.joined_date,
        leftDate: staff.left_date || null,
      },
      createdAt: staff.created_at || new Date().toISOString(),
      updatedAt: staff.updated_at || new Date().toISOString(),
    });
  }
}

async function migrateFinancials(tenantId: string) {
  const payments = sqlite.prepare('SELECT * FROM rent_payments WHERE tenant_id = ?').all(tenantId);
  for (const pay of payments) {
    await db.collection('tenants').doc(tenantId).collection('financials').doc(pay.id).set({
      id: pay.id,
      type: 'payment',
      personId: pay.tenant_profile_id,
      propertyId: pay.property_id,
      monthYear: pay.month_year,
      dueDate: pay.due_date,
      paidDate: pay.paid_date || null,
      rentAmount: pay.rent_amount,
      electricityCharge: pay.electricity_charge || 0,
      waterCharge: pay.water_charge || 0,
      foodCharge: pay.food_charge || 0,
      maintenanceCharge: pay.maintenance_charge || 0,
      lateFee: pay.late_fee || 0,
      discount: pay.discount || 0,
      totalAmount: pay.total_amount,
      paidAmount: pay.paid_amount || 0,
      balanceAmount: pay.balance_amount,
      paymentMethod: pay.payment_method || null,
      transactionId: pay.transaction_id || null,
      paymentStatus: pay.payment_status || 'pending',
      receiptNumber: pay.receipt_number || null,
      notes: pay.notes || null,
      createdAt: pay.created_at || new Date().toISOString(),
      updatedAt: pay.updated_at || new Date().toISOString(),
    });
  }
}

async function migrateOperations(tenantId: string) {
  // Complaints
  const complaints = sqlite.prepare('SELECT * FROM complaints WHERE tenant_id = ?').all(tenantId);
  for (const comp of complaints) {
    const comments = sqlite.prepare('SELECT * FROM complaint_comments WHERE complaint_id = ?').all(comp.id);
    await db.collection('tenants').doc(tenantId).collection('operations').doc(comp.id).set({
      id: comp.id,
      type: 'complaint',
      ticketNumber: comp.ticket_number,
      personId: comp.tenant_profile_id || null,
      propertyId: comp.property_id,
      category: comp.category,
      priority: comp.priority || 'medium',
      title: comp.title,
      description: comp.description,
      status: comp.status || 'open',
      assignedTo: comp.assigned_to || null,
      assignedAt: comp.assigned_at || null,
      resolvedAt: comp.resolved_at || null,
      resolutionNotes: comp.resolution_notes || null,
      resolutionPhotos: comp.resolution_photos ? JSON.parse(comp.resolution_photos) : [],
      tenantRating: comp.tenant_rating || null,
      tenantFeedback: comp.tenant_feedback || null,
      comments: comments.map((c: any) => ({
        id: c.id,
        userId: c.user_id || null,
        comment: c.comment,
        isInternal: c.is_internal === 1,
        createdAt: c.created_at || new Date().toISOString(),
      })),
      createdBy: comp.created_by || null,
      createdAt: comp.created_at || new Date().toISOString(),
      updatedAt: comp.updated_at || new Date().toISOString(),
    });
  }

  // Tasks
  const tasks = sqlite.prepare('SELECT * FROM tasks WHERE tenant_id = ?').all(tenantId);
  for (const task of tasks) {
    await db.collection('tenants').doc(tenantId).collection('operations').doc(task.id).set({
      id: task.id,
      type: 'task',
      personId: task.assigned_to,
      propertyId: task.property_id,
      title: task.title,
      description: task.description || null,
      taskType: task.task_type,
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      scheduledDate: task.scheduled_date || null,
      scheduledTime: task.scheduled_time || null,
      completedAt: task.completed_at || null,
      completionPhotos: task.completion_photos ? JSON.parse(task.completion_photos) : [],
      completionNotes: task.completion_notes || null,
      createdBy: task.created_by || null,
      createdAt: task.created_at || new Date().toISOString(),
      updatedAt: task.updated_at || new Date().toISOString(),
    });
  }

  // Visitors
  const visitors = sqlite.prepare('SELECT * FROM visitors WHERE tenant_id = ?').all(tenantId);
  for (const vis of visitors) {
    await db.collection('tenants').doc(tenantId).collection('operations').doc(vis.id).set({
      id: vis.id,
      type: 'visitor',
      propertyId: vis.property_id,
      name: vis.name,
      phone: vis.phone,
      email: vis.email || null,
      purpose: vis.purpose,
      whomToMeet: vis.whom_to_meet || null,
      expectedDate: vis.expected_date,
      expectedTime: vis.expected_time || null,
      status: vis.status || 'pending',
      entryTime: vis.entry_time || null,
      exitTime: vis.exit_time || null,
      createdAt: vis.created_at || new Date().toISOString(),
      updatedAt: vis.updated_at || new Date().toISOString(),
    });
  }
}

async function main() {
  const tenants = sqlite.prepare('SELECT id FROM tenants').all();
  for (const tenant of tenants) {
    const tenantId = (tenant as any).id;
    console.log(`\nMigrating tenant: ${tenantId}`);
    await migrateProperties(tenantId);
    await migratePeople(tenantId);
    await migrateFinancials(tenantId);
    await migrateOperations(tenantId);
    console.log(`Done: ${tenantId}`);
  }
  console.log('\nMigration complete!');
  sqlite.close();
  process.exit(0);
}

main().catch(console.error);
```

- [ ] **Step 2: Run migration**

```bash
npx tsx scripts/migrate-sqlite-to-firestore.ts
```

- [ ] **Step 3: Verify data in Firebase Console**

Check Firestore Console → each tenant should have 6 subcollections with data.

- [ ] **Step 4: Commit**

```bash
git add scripts/migrate-sqlite-to-firestore.ts
git commit -m "feat: one-time SQLite to Firestore migration script"
```

---

## Phase 4: API Migration

### Task 7: Firebase Cloud Functions Setup

**Files:**
- Create: `apps/api/functions/package.json`
- Create: `apps/api/functions/src/index.ts`
- Create: `apps/api/functions/tsconfig.json`

**Interfaces:**
- Produces: Cloud Functions HTTP endpoints for mobile API

- [ ] **Step 1: Create functions directory**

```bash
mkdir -p apps/api/functions/src
```

- [ ] **Step 2: Create functions package.json**

Create `apps/api/functions/package.json`:
```json
{
  "name": "opsora-functions",
  "scripts": {
    "build": "tsc",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": { "node": "18" },
  "main": "lib/index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/cors": "^2.8.17"
  }
}
```

- [ ] **Step 3: Create functions tsconfig.json**

Create `apps/api/functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "outDir": "lib",
    "sourceMap": true,
    "strict": true,
    "target": "es2017",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "compileOnSave": true,
  "include": ["src"]
}
```

- [ ] **Step 4: Create Cloud Functions entry point**

Create `apps/api/functions/src/index.ts`:
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
const corsHandler = cors({ origin: true });

// Auth middleware: verify Firebase ID token
async function authenticate(req: functions.Request, res: functions.Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(token);
    return decoded;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

// GET /api/me - Get current user profile
export const apiMe = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      // Get user from Firestore (try each tenant)
      const tenantsSnap = await db.collection('tenants').get();
      for (const tenantDoc of tenantsSnap.docs) {
        const personDoc = await tenantDoc.ref.collection('people').doc(user.uid).get();
        if (personDoc.exists()) {
          const data = personDoc.data()!;
          delete data.passwordHash;
          res.json({ ...data, tenantId: tenantDoc.id });
          return;
        }
      }
      res.status(404).json({ error: 'User not found' });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /api/properties - List properties
export const apiProperties = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const tenantId = req.query.tenantId as string || user.tenantId;
      const snap = await db.collection('tenants').doc(tenantId).collection('properties').get();
      const properties = snap.docs.map(doc => doc.data());
      res.json({ data: properties });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /api/residents - List residents
export const apiResidents = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const tenantId = req.query.tenantId as string || user.tenantId;
      const snap = await db.collection('tenants').doc(tenantId).collection('people')
        .where('role', '==', 'resident')
        .where('status', '==', 'active')
        .get();
      const residents = snap.docs.map(doc => {
        const data = doc.data();
        delete data.passwordHash;
        return data;
      });
      res.json({ data: residents });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// POST /api/payments - Create payment
export const apiCreatePayment = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const tenantId = user.tenantId || req.body.tenantId;
      const paymentData = req.body;
      const paymentRef = db.collection('tenants').doc(tenantId).collection('financials').doc();
      await paymentRef.set({
        ...paymentData,
        id: paymentRef.id,
        type: 'payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      res.json({ data: { id: paymentRef.id, ...paymentData } });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /api/complaints - List complaints
export const apiComplaints = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const tenantId = req.query.tenantId as string || user.tenantId;
      const snap = await db.collection('tenants').doc(tenantId).collection('operations')
        .where('type', '==', 'complaint')
        .orderBy('createdAt', 'desc')
        .get();
      const complaints = snap.docs.map(doc => doc.data());
      res.json({ data: complaints });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// GET /api/dashboard - Dashboard stats
export const apiDashboard = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;

    try {
      const tenantId = req.query.tenantId as string || user.tenantId;

      // Get properties with stats
      const propsSnap = await db.collection('tenants').doc(tenantId).collection('properties').get();
      const properties = propsSnap.docs.map(doc => doc.data());

      const totalBeds = properties.reduce((sum: number, p: any) => sum + (p.stats?.totalBeds || 0), 0);
      const occupiedBeds = properties.reduce((sum: number, p: any) => sum + (p.stats?.occupiedBeds || 0), 0);

      // Get pending payments
      const pendingSnap = await db.collection('tenants').doc(tenantId).collection('financials')
        .where('type', '==', 'payment')
        .where('paymentStatus', '==', 'pending')
        .get();
      const pendingAmount = pendingSnap.docs.reduce((sum, doc) => sum + (doc.data().balanceAmount || 0), 0);

      // Get open complaints
      const complaintsSnap = await db.collection('tenants').doc(tenantId).collection('operations')
        .where('type', '==', 'complaint')
        .where('status', '==', 'open')
        .get();

      res.json({
        data: {
          totalProperties: properties.length,
          totalBeds,
          occupiedBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
          pendingAmount,
          openComplaints: complaintsSnap.size,
        },
      });
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

// Firestore Triggers
export const onPaymentCreated = functions.firestore
  .document('tenants/{tenantId}/financials/{docId}')
  .onCreate(async (snap, context) => {
    const payment = snap.data();
    if (payment.type !== 'payment') return;

    // Update property stats
    const propRef = db.collection('tenants').doc(context.params.tenantId)
      .collection('properties').doc(payment.propertyId);

    // Send notification to tenant
    const notifRef = db.collection('tenants').doc(context.params.tenantId).collection('operations').doc();
    await notifRef.set({
      id: notifRef.id,
      type: 'notification',
      title: 'Payment Received',
      message: `Payment of ₹${payment.totalAmount} received for ${payment.monthYear}`,
      personId: payment.personId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

export const onComplaintCreated = functions.firestore
  .document('tenants/{tenantId}/operations/{docId}')
  .onCreate(async (snap, context) => {
    const complaint = snap.data();
    if (complaint.type !== 'complaint') return;

    // Notify assigned staff via FCM
    if (complaint.assignedTo) {
      const personDoc = await db.collection('tenants').doc(context.params.tenantId)
        .collection('people').doc(complaint.assignedTo).get();

      if (personDoc.exists()) {
        const fcmToken = personDoc.data()?.fcmToken;
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: 'New Complaint Assigned',
              body: `${complaint.title} - ${complaint.category}`,
            },
            data: { complaintId: context.params.docId },
          });
        }
      }
    }
  });
```

- [ ] **Step 5: Install dependencies and deploy**

```bash
cd apps/api/functions && npm install
cd ../.. && firebase deploy --only functions
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/functions/
git commit -m "feat: Firebase Cloud Functions for mobile API + Firestore triggers"
```

---

### Task 8: Next.js API Routes

**Files:**
- Create: `apps/web/src/app/api/auth/me/route.ts`
- Create: `apps/web/src/app/api/properties/route.ts`
- Create: `apps/web/src/app/api/residents/route.ts`
- Create: `apps/web/src/app/api/payments/route.ts`
- Create: `apps/web/src/app/api/complaints/route.ts`
- Create: `apps/web/src/app/api/dashboard/route.ts`
- Create: `apps/web/src/lib/firebase-admin.ts`

**Interfaces:**
- Consumes: Firebase Admin SDK, Firestore
- Produces: HTTP API routes for Next.js

- [ ] **Step 1: Create Firebase Admin init**

Create `apps/web/src/lib/firebase-admin.ts`:
```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const app = getApps().length === 0
  ? initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    })
  : getApps()[0];

const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { app, adminDb, adminAuth };
```

- [ ] **Step 2: Create auth/me route**

Create `apps/web/src/app/api/auth/me/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const token = authHeader.split('Bearer ')[1];
    const decoded = await adminAuth.verifyIdToken(token);

    // Find user in Firestore
    const tenantsSnap = await adminDb.collection('tenants').get();
    for (const tenantDoc of tenantsSnap.docs) {
      const personDoc = await tenantDoc.ref.collection('people').doc(decoded.uid).get();
      if (personDoc.exists()) {
        const data = personDoc.data()!;
        delete data.passwordHash;
        return NextResponse.json({ ...data, tenantId: tenantDoc.id });
      }
    }

    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
```

- [ ] **Step 3: Create properties route**

Create `apps/web/src/app/api/properties/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function getUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  return adminAuth.verifyIdToken(token);
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId') || user.tenantId;

  const snap = await adminDb.collection('tenants').doc(tenantId).collection('properties').get();
  const properties = snap.docs.map(doc => doc.data());

  return NextResponse.json({ data: properties });
}
```

- [ ] **Step 4: Create remaining routes (residents, payments, complaints, dashboard)**

Follow the same pattern as properties — verify token, query Firestore, return JSON. Each route filters by the appropriate collection and type field.

- [ ] **Step 5: Update Next.js API client**

Modify `apps/web/src/lib/api.ts` to use Firebase Auth token instead of JWT cookie.

- [ ] **Step 6: Add Firebase Admin env vars**

Add to `apps/web/.env.local`:
```
FIREBASE_PROJECT_ID=opsora
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@opsora.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/api/ apps/web/src/lib/firebase-admin.ts
git commit -m "feat: Next.js API routes with Firebase Admin SDK"
```

---

## Phase 5: Real-time, Notifications & Analytics

### Task 9: FCM Push Notifications

**Files:**
- Modify: `apps/mobile/src/services/auth.tsx` (add FCM token registration)
- Create: `apps/mobile/src/services/notifications.ts`

**Interfaces:**
- Consumes: `@react-native-firebase/messaging`
- Produces: FCM token stored in Firestore, push notification handling

- [ ] **Step 1: Create notification service**

Create `apps/mobile/src/services/notifications.ts`:
```typescript
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import { Platform, PermissionsAndroid } from 'react-native';

export async function requestNotificationPermission() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  const authStatus = await messaging().requestPermission();
  const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                  messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token;
  } catch {
    return null;
  }
}

export async function saveFCMToken(userId: string, tenantId: string) {
  const token = await getFCMToken();
  if (!token) return;

  await firestore()
    .collection('tenants')
    .doc(tenantId)
    .collection('people')
    .doc(userId)
    .update({ fcmToken: token });

  // Listen for token refresh
  messaging().onTokenRefresh(async (newToken) => {
    await firestore()
      .collection('tenants')
      .doc(tenantId)
      .collection('people')
      .doc(userId)
      .update({ fcmToken: newToken });
  });
}

export function setupNotificationHandlers() {
  // Handle foreground messages
  messaging().onMessage(async (remoteMessage) => {
    // Show in-app notification
    console.log('Foreground notification:', remoteMessage);
  });

  // Handle background/quit state taps
  messaging().onNotificationOpenedApp((remoteMessage) => {
    // Navigate to relevant screen
    console.log('Notification opened:', remoteMessage);
  });

  messaging().getInitialNotification().then((remoteMessage) => {
    if (remoteMessage) {
      console.log('Initial notification:', remoteMessage);
    }
  });
}
```

- [ ] **Step 2: Integrate in auth flow**

In `apps/mobile/src/services/auth.tsx`, after login:
```typescript
import { requestNotificationPermission, saveFCMToken, setupNotificationHandlers } from './notifications';

// In useEffect, after user is set:
if (user) {
  const hasPermission = await requestNotificationPermission();
  if (hasPermission) {
    await saveFCMToken(user.id, user.tenantId);
  }
  setupNotificationHandlers();
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/services/notifications.ts
git commit -m "feat: FCM push notifications for mobile"
```

---

### Task 10: Firebase Analytics

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Create: `apps/mobile/src/services/analytics.ts`

**Interfaces:**
- Consumes: `@react-native-firebase/analytics`
- Produces: Analytics event tracking

- [ ] **Step 1: Create analytics service**

Create `apps/mobile/src/services/analytics.ts`:
```typescript
import analytics from '@react-native-firebase/analytics';

export function logScreenView(screenName: string, screenClass?: string) {
  analytics().logScreenView({
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
}

export function logLogin(method: string = 'email') {
  analytics().logLogin({ method });
}

export function logSignUp(method: string = 'email') {
  analytics().logSignUp({ method });
}

export function logPropertyView(propertyId: string) {
  analytics().logEvent('property_view', { property_id: propertyId });
}

export function logPaymentCreated(amount: number, monthYear: string) {
  analytics().logEvent('payment_created', { amount, month_year: monthYear });
}

export function logComplaintSubmitted(category: string, priority: string) {
  analytics().logEvent('complaint_submitted', { category, priority });
}

export function logFoodPollVote(pollId: string, optionId: string) {
  analytics().logEvent('food_poll_vote', { poll_id: pollId, option_id: optionId });
}
```

- [ ] **Step 2: Add screen tracking to layout**

In `apps/mobile/app/_layout.tsx`, add screen tracking:
```typescript
import { logScreenView } from '../src/services/analytics';

// In useEffect or navigation listener:
// logScreenView('Dashboard', '(owner)/dashboard');
```

- [ ] **Step 3: Add analytics events to key actions**

In login, payment creation, complaint submission — add the corresponding analytics calls.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/services/analytics.ts apps/mobile/app/_layout.tsx
git commit -m "feat: Firebase Analytics for mobile app"
```

---

## Phase 6: File Storage

### Task 11: Firebase Storage Migration

**Files:**
- Create: `storage.rules`
- Modify: `apps/mobile/src/services/api.ts` (file upload logic)
- Modify: `apps/web/src/lib/api.ts` (file upload logic)

**Interfaces:**
- Consumes: Firebase Storage SDK
- Produces: File upload/download URLs

- [ ] **Step 1: Create storage rules**

Create `storage.rules`:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tenants/{tenantId}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.token.tenantId == tenantId;
      allow write: if request.auth != null && request.auth.token.tenantId == tenantId;
    }
  }
}
```

- [ ] **Step 2: Deploy storage rules**

```bash
firebase deploy --only storage
```

- [ ] **Step 3: Update mobile file upload**

Replace file upload logic in `apps/mobile/src/services/api.ts` with Firebase Storage:
```typescript
import storage from '@react-native-firebase/storage';

export async function uploadFile(uri: string, path: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ref = storage().ref(path);
  await ref.put(blob);
  return ref.getDownloadURL();
}
```

- [ ] **Step 4: Update web file upload**

Similar pattern using Firebase Storage SDK for web.

- [ ] **Step 5: Commit**

```bash
git add storage.rules apps/mobile/src/services/api.ts apps/web/src/lib/api.ts
git commit -m "feat: Firebase Storage for file uploads"
```

---

## Phase 7: Cleanup & Deploy

### Task 12: Remove Old Fastify API

**Files:**
- Delete: `apps/api/` (entire directory)
- Modify: `package.json` (root)
- Modify: `turbo.json`

**Interfaces:**
- Removes: Fastify server, SQLite, Drizzle ORM

- [ ] **Step 1: Remove API directory**

```bash
rm -rf apps/api/
```

- [ ] **Step 2: Update root package.json**

Remove scripts: `db:generate`, `db:migrate`, `db:seed`, `db:studio`

- [ ] **Step 3: Update turbo.json**

Remove API pipeline configuration.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove Fastify API server (migrated to Firebase)"
```

---

### Task 13: Deploy to Vercel + Firebase

**Files:**
- Create: `vercel.json` (if needed)

**Interfaces:**
- Produces: Deployed web app on Vercel, Cloud Functions on Firebase

- [ ] **Step 1: Deploy Cloud Functions**

```bash
firebase deploy --only functions
```

- [ ] **Step 2: Deploy Firestore rules + indexes**

```bash
firebase deploy --only firestore
```

- [ ] **Step 3: Deploy Storage rules**

```bash
firebase deploy --only storage
```

- [ ] **Step 4: Deploy web to Vercel**

```bash
cd apps/web && vercel --prod
```

- [ ] **Step 5: Test on Android**

Build and install on physical Android device:
```bash
cd apps/mobile && npx expo run:android
```

- [ ] **Step 6: Final verification**

- Login works on mobile
- Login works on web
- Properties list loads
- Residents list loads
- Payments can be created
- Complaints can be submitted
- Dashboard stats display correctly
- Push notifications arrive
- Analytics events fire

- [ ] **Step 7: Commit final state**

```bash
git add -A
git commit -m "feat: complete Firebase migration — deploy ready"
```
