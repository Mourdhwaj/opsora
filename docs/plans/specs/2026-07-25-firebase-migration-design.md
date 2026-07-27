# Firebase Migration Design Spec

## 1. Overview

Migrate Opsora from self-hosted Fastify + SQLite to Firebase (free tier / Spark plan) + Vercel. Single vendor, zero infrastructure management, free tier for MVP.

**Current stack:**
- Fastify API (Node.js) on port 3001
- SQLite via better-sqlite3 + Drizzle ORM
- Next.js 16 web frontend
- Expo React Native mobile app
- Custom JWT auth

**Target stack:**
- Firebase Auth (email/password + phone OTP)
- Firestore (NoSQL database)
- Firebase Cloud Functions (mobile API)
- Next.js API routes on Vercel (web API)
- Firebase Storage (file uploads)
- Firebase Hosting (optional)
- Expo + Firebase SDK (mobile)

---

## 2. Goals & Constraints

| Goal | Detail |
|------|--------|
| Free tier | Firebase Spark plan: 50K reads/day, 20K writes/day, 2M function invocations/month |
| Single vendor | Firebase/Google only — no separate DB provider |
| Zero infra | No servers to manage, no SQLite file to backup |
| Mobile login | Must work on physical Android (cleartext HTTP no longer needed — Firebase SDK handles connectivity) |
| Real-time | IoT readings, notifications, complaints need real-time updates |
| Scale ready | Design for 500+ tenants, even if starting small |

**Free tier limits (Spark plan):**
- Firestore: 1 GiB storage, 50K reads/day, 20K writes/day, 10 GB bandwidth/month
- Cloud Functions: 2M invocations/month, 400K GB-seconds compute
- Firebase Auth: Unlimited email/password, 10K phone OTP/month
- Firebase Storage: 5 GB, 1 GB/day download
- Firebase Hosting: 10 GB storage, 360 MB/day transfer

---

## 3. Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Expo Mobile │────▶│ Firebase Cloud    │────▶│  Firestore  │
│  (Android/   │     │ Functions         │     │  (database) │
│   iOS)       │     │ (API endpoints)   │     │             │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │                        ▲
                           │                        │
                           ▼                        │
                    ┌──────────────┐          ┌─────┴──────┐
                    │  Firebase    │          │  Firebase   │
                    │  Auth        │          │  Storage    │
                    └──────────────┘          └────────────┘
                           ▲
