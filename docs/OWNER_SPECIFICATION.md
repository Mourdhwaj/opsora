# Opsora — Owner/Admin Complete Specification

## Document Purpose

This document provides **comprehensive flow specifications** exclusively for the **Owner/Admin** view of Opsora. It covers every feature, API endpoint, UI component, and workflow that an owner or administrator can access and use.

**Repository:** `https://github.com/Mourdhwaj/opsora.git`
**Architecture:** Turborepo monorepo with `apps/api` (Fastify + Drizzle ORM + SQLite) and `apps/web` (Next.js 16 App Router + Tailwind v4)
**Current Date:** July 2026
**Role Access:** `owner` | `admin`

---

# Table of Contents

1. [Overview & Navigation Structure](#1-overview--navigation-structure)
2. [Dashboard Overview](#2-dashboard-overview)
3. [User Management](#3-user-management)
4. [Property Management](#4-property-management)
5. [Floor Management](#5-floor-management)
6. [Room & Bed Management](#6-room--bed-management)
7. [Resident Management](#7-resident-management)
8. [Smart Room Allocation](#8-smart-room-allocation)
9. [Payments Management](#9-payments-management)
10. [Invoice Generation](#10-invoice-generation)
11. [Payment Proof Verification](#11-payment-proof-verification)
12. [Receipt Generation](#12-receipt-generation)
13. [Payment Reminders](#13-payment-reminders)
14. [Billing Configuration](#14-billing-configuration)
15. [Complaints / Service Desk](#15-complaints--service-desk)
16. [IoT Water Dashboard](#16-iot-water-dashboard)
17. [IoT Electricity Dashboard](#17-iot-electricity-dashboard)
18. [IoT Device Management](#18-iot-device-management)
19. [Food Management](#19-food-management)
20. [Food Polls](#20-food-polls)
21. [Food Analytics](#21-food-analytics)
22. [Notifications Management](#22-notifications-management)
23. [Activity Logs & Audit Trail](#23-activity-logs--audit-trail)
24. [File Upload](#24-file-upload)
25. [Staff Management](#25-staff-management)
26. [Reports & Analytics](#26-reports--analytics)
27. [Settings & Configuration](#27-settings--configuration)

---

# 1. Overview & Navigation Structure

## 1.1 Owner Dashboard Layout

The owner/admin dashboard uses the `(dashboard)` route group with a dedicated layout.

### Navigation Sidebar
```
┌─────────────────────────────────────────┐
│  🏠 Opsora                             │
├─────────────────────────────────────────┤
│  📊 Dashboard                          │
│  👥 Residents                          │
│  🛏️ Rooms & Beds                       │
│  💰 Payments                           │
│  🎫 Service Desk                       │
│  💧 Water IoT                          │
│  ⚡ Electricity IoT                    │
│  🍽️ Food                               │
│  ⚙️ Settings                           │
├─────────────────────────────────────────┤
│  👤 Admin User                          │
│  📪 Notifications (3)                   │
│  🚪 Logout                              │
└─────────────────────────────────────────┘
```

### Route Protection
```typescript
// apps/web/src/middleware.ts
const OWNER_ADMIN_ROUTES = [
  "/dashboard",
  "/residents",
  "/rooms",
  "/payments",
  "/complaints",
  "/iot",
  "/food",
  "/settings"
];

// Role-based access
if (role === "resident") {
  // Redirect to /tenant
} else if (role === "staff") {
  // Redirect to /staff-portal
}
// owner/admin → allow access to all dashboard routes
```

### Layout Component
**File:** `apps/web/src/app/(dashboard)/layout.tsx`

The layout provides:
- Sidebar navigation (collapsible on mobile)
- Top header with search, notifications, user menu
- Main content area
- Responsive design (sidebar collapses to bottom nav on mobile)

---

# 2. Dashboard Overview

## 2.1 Dashboard Page

### User Story
As a property owner, I want to see a high-level overview of my property metrics so that I can understand my business at a glance and make informed decisions.

### Page Route
```
GET /dashboard
Component: apps/web/src/app/(dashboard)/dashboard/page.tsx
```

### API Endpoint
```
GET /dashboard/overview
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  properties: {
    total: number,           // Total properties
    totalBeds: number,       // Total beds across all properties
    occupiedBeds: number,    // Currently occupied beds
    vacantBeds: number,      // Available beds
    occupancyRate: string    // Percentage (e.g., "78.5")
  },
  tenants: {
    active: number           // Active resident count
  },
  payments: {
    totalExpected: number,   // Total rent expected this month
    totalCollected: number,  // Total rent collected this month
    totalPending: number,    // Outstanding amount
    collectionRate: string,  // Collection percentage
    paidCount: number,       // Number of paid invoices
    pendingCount: number     // Number of pending invoices
  },
  complaints: {
    open: number,            // Open complaints
    urgent: number           // Urgent (P1) complaints
  },
  water: [{
    tankId: string,
    tankName: string,
    capacityLiters: number,
    currentLevel: number,    // Percentage
    currentLiters: number
  }],
  visitors: {
    pending: number          // Pending visitor approvals
  },
  recentActivity: [{
    id: string,
    action: string,          // "checked_in", "payment_received", etc.
    entityType: string,      // "resident", "payment", "complaint"
    entityName: string,
    actorName: string,
    createdAt: string
  }]
}
```

### UI Components

#### 1. Metric Cards Row (4 cards)
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 👥              │ │ 🛏️              │ │ 💰              │ │ ⚠️              │
│ 62              │ │ 78.5%           │ │ ₹1,24,000       │ │ 3               │
│ Total Residents │ │ Occupancy       │ │ Revenue         │ │ Open Complaints │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Card Implementation:**
```tsx
// Color coding
const metrics = [
  { label: "Total Residents", value: data.totalResidents, icon: Users, color: "text-blue-600 bg-blue-50" },
  { label: "Occupancy", value: `${data.occupancyRate}%`, icon: BedDouble, color: "text-accent bg-accent/10" },
  { label: "Revenue", value: formatCurrency(data.totalRevenue), icon: IndianRupee, color: "text-amber-600 bg-amber-50" },
  { label: "Open Complaints", value: data.activeComplaints, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
];
```

#### 2. Charts Section (2 charts side by side)

**Occupancy Trend (BarChart):**
- X-axis: Month (Jan, Feb, Mar, etc.)
- Y-axis: Bed count
- Two bars per month: Occupied (green) and Vacant (gray)
- Tooltip shows exact numbers on hover

**Revenue Trend (AreaChart):**
- X-axis: Month
- Y-axis: Revenue in ₹
- Green area fill with gradient
- Tooltip shows formatted currency

#### 3. Recent Activity Feed
```
┌─────────────────────────────────────────────────────────┐
│ Recent Activity                                         │
├─────────────────────────────────────────────────────────┤
│ 🟢 Priya Sharma  checked in           2h ago  [resident]│
│ 🟢 Room 301 - June payment received   4h ago  [payment] │
│ 🟢 AC Repair - Room 205 resolved      6h ago  [complaint]│
│ 🟢 Bed 4B in Room 402 allocated       1d ago  [bed]     │
└─────────────────────────────────────────────────────────┘
```

### Data Flow
```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User loads│     │  GET /dashboard │     │  Render         │
│   /dashboard│────▶│  /overview      │────▶│  metrics,       │
│             │     │                 │     │  charts,        │
│             │     │                 │     │  activity feed  │
└─────────────┘     └─────────────────┘     └─────────────────┘
```

### UI/UX Specifications

**Loading State:**
- Show 4 shimmer skeleton cards
- Charts show placeholder bars
- Activity feed shows skeleton rows

**Error State:**
- AlertTriangle icon (red)
- Error message text
- "Retry" button (accent color)

**Responsive Behavior:**
- Mobile: 1 column cards, charts stacked
- Tablet: 2 column cards, charts side by side
- Desktop: 4 column cards, charts side by side

**Animations:**
- Fade-in on page load
- Shimmer effect on loading skeletons
- Hover shadow on metric cards
- Smooth chart transitions

---

## 2.2 Property-Level Dashboard

### User Story
As an owner, I want to see detailed metrics for a specific property so that I can drill down into individual property performance.

### API Endpoint
```
GET /dashboard/property/:propertyId
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  property: Property,
  rooms: Room[],
  beds: Bed[],
  activeTenants: number,
  openComplaints: number,
  waterTanks: number
}
```

### UI Components

**Property Selector:**
- Dropdown at top of dashboard
- Lists all properties
- "All Properties" option for aggregate view

**Property Detail View:**
```
┌─────────────────────────────────────────────────────────┐
│ Sunshine PG - Property Dashboard                        │
├─────────────────────────────────────────────────────────┤
│ Rooms: 20  │  Beds: 40  │  Tenants: 35  │  Complaints: 2│
├─────────────────────────────────────────────────────────┤
│ [Occupancy Chart]  [Payment Summary]                    │
│ [Room Grid]        [Recent Activity]                    │
└─────────────────────────────────────────────────────────┘
```

---

# 3. User Management

## 3.1 Users List

### User Story
As an owner, I want to manage users (staff, admins) so that I can control who has access to my property management system.

### Page Route
```
GET /settings/users (implied)
```

### API Endpoint
```
GET /users?page=1&limit=20&search=
Headers: Authorization: Bearer <token>
Role: owner | admin only

Response: {
  data: User[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

### User Data Model
```typescript
{
  id: string;              // UUID
  tenantId: string;        // Organization ID
  email: string;           // Unique per tenant
  phone?: string;
  fullName: string;
  role: "owner" | "admin" | "staff" | "resident";
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // passwordHash is excluded from responses
}
```

### UI Components

**Users Table:**
| Column | Description |
|--------|-------------|
| User | Avatar + Name + Email |
| Role | Badge (owner/admin/staff) |
| Phone | Contact number |
| Status | Active/Inactive badge |
| Created | Join date |
| Actions | Edit, Deactivate |

**Search & Filters:**
- Search by name or email
- Filter by role (All, Owner, Admin, Staff)
- Filter by status (All, Active, Inactive)

---

## 3.2 Create User

### User Story
As an owner, I want to add new users (admins, staff) so that they can help manage my properties.

### API Endpoint
```
POST /users
Headers: Authorization: Bearer <token>
Role: owner | admin only

Request: {
  email: string,
  password: string,
  fullName: string,
  phone?: string,
  role: "admin" | "staff"
}

Response: User (without passwordHash)
```

### Validation Schema
```typescript
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['owner', 'admin', 'staff']).default('staff'),
});
```

### Step-by-Step Flow

1. **Owner Clicks "Add User"** button
2. **Create User Modal Opens:**
   - Full Name (required)
   - Email (required, unique per tenant)
   - Password (required, min 8 chars)
   - Phone (optional)
   - Role (dropdown: Admin, Staff)

3. **Owner Submits Form**
4. **API Call:** `POST /users`
5. **Backend Processing:**
   - Validates input with Zod
   - Checks for duplicate email
   - Hashes password with bcrypt (10 rounds)
   - Creates user record
6. **Response:** Created user (without password)
7. **UI Update:** Close modal, refresh users list

### Edge Cases
- **Duplicate email:** Return 409 "User with this email already exists"
- **Weak password:** Zod validation error
- **Invalid role:** Only owner/admin roles allowed for creation

---

## 3.3 Update User

### API Endpoint
```
PUT /users/:id
Headers: Authorization: Bearer <token>
Role: owner | admin only

Request: {
  fullName?: string,
  phone?: string,
  role?: string,
  isActive?: boolean
}

Response: Updated User
```

### Flow
1. **Owner Clicks "Edit" on User Row**
2. **Edit Modal Opens** with pre-filled data
3. **Owner Modifies Fields:**
   - Full Name
   - Phone
   - Role (cannot change own role)
   - Status (Active/Inactive)
4. **API Call:** `PUT /users/:id`
5. **Backend:** Updates record, logs activity
6. **UI Update:** Refresh users list

### Restrictions
- Owner cannot deactivate themselves
- Owner cannot change their own role
- Only owner/admin can modify other users

---

## 3.4 Delete (Deactivate) User

### API Endpoint
```
DELETE /users/:id
Headers: Authorization: Bearer <token>
Role: owner | admin only

Response: { message: "User deactivated" }
```

### Flow
1. **Owner Clicks "Deactivate" on User Row**
2. **Confirmation Dialog:** "Are you sure you want to deactivate {name}?"
3. **API Call:** `DELETE /users/:id`
4. **Backend Processing:**
   - Soft delete: Sets `isActive: false`
   - Does NOT actually delete the record
   - Logs activity
5. **UI Update:** User shows as inactive

### Edge Cases
- **Cannot deactivate self:** Return error
- **Already deactivated:** Return error

---

# 4. Property Management

## 4.1 Properties List

### User Story
As an owner, I want to see all my properties so that I can manage multiple PGs/hostels from one dashboard.

### API Endpoint
```
GET /properties
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Property[]
```

### Property Data Model
```typescript
{
  id: string;                    // UUID
  tenantId: string;              // Owner's organization
  name: string;                  // "Sunshine PG"
  address: string;               // Full address
  city: string;
  state: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  propertyType: string;          // "pg" | "hostel" | "coliving"
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  wifiSsid?: string;
  wifiPassword?: string;
  amenities: string;             // JSON array
  status: string;                // "active" | "inactive"
  createdAt: string;
  updatedAt: string;
}
```

### UI Components

**Properties Grid:**
```
┌─────────────────────────────────────────────────────────┐
│ Properties (2)                              [+ Add New] │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────┐       │
│ │ 🏠 Sunshine PG      │  │ 🏠 Green Valley Hostel│       │
│ │ 123 Main St, Mumbai │  │ 456 Park Rd, Delhi   │       │
│ │                     │  │                      │       │
│ │ Beds: 40            │  │ Beds: 25             │       │
│ │ Occupied: 35        │  │ Occupied: 18         │       │
│ │ Vacant: 5           │  │ Vacant: 7            │       │
│ │                     │  │                      │       │
│ │ [Edit] [View]       │  │ [Edit] [View]        │       │
│ └─────────────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

**Property Card Elements:**
- Property icon/image
- Name (bold)
- Address (truncated)
- Bed stats: Total, Occupied, Vacant
- Occupancy progress bar
- Action buttons: Edit, View Details

---

## 4.2 Create Property

### API Endpoint
```
POST /properties
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  name: string,
  address: string,
  city: string,
  state: string,
  pincode?: string,
  propertyType: "pg" | "hostel" | "coliving",
  totalFloors: number
}

Response: Property
```

### Validation Schema
```typescript
const createPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().optional(),
  propertyType: z.enum(['pg', 'hostel', 'coliving']).default('pg'),
  totalFloors: z.number().int().min(1).max(50).default(1),
});
```

### Step-by-Step Flow

1. **Owner Clicks "Add Property"**
2. **Create Property Modal Opens:**
   - Property Name (required)
   - Property Type (dropdown: PG, Hostel, Co-living)
   - Address (required, textarea)
   - City (required)
   - State (required)
   - Pincode (optional)
   - Total Floors (number, 1-50, default: 1)

3. **Owner Fills Form** and clicks "Create Property"

4. **API Call:** `POST /properties`

5. **Backend Processing:**
   - Validates input
   - Creates property record
   - Auto-generates floors based on `totalFloors`:
     ```
     For i in 1..totalFloors:
       Create floor record with floorNumber: i
     ```
   - Creates activity log entry

6. **Response:** Created property with floors

7. **UI Update:**
   - Close modal
   - Add property to grid
   - Show success toast

### Auto-Generated Floors
When creating a property with `totalFloors: 3`, the system automatically creates:
```
Floor 1 (floorNumber: 1, floorName: "Ground Floor")
Floor 2 (floorNumber: 2, floorName: "First Floor")
Floor 3 (floorNumber: 3, floorName: "Second Floor")
```

---

## 4.3 Update Property

### API Endpoint
```
PUT /properties/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: Partial<Property>
Response: Updated Property
```

### Editable Fields
- Property Name
- Address, City, State, Pincode
- Property Type
- WiFi SSID & Password
- Amenities
- Status (active/inactive)

### Non-Editable Fields (require separate operations)
- Total Floors (must add/remove floors separately)
- Total Rooms (must add/remove rooms separately)
- Occupancy counts (auto-calculated)

---

## 4.4 Delete Property

### API Endpoint
```
DELETE /properties/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: { message: "Property deleted" }
```

### Validation
- **With active tenants:** Block deletion, show warning
- **With rooms/beds:** Require confirmation
- **No dependencies:** Allow soft delete (set status: "inactive")

### Flow
1. **Owner Clicks "Delete" on Property**
2. **Confirmation Dialog:**
   - Shows property name
   - Warns about active tenants (if any)
   - Requires explicit confirmation
3. **API Call:** `DELETE /properties/:id`
4. **Backend Processing:**
   - Checks for active tenants
   - If tenants exist: Return 400 error
   - If no tenants: Soft delete (status: "inactive")
5. **UI Update:** Remove from active list

---

# 5. Floor Management

## 5.1 Floors List

### API Endpoint
```
GET /properties/:propertyId/floors
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Floor[]
```

### Floor Data Model
```typescript
{
  id: string;
  tenantId: string;
  propertyId: string;
  floorNumber: number;        // 1, 2, 3...
  floorName?: string;         // "Ground Floor", "First Floor"...
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  layoutData?: string;        // JSON for floor plan
  createdAt: string;
  updatedAt: string;
}
```

---

## 5.2 Create Floor

### API Endpoint
```
POST /floors
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId: string,
  floorNumber: number,
  floorName?: string
}

Response: Floor
```

### Validation
- Floor number must be unique per property
- Floor name is optional

---

## 5.3 Update Floor

### API Endpoint
```
PUT /floors/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: { floorName?: string }
Response: Updated Floor
```

### Editable Fields
- Floor Name only

---

## 5.4 Delete Floor

### API Endpoint
```
DELETE /floors/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: { message: "Floor deleted" }
```

### Validation
- Cannot delete floor with rooms
- Must reassign or remove rooms first

---

# 6. Room & Bed Management

## 6.1 Rooms List (With Tenants)

### User Story
As an owner, I want to see all rooms with their tenant information so that I can quickly understand occupancy at a glance.

### API Endpoint
```
GET /rooms/with-tenants?propertyId=&floorId=
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: RoomWithTenants[]
```

### Response Schema
```typescript
{
  id: string;
  propertyId: string;
  floorId: string;
  roomNumber: string;        // "101", "205", etc.
  roomType: string;          // "shared" | "single" | "couple"
  sharingType: number;       // Number of beds
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  depositAmount: number;
  status: string;            // "available" | "full" | "maintenance"
  gender?: string;           // "male" | "female" | "mixed"
  beds: [{
    id: string;
    bedNumber: string;       // "B1", "B2"
    status: string;          // "vacant" | "occupied"
    rentAmount: number;
    tenantName?: string;     // Occupant's name
    tenantProfileId?: string; // For click-through
  }]
}
```

### UI Components

**Rooms Grid (Grouped by Floor):**
```
┌─────────────────────────────────────────────────────────┐
│ Rooms & Beds                    Floor: [All Floors ▼]  │
├─────────────────────────────────────────────────────────┤
│ Legend: 🟦 Vacant  🟨 Partial  🟥 Full  🟩 Occupied     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Floor 1                                                 │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 101 │ │ 102 │ │ 103 │ │ 104 │ │ 105 │               │
│ │ 🛏️🛏️│ │ 🛏️  │ │ 🛏️🛏️│ │ 🛏️  │ │ 🛏️🛏️│               │
│ │2/2  │ │0/2  │ │1/2  │ │0/2  │ │2/2  │               │
│ │Amit │ │     │ │Priya│ │     │ │Rahul│               │
│ │Ravi │ │     │ │     │ │     │ │Neha │               │
│ │₹8k  │ │₹7k  │ │₹8k  │ │₹7k  │ │₹9k  │               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                         │
│ Floor 2                                                 │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 201 │ │ 202 │ │ 203 │ │ 204 │ │ 205 │               │
│ │ ... │ │ ... │ │ ... │ │ ... │ │ ... │               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
└─────────────────────────────────────────────────────────┘
```

**Room Card Elements:**
- Room number (large, bold)
- Room type badge (shared/single/couple)
- Bed indicators (small colored squares)
- Tenant names (if occupied, clickable)
- Bed count: "{occupied}/{total} beds"
- Rent per bed: "₹{amount}/mo"
- Gender badge (M/F/Mixed)

**Color Coding:**
- Vacant (0 occupied): Slate background
- Partial (1+ occupied, not full): Amber background
- Full (all beds occupied): Red background
- Occupied bed indicator: Accent color

---

## 6.2 Room Details

### API Endpoint
```
GET /rooms/:id/details
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  id: string;
  roomNumber: string;
  roomType: string;
  rentPerBed: number;
  depositAmount: number;
  totalBeds: number;
  occupiedBeds: number;
  beds: Bed[],
  tenants: TenantProfile[]  // With latestPayment info
}
```

### UI Components

**Room Detail Panel (Right side):**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to rooms              Room 101                   │
├─────────────────────────────────────────────────────────┤
│ Shared · 2 beds · ₹8,000/mo                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                   │
│ │    2    │ │    1    │ │    1    │                   │
│ │Total Bed│ │Occupied │ │ Vacant  │                   │
│ └─────────┘ └─────────┘ └─────────┘                   │
│                                                         │
│ Residents (1)                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Amit Patel                            [active]   ││
│ │ Bed B1 · Since Jan 15, 2026                        ││
│ │ 📱 +919800000001  ✉️ amit@example.com              ││
│ │                                                     ││
│ │ 💳 Rent Payment - July 2026                         ││
│ │ Total Due: ₹8,000                                   ││
│ │ Paid: ₹8,000                                        ││
│ │ Status: ✅ Paid                                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Deposit Summary                                         │
│ Amit Patel: ₹10,000                                    │
│ ───────────────────────────────────────────────────────│
│ Total Deposits: ₹10,000                               │
└─────────────────────────────────────────────────────────┘
```

---

## 6.3 Create Room

### API Endpoint
```
POST /rooms
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId: string,
  floorId: string,
  roomNumber: string,
  roomType: "shared" | "single" | "couple",
  sharingType: number,
  totalBeds: number,
  rentPerBed: number,
  depositAmount: number,
  amenities?: string,
  gender?: "male" | "female" | "mixed"
}

Response: Room with beds
```

### Validation Schema
```typescript
const createRoomSchema = z.object({
  propertyId: z.string().uuid(),
  floorId: z.string().uuid(),
  roomNumber: z.string().min(1),
  roomType: z.enum(['shared', 'single', 'couple']).default('shared'),
  sharingType: z.number().int().min(1).default(2),
  totalBeds: z.number().int().min(1).default(2),
  rentPerBed: z.number().min(0).default(5000),
  depositAmount: z.number().min(0).default(10000),
  amenities: z.string().optional().default('[]'),
  gender: z.enum(['male', 'female', 'mixed']).default('mixed'),
});
```

### Auto-Creation of Beds
When creating a room with `totalBeds: 3`, the system automatically creates:
```
Bed B1 (bedNumber: "B1", status: "vacant", rentAmount: rentPerBed)
Bed B2 (bedNumber: "B2", status: "vacant", rentAmount: rentPerBed)
Bed B3 (bedNumber: "B3", status: "vacant", rentAmount: rentPerBed)
```

### Room Numbering Convention
- Format: `FLOOR-ROOM` (e.g., `101`, `102`, ..., `510`)
- Floor 1: 101-110
- Floor 2: 201-210
- etc.

---

## 6.4 Room Gender & Category System

### Data Model
```typescript
{
  roomType: "shared" | "single" | "couple",     // Room category
  gender: "male" | "female" | "mixed",           // Gender restriction
  sharingType: number,                            // Number of beds (for shared)
}
```

### Gender Allocation Rules
1. **Male rooms:** Only male tenants allowed
2. **Female rooms:** Only female tenants allowed
3. **Mixed rooms:** Any gender allowed
4. **Couples:** Detected via relationship field → separate room (type: "single" or "couple")

### Room Types
| Type | Description | Typical Beds | Gender |
|------|-------------|--------------|--------|
| shared | Multiple occupants | 2-6 | mixed/male/female |
| single | Single occupancy | 1 | any |
| couple | For couples | 1-2 | mixed |

---

# 7. Resident Management

## 7.1 Residents List

### User Story
As an owner, I want to see all residents across my properties so that I can manage occupancy and track tenant information.

### API Endpoint
```
GET /residents?page=1&limit=20&search=&status=active
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  data: Resident[],
  pagination: { total, page, limit }
}
```

### Resident Data Model
```typescript
{
  id: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  occupation?: string;
  companyName?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  moveInDate: string;
  moveOutDate?: string;
  rentAmount: number;
  depositPaid: number;
  depositBalance: number;
  status: string;            // "active" | "checked_out"
  foodOptIn: boolean;
  breakfastOptIn: boolean;
  lunchOptIn: boolean;
  dinnerOptIn: boolean;
  // Computed fields
  roomNumber?: string;
  floorNumber?: number;
  bedNumber?: string;
}
```

### UI Components

**Residents Table (Desktop):**
| Column | Description |
|--------|-------------|
| Resident | Avatar + Name + Phone |
| Room | Room number |
| Move-in | Date formatted |
| Rent | Monthly rent amount |
| Status | Badge (active/checked_out) |
| Actions | "View" chevron |

**Resident Cards (Mobile):**
- Card layout with avatar, name, phone, room
- Status badge
- Move-in date and rent

---

## 7.2 Check-In (Add Resident)

### User Story
As an owner, I want to check in a new resident so that I can allocate a bed and start tracking their tenancy.

### API Endpoint
```
POST /residents
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  // Personal Information
  fullName: string,           // Required
  phone: string,              // Required, unique per tenant
  email?: string,
  gender?: string,
  dateOfBirth?: string,
  bloodGroup?: string,
  
  // Identity Verification
  aadhaarNumber?: string,     // 12 digits
  panNumber?: string,         // 10 characters
  passportNumber?: string,
  
  // Employment
  occupation?: string,
  companyName?: string,
  workAddress?: string,
  
  // Emergency Contact
  emergencyName?: string,
  emergencyPhone?: string,
  emergencyRelation?: string,
  
  // Room Allocation
  propertyId: string,
  roomId: string,
  bedId: string,
  
  // Financial
  rentAmount: number,
  depositPaid: number,
  moveInDate: string,         // YYYY-MM-DD
  
  // Food Preferences
  foodOptIn: boolean,
  breakfastOptIn: boolean,
  lunchOptIn: boolean,
  dinnerOptIn: boolean,
  dietaryPreference?: string
}

Response: TenantProfile
```

### Multi-Step Form Flow

**Step 1: Personal Information**
```
┌─────────────────────────────────────────────────────────┐
│ Check-in Resident                              Step 1/7 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Full Name *                                             │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Amit Patel                                          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Phone Number *                                          │
│ ┌─────────────────────────────────────────────────────┐│
│ │ +91 98000 00001                                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Email                                                   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ amit@example.com                                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Gender                    Date of Birth                 │
│ ┌───────────────────┐    ┌───────────────────────────┐│
│ │ Male          ▼   │    │ 15/01/1995                ││
│ └───────────────────┘    └───────────────────────────┘│
│                                                         │
│ Blood Group                                             │
│ ┌───────────────────┐                                   │
│ │ O+            ▼   │                                   │
│ └───────────────────┘                                   │
│                                                         │
│                                    [Next →]             │
└─────────────────────────────────────────────────────────┘
```

**Step 2: Identity Verification**
- Aadhaar Number (12 digits, optional)
- PAN Number (10 characters, optional)
- Passport Number (optional)

**Step 3: Employment Details**
- Occupation (Working, Student, Other)
- Company/College Name
- Work Address

**Step 4: Emergency Contact**
- Contact Name (required)
- Contact Phone (required)
- Relationship (dropdown)

**Step 5: Room Allocation**
```
┌─────────────────────────────────────────────────────────┐
│ Check-in Resident                              Step 5/7 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Property                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Sunshine PG                                    ▼    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Floor                                                   │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Floor 1 (Ground)                              ▼    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Room                                                    │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 101 (Shared, 2 beds, ₹8,000/mo)              ▼    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Bed                                                     │
│ ┌─────────────────────────────────────────────────────┐│
│ │ B1 (Vacant)                                   ▼    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🤖 Suggest Room                                    ││
│ │ AI-powered recommendation based on gender, budget, ││
│ │ and floor preference                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [← Back]                                    [Next →]   │
└─────────────────────────────────────────────────────────┘
```

**Step 6: Financial Details**
- Monthly Rent (auto-filled from room, editable)
- Security Deposit Amount
- Deposit Paid Amount
- Move-in Date (default: today)

**Step 7: Food Preferences**
- Food Opt-in (toggle, default: true)
- Breakfast (toggle, default: true)
- Lunch (toggle, default: false)
- Dinner (toggle, default: true)
- Dietary Preference (Vegetarian, Non-Vegetarian, Vegan, etc.)

---

## 7.3 View Resident Details

### API Endpoint
```
GET /residents/:id/details
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  profile: TenantProfile,
  room: { id, roomNumber, roomType, rentPerBed } | null,
  bed: { id, bedNumber, rentAmount } | null,
  property: { id, name, address } | null,
  paymentSummary: {
    totalDue: number,
    totalPaid: number,
    totalBalance: number,
    paidCount: number,
    pendingCount: number,
    partialCount: number,
    totalPayments: number
  },
  paymentHistory: RentPayment[],
  recentComplaints: Complaint[]
}
```

### UI Components

**Resident Detail Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to list              ✕                          │
├─────────────────────────────────────────────────────────┤
│  ┌────┐                                                 │
│  │ AP │ Amit Patel                          [active]    │
│  └────┘ Room 101 · Bed B1                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐                       │
│ │ 💳 Monthly   │ │ 🛡️ Deposit   │                       │
│ │ Rent         │ │ Paid         │                       │
│ │ ₹8,000       │ │ ₹10,000      │                       │
│ └──────────────┘ └──────────────┘                       │
│ ┌──────────────┐ ┌──────────────┐                       │
│ │ ⚠️ Balance   │ │ 📅 Move-in   │                       │
│ │ Due          │ │ Date         │                       │
│ │ ₹0           │ │ Jan 15, 2026 │                       │
│ └──────────────┘ └──────────────┘                       │
│                                                         │
│ Payment Trend                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │  [BarChart: Month vs Due/Paid]                      ││
│ │  Jan: Due ₹8k, Paid ₹8k                            ││
│ │  Feb: Due ₹8k, Paid ₹8k                            ││
│ │  Mar: Due ₹8k, Paid ₹6k (partial)                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Personal Information                                    │
│ 📱 +919800000001                                        │
│ ✉️ amit@example.com                                    │
│ 👤 Male                                                 │
│ 📅 DOB: Jan 15, 1995                                   │
│ 💼 Software Engineer at TechCorp                        │
│ 🩸 O+                                                   │
│                                                         │
│ Identity                                                │
│ 🔢 Aadhaar: 1234-5678-9012                             │
│ 🔢 PAN: ABCDE1234F                                     │
│                                                         │
│ Accommodation                                           │
│ 🏠 Sunshine PG                                         │
│ 📍 123 Main St, Mumbai                                 │
│ 🛏️ Room 101 · shared · Bed B1                         │
│                                                         │
│ Emergency Contact                                       │
│ 👤 Rajesh Patel (Father)                               │
│ 📱 +919800000002                                        │
│                                                         │
│ Payment Summary                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                       │
│ │  12 │ │  10 │ │   1 │ │   1 │                       │
│ │Total│ │Paid │ │Part.│ │Pend.│                       │
│ └─────┘ └─────┘ └─────┘ └─────┘                       │
│ Total Due: ₹96,000                                     │
│ Total Paid: ₹94,000                                    │
│ Balance: ₹2,000                                        │
│                                                         │
│ Recent Complaints                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ TKT-001  AC not working    [open]    [urgent]       ││
│ │ TKT-003  WiFi slow         [resolved] [medium]      ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 7.4 Checkout (Remove Resident)

### API Endpoint
```
POST /residents/:id/checkout
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  message: "Resident checked out successfully",
  depositRefund: number,
  checkoutDate: string
}
```

### Pre-Checkout Validation

**Backend checks before allowing checkout:**

1. **Pending Payments Check:**
```sql
SELECT * FROM rent_payments 
WHERE tenant_profile_id = ? 
AND payment_status IN ('pending', 'overdue', 'partial')
```
If pending payments exist → Return 400 error with details

2. **Pending Complaints Check:**
```sql
SELECT * FROM complaints 
WHERE tenant_profile_id = ? 
AND status IN ('open', 'in_progress')
```
If pending complaints exist → Return 400 error with details

### Step-by-Step Flow

1. **Owner Clicks "Checkout" on Resident Detail**
2. **Confirmation Modal Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Checkout Resident                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Are you sure you want to check out Amit Patel?          │
│                                                         │
│ Details:                                                │
│ • Room: 101, Bed: B1                                    │
│ • Move-in: Jan 15, 2026 (6 months)                     │
│ • Pending Balance: ₹2,000                               │
│ • Deposit Refund: ₹8,000                                │
│                                                         │
│ ⚠️ This action cannot be undone.                        │
│                                                         │
│                    [Cancel]  [Confirm Checkout]         │
└─────────────────────────────────────────────────────────┘
```

3. **Owner Confirms Checkout**
4. **API Call:** `POST /residents/:id/checkout`
5. **Backend Processing:**
   - Validates no pending payments/complaints
   - Calculate deposit refund: `depositPaid - depositBalance`
   - Update `tenant_profiles`:
     - `status: "checked_out"`
     - `moveOutDate: today`
   - Update `beds`:
     - `status: "vacant"`
     - `currentTenantId: null`
   - Update `rooms`:
     - `occupiedBeds: occupiedBeds - 1`
     - `vacantBeds: vacantBeds + 1`
   - Update `properties`:
     - `occupiedBeds: occupiedBeds - 1`
     - `vacantBeds: vacantBeds + 1`
   - Create activity log entry

6. **Response:** Success message with deposit refund

7. **UI Update:**
   - Close detail panel
   - Refresh residents list
   - Show success toast with refund amount

---

# 8. Smart Room Allocation

## 8.1 AI Room Suggestions

### User Story
As an owner, I want AI-powered room suggestions so that I can quickly find the best room for a new resident based on gender, budget, and preferences.

### API Endpoint
```
POST /allocation/suggest
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  gender?: "male" | "female",
  isCouple?: boolean,
  budget?: number,
  floorPreference?: number,
  propertyId?: string
}

Response: {
  property: { id: string, name: string },
  filters: { gender, isCouple, budget, floorPreference },
  suggestions: [{
    roomId: string,
    roomNumber: string,
    floorNumber: number,
    floorName: string,
    roomType: string,
    totalBeds: number,
    vacantBeds: number,
    rentPerBed: number,
    depositAmount: number,
    currentGenders: string[],
    occupants: [{ name: string, gender: string }],
    vacantBedIds: [{ bedId: string, bedNumber: string }]
  }]
}
```

### Suggestion Algorithm

```typescript
// Step 1: Get all rooms with vacant beds
let suggestions = rooms.filter(r => r.vacantBeds > 0);

// Step 2: Couple handling
if (isCouple) {
  suggestions = suggestions.filter(r => 
    r.roomType === 'single' || r.roomType === 'couple'
  );
  // Fallback: rooms with 2 vacant beds
  if (suggestions.length === 0) {
    suggestions = rooms.filter(r => r.vacantBeds >= 2 && r.totalBeds <= 2);
  }
}

// Step 3: Gender-based allocation
else if (gender === 'male' || gender === 'female') {
  suggestions = suggestions.filter(r => {
    // Empty rooms are always ok
    if (r.currentGenders.length === 0) return true;
    // Room has same-gender occupants
    if (r.currentGenders.length === 1 && r.currentGenders[0] === gender) return true;
    return false;
  });
}

// Step 4: Budget filter
if (budget) {
  suggestions = suggestions.filter(r => r.rentPerBed <= budget);
}

// Step 5: Floor preference (sort by proximity)
if (floorPreference) {
  suggestions.sort((a, b) => {
    const aDist = Math.abs(a.floorNumber - floorPreference);
    const bDist = Math.abs(b.floorNumber - floorPreference);
    return aDist - bDist;
  });
} else {
  // Default: prefer rooms with fewer occupants (more privacy)
  suggestions.sort((a, b) => a.occupants.length - b.occupants.length);
}

return suggestions.slice(0, 10); // Top 10 suggestions
```

### Scoring System (Future Enhancement)
| Factor | Points | Description |
|--------|--------|-------------|
| Same floor preference | +20 | Matches requested floor |
| Budget match | +30 | Within ±10% of budget |
| Gender match | +25 | Same gender as occupants |
| Vacancy rate | +15 | Prefer less empty rooms |
| Recent move-ins | +10 | Prefer rooms with activity |

---

## 8.2 Room Allocation Preview

### UI Components

**Allocation Suggestions Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 AI Room Suggestions                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Filters: Male · Budget ₹10,000 · Floor 1               │
│                                                         │
│ Suggestion 1 (Best Match)                               │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Room 102 · Shared · Floor 1                         ││
│ │ Vacant: 1 bed · Rent: ₹8,000/mo                    ││
│ │ Current: Male (1 occupant)                          ││
│ │                                                     ││
│ │ Score: 85/100                                       ││
│ │ ✅ Gender match  ✅ Budget match  ✅ Floor match    ││
│ │                                                     ││
│ │ [Select This Room]                                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Suggestion 2                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Room 105 · Shared · Floor 1                         ││
│ │ Vacant: 2 beds · Rent: ₹7,500/mo                   ││
│ │ Current: Empty                                      ││
│ │                                                     ││
│ │ Score: 75/100                                       ││
│ │ ✅ Budget match  ✅ Floor match  ⚠️ No occupants    ││
│ │                                                     ││
│ │ [Select This Room]                                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 9. Payments Management

## 9.1 Payments List

### User Story
As an owner, I want to see all rent payments across my properties so that I can track collection and follow up on pending payments.

### API Endpoint
```
GET /payments?page=1&limit=50&status=pending
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  data: RentPayment[],
  pagination: { total, page, limit }
}

GET /payments/summary
Response: {
  totalExpected: number,
  totalCollected: number,
  totalPending: number,
  collectionRate: string
}
```

### Payment Data Model
```typescript
{
  id: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  tenantProfileId: string;
  monthYear: string;           // "2026-07"
  dueDate: string;             // "2026-07-05"
  paidDate?: string;
  rentAmount: number;
  electricityCharge: number;
  waterCharge: number;
  foodCharge: number;
  maintenanceCharge: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod?: string;
  transactionId?: string;
  paymentGateway?: string;
  paymentStatus: string;       // "pending" | "paid" | "partial" | "overdue" | "confirmed"
  receiptNumber?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  tenantName?: string;
  roomNumber?: string;
}
```

### UI Components

**Summary Cards (3 cards):**
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ ✅              │ │ ⏳              │ │ ⚠️              │
│ ₹1,24,000       │ │ ₹18,000         │ │ ₹8,000          │
│ Total Collected │ │ Pending         │ │ Overdue         │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Payments Table:**
| Column | Description |
|--------|-------------|
| Tenant | Name + Room |
| Period | Month/Year |
| Total | Total amount due |
| Paid | Amount paid |
| Balance | Outstanding balance |
| Status | Badge (paid/pending/overdue) |
| Due Date | Payment due date |

---

## 9.2 Record Payment

### API Endpoint
```
POST /payments/:id/pay
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  paidAmount: number,
  paymentMethod: "cash" | "upi_direct" | "neft_imps" | "cheque",
  transactionId?: string
}

Response: Updated payment record
```

### Step-by-Step Flow

1. **Owner Clicks "Record Payment" on Payment Row**
2. **Payment Modal Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ Record Payment                                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Period: July 2026                                       │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Total Due:        ₹8,000                            ││
│ │ Already Paid:     ₹0                                ││
│ │ ─────────────────────────────────────────────────── ││
│ │ Balance:          ₹8,000                            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Amount to Record *                                      │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ₹ 8,000                                             ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Payment Method                                          │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Cash                                            ▼  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Transaction ID (optional)                               │
│ ┌─────────────────────────────────────────────────────┐│
│ │ e.g. UPI ref, cheque number                        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                              [Cancel]  [Record Payment] │
└─────────────────────────────────────────────────────────┘
```

3. **Owner Enters Payment Details**
   - Amount cannot exceed remaining balance
   - Payment method selection
   - Optional transaction reference

4. **API Call:** `POST /payments/:id/pay`

5. **Backend Processing:**
   - Validates amount ≤ balance
   - Updates `rent_payments`:
     - `paidAmount: paidAmount + newAmount`
     - `balanceAmount: totalAmount - newPaidAmount`
     - `paymentStatus`: Update based on balance
       - balance === 0 → "paid"
       - balance > 0 && paidAmount > 0 → "partial"
       - balance > 0 && dueDate < today → "overdue"
     - `paidDate`: Set if fully paid
     - `paymentMethod`: Store method
     - `transactionId`: Store reference
   - Creates activity log entry
   - Broadcasts WebSocket update (if connected)

6. **Response:** Updated payment record

7. **UI Update:**
   - Close modal
   - Refresh payments list
   - Show success toast

### Edge Cases
- **Amount exceeds balance:** Return error "Amount cannot exceed balance due"
- **Zero amount:** Return error "Amount must be greater than zero"
- **Already fully paid:** Return error "Payment already completed"
- **Partial payment:** Allow, update status to "partial"

---

# 10. Invoice Generation

## 10.1 Calculate Billing

### User Story
As an owner, I want to calculate billing for a resident so that I can generate accurate invoices with all applicable charges.

### API Endpoint
```
POST /payments-proof/billing/calculate
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  tenantProfileId: string,
  monthYear: string            // "2026-07"
}

Response: {
  rentAmount: number,
  electricityCharge: number,
  waterCharge: number,
  foodCharge: number,
  maintenanceCharge: number,
  lateFee: number,
  discount: number,
  totalAmount: number
}
```

### Billing Calculation Logic

```typescript
// Step 1: Get base rent from room
const rentAmount = tenantProfile.rentAmount;

// Step 2: Get configurable charges from billing_config
const billingConfig = db.select().from(billingConfigs)
  .where(eq(billingConfigs.tenantId, tenantId))
  .get();

const electricityCharge = billingConfig?.electricityCharge || 0;
const waterCharge = billingConfig?.waterCharge || 0;
const maintenanceCharge = billingConfig?.maintenanceCharge || 0;

// Step 3: Calculate food charge based on opt-in preferences
function calculateFoodCharge(profile: TenantProfile): number {
  const foodConfig = billingConfig?.foodConfig || {};
  let charge = 0;
  if (profile.breakfastOptIn) charge += foodConfig.breakfastRate || 0;
  if (profile.lunchOptIn) charge += foodConfig.lunchRate || 0;
  if (profile.dinnerOptIn) charge += foodConfig.dinnerRate || 0;
  return charge;
}

const foodCharge = calculateFoodCharge(tenantProfile);

// Step 4: Calculate late fee (if overdue)
const dueDate = new Date(`${monthYear}-05`); // 5th of month
const today = new Date();
const lateFee = today > dueDate && balanceAmount > 0 
  ? calculateLateFee(totalAmount, daysOverdue) 
  : 0;

// Step 5: Apply discount (if any)
const discount = tenantProfile.discount || 0;

// Step 6: Calculate total
const totalAmount = rentAmount + electricityCharge + waterCharge + 
                    foodCharge + maintenanceCharge + lateFee - discount;
```

---

## 10.2 Generate Invoice

### API Endpoint
```
POST /payments-proof/invoices/generate
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  tenantProfileId: string,
  monthYear: string,
  charges: {
    rentAmount: number,
    electricityCharge?: number,
    waterCharge?: number,
    foodCharge?: number,
    maintenanceCharge?: number,
    lateFee?: number,
    discount?: number
  }
}

Response: Invoice object
```

### Invoice Data Model
```typescript
{
  id: string;
  invoiceNumber: string;      // "INV-2026-001"
  tenantProfileId: string;
  monthYear: string;
  rentAmount: number;
  electricityCharge: number;
  waterCharge: number;
  foodCharge: number;
  maintenanceCharge: number;
  lateFee: number;
  discount: number;
  totalAmount: number;
  status: string;             // "draft" | "sent" | "paid" | "overdue"
  dueDate: string;
  createdAt: string;
}
```

### UI Components

**Invoice Generation Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ Generate Invoice - July 2026                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Resident: Amit Patel (Room 101, Bed B1)                 │
│                                                         │
│ Charge Breakdown                                        │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Monthly Rent              ₹8,000                    ││
│ │ Electricity Charge        ₹500                      ││
│ │ Water Charge              ₹200                      ││
│ │ Food Charge               ₹3,000                    ││
│ │ Maintenance Charge        ₹300                      ││
│ │ ─────────────────────────────────────────────────── ││
│ │ Subtotal                  ₹12,000                   ││
│ │ Late Fee                  ₹0                        ││
│ │ Discount                  ₹0                        ││
│ │ ═══════════════════════════════════════════════════ ││
│ │ Total Amount              ₹12,000                   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Due Date: July 5, 2026                                  │
│                                                         │
│                    [Cancel]  [Generate Invoice]         │
└─────────────────────────────────────────────────────────┘
```

---

# 11. Payment Proof Verification

## 11.1 Upload Proof (Resident)

### API Endpoint
```
POST /payments-proof/proofs
Headers: Authorization: Bearer <token>, Content-Type: multipart/form-data
Role: resident

Request: {
  rentPaymentId: string,
  file: File,                  // Screenshot/image
  transactionId: string,
  amount: number,
  paymentMethod: string
}

Response: Proof record
```

### Proof Data Model
```typescript
{
  id: string;
  rentPaymentId: string;
  tenantProfileId: string;
  fileUrl: string;
  fileName: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  status: string;             // "pending" | "confirmed" | "rejected"
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}
```

---

## 11.2 Verify Proof (Owner)

### API Endpoint
```
GET /payments-proof/proofs
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Proof[]

POST /payments-proof/proofs/:id/verify
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  status: "confirmed" | "rejected",
  notes?: string
}

Response: Updated proof record
```

### Step-by-Step Flow

**Owner Verification Queue:**
```
┌─────────────────────────────────────────────────────────┐
│ Payment Proofs - Verification Queue (3 pending)         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📷 [Screenshot]  Amit Patel | Room 101              ││
│ │                ₹8,000 | UPI Ref: txn_12345          ││
│ │                2 hours ago                           ││
│ │                                                     ││
│ │                [✅ Verify] [❌ Reject] [🔍 Zoom]     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📷 [Screenshot]  Priya Sharma | Room 103            ││
│ │                ₹8,000 | UPI Ref: txn_67890          ││
│ │                5 hours ago                           ││
│ │                                                     ││
│ │                [✅ Verify] [❌ Reject] [🔍 Zoom]     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Verification Flow:**
1. **Owner Clicks "Verify"** on proof
2. **Confirmation Dialog:**
```
┌─────────────────────────────────────────────────────────┐
│ Confirm Payment Verification                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Verify payment from Amit Patel?                         │
│                                                         │
│ Amount: ₹8,000                                          │
│ Transaction ID: txn_12345                                │
│ Payment Method: UPI                                     │
│                                                         │
│ Notes (optional):                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Verified against bank statement                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                    [Cancel]  [Confirm]                  │
└─────────────────────────────────────────────────────────┘
```

3. **Owner Confirms**
4. **API Call:** `POST /payments-proof/proofs/:id/verify`
5. **Backend Processing:**
   - Updates proof status to "confirmed"
   - Updates payment record:
     - `paidAmount: paidAmount + proof.amount`
     - `paymentStatus: "confirmed"` (if fully paid)
     - `transactionId: proof.transactionId`
   - Generates receipt
   - Notifies resident
6. **UI Update:** Remove from queue, show success toast

---

# 12. Receipt Generation

## 12.1 Generate Receipt

### User Story
As an owner or tenant, I want to generate/print rent receipts so that I have proof of payment.

### API Endpoints
```
GET /payments-proof/receipts
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Receipt[]

GET /payments-proof/receipts/my
Headers: Authorization: Bearer <token>
Role: resident

Response: Receipt[]
```

### Receipt Template

**HTML Receipt (for printing):**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Rent Receipt - July 2026</title>
  <style>
    /* Professional receipt styling */
    .receipt { max-width: 600px; margin: 0 auto; border: 2px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #059669, #047857); color: white; padding: 24px; text-align: center; }
    .body { padding: 24px; }
    .section { margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row { background: #f0fdf4; padding: 12px 24px; border-top: 2px solid #d1fae5; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Sunshine PG</h1>
      <p>123 Main St, Mumbai</p>
      <p style="margin-top: 8px; font-weight: 600;">RENT RECEIPT</p>
    </div>
    <div class="body">
      <div class="section">
        <div class="section-title">Receipt Details</div>
        <div class="row"><span>Receipt Date</span><span>July 13, 2026</span></div>
        <div class="row"><span>Billing Period</span><span>July 2026</span></div>
        <div class="row"><span>Status</span><span class="status-paid">PAID</span></div>
      </div>
      <div class="section">
        <div class="section-title">Tenant Details</div>
        <div class="row"><span>Name</span><span>Amit Patel</span></div>
        <div class="row"><span>Room</span><span>Room 101 · Bed B1</span></div>
        <div class="row"><span>Phone</span><span>+919800000001</span></div>
      </div>
      <div class="section">
        <div class="section-title">Payment Breakdown</div>
        <div class="row"><span>Monthly Rent</span><span>₹8,000</span></div>
        <div class="row"><span>Total Amount</span><span>₹8,000</span></div>
        <div class="row"><span>Amount Paid</span><span style="color: #059669;">₹8,000</span></div>
        <div class="row"><span>Payment Date</span><span>July 10, 2026</span></div>
        <div class="row"><span>Payment Method</span><span>UPI</span></div>
      </div>
      <div class="total-row">
        <div class="row"><span style="font-weight: 700;">Amount Paid</span><span style="color: #059669; font-size: 18px;">₹8,000</span></div>
      </div>
    </div>
    <div class="footer">
      <p>This is a computer-generated receipt. No signature required.</p>
      <p>Opsora — Property Management System</p>
    </div>
  </div>
</body>
</html>
```

### Flow
1. **Owner Clicks Print Icon on Payment Record**
2. **Browser Opens New Window** with formatted receipt
3. **User Can Print** using browser's print dialog
4. **Receipt includes:** All payment details, formatted for A4 paper

---

# 13. Payment Reminders

## 13.1 Send Reminder

### User Story
As an owner, I want to send payment reminders to residents with pending payments so that I can collect rent on time.

### API Endpoints
```
POST /payments-proof/reminders
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  tenantProfileId: string,
  monthYear: string,
  message?: string
}

Response: Reminder record

POST /payments-proof/reminders/bulk
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId?: string,
  monthYear: string,
  message?: string
}

Response: { sent: number, failed: number }

GET /payments-proof/reminders
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Reminder[]
```

### Reminder Data Model
```typescript
{
  id: string;
  tenantProfileId: string;
  monthYear: string;
  message: string;
  sentBy: string;             // Owner's user ID
  sentAt: string;
  channel: string;            // "in_app" | "sms" | "email" | "whatsapp"
  status: string;             // "sent" | "delivered" | "failed"
}
```

### Step-by-Step Flow

**Single Reminder:**
1. **Owner Clicks "Send Reminder"** on pending payment
2. **Reminder Modal Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ Send Payment Reminder                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ To: Amit Patel (Room 101)                               │
│ Period: July 2026                                       │
│ Amount Due: ₹8,000                                      │
│                                                         │
│ Message:                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Dear Amit,                                          ││
│ │                                                      ││
│ │ This is a reminder that your rent payment of ₹8,000 ││
│ │ for July 2026 is due on July 5, 2026.               ││
│ │                                                      ││
│ │ Please make the payment at your earliest convenience.││
│ │                                                      ││
│ │ Regards,                                             ││
│ │ Sunshine PG Management                               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Send via: [✓] In-App  [ ] SMS  [ ] Email  [ ] WhatsApp  │
│                                                         │
│                              [Cancel]  [Send Reminder]  │
└─────────────────────────────────────────────────────────┘
```

3. **Owner Customizes Message** and selects channels
4. **API Call:** `POST /payments-proof/reminders`
5. **Backend Processing:**
   - Creates reminder record
   - Sends via selected channels (if configured)
   - Logs activity
6. **Response:** Reminder record
7. **UI Update:** Show success toast

**Bulk Reminders:**
1. **Owner Clicks "Send Bulk Reminders"**
2. **Confirmation Dialog:** "Send reminders to {count} residents with pending payments?"
3. **API Call:** `POST /payments-proof/reminders/bulk`
4. **Backend:** Processes all pending payments, sends reminders
5. **Response:** `{ sent: 25, failed: 2 }`

---

# 14. Billing Configuration

## 14.1 View Billing Config

### User Story
As an owner, I want to configure billing settings for my properties so that I can automate invoice generation with correct charges.

### API Endpoint
```
GET /payments-proof/billing-config
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: BillingConfig
```

### Billing Config Data Model
```typescript
{
  id: string;
  tenantId: string;
  propertyId?: string;        // null = applies to all properties
  
  // Default charges
  electricityCharge: number;  // Fixed charge per month
  waterCharge: number;
  maintenanceCharge: number;
  
  // Food charges
  foodConfig: {
    breakfastRate: number;
    lunchRate: number;
    dinnerRate: number;
  };
  
  // Late fee configuration
  lateFeeConfig: {
    enabled: boolean;
    gracePeriodDays: number;  // Days after due date before late fee
    feeType: "fixed" | "percentage";
    feeValue: number;         // Fixed amount or percentage
    maxLateFee: number;       // Cap on late fee
  };
  
  // Payment terms
  dueDayOfMonth: number;     // Day payment is due (e.g., 5)
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 14.2 Update Billing Config

### API Endpoint
```
PUT /payments-proof/billing-config
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: Partial<BillingConfig>
Response: Updated BillingConfig
```

### UI Components

**Billing Settings Form:**
```
┌─────────────────────────────────────────────────────────┐
│ Billing Configuration                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Default Monthly Charges                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Electricity Charge        ₹500                      ││
│ │ Water Charge              ₹200                      ││
│ │ Maintenance Charge        ₹300                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Food Charges                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Breakfast Rate            ₹30/day                   ││
│ │ Lunch Rate                ₹50/day                   ││
│ │ Dinner Rate               ₹40/day                   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Late Fee Configuration                                  │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Enable Late Fees          [✓]                       ││
│ │ Grace Period              5 days                    ││
│ │ Fee Type                  Percentage            ▼   ││
│ │ Fee Value                 2%                        ││
│ │ Maximum Late Fee          ₹500                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Payment Terms                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Due Day of Month          5th                       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                                        [Save Changes]   │
└─────────────────────────────────────────────────────────┘
```

---

# 15. Complaints / Service Desk

## 15.1 Complaints List

### User Story
As an owner, I want to see all complaints across my properties so that I can track resolution and assign staff.

### API Endpoint
```
GET /complaints
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  data: Complaint[],
  pagination: { total, page, limit }
}
```

### Complaint Data Model
```typescript
{
  id: string;
  propertyId: string;
  roomId?: string;
  bedId?: string;
  tenantProfileId?: string;
  ticketNumber: string;       // "TKT-001"
  category: string;           // "plumbing" | "electrical" | etc.
  priority: string;           // "urgent" | "high" | "medium" | "low"
  title: string;
  description: string;
  status: string;             // "open" | "in_progress" | "resolved" | "closed"
  assignedTo?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  resolutionNotes?: string;
  tenantRating?: number;      // 1-5
  tenantFeedback?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  tenantName?: string;
  roomNumber?: string;
  propertyName?: string;
  comments?: Comment[];
}
```

### UI Components

**Service Desk Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Service Desk                              [+ Create]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │  15 │ │  8  │ │  4  │ │  3  │ │  2  │               │
│ │Total│ │New  │ │In P.│ │Resv.│ │Urgnt│               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                         │
│ Filters: [Search] [Status ▼] [Priority ▼] [Category ▼] │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🔧  TKT-001  [P1-URGENT] [OPEN]                    ││
│ │ AC not working in Room 205                          ││
│ │ 👤 Priya Sharma · 📍 Room 205 · 🕐 2h ago          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📶  TKT-002  [P2-HIGH] [IN_PROGRESS]               ││
│ │ WiFi connectivity issues on Floor 2                 ││
│ │ 👤 Amit Patel · 📍 Room 101 · 🕐 1d ago            ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 15.2 Complaint Status Workflow

### Status Flow
```
┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│   New   │────▶│ In Progress  │────▶│ Resolved │────▶│  Closed  │
│ (open)  │     │(in_progress) │     │(resolved)│     │ (closed) │
└─────────┘     └──────────────┘     └──────────┘     └──────────┘
```

### Status Transitions
| From | To | Trigger | Actor |
|------|-----|---------|-------|
| New | In Progress | Staff assigned | Owner |
| In Progress | Resolved | Issue fixed | Staff |
| Resolved | Closed | Tenant confirms | Tenant |
| Resolved | Closed | Auto-close (30 days) | System |

### UI: Status Progress Bar
```
● New ──▶ ● In Progress ──▶ ● Resolved ──▶ ● Closed
  ✓           ✓                ○              ○
```

---

## 15.3 Complaint Assignment

### API Endpoint
```
GET /staff/list
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: [{
  id: string,
  fullName: string,
  role: string,
  phone: string,
  openTicketCount: number
}]

PATCH /complaints/:id/status
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  status: "in_progress",
  assignedTo: string
}

Response: Updated complaint
```

### Step-by-Step Flow

1. **Owner Opens Complaint Detail**
2. **Clicks "Select Staff Member"** or "Reassign"
3. **Dropdown Opens** showing:
   - Staff avatar and name
   - Role and phone
   - Current open ticket count
4. **Owner Selects Staff Member**
5. **API Call:** `PATCH /complaints/:id/status`
6. **Backend Processing:**
   - Updates complaint status to "in_progress"
   - Sets `assignedTo` and `assignedAt`
   - Creates activity log
   - Notifies staff member
7. **UI Update:** Refresh detail panel

### Staff Dropdown UI
```
┌─────────────────────────────────────────────────────────┐
│ Select Staff Member                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Rajesh Kumar · Maintenance                       ││
│ │    📱 +919800000003 · 2 open tickets               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Suresh Yadav · Security                          ││
│ │    📱 +919800000004 · 1 open ticket                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 15.4 Complaint Comments

### API Endpoint
```
POST /complaints/:id/comments
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  comment: string,
  isInternal?: boolean        // Internal note (not visible to tenant)
}

Response: Comment object
```

### Comment Types
| Type | Visibility | Use Case |
|------|------------|----------|
| Public | Tenant, Staff, Owner | Status updates, questions |
| Internal | Staff, Owner only | Notes, coordination |

### UI Components

**Comment Input:**
```
┌─────────────────────────────────────────────────────────┐
│ [✓] Internal note (not visible to tenant)               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Add a comment...                              [Send]││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Comment Timeline:**
```
┌─────────────────────────────────────────────────────────┐
│ Activity Timeline                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🟢 Ticket created                                       │
│    July 13, 2026 10:30 AM                               │
│                                                         │
│ 🟡 Assigned to Rajesh Kumar                             │
│    July 13, 2026 11:00 AM                               │
│                                                         │
│ 💬 Rajesh Kumar: "On my way to check the AC unit"       │
│    July 13, 2026 11:15 AM                               │
│                                                         │
│ 🟡 [Internal] Checked AC filter - needs replacement     │
│    July 13, 2026 11:30 AM                               │
│                                                         │
│ 🟢 Resolved                                             │
│    July 13, 2026 2:00 PM                                │
│    Resolution: Replaced AC filter and cleaned unit      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 16. IoT Water Dashboard

## 16.1 Water Consumption Overview

### User Story
As an owner, I want to monitor water consumption across my properties so that I can detect leaks and manage tanker orders.

### API Endpoints
```
GET /iot/water-tanks
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: WaterTank[]

GET /iot/analytics/water?propertyId=&days=30
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  totalConsumption: number,      // Liters
  averageDaily: number,
  peakUsage: number,
  tankFillEvents: number,
  readings: [{
    date: string,
    consumption: number,
    level: number
  }]
}

GET /iot/analytics/water/daily?date=2026-07-13
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  hourlyReadings: [{
    hour: number,
    consumption: number,
    level: number
  }],
  totalConsumption: number,
  anomalies: [{
    time: string,
    reason: string
  }]
}
```

### Water Tank Data Model
```typescript
{
  id: string;
  tenantId: string;
  propertyId: string;
  name: string;                // "Main Overhead Tank"
  tankType: string;            // "overhead" | "underground"
  capacityLiters: number;
  sensorId?: string;
  location?: string;
  lowLevelAlert: number;       // Percentage (default: 20)
  criticalLevelAlert: number;  // Percentage (default: 10)
  overflowAlert: boolean;      // Default: true
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### UI Components

**Water Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Water IoT Dashboard                                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────┐ │
│ │ 💧 12,500L  │ │ 📊 416L     │ │ 📈 850L     │ │ 🚛 │ │
│ │ Total       │ │ Daily Avg   │ │ Peak        │ │ 2  │ │
│ │ Consumption │ │             │ │ Usage       │ │    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Water Consumption (Last 30 Days)                    ││
│ │  [LineChart: Date vs Consumption]                   ││
│ │  🟢 Green = Low  🟡 Yellow = Moderate  🔴 Red = High ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Tank Status                                             │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Main Overhead Tank          Last updated: 5m ago    ││
│ │ ┌─────────────────────────────────────────────────┐││
│ │ │████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░│││
│ │ │            65% (3,250L / 5,000L)                │││
│ │ └─────────────────────────────────────────────────┘││
│ │ Status: Normal                                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 16.2 Tank Level Widget

### Visual Representation
```
┌─────────────────────────────────────────────────────────┐
│ Main Overhead Tank                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────┐                    │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← Empty (Red)     │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│                    │
│  │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← Low (Yellow)    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│                    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Normal (Green)  │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│                    │
│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← Full (Blue)     │
│  └─────────────────────────────────┘                    │
│                                                         │
│  Current Level: 65%                                     │
│  Volume: 3,250L / 5,000L                                │
│  Status: ✅ Normal                                      │
│  Last Reading: 5 minutes ago                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Color Coding
| Level | Color | Status |
|-------|-------|--------|
| > 50% | Green | Normal |
| 20-50% | Yellow | Low |
| 10-20% | Orange | Critical |
| < 10% | Red | Emergency |
| > 95% | Blue | Near Overflow |

---

## 16.3 Calendar Date Picker

### UI Component
```
┌─────────────────────────────────────────────────────────┐
│ Daily Breakdown - July 13, 2026                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [← Jul 12]  July 13, 2026  [Jul 14 →]                 │
│                                                         │
│ Hourly Consumption                                      │
│  ┌─────────────────────────────────────────────────────┐│
│  │  1200L│     ▓                                       ││
│  │  1000L│     ▓                                       ││
│  │   800L│  ▓  ▓     ▓                                 ││
│  │   600L│  ▓  ▓  ▓  ▓  ▓                             ││
│  │   400L│  ▓  ▓  ▓  ▓  ▓  ▓  ▓                       ││
│  │   200L│  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓  ▓       ││
│  │     0L├─────────────────────────────────────────────││
│  │        6  8  10 12 14 16 18 20 22 24               ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│ Total: 4,250L                                          │
│ Peak Hour: 8:00 AM (1,200L)                            │
│ Anomalies: None                                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 17. IoT Electricity Dashboard

## 17.1 Electricity Consumption Overview

### User Story
As an owner, I want to monitor electricity consumption like a stock market dashboard so that I can track usage patterns and costs.

### API Endpoints
```
GET /iot/electricity-meters
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: ElectricityMeter[]

GET /iot/analytics/electricity?propertyId=&days=30
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  totalConsumption: number,      // kWh
  averageDaily: number,
  peakLoad: number,              // kW
  totalCost: number,             // ₹
  readings: [{
    date: string,
    consumption: number,
    cost: number
  }]
}

GET /iot/analytics/electricity/daily?date=2026-07-13
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  hourlyReadings: [{
    hour: number,
    powerKw: number,
    consumption: number,
    cost: number
  }],
  totalConsumption: number,
  totalCost: number,
  peakHour: string
}
```

### Electricity Meter Data Model
```typescript
{
  id: string;
  tenantId: string;
  propertyId: string;
  meterNumber: string;         // "M-001"
  meterType: string;           // "main" | "floor" | "room"
  floorId?: string;
  roomId?: string;
  sensorId?: string;
  maxCapacityKw?: number;
  costPerUnit: number;         // ₹ per kWh (default: 7.50)
  fixedCharge: number;         // Monthly fixed charge
  highUsageAlert: number;      // Daily threshold in kWh
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### UI Components

**Electricity Dashboard (Stock Market Style):**
```
┌─────────────────────────────────────────────────────────┐
│ Electricity IoT Dashboard                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────┐ │
│ │ ⚡ 2,450    │ │ 📊 81.7     │ │ 📈 12.5     │ │ ₹  │ │
│ │ Total kWh   │ │ Daily Avg   │ │ Peak Load   │ │18k │ │
│ │             │ │             │ │             │ │    │ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────┘ │
│                                                         │
│ Power Consumption (Stock Market Style)                  │
│ ┌─────────────────────────────────────────────────────┐│
│ │  15kW│                                               ││
│ │      │     ╱╲    ╱╲                                 ││
│ │  10kW│    ╱  ╲  ╱  ╲    ╱╲                         ││
│ │      │   ╱    ╲╱    ╲  ╱  ╲                        ││
│ │   5kW│  ╱            ╲╱    ╲                       ││
│ │      │ ╱                  ╲                        ││
│ │    0L├─────────────────────────────────────────────││
│ │       6  8  10 12 14 16 18 20 22 24               ││
│ │                                                     ││
│ │  🔴 High Usage   🟡 Normal   🟢 Low                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Cost Trend                                              │
│ ┌─────────────────────────────────────────────────────┐│
│ │  Today: ₹1,245  │  This Month: ₹18,450             ││
│ │  ↑ 5% vs yesterday │  ↓ 3% vs last month           ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 17.2 Stock Market Style Chart

### Visual Elements
- **Real-time power indicator** with sparkline mini-chart
- **Color-coded bars:** Green (low usage), Yellow (moderate), Red (high usage)
- **Cost trend** with up/down arrows showing cost vs previous period
- **Calendar date picker** for viewing historical data

### Chart Implementation
```tsx
<AreaChart data={readings}>
  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
  <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
  <YAxis tick={{ fontSize: 12 }} />
  <Tooltip />
  <Area 
    type="monotone" 
    dataKey="powerKw" 
    stroke="#059669" 
    fill="#D1FAE5" 
    strokeWidth={2} 
  />
</AreaChart>
```

---

# 18. IoT Device Management

## 18.1 Water Tank Management

### API Endpoints
```
POST /iot/water-tanks
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId: string,
  name: string,
  tankType: "overhead" | "underground",
  capacityLiters: number,
  sensorId?: string,
  location?: string,
  lowLevelAlert?: number,
  criticalLevelAlert?: number,
  overflowAlert?: boolean
}

Response: WaterTank

PUT /iot/water-tanks/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: Partial<WaterTank>
Response: Updated WaterTank

POST /iot/water-tanks/:id/readings
Headers: Authorization: Bearer <token>
Role: owner | admin (or IoT device)

Request: {
  levelPercentage: number,
  levelLiters: number,
  temperature?: number,
  consumptionLiters?: number,
  flowRate?: number,
  timestamp?: string
}

Response: Reading record
```

---

## 18.2 Electricity Meter Management

### API Endpoints
```
POST /iot/electricity-meters
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId: string,
  meterNumber: string,
  meterType: "main" | "floor" | "room",
  floorId?: string,
  roomId?: string,
  sensorId?: string,
  maxCapacityKw?: number,
  costPerUnit?: number,
  fixedCharge?: number,
  highUsageAlert?: number
}

Response: ElectricityMeter

PUT /iot/electricity-meters/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: Partial<ElectricityMeter>
Response: Updated ElectricityMeter

POST /iot/electricity-meters/:id/readings
Headers: Authorization: Bearer <token>
Role: owner | admin (or IoT device)

Request: {
  powerKw: number,
  voltage?: number,
  currentAmp?: number,
  frequency?: number,
  powerFactor?: number,
  totalKwh: number,
  dailyKwh?: number,
  estimatedCost?: number,
  timestamp?: string
}

Response: Reading record
```

---

## 18.3 Tanker Orders

### API Endpoints
```
POST /iot/tanker-orders
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  tankId: string,
  orderDate: string,
  supplierName?: string,
  supplierPhone?: string,
  orderedLiters: number,
  deliveredLiters?: number,
  actualAddedLiters?: number,
  costPerTanker?: number,
  totalCost?: number,
  notes?: string
}

Response: TankerOrder

PATCH /iot/tanker-orders/:id
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  status?: "ordered" | "delivered" | "verified",
  deliveredLiters?: number,
  actualAddedLiters?: number,
  verifiedBy?: string,
  notes?: string
}

Response: Updated TankerOrder
```

### Tanker Order Flow
1. **Owner Creates Order:** When tank level is low
2. **Supplier Delivers:** Owner updates with delivered amount
3. **Owner Verifies:** Confirms actual liters added to tank
4. **System Updates:** Tank readings adjust automatically

---

# 19. Food Management

## 19.1 Food Menu Management

### API Endpoints
```
POST /food/menus
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId: string,
  date: string,
  mealType: "breakfast" | "lunch" | "snacks" | "dinner",
  items: [{ name: string, quantity?: string }],
  isSpecial: boolean,
  specialName?: string
}

Response: Menu object

GET /food/menus?date=2026-07-13
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Menu[]

GET /food/menus/upcoming
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: Menu[]
```

### Menu Data Model
```typescript
{
  id: string;
  propertyId: string;
  date: string;                // "2026-07-13"
  mealType: string;            // "breakfast" | "lunch" | "snacks" | "dinner"
  items: string;               // JSON array of items
  isSpecial: boolean;
  specialName?: string;
  createdAt: string;
  updatedAt: string;
}
```

### UI Components

**Menu Management:**
```
┌─────────────────────────────────────────────────────────┐
│ Food Menu Management                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Date: [July 13, 2026 ▼]  Property: [Sunshine PG ▼]     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🍳 Breakfast (7:30 - 9:00 AM)          [Edit] [🗑️] ││
│ │ • Poha                                              ││
│ │ • Boiled Eggs                                       ││
│ │ • Tea/Coffee                                        ││
│ │ • Fruit Bowl                                        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🍛 Lunch (12:30 - 2:00 PM)              [Edit] [🗑️] ││
│ │ • Rice                                              ││
│ │ • Dal Makhani                                       ││
│ │ • Paneer Butter Masala                              ││
│ │ • Roti, Salad                                       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [+ Add Meal]                                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 19.2 Meal Attendance Tracking

### API Endpoints
```
GET /food/attendance?date=2026-07-13
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  breakfast: { count: number, residents: Resident[] },
  lunch: { count: number, residents: Resident[] },
  dinner: { count: number, residents: Resident[] }
}

GET /food/cook/today
Headers: Authorization: Bearer <token>
Role: owner | admin | staff

Response: {
  breakfast: { count: number, residents: Resident[] },
  lunch: { count: number, residents: Resident[] },
  dinner: { count: number, residents: Resident[] }
}
```

### Cook Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ Today's Meal Count - July 13, 2026                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────┐│
│ │ 🍳 Breakfast    │ │ 🍛 Lunch        │ │ 🍲 Dinner   ││
│ │                 │ │                 │ │             ││
│ │     45          │ │     62          │ │     58      ││
│ │   residents     │ │   residents     │ │  residents  ││
│ │                 │ │                 │ │             ││
│ │ [View List]     │ │ [View List]     │ │ [View List] ││
│ └─────────────────┘ └─────────────────┘ └─────────────┘│
│                                                         │
│ Recent Attendance                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Amit Patel - Breakfast, Lunch, Dinner            ││
│ │ ✅ Priya Sharma - Breakfast, Dinner                 ││
│ │ ⏳ Rajesh Kumar - Lunch (pending)                   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 20. Food Polls

## 20.1 Create Poll

### API Endpoint
```
POST /food/polls
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: {
  propertyId: string,
  title: string,
  description: string,
  options: [{ id: string, label: string }],
  startDate: string,
  endDate: string
}

Response: Poll object
```

### Poll Data Model
```typescript
{
  id: string;
  propertyId: string;
  title: string;
  description: string;
  options: string;             // JSON array of options
  startDate: string;
  endDate: string;
  status: string;              // "draft" | "active" | "closed" | "finalized"
  winningOptionId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Step-by-Step Flow

1. **Owner Clicks "Create Poll"**
2. **Poll Form Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ Create Food Poll                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Title *                                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Weekend Special Menu Vote                           ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Description                                             │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Vote for your preferred weekend special dish        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Options                                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 1. [Biryani                            ] [Remove]   ││
│ │ 2. [Paneer Tikka Masala                ] [Remove]   ││
│ │ 3. [Chicken Curry                       ] [Remove]   ││
│ │ [+ Add Option]                                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Start Date: [July 13, 2026]                             │
│ End Date:   [July 15, 2026]                             │
│                                                         │
│                    [Save Draft]  [Publish Now]          │
└─────────────────────────────────────────────────────────┘
```

3. **Owner Submits** (Save Draft or Publish)
4. **API Call:** `POST /food/polls`
5. **Backend:** Creates poll with status
6. **UI Update:** Poll appears in list

---

## 20.2 Poll Voting

### API Endpoint
```
POST /food/polls/:id/vote
Headers: Authorization: Bearer <token>
Role: resident

Request: { optionId: string }

Response: Vote record
```

---

## 20.3 Poll Results

### API Endpoint
```
GET /food/polls/:id/results
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  poll: Poll,
  results: [{
    optionId: string,
    label: string,
    votes: number,
    percentage: number
  }],
  totalVotes: number
}
```

### UI Components

**Poll Results:**
```
┌─────────────────────────────────────────────────────────┐
│ Weekend Special Menu Vote - Results                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Total Votes: 45                                         │
│ Status: Active (ends July 15)                           │
│                                                         │
│ Biryani                                                 │
│ ████████████████████████████████████░░░░░░░  65% (29)   │
│                                                         │
│ Paneer Tikka Masala                                     │
│ ████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  25% (11)   │
│                                                         │
│ Chicken Curry                                           │
│ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  10% (5)    │
│                                                         │
│                          [Finalize Poll]                │
└─────────────────────────────────────────────────────────┘
```

---

## 20.4 Finalize Poll

### API Endpoint
```
POST /food/polls/:id/finalize
Headers: Authorization: Bearer <token>
Role: owner | admin

Request: { winningOptionId: string }

Response: Finalized poll
```

### Flow
1. **Voting Period Ends**
2. **Owner Sees Results** with vote counts
3. **Owner Clicks "Finalize"** with winning option
4. **API Call:** `POST /food/polls/:id/finalize`
5. **Backend:** Sets winning option, creates menu item
6. **Residents Notified:** Winning option announced

---

# 21. Food Analytics

## 21.1 Food Analytics Dashboard

### API Endpoint
```
GET /food/analytics
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  totalMeals: number,
  averageAttendance: number,
  popularMeal: string,
  attendanceRate: string,
  mealWastage: number
}

GET /food/analytics/attendance-trends
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: [{
  date: string,
  breakfast: number,
  lunch: number,
  dinner: number
}]
```

---

# 22. Notifications Management

## 22.1 View Notifications

### User Story
As an owner, I want to view and manage notifications so that I can stay updated on important events.

### API Endpoint
```
GET /notifications?page=1&limit=20&unreadOnly=true
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  data: Notification[],
  unreadCount: number,
  pagination: { page, limit, total, totalPages }
}
```

### Notification Data Model
```typescript
{
  id: string;
  tenantId: string;
  userId?: string;
  title: string;
  message: string;
  type: string;                // "payment_received" | "complaint_created" | etc.
  priority: string;            // "normal" | "high" | "urgent"
  actionUrl?: string;
  actionType?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
```

### UI Components

**Notification Bell (Header):**
```
┌─────────────────────────────────────────────────────────┐
│ 🔔 (3)                    👤 Admin User                 │
└─────────────────────────────────────────────────────────┘
```

**Notification Dropdown:**
```
┌─────────────────────────────────────────────────────────┐
│ Notifications (3 unread)            [Mark all as read]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🔵 New payment received from Amit Patel                 │
│    ₹8,000 for July 2026                                 │
│    5 minutes ago                                   [✓]  │
│                                                         │
│ 🔵 New complaint: AC not working                        │
│    TKT-001 from Priya Sharma                            │
│    1 hour ago                                      [✓]  │
│                                                         │
│ 🔵 Water tank level low                                 │
│    Main tank at 15%                                     │
│    2 hours ago                                     [✓]  │
│                                                         │
│ [View All Notifications]                                │
└─────────────────────────────────────────────────────────┘
```

---

## 22.2 Mark as Read

### API Endpoint
```
PATCH /notifications/:id/read
Headers: Authorization: Bearer <token>
Role: any authenticated user

Response: { message: "Marked as read" }

POST /notifications/read-all
Headers: Authorization: Bearer <token>
Role: any authenticated user

Response: { message: "All notifications marked as read" }
```

---

# 23. Activity Logs & Audit Trail

## 23.1 View Activity Logs

### User Story
As an owner, I want to view activity logs so that I can audit all changes made in the system.

### API Endpoint
```
GET /activity-logs?page=1&limit=50&entityType=&entityId=
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: {
  data: ActivityLog[],
  pagination: { page, limit, total, totalPages }
}
```

### Activity Log Data Model
```typescript
{
  id: string;
  tenantId: string;
  actorType: string;           // "user" | "system"
  actorId: string;
  actorName?: string;
  action: string;              // "created" | "updated" | "deleted" | "checked_in" | etc.
  entityType: string;          // "resident" | "payment" | "complaint" | etc.
  entityId?: string;
  oldValues?: string;          // JSON
  newValues?: string;          // JSON
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
```

### UI Components

**Activity Logs Page:**
```
┌─────────────────────────────────────────────────────────┐
│ Activity Logs                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Filters: [Entity Type ▼] [Date Range] [Search]          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Admin · checked_in resident · 2h ago             ││
│ │    Priya Sharma checked into Room 103, Bed B2       ││
│ │    IP: 192.168.1.100                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Admin · payment_received · 4h ago                ││
│ │    Amit Patel paid ₹8,000 for July 2026             ││
│ │    Method: UPI, Ref: txn_12345                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Staff · complaint_resolved · 6h ago              ││
│ │    TKT-001: AC not working resolved                 ││
│ │    Resolution: Replaced AC filter                   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 24. File Upload

## 24.1 Upload File

### User Story
As an owner, I want to upload files (KYC documents, receipts, photos) so that I can store them securely.

### API Endpoint
```
POST /upload
Headers: Authorization: Bearer <token>, Content-Type: multipart/form-data
Role: any authenticated user

Request: File (binary)

Response: {
  url: string,                 // "/uploads/{uuid}.{ext}"
  filename: string             // Original filename
}
```

### Constraints
- Max file size: 10MB
- Allowed extensions: png, jpg, jpeg, gif, webp, pdf
- Storage: Local filesystem (`uploads/` directory)

### File Serving
```
GET /uploads/:filename
Response: File binary with appropriate Content-Type
```

### Supported MIME Types
```typescript
const mimeTypes = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  pdf: 'application/pdf',
};
```

---

# 25. Staff Management

## 25.1 Staff List

### API Endpoint
```
GET /staff/list
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: [{
  id: string,
  propertyId: string,
  fullName: string,
  phone: string,
  email?: string,
  role: string,
  salary?: number,
  isActive: boolean,
  joinedDate: string,
  openTicketCount: number
}]
```

### Staff Data Model
```typescript
{
  id: string;
  tenantId: string;
  propertyId: string;
  userId?: string;             // Linked user account
  fullName: string;
  phone: string;
  email?: string;
  role: string;                // "maintenance" | "security" | "cleaning" | "cook" | etc.
  salary?: number;
  shiftStart?: string;
  shiftEnd?: string;
  weeklyOff: string;           // "sunday" | "monday" | etc.
  aadhaarUrl?: string;
  photoUrl?: string;
  isActive: boolean;
  joinedDate: string;
  leftDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

# 26. Reports & Analytics

## 26.1 Occupancy Trend Report

### API Endpoint
```
GET /dashboard/occupancy-trend?propertyId=
Headers: Authorization: Bearer <token>
Role: owner | admin

Response: [{
  month: string,
  expected: number,
  collected: number,
  collectionRate: string,
  tenantCount: number
}]
```

### UI Components

**Occupancy Trend Chart:**
```
┌─────────────────────────────────────────────────────────┐
│ Occupancy Trend (Last 12 Months)                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  100%│                          ▓▓▓▓                   │
│   80%│              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓               │
│   60%│  ▓▓▓▓▓▓▓▓▓▓▓▓                                  │
│   40%│  ▓▓▓▓                                          │
│   20%│                                                 │
│     0%├────────────────────────────────────────────────│
│        Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec  │
│                                                         │
│  ■ Occupied    □ Vacant                                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 27. Settings & Configuration

## 27.1 Billing Settings

(See Section 14 - Billing Configuration)

## 27.2 Notification Settings

(To be implemented - configure which events trigger notifications)

## 27.3 Property Settings

(To be implemented - WiFi credentials, amenities, etc.)

---

# Appendix A: Owner API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/overview` | Dashboard metrics |
| GET | `/dashboard/occupancy-trend` | Occupancy trend data |
| GET | `/dashboard/property/:id` | Property-level dashboard |
| GET | `/users` | List users |
| POST | `/users` | Create user |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Deactivate user |
| GET | `/properties` | List properties |
| POST | `/properties` | Create property |
| PUT | `/properties/:id` | Update property |
| DELETE | `/properties/:id` | Delete property |
| GET | `/properties/:id/floors` | List floors |
| POST | `/floors` | Create floor |
| PUT | `/floors/:id` | Update floor |
| DELETE | `/floors/:id` | Delete floor |
| GET | `/rooms/with-tenants` | List rooms with tenants |
| GET | `/rooms/:id/details` | Room details |
| POST | `/rooms` | Create room |
| PUT | `/rooms/:id` | Update room |
| DELETE | `/rooms/:id` | Delete room |
| GET | `/residents` | List residents |
| GET | `/residents/:id/details` | Resident details |
| POST | `/residents` | Check-in resident |
| PUT | `/residents/:id` | Update resident |
| POST | `/residents/:id/checkout` | Checkout resident |
| POST | `/allocation/suggest` | AI room suggestions |
| GET | `/allocation/rooms` | Room allocation details |
| GET | `/payments` | List payments |
| GET | `/payments/summary` | Payment summary |
| POST | `/payments` | Create payment record |
| POST | `/payments/:id/pay` | Record payment |
| POST | `/payments-proof/billing/calculate` | Calculate billing |
| POST | `/payments-proof/invoices/generate` | Generate invoice |
| GET | `/payments-proof/invoices` | List invoices |
| GET | `/payments-proof/proofs` | List payment proofs |
| POST | `/payments-proof/proofs/:id/verify` | Verify proof |
| GET | `/payments-proof/receipts` | List receipts |
| POST | `/payments-proof/reminders` | Send reminder |
| POST | `/payments-proof/reminders/bulk` | Send bulk reminders |
| GET | `/payments-proof/billing-config` | Get billing config |
| PUT | `/payments-proof/billing-config` | Update billing config |
| GET | `/complaints` | List complaints |
| GET | `/complaints/:id` | Complaint details |
| POST | `/complaints` | Create complaint |
| PATCH | `/complaints/:id/status` | Update complaint status |
| POST | `/complaints/:id/comments` | Add comment |
| GET | `/iot/water-tanks` | List water tanks |
| POST | `/iot/water-tanks` | Create water tank |
| PUT | `/iot/water-tanks/:id` | Update water tank |
| POST | `/iot/water-tanks/:id/readings` | Add water reading |
| GET | `/iot/electricity-meters` | List electricity meters |
| POST | `/iot/electricity-meters` | Create electricity meter |
| PUT | `/iot/electricity-meters/:id` | Update electricity meter |
| POST | `/iot/electricity-meters/:id/readings` | Add electricity reading |
| POST | `/iot/tanker-orders` | Create tanker order |
| PATCH | `/iot/tanker-orders/:id` | Update tanker order |
| GET | `/iot/analytics/water` | Water analytics |
| GET | `/iot/analytics/water/daily` | Water daily breakdown |
| GET | `/iot/analytics/electricity` | Electricity analytics |
| GET | `/iot/analytics/electricity/daily` | Electricity daily breakdown |
| GET | `/food/menus` | List menus |
| POST | `/food/menus` | Create menu |
| GET | `/food/polls` | List polls |
| POST | `/food/polls` | Create poll |
| POST | `/food/polls/:id/publish` | Publish poll |
| GET | `/food/polls/:id/results` | Poll results |
| POST | `/food/polls/:id/finalize` | Finalize poll |
| GET | `/food/attendance` | Get attendance |
| GET | `/food/cook/today` | Cook dashboard |
| GET | `/food/analytics` | Food analytics |
| GET | `/food/analytics/attendance-trends` | Attendance trends |
| GET | `/notifications` | List notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |
| GET | `/activity-logs` | List activity logs |
| GET | `/staff/list` | List staff |
| POST | `/upload` | Upload file |

---

# Appendix B: Owner Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `DashboardPage` | Overview metrics |
| `/residents` | `ResidentsPage` | Resident management |
| `/rooms` | `RoomsPage` | Room & bed view |
| `/payments` | `PaymentsPage` | Payment management |
| `/complaints` | `ComplaintsPage` | Service desk |
| `/iot/water` | `WaterIoTPage` | Water IoT dashboard |
| `/iot/electricity` | `ElectricityIoTPage` | Electricity IoT dashboard |
| `/food` | `FoodPage` | Food management |

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
**Author:** Opsora Development Team
