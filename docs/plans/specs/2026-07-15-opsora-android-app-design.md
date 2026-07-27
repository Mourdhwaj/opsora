# Opsora Android App Design

**Date:** 2026-07-15
**Goal:** Full feature-parity React Native (Expo) Android app consuming the existing Opsora Fastify API

## 1. Architecture

- **Monorepo:** Add `apps/mobile` as a workspace under the existing Turborepo (no root config changes needed — already supports `apps/*`)
- **Framework:** Expo SDK 52+ with expo-router (file-based routing, same paradigm as Next.js App Router)
- **Auth:** Consume existing `/auth/login` endpoint, store JWT in `expo-secure-store`, role-based redirect to the correct navigation stack
- **API Client:** Axios with interceptors (JWT from secure store, 401 → logout). Base URL configurable via `app.config.js` per environment
- **Real-time:** WebSocket client connecting to `ws://<API_HOST>/ws` for notifications and live updates
- **Offline:** `@tanstack/react-query` persistence via `@react-native-async-storage/async-storage`
- **Notifications:** Expo Notifications (FCM) for push — rent reminders, complaint updates, water alerts

## 2. Screens & Navigation

Three role-based bottom-tab navigators:

### Owner (`(owner)`)
- **Dashboard** — occupancy stats, revenue trend, recent activity, pending payments, active complaints
- **Properties** — list → detail (floors → rooms → beds), add/edit property
- **Residents** — list with search/filter by property, add/check-in workflow, resident detail
- **Payments** — list by month, payment status, proof verification, receipt generation
- **Complaints** — list with filter (status/category), detail with thread, assign/update
- **Food** — menu management, meal attendance, ratings
- **IoT** — water tank levels (chart), electricity consumption (chart), alerts
- **More** — archive, staff portal link, notification settings, logout

### Tenant (`(tenant)`)
- **Dashboard** — rent due card, water level card, today's menu card, quick actions
- **Payments** — payment history, pay rent, upload payment proof
- **Food** — today's menu, meal attendance toggle, rating
- **Complaints** — create complaint with photo, track status, comment thread
- **Profile** — personal info, documents, notice period, move-out request

### Staff (`(staff)`)
- **Dashboard** — today's stats, assigned tasks count, pending complaints
- **Residents** — resident lookup by room/name, contact info
- **Tasks** — assigned task list, mark complete with photo
- **Complaints** — view/resolve complaints, update status
- **Checklist** — daily cleaning/inspection checklist

## 3. Shared Components

- `Card`, `Button`, `Input`, `Select`, `Badge`, `StatusChip`, `Avatar`, `EmptyState`, `LoadingSkeleton`, `PullToRefresh`
- Charts: `react-native-chart-kit` for line/bar charts (dashboard revenue, IoT trends)
- Camera/image picker via `expo-image-picker` for complaint photos, payment proof, KYC
- Toast/snackbar for action feedback

## 4. Data Flow

Mobile App → Axios (JWT in Authorization header) → Fastify API → Drizzle ORM → SQLite → JSON response

WebSocket ← ws://API_HOST/ws (JWT authenticated) → Real-time events (payment, complaint, IoT alerts)

No backend changes required — the existing Fastify API already handles all three roles and returns JSON.

## 5. Key Libraries

| Purpose | Library |
|---------|---------|
| Framework | expo ~52, expo-router ~4 |
| HTTP | axios |
| Caching | @tanstack/react-query |
| Storage | expo-secure-store, @react-native-async-storage |
| Navigation | expo-router (file-based) |
| Charts | react-native-chart-kit |
| Push | expo-notifications |
| Camera | expo-image-picker |
| Biometrics | expo-local-authentication |
| Animations | react-native-reanimated |

## 6. Out of Scope (Phase 1)

- iOS build (Android only for now)
- IoT hardware integration (MQTT handled server-side)
- Offline-first mode (basic cache only)