┌─────────────┐     ┌──────┴────────┐
│  Next.js    │────▶│ Vercel        │
│  Web App    │     │ Serverless    │
└─────────────┘     └───────────────┘
```

**Data flow:**
- **Web:** Next.js → Vercel API routes → Firestore SDK → Firestore
- **Mobile:** Expo → Firebase Cloud Functions → Firestore SDK → Firestore
- **Real-time:** Firestore snapshots push updates to both web and mobile
- **Auth:** Firebase Auth SDK handles login on both platforms

---

## 4. Firestore Data Model

### 4.1 Collection Structure

Root collections are scoped by `tenantId` using Firestore's Security Rules.

```
tenants/{tenantId}
tenants/{tenantId}/properties/{propertyId}
tenants/{tenantId}/people/{personId}
tenants/{tenantId}/financials/{docId}
tenants/{tenantId}/operations/{docId}
tenants/{tenantId}/iot/{readingId}
tenants/{tenantId}/food/{docId}
tenants/{tenantId}/config/{configId}
```

### 4.2 Document Schemas

#### tenants/{tenantId}
```json
{
  "id": "uuid",
  "name": "Sunshine PG",
  "slug": "sunshine-pg",
  "email": "admin@sunshinepg.com",
  "phone": "+919876543210",
  "address": "123 Main St",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560001",
  "gstNumber": null,
  "planType": "free",
  "planExpiresAt": null,
  "maxProperties": 1,
  "maxBeds": 50,
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

#### tenants/{tenantId}/properties/{propertyId}
```json
{
  "id": "uuid",
  "name": "Sunshine PG - Koramangala",
  "address": "456 100 Feet Road",
  "city": "Bangalore",
  "state": "Karnataka",
  "pincode": "560034",
  "latitude": 12.9352,
  "longitude": 77.6245,
  "propertyType": "pg",
  "totalFloors": 3,
  "wifiSsid": "SunshinePG",
  "wifiPassword": "password123",
  "amenities": ["wifi", "food", "laundry"],
  "status": "active",

  "floorSummaries": [
    { "id": "floor-uuid", "floorNumber": 1, "floorName": "Ground Floor", "roomCount": 5, "occupiedCount": 3 },
    { "id": "floor-uuid", "floorNumber": 2, "floorName": "First Floor", "roomCount": 5, "occupiedCount": 4 }
  ],

  "roomSummaries": [
    {
      "id": "room-uuid",
      "roomNumber": "101",
      "roomType": "shared",
      "sharingType": 2,
      "rentPerBed": 8000,
      "status": "available",
      "floorNumber": 1,
      "beds": [
        { "id": "bed-uuid", "bedNumber": "1", "status": "vacant", "rentAmount": 8000 },
        { "id": "bed-uuid", "bedNumber": "2", "status": "occupied", "rentAmount": 8000, "residentName": "John Doe" }
      ]
    }
  ],

  "stats": {
    "totalBeds": 30,
    "occupiedBeds": 22,
    "occupancyRate": 73.3,
    "monthlyRevenue": 176000
  },

  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

**Design decision:** Room and bed summaries are denormalized into the property document. This means reading a property gives you the full overview without querying subcollections. Trade-off: writes to room/bed status require updating the parent property document too.

#### tenants/{tenantId}/people/{personId}
```json
{
  "id": "uuid",
  "role": "resident",
  "email": "john@example.com",
  "phone": "+919876543211",
  "fullName": "John Doe",
  "passwordHash": "...",
  "avatarUrl": null,
  "isActive": true,
  "tenantProfileId": "uuid",

  "propertyId": "property-uuid",
  "roomId": "room-uuid",
  "bedId": "bed-uuid",
  "roomNumber": "101",
  "bedNumber": "1",

  "dateOfBirth": "1995-05-15",
  "gender": "male",
  "bloodGroup": "O+",
  "occupation": "Software Engineer",
  "companyName": "TechCorp",
  "emergencyName": "Jane Doe",
  "emergencyPhone": "+919876543212",
  "emergencyRelation": "Spouse",

  "moveInDate": "2026-01-15",
  "moveOutDate": null,
  "rentAmount": 8000,
  "depositPaid": 16000,

  "documents": {
    "aadhaarFront": "storage://aadhaar-front.jpg",
    "aadhaarBack": "storage://aadhaar-back.jpg",
    "panCard": null,
    "photo": "storage://photo.jpg"
  },

  "mealPreferences": { "breakfast": true, "lunch": false, "dinner": true },
  "dietaryPreference": "vegetarian",

  "staffDetails": null,
  "userDetails": null,

  "createdAt": "2026-01-15T00:00:00Z",
  "updatedAt": "2026-01-15T00:00:00Z"
}
```

**Design decision:** Users, residents, and staff merged into one `people` collection with a `role` field. Staff-specific fields (salary, shift) go in `staffDetails`. User-specific fields go in `userDetails`. This avoids collection group queries across separate collections.

#### tenants/{tenantId}/financials/{docId}
```json
{
  "id": "uuid",
  "type": "payment",
  "personId": "person-uuid",
  "propertyId": "property-uuid",
  "monthYear": "2026-07",
  "dueDate": "2026-07-05",
  "paidDate": "2026-07-03",

  "rentAmount": 8000,
  "electricityCharge": 500,
  "waterCharge": 200,
  "foodCharge": 1500,
  "maintenanceCharge": 0,
  "lateFee": 0,
  "discount": 0,
  "totalAmount": 10200,
  "paidAmount": 10200,
  "balanceAmount": 0,

  "paymentMethod": "upi",
  "transactionId": "UPI123456",
  "paymentStatus": "paid",
  "receiptNumber": "RCP-2026-07-001",
  "proofUrl": "storage://payment-proof.jpg",

  "createdAt": "2026-07-03T00:00:00Z",
  "updatedAt": "2026-07-03T00:00:00Z"
}
```

**Design decision:** Payments, invoices, receipts, and payment proofs all go in `financials` with a `type` field. Queries filter by `type` + `monthYear` + `paymentStatus`. For dashboard aggregates (total revenue, pending payments), Cloud Functions compute and cache results in the tenant document.

#### tenants/{tenantId}/operations/{docId}
```json
{
  "id": "uuid",
  "type": "complaint",
  "ticketNumber": "CMP-001",
  "personId": "person-uuid",
  "propertyId": "property-uuid",
  "category": "plumbing",
  "priority": "high",
  "title": "Leaking tap in room 101",
  "description": "Water is leaking from the kitchen tap",
  "status": "open",
  "assignedTo": "staff-person-uuid",
  "assignedAt": "2026-07-20T10:00:00Z",
  "resolvedAt": null,
  "resolutionNotes": null,
  "resolutionPhotos": [],
  "tenantRating": null,
  "comments": [
    {
      "id": "comment-uuid",
      "userId": "staff-uuid",
      "comment": "Looking into it",
      "createdAt": "2026-07-20T11:00:00Z"
    }
  ],
  "createdAt": "2026-07-20T09:00:00Z",
  "updatedAt": "2026-07-20T11:00:00Z"
}
```

**Design decision:** Complaints, tasks, and visitors all go in `operations` with a `type` field. Comments are embedded as an array (max ~50 per document, enough for complaint threads). For longer threads, use a subcollection.

#### tenants/{tenantId}/iot/{readingId}
```json
{
  "id": "uuid",
  "type": "water",
  "propertyId": "property-uuid",
  "tankId": "tank-uuid",
  "tankName": "Overhead Tank - Floor 1",
  "time": "2026-07-25T14:30:00Z",
  "levelPercentage": 75.5,
  "levelLiters": 3775,
  "temperature": 28.3,
  "consumptionLiters": 120,
  "flowRate": 2.5,
  "isAnomaly": false,
  "anomalyReason": null
}
```

IoT readings are high-volume. On free tier (50K reads/day), limit real-time subscriptions to dashboards only. Historical charts load via Cloud Functions that aggregate readings.

#### tenants/{tenantId}/food/{docId}
```json
{
  "id": "uuid",
  "type": "poll",
  "propertyId": "property-uuid",
  "title": "What's for dinner?",
  "mealType": "dinner",
  "date": "2026-07-25",
  "deadline": "2026-07-25T16:00:00Z",
  "status": "active",
  "options": [
    { "id": "opt-1", "title": "North Indian Thali", "voteCount": 12 },
    { "id": "opt-2", "title": "South Indian Meals", "voteCount": 8 }
  ],
  "votes": [
    { "personId": "person-uuid", "selectedOptionId": "opt-1", "votedAt": "2026-07-25T10:00:00Z" }
  ],
  "finalizedOptionId": null,
  "createdBy": "staff-uuid",
  "createdAt": "2026-07-25T08:00:00Z",
  "updatedAt": "2026-07-25T10:00:00Z"
}
```

#### tenants/{tenantId}/config/{configId}
```json
{
  "id": "billing",
  "breakfastRate": 30,
  "lunchRate": 50,
  "dinnerRate": 60,
  "utilitySplitMethod": "even",
  "noticePeriodDays": 30,
  "lateFeePerDay": 100,
  "workingHoursStart": "09:00",
  "workingHoursEnd": "18:00"
}
```

---

## 5. API Layer Design

### 5.1 Web API (Next.js on Vercel)

Next.js API routes in `apps/web/src/app/api/` handle web-specific endpoints. They use the Firebase Admin SDK to read/write Firestore directly.

**Route mapping (Fastify → Next.js):**

| Current Fastify Route | New Next.js Route | Notes |
|----------------------|-------------------|-------|
| `POST /auth/login` | `POST /api/auth/login` | Firebase Auth SDK instead of bcrypt+JWT |
| `GET /auth/me` | `GET /api/auth/me` | Firebase Admin verifies session |
| `GET /dashboard` | `GET /api/dashboard` | Aggregates from Firestore |
| `GET /properties` | `GET /api/properties` | List properties with summaries |
| `GET /residents` | `GET /api/residents` | Query people collection where role=resident |
| `POST /payments` | `POST /api/payments` | Create financial doc |
| `GET /complaints` | `GET /api/complaints` | Query operations where type=complaint |
| `GET /iot/water` | `GET /api/iot/water` | Query IoT readings |
| ... | ... | Similar pattern |

### 5.2 Mobile API (Firebase Cloud Functions)

Cloud Functions serve the mobile app. Each function is an HTTPS endpoint.

**Function mapping:**

| Function | Trigger | Purpose |
|----------|---------|---------|
| `apiLogin` | HTTPS | Firebase Auth sign-in, return custom token |
| `apiMe` | HTTPS | Get current user profile |
| `apiProperties` | HTTPS | CRUD properties |
| `apiResidents` | HTTPS | CRUD residents |
| `apiPayments` | HTTPS | CRUD payments |
| `apiComplaints` | HTTPS | CRUD complaints |
| `apiDashboard` | HTTPS | Dashboard stats |
| `apiIoT` | HTTPS | IoT readings |
| `onPaymentCreated` | Firestore trigger | Update property stats, send notification |
| `onComplaintCreated` | Firestore trigger | Notify assigned staff |
| `generateMonthlyBills` | Scheduled | Cloud Scheduler, monthly billing |

### 5.3 Auth Flow

```
Mobile:
  Firebase SDK → signInWithEmailAndPassword()
    → Firebase Auth returns ID token
    → Store in expo-secure-store
    → Attach to requests via Authorization header
    → Cloud Functions verify with Firebase Admin

Web:
  Firebase SDK → signInWithEmailAndPassword()
    → Firebase Auth sets session cookie
    → Next.js middleware reads cookie
    → API routes verify with Firebase Admin
```

Note: Email/password only. No phone OTP. Firebase Auth handles password hashing, session management, and token refresh automatically.

---

## 6. Migration Plan

### Phase 1: Firebase Project Setup (1-2 days)
1. Create Firebase project
2. Enable Firestore, Auth, Storage, Cloud Functions
3. Set up Firebase CLI
4. Configure security rules
5. Set up Expo + Firebase SDK

### Phase 2: Auth Migration (2-3 days)
1. Install Firebase Auth SDK in Expo mobile
2. Install Firebase Auth in Next.js web
3. Migrate user credentials (bcrypt hashes → Firebase Auth)
4. Update login screens
5. Remove Fastify JWT system

### Phase 3: Firestore Data Model (3-5 days)
1. Create Firestore security rules
2. Define collection structure (per section 4)
3. Write one-time migration script: SQLite → Firestore (Node.js script using better-sqlite3 read + Firestore batch writes)
4. Migrate seed data
5. Test data integrity

### Phase 4: API Migration (5-7 days)
1. Set up Next.js API routes with Firebase Admin
2. Set up Firebase Cloud Functions for mobile
3. Migrate routes one by one (start with auth, then properties, residents, payments)
4. Update Expo app to call Cloud Functions
5. Update Next.js to call API routes

### Phase 5: Real-time, Notifications & Analytics (3-4 days)
1. Add Firestore real-time listeners for IoT
2. Add Cloud Functions triggers for notifications (FCM push + in-app)
3. Set up FCM topics for tenant-wide broadcasts
4. Add Cloud Scheduler for monthly billing
5. Integrate Firebase Analytics in mobile + web
6. Track key events: login, property_view, payment_created, complaint_submitted

### Phase 6: File Storage (1-2 days)
1. Set up Firebase Storage
2. Migrate file upload logic
3. Update image/document references

### Phase 7: Testing & Deploy (2-3 days)
1. End-to-end testing on Android
2. End-to-end testing on web
3. Performance testing with Firestore queries
4. Deploy to Vercel (web) and Firebase (mobile API)

**Total estimated effort: 17-26 days**

---

## 7. Free Tier Budget

**Daily Firestore reads (50K limit):**
- Dashboard loads: ~200 reads/tenant/day × 500 tenants = 100K → **EXCEEDS LIMIT**
- Need to cache dashboard data in tenant document or use Cloud Functions to pre-aggregate

**Optimization strategies:**
1. **Cache dashboard stats** in tenant document (updated via Cloud Function triggers)
2. **Denormalize** room/bed summaries into property documents
3. **Limit real-time subscriptions** to active dashboards only
4. **Batch writes** for bulk operations (monthly billing)
5. **Use Firestore's `select()`** to fetch only needed fields

**Adjusted daily budget (with caching):**
- Dashboard loads: ~5 reads/tenant/day × 500 tenants = 2,500 reads
- CRUD operations: ~50 reads/tenant/day × 500 tenants = 25,000 reads
- Real-time: ~20 reads/tenant/day × 100 concurrent = 2,000 reads
- **Total: ~29,500 reads/day** (within 50K limit)

**If exceeding free tier:** Upgrade to Blaze plan (pay-as-you-go). Firestore pricing: $0.06/100K reads, $0.18/100K writes. At 50K reads/day = ~$90/month.

---

## 8. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Free tier limits hit | High | Cache aggressively, pre-aggregate with Cloud Functions |
| Data migration errors | High | Run migration in parallel, verify checksums, keep SQLite backup |
| Firestore query complexity | Medium | Design denormalized model upfront, test queries early |
| Cloud Functions cold start | Medium | Keep functions warm with scheduled pings, use minimum instances |
| Offline support | Medium | Firestore has built-in offline persistence for mobile |
| Vendor lock-in | Low | Firebase SDKs are well-documented, migration path exists |
| Cost overrun | Low | Start on Spark plan, monitor usage, set budget alerts |

---

## 9. What Gets Deleted

After migration, the following can be removed:
- `apps/api/` (entire Fastify server)
- `apps/api/opsora.db` (SQLite database)
- `apps/api/src/lib/db.ts` (Drizzle connection)
- `apps/api/src/lib/schema.ts` (Drizzle schema)
- `apps/api/src/middleware/auth.ts` (old auth middleware)
- `package.json` root scripts for `db:generate`, `db:migrate`, `db:seed`
- `turbo.json` API pipeline config

**Kept:**
- `apps/web/` (Next.js, migrated to use Firebase)
- `apps/mobile/` (Expo, migrated to use Firebase SDK)
- `packages/shared/` (if any shared types)

---

## 10. Decisions (Resolved)

1. **Data migration:** One-time migration script from SQLite → Firestore
2. **Auth:** Email/password only (no phone OTP)
3. **Notifications:** Both FCM push notifications + in-app notifications
4. **Analytics:** Firebase Analytics included

### 10.1 FCM Push Notifications

- Mobile: `expo-notifications` + `@react-native-firebase/messaging`
- Web: Firebase Cloud Messaging via service worker
- Triggers: Cloud Functions on Firestore writes (new payment, complaint assigned, food poll created)
- Topics: `tenant_{tenantId}` for broadcast, `user_{userId}` for targeted

### 10.2 Firebase Analytics

- Mobile: `@react-native-firebase/analytics` (auto-tracks screen views, user engagement)
- Web: Firebase Analytics via `firebase/analytics`
- Events: login, property_view, payment_created, complaint_submitted
- Dashboard: Firebase Console → Analytics for user behavior insights
