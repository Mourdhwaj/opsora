# Opsora — Detailed Flow Specifications

## Document Purpose

This document provides comprehensive flow specifications for all features across three user views: **Owner/Admin**, **Tenant/Resident**, and **Staff Portal**. Each flow includes user stories, API endpoints, data models, step-by-step workflows, edge cases, and UI/UX requirements.

**Repository:** `https://github.com/Mourdhwaj/opsora.git`
**Architecture:** Turborepo monorepo with `apps/api` (Fastify + Drizzle ORM + SQLite) and `apps/web` (Next.js 16 App Router + Tailwind v4)
**Current Date:** July 2026

---

# Table of Contents

1. [Authentication & Authorization Flows](#1-authentication--authorization-flows)
2. [Owner/Admin Dashboard View](#2-owneradmin-dashboard-view)
3. [Owner/Admin Residents Management](#3-owneradmin-residents-management)
4. [Owner/Admin Rooms & Beds Management](#4-owneradmin-rooms--beds-management)
5. [Owner/Admin Payments Management](#5-owneradmin-payments-management)
6. [Owner/Admin Complaints / Service Desk](#6-owneradmin-complaints--service-desk)
7. [Owner/Admin IoT Dashboards](#7-owneradmin-iot-dashboards)
8. [Owner/Admin Food Management](#8-owneradmin-food-management)
9. [Tenant/Resident Portal View](#9-tenantresident-portal-view)
10. [Staff Portal View](#10-staff-portal-view)
11. [Cross-Cutting Concerns](#11-cross-cutting-concerns)

---

# 1. Authentication & Authorization Flows

## 1.1 Login Flow

### User Story
As any user (owner, staff, or tenant), I want to log in with my email and password so that I can access my role-specific dashboard.

### Flow Diagram
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User visits│     │  Enter email │     │  Backend     │     │  Redirect to │
│   /login     │────▶│  + password  │────▶│  validates   │────▶│  role-based  │
│              │     │  & submit    │     │  credentials │     │  dashboard   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Step-by-Step Flow

1. **Entry Point**
   - User navigates to `/login` or is redirected from `/` (if already authenticated)
   - If user has valid `opsora_token` cookie, middleware redirects to role-appropriate dashboard:
     - `role === "resident"` → `/tenant`
     - `role === "staff"` → `/staff-portal`
     - `role === "owner"` or `role === "admin"` → `/dashboard`

2. **Form Submission**
   - User enters email and password
   - Frontend sends `POST /auth/login` with `{ email, password }`
   - Rate limiting: 5 attempts per IP per minute (in-memory)

3. **Backend Validation**
   - Validates credentials against `users` table
   - Generates JWT token with payload: `{ userId, tenantId, email, role }`
   - Sets token expiry (configurable)

4. **Response Handling**
   - On success: Backend returns `{ token, user: { id, tenantId, email, fullName, role } }`
   - Frontend stores:
     - `localStorage.setItem("opsora_token", token)`
     - `localStorage.setItem("opsora_role", role)`
     - Cookie: `opsora_token=${token}; path=/; max-age=86400`
     - Cookie: `opsora_role=${role}; path=/; max-age=86400`

5. **Role-Based Redirect**
   - Middleware (`src/middleware.ts`) reads `opsora_role` cookie
   - Redirects to appropriate route group:
     - `resident` → `/tenant/*`
     - `staff` → `/staff-portal/*`
     - `owner`/`admin` → `/dashboard/*`

### API Endpoint
```
POST /auth/login
Request: { email: string, password: string }
Response: { token: string, user: User }
Rate Limit: 5 requests/minute per IP
```

### Edge Cases
- **Invalid credentials:** Return `{ error: "Invalid email or password" }` (don't reveal if email exists)
- **Account locked:** After 5 failed attempts, return `{ error: "Account locked. Try again in 1 minute." }`
- **Inactive account:** Check `user.isActive` before authentication
- **Missing JWT_SECRET:** Server exits on startup with error message

### UI Requirements
- Clean, centered login form
- Email field with validation
- Password field with show/hide toggle
- "Forgot password?" link (placeholder)
- Loading state during submission
- Error message display (non-intrusive toast or inline)
- Responsive design (mobile-first)

---

## 1.2 Logout Flow

### User Story
As a logged-in user, I want to securely log out so that my session is invalidated.

### Step-by-Step Flow

1. **User Clicks Logout**
   - Calls `POST /auth/logout` with current JWT token

2. **Backend Processing**
   - Adds token to `revokedTokens` table with expiry timestamp
   - Returns `{ message: "Logged out successfully" }`

3. **Frontend Cleanup**
   - Removes `opsora_token` and `opsora_role` from localStorage
   - Clears cookies:
     - `opsora_token=; path=/; max-age=0`
     - `opsora_role=; path=/; max-age=0`
   - Redirects to `/login`

4. **Scheduled Cleanup**
   - Background job runs every hour to remove expired revoked tokens

### API Endpoint
```
POST /auth/logout
Headers: Authorization: Bearer <token>
Response: { message: "Logged out successfully" }
```

---

## 1.3 Token Refresh & Session Management

### User Story
As a user, I want my session to remain valid while I'm active, and automatically expire when I'm inactive.

### Flow
1. **Token Verification:** Every authenticated request includes `Authorization: Bearer <token>`
2. **Backend Verification:** `app.authenticate` hook:
   - Verifies JWT signature
   - Checks token against `revokedTokens` table
   - Decodes payload: `{ userId, tenantId, email, role }`
3. **401 Response:** If invalid/expired, returns `{ error: "Unauthorized" }`
4. **Frontend Handling:** On 401 response:
   - Clear tokens from storage
   - Redirect to `/login`

### API Endpoint
```
GET /auth/me
Headers: Authorization: Bearer <token>
Response: User object (id, tenantId, email, fullName, role)
```

---

## 1.4 Registration Flow

### User Story
As a new property owner, I want to register an account so that I can start managing my PG/hostel.

### Step-by-Step Flow

1. **User Visits Register Page** (if enabled)
2. **Form Submission:** `{ email, password, fullName, phone, propertyName }`
3. **Backend Processing:**
   - Validates input with Zod schema
   - Rate limiting: 3 registrations per IP per 5 minutes
   - Creates new `tenants` record (organization)
   - Creates new `users` record with `role: "owner"`
   - Creates initial `properties` record
4. **Response:** `{ token, user }` (auto-login after registration)
5. **Redirect:** Owner dashboard

### API Endpoint
```
POST /auth/register
Request: { email, password, fullName, phone, propertyName }
Response: { token, user }
Rate Limit: 3 requests/5 minutes per IP
```

### Edge Cases
- **Duplicate email:** Return `{ error: "Email already registered" }`
- **Weak password:** Enforce minimum 8 characters, at least one number
- **Missing required fields:** Zod validation returns detailed error

---

# 2. Owner/Admin Dashboard View

## 2.1 Dashboard Overview

### User Story
As a property owner, I want to see a high-level overview of my property metrics so that I can understand my business at a glance.

### API Endpoints
```
GET /dashboard/overview
Response: {
  properties: { total, totalBeds, occupiedBeds, vacantBeds, occupancyRate },
  tenants: { active },
  payments: { totalExpected, totalCollected, totalPending, collectionRate, paidCount, pendingCount },
  complaints: { open, urgent },
  water: [{ tankId, tankName, capacityLiters, currentLevel, currentLiters }],
  visitors: { pending },
  recentActivity: [{ id, action, entityType, entityName, actorName, createdAt }]
}
```

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`

### Display Elements

1. **Metric Cards Row (4 cards)**
   - Total Residents (icon: Users, color: blue)
   - Occupancy Rate (icon: BedDouble, color: accent/green)
   - Revenue Collected (icon: IndianRupee, color: amber)
   - Open Complaints (icon: AlertTriangle, color: red)

2. **Charts Section (2 charts)**
   - **Occupancy Trend** (BarChart): Monthly occupied vs vacant beds
   - **Revenue Trend** (AreaChart): Monthly revenue collection

3. **Recent Activity Feed**
   - List of recent actions with:
     - Action icon (colored circle)
     - Entity name (bold)
     - Action description (e.g., "checked in", "payment received")
     - Actor name and timestamp
     - Entity type badge

### Data Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User loads│     │  Fetch      │     │  Display    │
│   /dashboard│────▶│  /dashboard │────▶│  metrics,   │
│             │     │  /overview  │     │  charts,    │
│             │     │             │     │  activity   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### UI/UX Requirements
- Loading state: Shimmer skeleton cards
- Error state: Friendly error message with retry button
- Responsive grid: 1 col mobile, 2 col tablet, 4 col desktop
- Charts: Use Recharts library with tooltips
- Hover effects on metric cards
- Smooth fade-in animation

---

## 2.2 Property Management

### User Story
As a property owner, I want to manage my properties (PGs/hostels) so that I can add, edit, and track occupancy.

### API Endpoints
```
GET    /properties                    # List all properties
POST   /properties                    # Create new property
GET    /properties/:id                # Get property details
PUT    /properties/:id                # Update property
DELETE /properties/:id                # Delete property

GET    /properties/:propertyId/floors # List floors for property
POST   /floors                        # Create floor
PUT    /floors/:id                    # Update floor
DELETE /floors/:id                    # Delete floor
```

### Property Data Model
```typescript
{
  id: string;                    // UUID
  tenantId: string;              // Owner's tenant ID (multi-tenancy)
  name: string;                  // e.g., "Sunshine PG"
  address: string;               // Full address
  city: string;
  state: string;
  propertyType: string;          // "pg" | "hostel" | "coliving"
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  status: string;                // "active" | "inactive"
  createdAt: string;
  updatedAt: string;
}
```

### Flow: Create Property

1. **User Clicks "Add Property"** button
2. **Form Modal Opens** with fields:
   - Property Name (required)
   - Address (required)
   - City (required)
   - State (required)
   - Property Type (dropdown: PG, Hostel, Co-living)
   - Total Floors (number, default: 1)
3. **Validation:** Zod schema validates all fields
4. **API Call:** `POST /properties` with form data
5. **Backend Processing:**
   - Validates unique name per tenant
   - Creates property record
   - Auto-generates floors based on `totalFloors`
   - Creates activity log entry
6. **Response:** Created property object
7. **UI Update:** Add property to list, close modal, show success toast

### Flow: Edit Property

1. **User Clicks Property Card** → Opens property detail view
2. **User Clicks "Edit"** button
3. **Pre-filled Form Modal** with current values
4. **API Call:** `PUT /properties/:id` with updated data
5. **Backend Processing:**
   - Validates changes
   - Updates record
   - Creates activity log with old/new values
6. **UI Update:** Refresh property card

### Edge Cases
- **Delete property with active tenants:** Prevent deletion, show warning
- **Delete property with no tenants:** Soft delete (set status: "inactive")
- **Duplicate property name:** Return error

---

# 3. Owner/Admin Residents Management

## 3.1 Residents List View

### User Story
As an owner, I want to see all residents across my properties so that I can manage occupancy and track tenant information.

### API Endpoints
```
GET /residents?page=1&limit=20&search=&status=active
Response: {
  data: Resident[],
  pagination: { total, page, limit }
}
```

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/residents/page.tsx`

### Display Elements

1. **Header**
   - Title: "Residents"
   - Subtitle: Total count
   - "Add Resident" button (primary action)

2. **Filters Bar**
   - Search input (name, phone, email)
   - Status filter dropdown (All, Active, Checked Out)

3. **Residents Table (Desktop)**
   | Column | Description |
   |--------|-------------|
   | Resident | Avatar + Name + Phone |
   | Room | Room number |
   | Move-in | Date formatted |
   | Rent | Monthly rent amount |
   | Status | Badge (active/checked_out) |
   | Actions | "View" chevron |

4. **Resident Cards (Mobile)**
   - Card layout with avatar, name, phone, room
   - Status badge
   - Move-in date and rent

5. **Pagination**
   - Previous/Next buttons
   - "Page X of Y" indicator

### Flow: View Resident Details

1. **User Clicks Resident Row/Card**
2. **Split View Opens** (right panel on desktop, full screen on mobile)
3. **API Call:** `GET /residents/:id/details`
4. **Response includes:**
   - `profile`: Full tenant information
   - `room`: Room details (number, type, rent)
   - `bed`: Bed details (number, rent)
   - `property`: Property info (name, address)
   - `paymentSummary`: Aggregated payment stats
   - `paymentHistory`: All payment records
   - `recentComplaints`: Last 5 complaints

5. **Detail Panel Displays:**
   - **Quick Stats:** Monthly Rent, Deposit Paid, Balance Due, Move-in Date
   - **Payment Chart:** BarChart of payment history (due vs paid)
   - **Personal Info:** Phone, email, gender, DOB, occupation, company, blood group
   - **Identity Documents:** Aadhaar, PAN, Passport
   - **Accommodation:** Property name, address, room/bed details
   - **Emergency Contact:** Name, phone, relation
   - **Payment Summary:** Total/Paid/Partial/Pending counts
   - **Recent Complaints:** List with ticket number, priority, status

---

## 3.2 Check-In (Add Resident) Flow

### User Story
As an owner, I want to check in a new resident so that I can allocate a bed and start tracking their tenancy.

### API Endpoints
```
POST /allocation/suggest    # Get AI room suggestions
POST /residents             # Create resident profile
```

### Step-by-Step Flow

1. **User Clicks "Add Resident"**
2. **Check-In Modal Opens** with multi-step form:

   **Step 1: Personal Information**
   - Full Name (required)
   - Phone Number (required, unique per tenant)
   - Email (optional)
   - Gender (dropdown: Male, Female, Other)
   - Date of Birth (date picker)
   - Blood Group (dropdown)

   **Step 2: Identity Verification**
   - Aadhaar Number (12 digits)
   - PAN Number (10 characters)
   - Passport Number (optional)

   **Step 3: Employment Details**
   - Occupation (dropdown: Working, Student, Other)
   - Company/College Name
   - Work Address

   **Step 4: Emergency Contact**
   - Contact Name (required)
   - Contact Phone (required)
   - Relationship (dropdown)

   **Step 5: Room Allocation**
   - Property (dropdown)
   - Floor (dropdown, filtered by property)
   - Room (dropdown, filtered by floor, shows availability)
   - Bed (dropdown, shows vacant beds only)
   - OR: Click "Suggest Room" for AI recommendation

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
   - Dietary Preference (dropdown: Vegetarian, Non-Vegetarian, Vegan, etc.)

3. **Form Validation:** Zod schema validates all required fields
4. **API Call:** `POST /residents` with complete form data
5. **Backend Processing:**
   - Validates room/bed availability
   - Creates `tenant_profiles` record
   - Updates `beds` status from "vacant" to "occupied"
   - Updates `rooms` occupied/vacant bed counts
   - Updates `properties` occupied/vacant bed counts
   - Creates initial `rent_payments` record for current month
   - Creates activity log entry
   - Optionally creates welcome notification
6. **Response:** Created resident profile
7. **UI Update:** Close modal, refresh residents list, show success toast

### Room Suggestion Algorithm
```
POST /allocation/suggest
Request: {
  propertyId: string,
  gender: "male" | "female" | "mixed",
  budget: number,
  floorPreference?: number,
  moveInDate: string
}
Response: {
  suggestions: [{
    roomId: string,
    roomNumber: string,
    bedId: string,
    bedNumber: string,
    rentPerBed: number,
    score: number,  // 0-100, higher is better
    reasons: string[]  // Why this room was suggested
  }]
}
```

### Suggestion Logic
1. Filter rooms by property
2. Filter by gender compatibility:
   - Male tenant → male rooms only
   - Female tenant → female rooms only
   - Mixed rooms → any gender
3. Filter by available beds (status: "vacant")
4. Filter by rent within budget (±10% tolerance)
5. Filter by floor preference (if specified)
6. Score rooms:
   - Same floor preference: +20 points
   - Budget match: +30 points
   - Gender match: +25 points
   - Vacancy rate: +15 points (prefer less empty rooms)
   - Recent move-ins: +10 points (prefer rooms with activity)

### Edge Cases
- **No beds available:** Show message "No beds available matching your criteria"
- **Duplicate phone number:** Return error "A resident with this phone number already exists"
- **Bed already occupied:** Return error and suggest alternative beds
- **Invalid date:** Move-in date cannot be in the future
- **Deposit less than required:** Warning but allow (configurable)

---

## 3.3 Checkout (Remove Resident) Flow

### User Story
As an owner, I want to check out a resident so that I can free up their bed and calculate final settlements.

### API Endpoints
```
POST /residents/:id/checkout
Response: {
  message: "Resident checked out successfully",
  depositRefund: number,
  checkoutDate: string
}
```

### Step-by-Step Flow

1. **User Clicks "Checkout" on Resident Detail**
2. **Confirmation Modal Opens** showing:
   - Resident name and room
   - Move-in date and duration
   - Pending balance (if any)
   - Deposit refund calculation

3. **Pre-Checkout Validation** (Backend):
   - **Check Pending Payments:**
     ```
     SELECT * FROM rent_payments 
     WHERE tenant_profile_id = ? 
     AND payment_status IN ('pending', 'overdue', 'partial')
     ```
     - If pending payments exist → Return 400 error with details

   - **Check Pending Complaints:**
     ```
     SELECT * FROM complaints 
     WHERE tenant_profile_id = ? 
     AND status IN ('open', 'in_progress')
     ```
     - If pending complaints exist → Return 400 error with details

4. **If Validation Passes:**
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

5. **Response:** Success message with deposit refund amount

6. **UI Update:**
   - Close detail panel
   - Refresh residents list
   - Show success toast with refund amount

### Edge Cases
- **Pending payments:** Block checkout, show detailed list
- **Pending complaints:** Block checkout, show ticket list
- **Partial deposit refund:** Calculate correctly based on deductions
- **Already checked out:** Return error "Resident already checked out"

---

## 3.4 Edit Resident Flow

### User Story
As an owner, I want to update resident information so that I can keep records accurate.

### API Endpoint
```
PUT /residents/:id
Request: Partial ResidentProfile
Response: Updated ResidentProfile
```

### Flow
1. **User Clicks "Edit" on Resident Detail**
2. **Edit Modal Opens** with pre-filled form
3. **User Modifies Fields** (only editable fields):
   - Contact information
   - Employment details
   - Emergency contact
   - Food preferences
   - Notes
4. **API Call:** `PUT /residents/:id`
5. **Backend Processing:**
   - Validates changes
   - Updates record
   - Creates activity log with old/new values
6. **UI Update:** Refresh detail panel

### Non-Editable Fields (require separate flows)
- Room/bed assignment (requires checkout + re-checkin)
- Rent amount (requires payment record update)
- Deposit amount (requires financial reconciliation)

---

# 4. Owner/Admin Rooms & Beds Management

## 4.1 Rooms Grid View

### User Story
As an owner, I want to see a visual grid of all rooms across floors so that I can quickly understand occupancy and availability.

### API Endpoints
```
GET /rooms/with-tenants?propertyId=&floorId=
Response: RoomWithTenants[]

GET /rooms/:id/details
Response: {
  id, roomNumber, roomType, rentPerBed, depositAmount,
  totalBeds, occupiedBeds,
  beds: Bed[],
  tenants: TenantProfile[]
}
```

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/rooms/page.tsx`

### Display Elements

1. **Header**
   - Title: "Rooms & Beds"
   - Subtitle: "{count} rooms across {floors} floors"
   - Floor filter dropdown

2. **Legend**
   - Vacant (slate)
   - Partial (amber)
   - Full (red)
   - Occupied (accent/green)

3. **Rooms Grid (Grouped by Floor)**
   ```
   Floor 1
   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
   │ 101 │ │ 102 │ │ 103 │ │ 104 │
   │ 🛏️  │ │ 🛏️🛏️│ │ 🛏️  │ │ 🛏️🛏️│
   │ 1/2 │ │ 2/2 │ │ 0/2 │ │ 2/2 │
   └─────┘ └─────┘ └─────┘ └─────┘
   ```

4. **Room Card Elements**
   - Room number (bold)
   - Room type badge (shared/single/couple)
   - Bed indicators (small squares, colored by occupancy)
   - Tenant names (if occupied)
   - Bed count: "{occupied}/{total} beds"
   - Rent per bed: "₹{amount}/mo"

### Flow: View Room Details

1. **User Clicks Room Card**
2. **Room Detail Panel Opens** (right side)
3. **API Call:** `GET /rooms/:id/details`
4. **Response includes:**
   - Room metadata
   - Bed list with occupancy
   - Tenant profiles with latest payment status

5. **Detail Panel Displays:**
   - Room header (number, type, beds, rent)
   - Stats: Total Beds, Occupied, Vacant
   - Residents list with:
     - Avatar + Name + Status
     - Bed number, move-in date
     - Phone, email, occupation
     - Latest payment status (Paid/Partial/Pending)
     - Balance amount
   - Deposit summary

### Flow: View Tenant from Room

1. **User Clicks Tenant Name in Room Detail**
2. **Tenant Detail Panel Opens** (replaces room detail)
3. **API Call:** `GET /residents/:id/details`
4. **Full tenant detail displayed** (same as Residents page)

---

## 4.2 Room Gender & Category System

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

### Room Numbering Convention
- Format: `FLOOR-ROOM` (e.g., `101`, `102`, ..., `510`)
- Floor 1: 101-110
- Floor 2: 201-210
- etc.

---

# 5. Owner/Admin Payments Management

## 5.1 Payments List View

### User Story
As an owner, I want to see all rent payments across my properties so that I can track collection and follow up on pending payments.

### API Endpoints
```
GET /payments?page=1&limit=50&status=pending
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

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/payments/page.tsx`

### Display Elements

1. **Summary Cards (3 cards)**
   - Total Collected (green)
   - Pending (amber)
   - Overdue (red)

2. **Filters Bar**
   - Search (tenant name, room number)
   - Status filter (All, Paid, Pending, Overdue)

3. **Payments Table**
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

## 5.2 Invoice Generation Flow

### User Story
As an owner, I want to generate invoices for residents so that they know what to pay.

### API Endpoints
```
POST /payments-proof/billing/calculate
Request: { tenantProfileId, monthYear }
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

POST /payments-proof/invoices/generate
Request: { tenantProfileId, monthYear, charges }
Response: Invoice object
```

### Billing Calculation Logic
```typescript
// Step 1: Get base rent from room
const rentAmount = tenantProfile.rentAmount;

// Step 2: Get configurable charges
const electricityCharge = billingConfig?.electricityCharge || 0;
const waterCharge = billingConfig?.waterCharge || 0;
const foodCharge = calculateFoodCharge(tenantProfile);
const maintenanceCharge = billingConfig?.maintenanceCharge || 0;

// Step 3: Calculate late fee (if overdue)
const lateFee = isOverdue(dueDate) ? calculateLateFee(totalAmount) : 0;

// Step 4: Apply discount (if any)
const discount = tenantProfile.discount || 0;

// Step 5: Calculate total
const totalAmount = rentAmount + electricityCharge + waterCharge + 
                    foodCharge + maintenanceCharge + lateFee - discount;
```

### Food Charge Calculation
```typescript
function calculateFoodCharge(profile: TenantProfile): number {
  let charge = 0;
  if (profile.breakfastOptIn) charge += breakfastRate;
  if (profile.lunchOptIn) charge += lunchRate;
  if (profile.dinnerOptIn) charge += dinnerRate;
  return charge;
}
```

---

## 5.3 Payment Recording Flow

### User Story
As an owner, I want to record payments received from residents so that I can track collections.

### API Endpoints
```
POST /payments/:id/pay
Request: {
  paidAmount: number,
  paymentMethod: "cash" | "upi_direct" | "neft_imps" | "cheque",
  transactionId?: string
}
Response: Updated payment record
```

### Step-by-Step Flow

1. **User Clicks "Record Payment" on Payment Row**
2. **Payment Modal Opens** showing:
   - Current payment details (period, total, already paid, balance)
   - Amount input (pre-filled with balance amount)
   - Payment method dropdown
   - Transaction ID input (optional)

3. **User Enters Payment Details**
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

## 5.4 Payment Proof Verification Flow

### User Story
As an owner, I want to verify payment proofs uploaded by residents so that I can confirm payments are legitimate.

### API Endpoints
```
POST /payments-proof/proofs
Request: { rentPaymentId, file, transactionId, amount, paymentMethod }
Response: Proof record

GET /payments-proof/proofs
Response: Proof[]

POST /payments-proof/proofs/:id/verify
Request: { status: "confirmed" | "rejected", notes?: string }
Response: Updated proof record
```

### Step-by-Step Flow

**Resident Uploads Proof:**
1. Resident selects payment period
2. Uploads screenshot/image of payment
3. Enters transaction ID and amount
4. Submits proof

**Owner Verifies:**
1. Owner sees pending proofs in verification queue
2. Each proof shows:
   - Screenshot thumbnail
   - Resident name and room
   - Amount and transaction ID
   - Upload timestamp
3. Owner clicks to view full screenshot
4. Owner verifies transaction (optional: check bank statement)
5. Owner clicks "Confirm" or "Reject"
6. If confirmed:
   - Payment status updated to "confirmed"
   - Receipt generated
   - Resident notified
7. If rejected:
   - Reason required
   - Resident notified with reason

---

## 5.5 Receipt Generation Flow

### User Story
As an owner or tenant, I want to generate/print rent receipts so that I have proof of payment.

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/rooms/page.tsx` (inline receipt generator)

### Receipt Template
```html
┌─────────────────────────────────────────┐
│         [Property Name]                 │
│         [Property Address]              │
│           RENT RECEIPT                  │
├─────────────────────────────────────────┤
│ Receipt Details                         │
│   Receipt Date: [date]                  │
│   Billing Period: [month/year]          │
│   Status: [PAID/PENDING]                │
├─────────────────────────────────────────┤
│ Tenant Details                          │
│   Name: [full name]                     │
│   Room: [room number] · Bed [bed]       │
│   Phone: [phone]                        │
├─────────────────────────────────────────┤
│ Payment Breakdown                       │
│   Monthly Rent: ₹[amount]               │
│   Total Amount: ₹[amount]               │
│   Amount Paid: ₹[amount]                │
│   Balance Due: ₹[amount]                │
│   Payment Date: [date]                  │
│   Payment Method: [method]              │
├─────────────────────────────────────────┤
│ Amount Paid: ₹[total]                   │
├─────────────────────────────────────────┤
│ This is a computer-generated receipt.   │
│ Opsora — Property Management System     │
└─────────────────────────────────────────┘
```

### Flow
1. **User Clicks Print Icon on Payment Record**
2. **Browser Opens New Window** with formatted receipt
3. **User Can Print** using browser's print dialog
4. **Receipt includes:** All payment details, formatted for A4 paper

---

# 6. Owner/Admin Complaints / Service Desk

## 6.1 Complaints List View

### User Story
As an owner, I want to see all complaints across my properties so that I can track resolution and assign staff.

### API Endpoints
```
GET /complaints
Response: {
  data: Complaint[],
  pagination: { total, page, limit }
}

GET /complaints/:id
Response: Complaint with comments

PATCH /complaints/:id/status
Request: { status: string, assignedTo?: string, resolutionNotes?: string }
Response: Updated complaint

POST /complaints/:id/comments
Request: { comment: string, isInternal?: boolean }
Response: Comment object
```

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/complaints/page.tsx`

### Display Elements

1. **Header**
   - Title: "Service Desk"
   - Subtitle: "Manage issues, track resolution, and maintain SLA compliance"
   - "Create Ticket" button

2. **Stats Bar (5 cards)**
   - Total tickets
   - New (open)
   - In Progress
   - Resolved
   - Urgent

3. **Filters**
   - Search (ticket number, title, tenant name)
   - Status filter (All, New, In Progress, Resolved, Closed)
   - Priority filter (All, P1-Urgent, P2-High, P3-Medium, P4-Low)
   - Category filter (All, Plumbing, Electrical, etc.)

4. **Ticket List**
   - Each ticket shows:
     - Category icon (emoji)
     - Ticket number (monospace)
     - Priority badge (color-coded)
     - Status badge
     - Title (bold)
     - Tenant name and room
     - Created timestamp

5. **Detail Panel** (when ticket selected)
   - Header: Ticket number, priority, title, description
   - Reported By: Tenant info with avatar
   - Status Workflow: Visual progress bar
   - Assignment: Staff member with reassign option
   - Activity Timeline: Creation, assignment, resolution events
   - Comments: Thread with author, timestamp, internal badges
   - Comment Input: Text field with send button

---

## 6.2 Complaint Status Workflow

### Status Flow
```
┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│   New   │────▶│ In Progress  │────▶│ Resolved │────▶│  Closed  │
│ (open)  │     │(in_progress) │     │(resolved)│     │ (closed) │
└─────────┘     └──────────────┘     └──────────┘     └──────────┘
```

### Status Transitions
1. **New → In Progress:** When staff is assigned
2. **In Progress → Resolved:** When issue is fixed
3. **Resolved → Closed:** When tenant confirms or auto-close after X days

### UI: Status Progress Bar
```
● New ──▶ ● In Progress ──▶ ● Resolved ──▶ ● Closed
  ✓           ✓                ○              ○
```
- Completed steps: Green with checkmark
- Current step: Colored badge
- Future steps: Gray

---

## 6.3 Complaint Assignment Flow

### User Story
As an owner, I want to assign complaints to staff members so that issues are resolved promptly.

### API Endpoint
```
GET /staff/list
Response: [{
  id: string,
  fullName: string,
  role: string,
  phone: string,
  openTicketCount: number
}]
```

### Step-by-Step Flow

1. **Owner Opens Complaint Detail**
2. **Clicks "Select Staff Member" or "Reassign"**
3. **Dropdown Opens** showing:
   - Staff avatar and name
   - Role and phone
   - Current open ticket count
4. **Owner Selects Staff Member**
5. **API Call:** `PATCH /complaints/:id/status`
   ```json
   {
     "status": "in_progress",
     "assignedTo": "staff-id"
   }
   ```
6. **Backend Processing:**
   - Updates complaint status
   - Sets `assignedTo` and `assignedAt`
   - Creates activity log
   - Notifies staff member (if notifications enabled)
7. **UI Update:** Refresh detail panel

---

## 6.4 Complaint Comments Flow

### User Story
As a user (owner/staff/tenant), I want to add comments to a complaint so that I can communicate about the issue.

### API Endpoint
```
POST /complaints/:id/comments
Request: { comment: string, isInternal?: boolean }
Response: Comment object
```

### Comment Types
1. **Public Comment:** Visible to all (tenant, staff, owner)
2. **Internal Note:** Visible only to staff/owner (not tenant)

### Step-by-Step Flow

1. **User Types Comment** in input field
2. **Optionally Checks "Internal Note"** checkbox (staff/owner only)
3. **Clicks Send** or presses Enter
4. **API Call:** `POST /complaints/:id/comments`
5. **Backend Processing:**
   - Validates comment length
   - Creates comment record with author info
   - Updates complaint `updatedAt`
   - Broadcasts via WebSocket (if connected)
6. **Response:** Created comment object
7. **UI Update:** Append comment to timeline

---

## 6.5 Complaint Rating Flow

### User Story
As a tenant, I want to rate the resolution of my complaint so that the management can track service quality.

### API Endpoint
```
POST /complaints/:id/rate
Request: { rating: 1-5, feedback?: string }
Response: Updated complaint
```

### Step-by-Step Flow

1. **Complaint Status Changes to "Resolved"**
2. **Tenant Sees "Rate this resolution" button**
3. **Rating Form Opens:**
   - Star rating (1-5 stars)
   - Optional feedback textarea
4. **Tenant Submits Rating**
5. **API Call:** `POST /complaints/:id/rate`
6. **Backend Processing:**
   - Validates rating (1-5)
   - Updates complaint with `tenantRating` and `tenantFeedback`
7. **UI Update:** Show submitted rating, hide rating form

---

## 6.6 Create Complaint Flow (Tenant)

### User Story
As a tenant, I want to create a complaint so that I can report an issue with my room or facilities.

### API Endpoint
```
POST /complaints
Request: {
  propertyId: string,
  category: string,
  priority: string,
  title: string,
  description: string
}
Response: Created complaint
```

### Categories
```typescript
const categories = [
  { value: "plumbing", label: "Plumbing", icon: "🔧" },
  { value: "electrical", label: "Electrical", icon: "⚡" },
  { value: "cleaning", label: "Cleaning", icon: "🧹" },
  { value: "maintenance", label: "Maintenance", icon: "🛠️" },
  { value: "pest_control", label: "Pest Control", icon: "🐛" },
  { value: "wifi", label: "WiFi / Internet", icon: "📶" },
  { value: "food", label: "Food & Mess", icon: "🍽️" },
  { value: "security", label: "Security", icon: "🔒" },
  { value: "noise", label: "Noise", icon: "🔊" },
  { value: "other", label: "Other", icon: "📋" },
];
```

### Priority Levels
```typescript
const priorities = {
  urgent: { label: "P1 - Urgent", color: "red" },
  high: { label: "P2 - High", color: "orange" },
  medium: { label: "P3 - Medium", color: "amber" },
  low: { label: "P4 - Low", color: "blue" },
};
```

### Step-by-Step Flow

1. **Tenant Clicks "New Ticket"**
2. **Create Modal Opens** with:
   - Category selector (icon grid)
   - Priority selector (color-coded buttons)
   - Title input
   - Description textarea
3. **Tenant Fills Form** and clicks "Submit Ticket"
4. **API Call:** `POST /complaints`
5. **Backend Processing:**
   - Auto-generates ticket number (e.g., "TKT-001")
   - Sets status to "open"
   - Links to tenant's profile, room, property
   - Creates activity log
   - Notifies owner (if notifications enabled)
6. **Response:** Created complaint
7. **UI Update:** Close modal, refresh complaints list

---

# 7. Owner/Admin IoT Dashboards

## 7.1 Water Consumption Dashboard

### User Story
As an owner, I want to monitor water consumption across my properties so that I can detect leaks and manage tanker orders.

### API Endpoints
```
GET /iot/water-tanks
Response: WaterTank[]

GET /iot/water-tanks/:id/readings?days=30
Response: WaterReading[]

GET /iot/analytics/water?propertyId=&days=30
Response: {
  totalConsumption: number,
  averageDaily: number,
  peakUsage: number,
  tankFillEvents: number,
  readings: [{ date, consumption, level }]
}

GET /iot/analytics/water/daily?date=2026-07-13
Response: {
  hourlyReadings: [{ hour, consumption, level }],
  totalConsumption: number,
  anomalies: [{ time, reason }]
}
```

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/iot/water/page.tsx`

### Display Elements

1. **Summary Cards (4 cards)**
   - Total Consumption (liters)
   - Average Daily
   - Peak Usage
   - Tanker Orders

2. **Main Chart** (LineChart)
   - X-axis: Date/Time
   - Y-axis: Consumption (liters)
   - Color-coded bars: Green (low), Yellow (moderate), Red (high)
   - Anomaly highlights

3. **Tank Level Widget**
   - Visual tank representation
   - Current level percentage
   - Color: Green (>50%), Yellow (20-50%), Red (<20%)
   - Last updated timestamp

4. **Calendar Date Picker**
   - Click any day to see hourly breakdown
   - Show daily total on hover

### Data Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User loads│     │  Fetch      │     │  Display    │
│   /iot/water│────▶│  /iot/      │────▶│  charts,    │
│             │     │  analytics/ │     │  tank level │
│             │     │  water      │     │  summary    │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 7.2 Electricity Consumption Dashboard

### User Story
As an owner, I want to monitor electricity consumption like a stock market dashboard so that I can track usage patterns and costs.

### API Endpoints
```
GET /iot/electricity-meters
Response: ElectricityMeter[]

GET /iot/electricity-meters/:id/readings?days=30
Response: ElectricityReading[]

GET /iot/analytics/electricity?propertyId=&days=30
Response: {
  totalConsumption: number,  // kWh
  averageDaily: number,
  peakLoad: number,  // kW
  totalCost: number,
  readings: [{ date, consumption, cost }]
}

GET /iot/analytics/electricity/daily?date=2026-07-13
Response: {
  hourlyReadings: [{ hour, powerKw, consumption, cost }],
  totalConsumption: number,
  totalCost: number,
  peakHour: string
}
```

### Frontend Component
**File:** `apps/web/src/app/(dashboard)/iot/electricity/page.tsx`

### Display Elements

1. **Summary Cards (4 cards)**
   - Total kWh consumed
   - Average daily
   - Peak load (kW)
   - Total cost (₹)

2. **Main Chart** (LineChart - Stock Market Style)
   - X-axis: Date/Time
   - Y-axis: kWh consumption
   - Real-time power indicator with sparkline
   - Cost trend with up/down arrows

3. **Calendar Date Picker**
   - Click any day for hourly breakdown
   - Color-coded bars by usage level

4. **Cost Comparison**
   - vs Previous period
   - vs Budget (if set)

---

## 7.3 IoT Device Management

### API Endpoints
```
POST /iot/water-tanks
Request: { name, tankType, capacityLiters, sensorId, location, ... }
Response: WaterTank

PUT /iot/water-tanks/:id
Request: Partial WaterTank
Response: Updated WaterTank

POST /iot/water-tanks/:id/readings
Request: { levelPercentage, levelLiters, timestamp, ... }
Response: Reading record

POST /iot/electricity-meters
Request: { meterNumber, meterType, costPerUnit, ... }
Response: ElectricityMeter

POST /iot/electricity-meters/:id/readings
Request: { powerKw, voltage, currentAmp, ... }
Response: Reading record
```

### Alert Thresholds
```typescript
// Water Tank Alerts
low_level_alert: 20%,      // Warning
critical_level_alert: 10%, // Critical
overflow_alert: 95%,       // Overflow warning

// Electricity Alerts
high_usage_alert: 50 kWh,  // Daily threshold
```

---

# 8. Owner/Admin Food Management

## 8.1 Food Poll Management

### User Story
As an owner, I want to create food polls so that residents can vote on menu items and I can plan meals.

### API Endpoints
```
POST /food/polls
Request: {
  propertyId: string,
  title: string,
  description: string,
  options: [{ id, label }],
  startDate: string,
  endDate: string
}
Response: Poll object

GET /food/polls
Response: Poll[]

POST /food/polls/:id/publish
Response: Published poll

POST /food/polls/:id/vote
Request: { optionId: string }
Response: Vote record

GET /food/polls/:id/results
Response: {
  poll: Poll,
  results: [{ optionId, label, votes, percentage }],
  totalVotes: number
}

POST /food/polls/:id/finalize
Request: { winningOptionId: string }
Response: Finalized poll
```

### Flow: Create Poll

1. **Owner Clicks "Create Poll"**
2. **Form Opens:**
   - Poll title (e.g., "Weekend Special Menu")
   - Description
   - Options (add multiple)
   - Start/End dates
3. **Owner Submits**
4. **API Call:** `POST /food/polls`
5. **Backend:** Creates poll with status "draft"
6. **Owner Publishes:** `POST /food/polls/:id/publish`
7. **Residents Notified:** Can now vote

### Flow: Vote on Poll

1. **Resident Sees Active Polls** on dashboard
2. **Resident Selects Option** and submits
3. **API Call:** `POST /food/polls/:id/vote`
4. **Backend:** Records vote, updates counts
5. **Results Updated:** Real-time via WebSocket

### Flow: Finalize Poll

1. **Voting Period Ends**
2. **Owner Sees Results** with vote counts
3. **Owner Clicks "Finalize"** with winning option
4. **API Call:** `POST /food/polls/:id/finalize`
5. **Backend:** Sets winning option, creates menu item

---

## 8.2 Meal Attendance Tracking

### User Story
As an owner/cook, I want to track meal attendance so that I know how many portions to prepare.

### API Endpoints
```
POST /food/attendance
Request: {
  tenantProfileId: string,
  date: string,
  breakfast: boolean,
  lunch: boolean,
  dinner: boolean
}
Response: Attendance record

GET /food/attendance?date=2026-07-13
Response: AttendanceSummary

GET /food/attendance/my
Response: My attendance records

GET /food/cook/today
Response: {
  breakfast: { count, residents: [] },
  lunch: { count, residents: [] },
  dinner: { count, residents: [] }
}
```

### Cook Dashboard
```
┌─────────────────────────────────────────┐
│ Today's Meal Count                      │
├─────────────────────────────────────────┤
│ Breakfast: 45 residents                 │
│ Lunch: 62 residents                     │
│ Dinner: 58 residents                    │
├─────────────────────────────────────────┤
│ [View detailed list]                    │
└─────────────────────────────────────────┘
```

---

## 8.3 Food Menu Management

### API Endpoints
```
POST /food/menu
Request: {
  propertyId: string,
  date: string,
  mealType: "breakfast" | "lunch" | "snacks" | "dinner",
  items: [{ name, quantity }],
  isSpecial: boolean,
  specialName?: string
}
Response: Menu object

GET /food/menu?date=2026-07-13
Response: Menu[]
```

### Menu Display (Tenant View)
```
┌─────────────────────────────────────────┐
│ Today's Menu                            │
├─────────────────────────────────────────┤
│ 🍳 Breakfast (7:30 - 9:00 AM)          │
│   • Poha                                │
│   • Boiled Eggs                         │
│   • Tea/Coffee                          │
│   • Fruit Bowl                          │
│   [👍 Vote this meal]                   │
├─────────────────────────────────────────┤
│ 🍛 Lunch (12:30 - 2:00 PM)            │
│   • Rice                                │
│   • Dal Makhani                         │
│   • Paneer Butter Masala                │
│   • Roti, Salad                         │
│   [👍 Vote this meal]                   │
└─────────────────────────────────────────┘
```

---

# 9. Tenant/Resident Portal View

## 9.1 Tenant Dashboard

### User Story
As a tenant, I want to see a personalized dashboard with my room info, payment status, and quick actions.

### API Endpoints
```
GET /tenant/me
Response: TenantProfile

GET /tenant/dashboard
Response: {
  profile: TenantProfile,
  latestPayment: RentPayment,
  pendingPayments: RentPayment[],
  openComplaints: Complaint[],
  recentActivity: ActivityLog[]
}
```

### Frontend Component
**File:** `apps/web/src/app/tenant/page.tsx`

### Display Elements

1. **Welcome Header**
   - "Welcome back, {firstName}"
   - Property name

2. **Quick Stats (4 cards)**
   - Room number + Bed number
   - Monthly rent amount
   - Open complaints count
   - Move-in date

3. **Payment Status Card**
   - Latest payment period
   - Due date
   - Amount and status badge
   - "View all" link
   - Pending payments warning (if any)

4. **Quick Actions (3 cards)**
   - Pay Rent → `/tenant/payments`
   - Raise Complaint → `/tenant/complaints`
   - Today's Menu → `/tenant/food`

---

## 9.2 Tenant Payments View

### User Story
As a tenant, I want to view my payment history so that I can track what I've paid and what's due.

### API Endpoint
```
GET /tenant/payments
Response: {
  payments: RentPayment[]
}
```

### Frontend Component
**File:** `apps/web/src/app/tenant/payments/page.tsx`

### Display Elements

1. **Header**
   - Title: "My Payments"
   - Subtitle: "View your rent payment history"

2. **Payments Table**
   | Column | Description |
   |--------|-------------|
   | Period | Month/Year |
   | Rent | Rent amount |
   | Paid | Amount paid |
   | Balance | Outstanding |
   | Status | Badge |
   | Due Date | Payment due |

### Edge Cases
- **No payments:** Show empty state with message
- **All paid:** Show success message
- **Pending payments:** Highlight with warning color

---

## 9.3 Tenant Complaints View

### User Story
As a tenant, I want to create and track complaints so that my issues are addressed.

### API Endpoints
```
GET /tenant/complaints
Response: { data: Complaint[] }

POST /tenant/complaints
Request: { category, priority, title, description }
Response: Created complaint

GET /tenant/complaints/:id
Response: Complaint with comments

POST /tenant/complaints/:id/comments
Request: { comment: string }
Response: Comment object

POST /tenant/complaints/:id/rate
Request: { rating: 1-5, feedback?: string }
Response: Updated complaint
```

### Frontend Component
**File:** `apps/web/src/app/tenant/complaints/page.tsx`

### Display Elements

1. **Header**
   - Title: "My Complaints"
   - Subtitle: "Track and manage your maintenance requests"
   - "New Ticket" button

2. **Complaint List** (Accordion style)
   - Each complaint expandable
   - Shows: ticket number, priority badge, status badge
   - Title and description preview
   - Room number and created date
   - Star rating (if resolved)

3. **Expanded Detail**
   - Status workflow progress bar
   - Resolution notes (if resolved)
   - "Rate this resolution" button (if applicable)
   - Activity timeline
   - Comment input

4. **Create Modal**
   - Category selector (icon grid)
   - Priority selector
   - Title input
   - Description textarea

---

## 9.4 Tenant Profile View

### User Story
As a tenant, I want to view and manage my profile information.

### Frontend Component
**File:** `apps/web/src/app/tenant/profile/page.tsx`

### Display Elements

1. **Avatar + Name**
   - Initials avatar (colored circle)
   - Full name
   - "Resident at {property}"

2. **Profile Info**
   - Full Name
   - Email
   - Phone
   - Room + Bed
   - Move-in Date
   - Role

---

## 9.5 Tenant Food View

### User Story
As a tenant, I want to view today's menu and vote on meal options.

### Frontend Component
**File:** `apps/web/src/app/tenant/food/page.tsx`

### Display Elements

1. **Header**
   - Title: "Food & Meals"
   - Subtitle: "View today's menu and weekly meal plan"

2. **Tab Switcher**
   - "Today's Menu" | "Weekly Plan"

3. **Menu Cards** (grid layout)
   - Meal type (Breakfast, Lunch, Snacks, Dinner)
   - Time slot
   - List of items
   - "Vote this meal" button

---

# 10. Staff Portal View

## 10.1 Staff Dashboard

### User Story
As a staff member, I want to see my daily tasks and assigned complaints so that I can prioritize my work.

### API Endpoint
```
GET /staff/dashboard
Response: {
  pendingTasks: number,
  openComplaints: number,
  completedToday: number,
  totalResidents: number,
  assignedTickets: Complaint[],
  todayTasks: Task[]
}
```

### Frontend Component
**File:** `apps/web/src/app/staff-portal/page.tsx`

### Display Elements

1. **Welcome Header**
   - "Staff Dashboard"
   - "Welcome, {staff name}"

2. **Summary Cards (4 cards)**
   - Pending Tasks
   - Open Complaints
   - Completed Today
   - Residents

3. **Quick Actions (3 cards)**
   - My Tasks → `/staff-portal/tasks`
   - Complaints → `/staff-portal/complaints`
   - Daily Checklist → `/staff-portal/checklist`

---

## 10.2 Staff Tasks View

### User Story
As a staff member, I want to view and complete my assigned tasks.

### API Endpoints
```
GET /staff/tasks
Response: Task[]

PATCH /staff/tasks/:id/complete
Response: Updated task
```

### Frontend Component
**File:** `apps/web/src/app/staff-portal/tasks/page.tsx`

### Display Elements

1. **Header**
   - Title: "My Tasks"
   - Subtitle: "Manage your assigned tasks"

2. **Filter Tabs**
   - All | Pending | In Progress | Completed

3. **Task List**
   - Each task shows:
     - Checkbox (toggle complete)
     - Title (strikethrough if completed)
     - Priority badge
     - Status badge

### Flow: Complete Task

1. **Staff Clicks Checkbox** on task
2. **API Call:** `PATCH /staff/tasks/:id/complete`
3. **Backend:**
   - Updates task status to "completed"
   - Sets `completedAt` timestamp
   - Creates activity log
4. **UI Update:** Toggle checkbox, update status

---

## 10.3 Staff Complaints View

### User Story
As a staff member, I want to view and handle complaints assigned to me.

### API Endpoint
```
GET /staff/tickets
Response: {
  open: Complaint[],
  inProgress: Complaint[],
  resolved: Complaint[]
}
```

### Frontend Component
**File:** `apps/web/src/app/staff-portal/complaints/page.tsx`

### Display Elements

1. **Header**
   - Title: "Complaints"
   - Subtitle: "Handle resident issues and track resolution"

2. **Stats (3 cards)**
   - New (open)
   - In Progress
   - Resolved

3. **Ticket Groups**
   - **New Tickets:** With "Accept" button
   - **In Progress:** Currently working on
   - **Resolved:** Completed tickets

4. **Detail Panel** (when ticket selected)
   - Ticket info
   - Tenant info
   - Status workflow
   - "Mark as Resolved" button
   - Activity timeline
   - Comment input with "Internal note" checkbox

### Flow: Accept Ticket

1. **Staff Clicks "Accept" on New Ticket**
2. **API Call:** `PATCH /complaints/:id/status`
   ```json
   {
     "status": "in_progress",
     "assignedTo": "current-staff-id"
   }
   ```
3. **Backend:**
   - Updates status to "in_progress"
   - Sets `assignedTo` and `assignedAt`
4. **UI Update:** Move ticket to "In Progress" group

### Flow: Resolve Ticket

1. **Staff Clicks "Mark as Resolved"**
2. **Resolution Form Opens:**
   - Resolution notes textarea
3. **Staff Submits**
4. **API Call:** `PATCH /complaints/:id/status`
   ```json
   {
     "status": "resolved",
     "resolutionNotes": "Fixed the leaky faucet..."
   }
   ```
5. **Backend:**
   - Updates status to "resolved"
   - Sets `resolvedAt` and `resolutionNotes`
6. **UI Update:** Move ticket to "Resolved" group

---

## 10.4 Staff Daily Checklist

### User Story
As a staff member, I want to complete a daily checklist so that I ensure all routine duties are performed.

### Frontend Component
**File:** `apps/web/src/app/staff-portal/checklist/page.tsx`

### Display Elements

1. **Header**
   - Title: "Daily Checklist"
   - Subtitle: "Complete your daily duties"

2. **Progress Bar**
   - "{completed} of {total} completed"
   - Visual progress bar

3. **Checklist Items**
   - Each item shows:
     - Checkmark icon (filled if completed)
     - Task description
   - Click to toggle completion

### Default Checklist Items
```typescript
const defaultChecklist = [
  "Check all floor bathrooms are clean",
  "Verify common area is tidy",
  "Check water levels in tanks",
  "Inspect entrance and security",
  "Review pending complaints",
  "Check kitchen supplies",
  "Verify visitor log is updated",
  "Report any maintenance issues",
];
```

### Flow: Toggle Item

1. **Staff Clicks Checklist Item**
2. **UI Toggle:** Icon changes from circle to checkmark
3. **Progress Updates:** Recalculate percentage
4. **Note:** Currently local state only (not persisted)

---

## 10.5 Staff Residents View

### User Story
As a staff member, I want to view resident information so that I can assist them.

### API Endpoint
```
GET /staff/residents
Response: {
  residents: Resident[]
}
```

### Frontend Component
**File:** `apps/web/src/app/staff-portal/residents/page.tsx`

### Display Elements

1. **Header**
   - Title: "Residents"
   - Subtitle: "View resident information"

2. **Residents Table**
   | Column | Description |
   |--------|-------------|
   | Name | Avatar + Full name |
   | Room | Room number |
   | Bed | Bed number |
   | Phone | Contact number |
   | Status | Badge (active/inactive) |

### Note
- Staff can only view, not edit resident information
- Limited fields compared to owner view

---

# 11. Cross-Cutting Concerns

## 11.1 Multi-Tenancy

### Data Isolation
Every table has a `tenant_id` column. All queries must filter by `request.user.tenantId`.

```typescript
// Example: Get rooms for current tenant
const rooms = db.select().from(rooms)
  .where(eq(rooms.tenantId, request.user.tenantId))
  .all();
```

### Security Boundary
- API validates `tenantId` on every request
- Frontend stores `tenantId` in JWT
- No cross-tenant data access possible

---

## 11.2 Real-Time Updates (WebSocket)

### Connection Flow
1. **User Logs In:** Frontend connects to `ws://localhost:3001/ws`
2. **Authentication:** WebSocket handshake includes JWT token
3. **Connection Tracking:**
   ```typescript
   const clients: Map<string, WebSocketClient[]> = new Map();
   // key: tenantId, value: array of connected clients
   ```
4. **Broadcasting:**
   - `broadcastToTenant(tenantId, message)`: Send to all clients in tenant
   - `broadcastToUsers(tenantId, userIds, message)`: Send to specific users

### Event Types
```typescript
// Payment updated
{ type: "payment_updated", data: Payment }

// Complaint created/updated
{ type: "complaint_updated", data: Complaint }

// IoT reading
{ type: "water_reading", data: WaterReading }
{ type: "electricity_reading", data: ElectricityReading }

// Notification
{ type: "notification", data: Notification }
```

---

## 11.3 Activity Logging

### Every Mutating Operation Logs:
```typescript
{
  tenantId: string,
  actorType: "user" | "system",
  actorId: string,
  actorName: string,
  action: "created" | "updated" | "deleted" | "checked_in" | "checked_out" | ...,
  entityType: "resident" | "payment" | "complaint" | ...,
  entityId: string,
  oldValues: object,  // For updates
  newValues: object,  // For updates
  ipAddress: string,
  userAgent: string
}
```

---

## 11.4 Error Handling

### API Response Format
```typescript
// Success
{ data: T }

// Error
{ error: string, details?: any }

// Paginated
{ data: T[], pagination: { total, page, limit } }
```

### Frontend Error Handling
```typescript
// In api.ts
if (!res.ok) {
  const error = await res.json();
  throw new Error(error.error || "Request failed");
}

// 401 handling
if (res.status === 401) {
  localStorage.removeItem("opsora_token");
  window.location.href = "/login";
}
```

---

## 11.5 Rate Limiting

### Global Rate Limit
- 100 requests per minute per IP

### Stricter Limits
- `/auth/login`: 5 attempts per minute per IP
- `/auth/register`: 3 attempts per 5 minutes per IP

### Implementation
```typescript
// Global
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Per-IP for login
app.addHook('preHandler', async (request, reply) => {
  const ip = request.ip;
  const attempts = getRecentAttempts(ip, 60000);
  if (attempts >= 5) {
    return reply.status(429).send({ error: "Too many attempts" });
  }
});
```

---

## 11.6 File Upload

### API Endpoint
```
POST /upload
Headers: Content-Type: multipart/form-data
Body: file (binary)
Response: { url: string, filename: string }
```

### Constraints
- Max file size: 10MB
- Supported types: Images (jpg, png, gif), Documents (pdf)
- Storage: Local filesystem (can be extended to S3)

---

## 11.7 Notifications

### Notification Types
```typescript
type NotificationType = 
  | "payment_due"
  | "payment_received"
  | "complaint_created"
  | "complaint_assigned"
  | "complaint_resolved"
  | "visitor_approved"
  | "food_menu_updated"
  | "system_announcement";
```

### API Endpoints
```
GET /notifications
Response: Notification[]

PATCH /notifications/:id/read
Response: Updated notification

POST /notifications/read-all
Response: { message: "All notifications marked as read" }
```

### Future Enhancements
- Push notifications (FCM)
- SMS notifications (Twilio/MSG91)
- Email notifications (Resend/SendGrid)
- WhatsApp notifications (Meta Business API)

---

# Appendix A: API Route Summary

| Route Group | Prefix | Auth Required | Description |
|-------------|--------|---------------|-------------|
| Auth | `/auth` | No (login/register) | Authentication |
| Users | `/users` | Yes | User management |
| Properties | `/properties` | Yes | Property CRUD |
| Floors | `/floors` | Yes | Floor management |
| Rooms | `/rooms` | Yes | Room & bed management |
| Residents | `/residents` | Yes | Tenant profile management |
| Payments | `/payments` | Yes | Rent payment management |
| Complaints | `/complaints` | Yes | Ticket system |
| Dashboard | `/dashboard` | Yes | Overview metrics |
| IoT Water | `/iot/water-tanks` | Yes | Water tank management |
| IoT Electricity | `/iot/electricity-meters` | Yes | Electricity meter management |
| IoT Analytics | `/iot/analytics` | Yes | Consumption analytics |
| Food | `/food` | Yes | Menu, polls, attendance |
| Payments Proof | `/payments-proof` | Yes | Invoice, proof, receipts |
| Staff Portal | `/staff` | Yes | Staff-specific endpoints |
| Tenant Portal | `/tenant` | Yes | Tenant-specific endpoints |
| Notifications | `/notifications` | Yes | Notification management |
| Upload | `/upload` | Yes | File upload |
| WebSocket | `/ws` | Yes | Real-time updates |

---

# Appendix B: Frontend Route Summary

| Route Group | Layout | Role Access | Pages |
|-------------|--------|-------------|-------|
| `/login` | Root | Public | Login form |
| `/dashboard` | `(dashboard)` | owner, admin | Dashboard overview |
| `/residents` | `(dashboard)` | owner, admin | Resident management |
| `/rooms` | `(dashboard)` | owner, admin | Room & bed view |
| `/payments` | `(dashboard)` | owner, admin | Payment management |
| `/complaints` | `(dashboard)` | owner, admin | Service desk |
| `/iot/water` | `(dashboard)` | owner, admin | Water IoT dashboard |
| `/iot/electricity` | `(dashboard)` | owner, admin | Electricity IoT dashboard |
| `/food` | `(dashboard)` | owner, admin | Food management |
| `/tenant` | `tenant` | resident | Tenant dashboard |
| `/tenant/payments` | `tenant` | resident | Payment history |
| `/tenant/complaints` | `tenant` | resident | Complaint management |
| `/tenant/food` | `tenant` | resident | Food menu |
| `/tenant/profile` | `tenant` | resident | Profile view |
| `/staff-portal` | `staff-portal` | staff | Staff dashboard |
| `/staff-portal/tasks` | `staff-portal` | staff | Task management |
| `/staff-portal/complaints` | `staff-portal` | staff | Complaint handling |
| `/staff-portal/checklist` | `staff-portal` | staff | Daily checklist |
| `/staff-portal/residents` | `staff-portal` | staff | Resident view |

---

# Appendix C: Database Schema Summary

| Table | Primary Key | Key Relationships |
|-------|-------------|-------------------|
| `tenants` | id | Organizations/property owners |
| `users` | id | tenant_id → tenants |
| `properties` | id | tenant_id → tenants |
| `floors` | id | property_id → properties |
| `rooms` | id | floor_id → floors, property_id → properties |
| `beds` | id | room_id → rooms |
| `tenant_profiles` | id | bed_id → beds, room_id → rooms |
| `rent_payments` | id | tenant_profile_id → tenant_profiles |
| `complaints` | id | tenant_profile_id → tenant_profiles |
| `complaint_comments` | id | complaint_id → complaints |
| `visitors` | id | property_id → properties |
| `staff` | id | property_id → properties |
| `staff_attendance` | id | staff_id → staff |
| `tasks` | id | assigned_to → staff |
| `food_menu` | id | property_id → properties |
| `food_polls` | id | property_id → properties |
| `food_votes` | id | poll_id → food_polls |
| `meal_attendance` | id | tenant_profile_id → tenant_profiles |
| `water_tanks` | id | property_id → properties |
| `water_readings` | time (hypertable) | tank_id → water_tanks |
| `electricity_meters` | id | property_id → properties |
| `electricity_readings` | time (hypertable) | meter_id → electricity_meters |
| `notifications` | id | user_id → users |
| `activity_logs` | id | tenant_id → tenants |

---

# Appendix D: Environment Variables

```bash
# Required
JWT_SECRET=your-secret-key-here

# Optional
PORT=3001
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://localhost:3002
NODE_ENV=development

# Database
DATABASE_URL=file:./opsora.db

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

# Appendix E: Development Commands

```bash
# Install dependencies
npm install

# Start development servers
npm run dev  # Starts both API (3001) and Web (3000)

# Database operations
npm run db:generate  # Generate migration
npm run db:migrate   # Run migration
npm run db:studio    # Open Drizzle Studio
npm run db:seed      # Seed database

# Single app
cd apps/api && npm run dev    # API only
cd apps/web && npm run dev    # Web only

# Linting
npm run lint

# Build
npm run build
```

---

# Appendix F: Seed Data Credentials

| Role | Email | Password |
|------|-------|----------|
| Owner | admin@sunshinepg.com | password123 |
| Staff | staff@sunshinepg.com | password123 |
| Resident | resident@sunshinepg.com | password123 |

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
**Author:** Opsora Development Team
