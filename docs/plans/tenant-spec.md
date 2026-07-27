# Opsora — Tenant/Resident Portal Complete Specification

## Document Purpose

This document provides **comprehensive flow specifications** exclusively for the **Tenant/Resident** portal of Opsora. It covers every feature, API endpoint, UI component, and workflow that a tenant/resident can access and use.

**Repository:** `https://github.com/Mourdhwaj/opsora.git`
**Architecture:** Turborepo monorepo with `apps/api` (Fastify + Drizzle ORM + SQLite) and `apps/web` (Next.js 16 App Router + Tailwind v4)
**Current Date:** July 2026
**Role Access:** `resident`

---

# Table of Contents

1. [Overview & Navigation Structure](#1-overview--navigation-structure)
2. [Tenant Dashboard](#2-tenant-dashboard)
3. [My Profile](#3-my-profile)
4. [My Payments](#4-my-payments)
5. [Payment Proof Upload](#5-payment-proof-upload)
6. [My Complaints](#6-my-complaints)
7. [Complaint Comments & Rating](#7-complaint-comments--rating)
8. [Food & Meals](#8-food--meals)
9. [Notifications](#9-notifications)
10. [Mobile-First Design](#10-mobile-first-design)

---

# 1. Overview & Navigation Structure

## 1.1 Tenant Portal Layout

The tenant portal uses the `tenant` route group with a dedicated layout.

### Navigation Structure
```
┌─────────────────────────────────────────────────────────┐
│  🏠 Sunshine PG                                        │
├─────────────────────────────────────────────────────────┤
│  📊 My Dashboard                                        │
│  💰 My Payments                                         │
│  🎫 My Complaints                                       │
│  🍽️ Food & Meals                                        │
│  👤 My Profile                                          │
├─────────────────────────────────────────────────────────┤
│  🔔 Notifications (2)                                   │
│  🚪 Logout                                              │
└─────────────────────────────────────────────────────────┘
```

### Route Protection
```typescript
// apps/web/src/middleware.ts
const TENANT_ROUTES = ["/tenant"];

// Role-based access
if (role === "resident") {
  // Tenant can only access /tenant/* routes
  if (!pathname.startsWith("/tenant")) {
    return NextResponse.redirect(new URL("/tenant", request.url));
  }
}
```

### Layout Component
**File:** `apps/web/src/app/tenant/layout.tsx`

The layout provides:
- Top header with property name and user menu
- Main content area
- Mobile-optimized responsive design
- Bottom navigation bar on mobile (future)

---

# 2. Tenant Dashboard

## 2.1 Dashboard Page

### User Story
As a tenant, I want to see a personalized dashboard with my room info, payment status, and quick actions so that I can manage my stay easily.

### Page Route
```
GET /tenant
Component: apps/web/src/app/tenant/page.tsx
```

### API Endpoints
```
GET /tenant/me
Headers: Authorization: Bearer <token>
Role: resident

Response: TenantProfile

GET /tenant/dashboard
Headers: Authorization: Bearer <token>
Role: resident

Response: {
  profile: TenantProfile,
  latestPayment: RentPayment,
  pendingPayments: RentPayment[],
  openComplaints: Complaint[],
  recentActivity: ActivityLog[]
}
```

### Tenant Profile Data Model
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
  dietaryPreference?: string;
  // Computed fields
  roomNumber?: string;
  floorNumber?: number;
  bedNumber?: string;
  propertyName?: string;
}
```

### UI Components

#### Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ Welcome back, Amit           ☀️ Good Morning            │
│ Here's an overview of your stay at Sunshine PG          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐                       │
│ │ 🏠           │ │ 💳           │                       │
│ │ Room 101     │ │ ₹8,000       │                       │
│ │ Bed B1       │ │ per month    │                       │
│ └──────────────┘ └──────────────┘                       │
│ ┌──────────────┐ ┌──────────────┐                       │
│ │ ⚠️           │ │ 📅           │                       │
│ │ 1            │ │ Jan 15       │                       │
│ │ Open Tickets │ │ 2026         │                       │
│ └──────────────┘ └──────────────┘                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Payment Status                                          │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Latest: July 2026                                   ││
│ │ Due: July 5, 2026                                   ││
│ │                                                     ││
│ │ ₹8,000                              [paid]          ││
│ │                                                     ││
│ │ You have 1 pending payment(s) totaling ₹8,000       ││
│ └─────────────────────────────────────────────────────┘│
│                                         [View all →]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 💳           │ │ ⚠️           │ │ 🍽️           │     │
│ │ Pay Rent     │ │ Raise        │ │ Today's      │     │
│ │              │ │ Complaint    │ │ Menu         │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### Metric Cards (4 cards)
| Card | Icon | Description |
|------|------|-------------|
| Room | 🏠 | Room number and bed number |
| Rent | 💳 | Monthly rent amount |
| Open Tickets | ⚠️ | Count of open complaints |
| Since | 📅 | Move-in date |

#### Payment Status Card
- Latest payment period
- Due date
- Amount and status badge
- "View all" link to payments page
- Pending payments warning (if any)

#### Quick Actions (3 cards)
| Action | Icon | Route |
|--------|------|-------|
| Pay Rent | 💳 | `/tenant/payments` |
| Raise Complaint | ⚠️ | `/tenant/complaints` |
| Today's Menu | 🍽️ | `/tenant/food` |

### Data Flow
```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User loads│     │  GET /tenant/   │     │  Render         │
│   /tenant   │────▶│  dashboard      │────▶│  profile,       │
│             │     │                 │     │  payments,      │
│             │     │                 │     │  complaints     │
└─────────────┘     └─────────────────┘     └─────────────────┘
```

### UI/UX Specifications

**Loading State:**
- Show shimmer skeleton cards
- Spinner in center

**Error State:**
- Friendly error message
- "Retry" button

**Responsive Behavior:**
- Mobile: 1 column cards, stacked layout
- Tablet: 2 column cards
- Desktop: 4 column cards

---

# 3. My Profile

## 3.1 Profile Page

### User Story
As a tenant, I want to view my profile information so that I can verify my details are correct.

### Page Route
```
GET /tenant/profile
Component: apps/web/src/app/tenant/profile/page.tsx
```

### API Endpoint
```
GET /tenant/me
Headers: Authorization: Bearer <token>
Role: resident

Response: TenantProfile
```

### UI Components

**Profile Page:**
```
┌─────────────────────────────────────────────────────────┐
│ My Profile                                              │
│ View and manage your profile                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────┐                                                 │
│  │ AP │ Amit Patel                                      │
│  └────┘ Resident at Sunshine PG                         │
│                                                         │
│ 📋 Full Name                                            │
│    Amit Patel                                           │
│                                                         │
│ ✉️ Email                                                │
│    amit@example.com                                     │
│                                                         │
│ 📱 Phone                                                │
│    +919800000001                                        │
│                                                         │
│ 🏠 Room                                                 │
│    101 · Bed B1                                         │
│                                                         │
│ 📅 Move-in Date                                         │
│    January 15, 2026                                     │
│                                                         │
│ 👤 Role                                                 │
│    Resident                                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Profile Fields Displayed
| Field | Icon | Description |
|-------|------|-------------|
| Full Name | 📋 | Resident's full name |
| Email | ✉️ | Email address |
| Phone | 📱 | Contact number |
| Room | 🏠 | Room number and bed |
| Move-in Date | 📅 | Date of check-in |
| Role | 👤 | User role (Resident) |

### Additional Info (if available)
| Field | Description |
|-------|-------------|
| Gender | Male/Female/Other |
| Date of Birth | DOB |
| Blood Group | Blood type |
| Occupation | Job/Student |
| Company/College | Workplace/School |
| Emergency Contact | Name and phone |
| Aadhaar Number | Identity document |
| PAN Number | Tax document |

---

# 4. My Payments

## 4.1 Payments History

### User Story
As a tenant, I want to view my payment history so that I can track what I've paid and what's due.

### Page Route
```
GET /tenant/payments
Component: apps/web/src/app/tenant/payments/page.tsx
```

### API Endpoint
```
GET /tenant/payments
Headers: Authorization: Bearer <token>
Role: resident

Response: {
  payments: RentPayment[]
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
  paymentStatus: string;       // "pending" | "paid" | "partial" | "overdue" | "confirmed"
  createdAt: string;
  updatedAt: string;
}
```

### UI Components

**Payments Page:**
```
┌─────────────────────────────────────────────────────────┐
│ My Payments                                             │
│ View your rent payment history                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Month      │ Rent    │ Paid    │ Balance │ Status   ││
│ ├─────────────────────────────────────────────────────┤│
│ │ July 2026  │ ₹8,000  │ ₹0      │ ₹8,000  │ pending ││
│ │ June 2026  │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    ││
│ │ May 2026   │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    ││
│ │ Apr 2026   │ ₹8,000  │ ₹6,000  │ ₹2,000  │ partial ││
│ │ Mar 2026   │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    ││
│ │ Feb 2026   │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    ││
│ │ Jan 2026   │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Payments Table Columns:**
| Column | Description |
|--------|-------------|
| Month | Billing period (Month/Year) |
| Rent | Rent amount |
| Paid | Amount paid |
| Balance | Outstanding balance |
| Status | Badge (paid/pending/partial/overdue) |
| Due Date | Payment due date |

### Payment Status Badges
| Status | Color | Description |
|--------|-------|-------------|
| paid | Green | Fully paid |
| confirmed | Green | Payment verified by owner |
| partial | Amber | Partially paid |
| pending | Red | Not yet paid |
| overdue | Red | Past due date |

### Edge Cases

**No Payments:**
```
┌─────────────────────────────────────────────────────────┐
│ My Payments                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│            📋                                           │
│       No payment records                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**All Paid:**
- Show success message
- All rows show green "paid" badge

**Pending Payments:**
- Highlight with warning color
- Show due date prominently

---

# 5. Payment Proof Upload

## 5.1 Upload Payment Proof

### User Story
As a tenant, I want to upload payment proof so that the owner can verify my payment and update my records.

### API Endpoint
```
POST /payments-proof/proofs
Headers: Authorization: Bearer <token>, Content-Type: multipart/form-data
Role: resident

Request: {
  rentPaymentId: string,
  file: File,                  // Screenshot/image of payment
  transactionId: string,       // UPI ref, cheque number, etc.
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

### Step-by-Step Flow

1. **Tenant Navigates to Payments Page**
2. **Selects Pending Payment** to pay
3. **Clicks "Upload Proof"** button
4. **Upload Modal Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ Upload Payment Proof                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Payment Period: July 2026                               │
│ Amount Due: ₹8,000                                      │
│                                                         │
│ Upload Screenshot *                                     │
│ ┌─────────────────────────────────────────────────────┐│
│ │                                                     ││
│ │    📷 Click to upload or drag and drop              ││
│ │    PNG, JPG, GIF up to 10MB                         ││
│ │                                                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Transaction ID *                                        │
│ ┌─────────────────────────────────────────────────────┐│
│ │ e.g. UPI ref: txn_1234567890                       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Amount *                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ₹ 8,000                                             ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Payment Method                                          │
│ ┌─────────────────────────────────────────────────────┐│
│ │ UPI                                             ▼  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                              [Cancel]  [Upload Proof]   │
└─────────────────────────────────────────────────────────┘
```

5. **Tenant Selects File** (screenshot of payment)
6. **Enters Transaction ID** (UPI reference number)
7. **Enters Amount** (pre-filled with balance)
8. **Selects Payment Method** (UPI, Bank Transfer, etc.)
9. **Clicks "Upload Proof"**

10. **API Call:** `POST /payments-proof/proofs`

11. **Backend Processing:**
    - Validates file type (png, jpg, gif, pdf)
    - Validates file size (max 10MB)
    - Saves file to uploads directory
    - Creates proof record with status "pending"
    - Creates activity log entry
    - Notifies owner (if notifications enabled)

12. **Response:** Created proof record

13. **UI Update:**
    - Close modal
    - Show success toast: "Payment proof uploaded successfully"
    - Update payment status to "pending verification"

### Upload Success State
```
┌─────────────────────────────────────────────────────────┐
│ ✅ Payment Proof Uploaded                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Your payment proof has been uploaded successfully.      │
│                                                         │
│ Status: Pending Verification                            │
│ The owner will verify your payment shortly.             │
│                                                         │
│                              [Close]                     │
└─────────────────────────────────────────────────────────┘
```

### My Proofs List

**API Endpoint:**
```
GET /payments-proof/proofs/my
Headers: Authorization: Bearer <token>
Role: resident

Response: Proof[]
```

**UI Components:**
```
┌─────────────────────────────────────────────────────────┐
│ My Payment Proofs                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📷 July 2026 - ₹8,000                              ││
│ │ UPI Ref: txn_1234567890                            ││
│ │ Uploaded: July 10, 2026                             ││
│ │ Status: ✅ Confirmed                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 📷 June 2026 - ₹8,000                              ││
│ │ UPI Ref: txn_0987654321                            ││
│ │ Uploaded: June 8, 2026                              ││
│ │ Status: ✅ Confirmed                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Edge Cases

**File Too Large:**
- Error: "File size exceeds 10MB limit"
- Prevent upload

**Invalid File Type:**
- Error: "Only PNG, JPG, GIF, and PDF files are allowed"
- Prevent upload

**Missing Transaction ID:**
- Error: "Transaction ID is required"
- Prevent submission

**Amount Mismatch:**
- Warning: "Amount does not match the balance due"
- Allow but flag for owner review

---

# 6. My Complaints

## 6.1 Complaints List

### User Story
As a tenant, I want to view and manage my complaints so that I can track the status of my maintenance requests.

### Page Route
```
GET /tenant/complaints
Component: apps/web/src/app/tenant/complaints/page.tsx
```

### API Endpoint
```
GET /tenant/complaints
Headers: Authorization: Bearer <token>
Role: resident

Response: {
  data: Complaint[]
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

**Complaints Page:**
```
┌─────────────────────────────────────────────────────────┐
│ My Complaints                               [+ New Ticket]│
│ Track and manage your maintenance requests              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ TKT-001  [P1-URGENT] [OPEN]                        ││
│ │ AC not working in Room 205                          ││
│ │ 📍 Room 101 · 🕐 July 13, 2026 10:30 AM            ││
│ │ ⭐⭐⭐⭐⭐ (if rated)                                ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ TKT-002  [P2-HIGH] [IN_PROGRESS]                   ││
│ │ WiFi connectivity issues                            ││
│ │ 📍 Room 101 · 🕐 July 12, 2026 2:15 PM             ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ TKT-003  [P3-MEDIUM] [RESOLVED]                    ││
│ │ Leaky faucet in bathroom                            ││
│ │ 📍 Room 101 · 🕐 July 10, 2026 9:00 AM             ││
│ │ ✅ Resolved - July 11, 2026                         ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Complaint Card Elements:**
- Ticket number (monospace)
- Priority badge (color-coded)
- Status badge
- Title (bold)
- Description preview (truncated)
- Room number
- Created timestamp
- Rating stars (if resolved and rated)

### Complaint Status Workflow

**Status Flow:**
```
┌─────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│   New   │────▶│ In Progress  │────▶│ Resolved │────▶│  Closed  │
│ (open)  │     │(in_progress) │     │(resolved)│     │ (closed) │
└─────────┘     └──────────────┘     └──────────┘     └──────────┘
```

**Status Transitions:**
| From | To | Trigger | Actor |
|------|-----|---------|-------|
| New | In Progress | Staff assigned | Owner |
| In Progress | Resolved | Issue fixed | Staff |
| Resolved | Closed | Tenant confirms | Tenant |

**UI: Status Progress Bar**
```
● New ──▶ ● In Progress ──▶ ● Resolved ──▶ ● Closed
  ✓           ✓                ○              ○
```

---

## 6.2 Create Complaint

### User Story
As a tenant, I want to create a complaint so that I can report an issue with my room or facilities.

### API Endpoint
```
POST /tenant/complaints
Headers: Authorization: Bearer <token>
Role: resident

Request: {
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
  urgent: { label: "Urgent", color: "red" },
  high: { label: "High", color: "orange" },
  medium: { label: "Medium", color: "amber" },
  low: { label: "Low", color: "blue" },
};
```

### Step-by-Step Flow

1. **Tenant Clicks "New Ticket"**
2. **Create Complaint Modal Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ New Complaint                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Category *                                              │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 🔧  │ │ ⚡  │ │ 🧹  │ │ 🛠️  │ │ 🐛  │               │
│ │Plumb│ │Elec │ │Clean│ │Maint│ │Pest │               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │ 📶  │ │ 🍽️  │ │ 🔒  │ │ 🔊  │ │ 📋  │               │
│ │WiFi │ │Food │ │Secur│ │Noise│ │Other│               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                         │
│ Priority *                                              │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────────┐│
│ │  Urgent   │ │   High    │ │  Medium   │ │   Low    ││
│ └───────────┘ └───────────┘ └───────────┘ └──────────┘│
│                                                         │
│ Title *                                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Brief description of the issue                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Description *                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Provide details about the issue...                  ││
│ │                                                     ││
│ │                                                     ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                    [Cancel]  [Submit Ticket]            │
└─────────────────────────────────────────────────────────┘
```

3. **Tenant Selects Category** (icon grid)
4. **Tenant Selects Priority** (color-coded buttons)
5. **Tenant Enters Title** (brief description)
6. **Tenant Enters Description** (detailed explanation)
7. **Tenant Clicks "Submit Ticket"**

8. **API Call:** `POST /tenant/complaints`

9. **Backend Processing:**
   - Auto-generates ticket number (e.g., "TKT-001")
   - Sets status to "open"
   - Links to tenant's profile, room, property
   - Creates activity log
   - Notifies owner (if notifications enabled)

10. **Response:** Created complaint

11. **UI Update:**
    - Close modal
    - Refresh complaints list
    - Show success toast: "Ticket created successfully"

### Edge Cases

**Empty Title:**
- Error: "Title is required"
- Prevent submission

**Empty Description:**
- Error: "Description is required"
- Prevent submission

**Category Not Selected:**
- Error: "Please select a category"
- Prevent submission

---

## 6.3 View Complaint Details

### API Endpoint
```
GET /tenant/complaints/:id
Headers: Authorization: Bearer <token>
Role: resident

Response: Complaint with comments
```

### UI Components

**Complaint Detail (Expanded View):**
```
┌─────────────────────────────────────────────────────────┐
│ TKT-001  [P1-URGENT]                                   │
│ AC not working in Room 205                              │
│ The AC unit is making a strange noise and not cooling   │
│ properly. It started yesterday evening.                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Status                                                  │
│ ● New ──▶ ● In Progress ──▶ ● Resolved ──▶ ● Closed    │
│   ✓           ✓                ○              ○         │
│                                                         │
│ Resolution Notes                                        │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Fixed the AC by cleaning the filter and checking    ││
│ │ the refrigerant levels.                             ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ⭐ Rate this resolution                                 │
│                                                         │
│ Activity                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🟢 Ticket created                                   ││
│ │    July 13, 2026 10:30 AM                           ││
│ │                                                     ││
│ │ 💬 Rajesh Kumar: "On my way to check the AC"        ││
│ │    July 13, 2026 11:15 AM                           ││
│ │                                                     ││
│ │ 🟢 Resolved                                         ││
│ │    July 13, 2026 2:00 PM                            ││
│ │    Resolution: Fixed the AC...                      ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Add a comment...                              [Send]││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Complaint Detail Elements

**1. Status Progress Bar**
- Visual workflow showing current status
- Completed steps: Green with checkmark
- Current step: Colored badge
- Future steps: Gray

**2. Resolution Notes**
- Displayed when status is "resolved"
- Shows how the issue was fixed

**3. Rating Button**
- Appears when status is "resolved" and not yet rated
- Star rating (1-5)
- Optional feedback

**4. Activity Timeline**
- Shows all events chronologically:
  - Ticket creation
  - Status changes
  - Comments
  - Resolution

**5. Comment Input**
- Text field for adding comments
- Send button
- Visible for all statuses except "closed"

---

# 7. Complaint Comments & Rating

## 7.1 Add Comment

### User Story
As a tenant, I want to add comments to my complaint so that I can provide additional information or ask questions.

### API Endpoint
```
POST /tenant/complaints/:id/comments
Headers: Authorization: Bearer <token>
Role: resident

Request: {
  comment: string
}

Response: Comment object
```

### Comment Data Model
```typescript
{
  id: string;
  complaintId?: string;
  userId?: string;
  tenantProfileId?: string;
  comment: string;
  isInternal?: boolean;       // false for tenant comments
  createdAt: string;
  authorName?: string;
}
```

### Step-by-Step Flow

1. **Tenant Types Comment** in input field
2. **Clicks Send** or presses Enter
3. **API Call:** `POST /tenant/complaints/:id/comments`
4. **Backend Processing:**
   - Validates comment length
   - Creates comment record with author info
   - Updates complaint `updatedAt`
   - Broadcasts via WebSocket (if connected)
5. **Response:** Created comment object
6. **UI Update:** Append comment to timeline

### Comment Input UI
```
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐│
│ │ Add a comment...                              [Send]││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Comment Timeline
```
┌─────────────────────────────────────────────────────────┐
│ Activity                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🟢 Ticket created                                       │
│    July 13, 2026 10:30 AM                               │
│                                                         │
│ 💬 Amit Patel: "The issue is getting worse"             │
│    July 13, 2026 11:00 AM                               │
│                                                         │
│ 💬 Rajesh Kumar: "I'm checking now"                     │
│    July 13, 2026 11:15 AM                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Edge Cases

**Empty Comment:**
- Error: "Comment cannot be empty"
- Prevent submission

**Comment Too Long:**
- Error: "Comment must be less than 1000 characters"
- Prevent submission

**Closed Complaint:**
- Comment input hidden
- Message: "This complaint is closed"

---

## 7.2 Rate Resolution

### User Story
As a tenant, I want to rate the resolution of my complaint so that the management can track service quality.

### API Endpoint
```
POST /tenant/complaints/:id/rate
Headers: Authorization: Bearer <token>
Role: resident

Request: {
  rating: number,             // 1-5
  feedback?: string
}

Response: Updated complaint
```

### Step-by-Step Flow

1. **Complaint Status Changes to "Resolved"**
2. **Tenant Sees "Rate this resolution" button**
3. **Rating Form Opens:**
```
┌─────────────────────────────────────────────────────────┐
│ How was the resolution?                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ⭐ ⭐ ⭐ ⭐ ⭐                                          │
│                                                         │
│ Optional feedback:                                      │
│ ┌─────────────────────────────────────────────────────┐│
│ │ The technician was professional and fixed the       ││
│ │ issue quickly.                                       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│                    [Cancel]  [Submit Rating]            │
└─────────────────────────────────────────────────────────┘
```

4. **Tenant Selects Star Rating** (1-5 stars)
5. **Tenant Enters Optional Feedback**
6. **Tenant Clicks "Submit Rating"**

7. **API Call:** `POST /tenant/complaints/:id/rate`

8. **Backend Processing:**
   - Validates rating (1-5)
   - Updates complaint with `tenantRating` and `tenantFeedback`

9. **UI Update:**
   - Hide rating form
   - Show submitted rating stars
   - Show success toast

### Rating UI

**Before Rating:**
```
⭐ Rate this resolution
```

**After Rating:**
```
⭐⭐⭐⭐⭐ "The technician was professional..."
```

### Edge Cases

**Already Rated:**
- Show existing rating
- Hide rating form

**Invalid Rating:**
- Error: "Rating must be between 1 and 5"
- Prevent submission

---

# 8. Food & Meals

## 8.1 Food Page

### User Story
As a tenant, I want to view today's menu and vote on meal options so that I can plan my meals and provide feedback.

### Page Route
```
GET /tenant/food
Component: apps/web/src/app/tenant/food/page.tsx
```

### UI Components

**Food Page:**
```
┌─────────────────────────────────────────────────────────┐
│ Food & Meals                                            │
│ View today's menu and weekly meal plan                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Today's Menu] [Weekly Plan]                            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🍳 Breakfast (7:30 - 9:00 AM)                      ││
│ │ • Poha                                              ││
│ │ • Boiled Eggs                                       ││
│ │ • Tea/Coffee                                        ││
│ │ • Fruit Bowl                                        ││
│ │                                                     ││
│ │ [👍 Vote this meal]                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🍛 Lunch (12:30 - 2:00 PM)                         ││
│ │ • Rice                                              ││
│ │ • Dal Makhani                                       ││
│ │ • Paneer Butter Masala                              ││
│ │ • Roti, Salad                                       ││
│ │                                                     ││
│ │ [👍 Vote this meal]                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🍵 Snacks (5:00 - 6:00 PM)                         ││
│ │ • Samosa                                            ││
│ │ • Chai                                              ││
│ │ • Biscuits                                          ││
│ │                                                     ││
│ │ [👍 Vote this meal]                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🍲 Dinner (8:00 - 9:30 PM)                         ││
│ │ • Rice                                              ││
│ │ • Rajma                                             ││
│ │ • Chicken Curry                                     ││
│ │ • Roti, Curd                                        ││
│ │                                                     ││
│ │ [👍 Vote this meal]                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Menu Card Elements
- Meal type icon and name
- Time slot
- List of items
- "Vote this meal" button

### Meal Types
| Meal | Time | Icon |
|------|------|------|
| Breakfast | 7:30 - 9:00 AM | 🍳 |
| Lunch | 12:30 - 2:00 PM | 🍛 |
| Snacks | 5:00 - 6:00 PM | 🍵 |
| Dinner | 8:00 - 9:30 PM | 🍲 |

---

## 8.2 Vote on Meal

### User Story
As a tenant, I want to vote on meals so that the management knows which meals are popular.

### API Endpoint
```
POST /food/polls/:id/vote
Headers: Authorization: Bearer <token>
Role: resident

Request: { optionId: string }

Response: Vote record
```

### Step-by-Step Flow

1. **Tenant Sees "Vote this meal" button**
2. **Tenant Clicks to Vote**
3. **API Call:** `POST /food/polls/:id/vote`
4. **Backend:** Records vote, updates counts
5. **UI Update:** Button changes to "Voted ✓"

---

## 8.3 Weekly Plan

### Tab Switcher
```
[Today's Menu] [Weekly Plan]
```

**Weekly Plan View:**
```
┌─────────────────────────────────────────────────────────┐
│ Weekly Menu Plan                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Monday, July 14                                         │
│ Breakfast: Poha, Eggs, Tea                              │
│ Lunch: Rice, Dal, Paneer, Roti                          │
│ Dinner: Rice, Chicken, Roti, Curd                       │
│                                                         │
│ Tuesday, July 15                                        │
│ Breakfast: Upma, Toast, Coffee                          │
│ Lunch: Rice, Sambar, Potato Curry, Roti                 │
│ Dinner: Rice, Fish Curry, Roti, Salad                   │
│                                                         │
│ ...                                                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 9. Notifications

## 9.1 View Notifications

### User Story
As a tenant, I want to view notifications so that I can stay updated on important events.

### API Endpoint
```
GET /tenant/notifications
Headers: Authorization: Bearer <token>
Role: resident

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
  type: string;                // "payment_received" | "complaint_assigned" | etc.
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
│ 🔔 (2)                    👤 Amit Patel                 │
└─────────────────────────────────────────────────────────┘
```

**Notification Dropdown:**
```
┌─────────────────────────────────────────────────────────┐
│ Notifications (2 unread)            [Mark all as read]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🔵 Payment received for July 2026                       │
│    Your payment of ₹8,000 has been confirmed            │
│    5 minutes ago                                   [✓]  │
│                                                         │
│ 🔵 Complaint assigned                                  │
│    TKT-001 has been assigned to Rajesh Kumar            │
│    2 hours ago                                     [✓]  │
│                                                         │
│ [View All Notifications]                                │
└─────────────────────────────────────────────────────────┘
```

### Notification Types
| Type | Description |
|------|-------------|
| payment_received | Payment confirmed by owner |
| payment_due | Rent payment reminder |
| complaint_created | New complaint ticket |
| complaint_assigned | Staff assigned to complaint |
| complaint_resolved | Complaint marked as resolved |
| food_menu_updated | Menu updated |
| system_announcement | General announcement |

---

## 9.2 Mark as Read

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

# 10. Mobile-First Design

## 10.1 Responsive Layout

The tenant portal is designed mobile-first with the following breakpoints:

| Breakpoint | Layout |
|------------|--------|
| < 640px (Mobile) | Single column, stacked cards |
| 640-1024px (Tablet) | Two column grid |
| > 1024px (Desktop) | Full layout with sidebar |

## 10.2 Mobile Navigation

**Bottom Navigation Bar (Future):**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Content Area]                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  🏠      💰      🎫      🍽️      👤                    │
│  Home   Pay    Complaint  Food   Profile                │
└─────────────────────────────────────────────────────────┘
```

## 10.3 Touch-Friendly Design

- **Minimum tap target:** 44px x 44px
- **Spacing between elements:** 8px minimum
- **Font size:** 16px minimum for body text
- **Contrast ratio:** 4.5:1 for accessibility

## 10.4 Pull-to-Refresh

All list views support pull-to-refresh gesture on mobile.

## 10.5 Safe Area Insets

For devices with notches (iPhone X+):
```css
padding-bottom: env(safe-area-inset-bottom);
```

---

# Appendix A: Tenant API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tenant/me` | Get current user profile |
| GET | `/tenant/dashboard` | Get dashboard data |
| GET | `/tenant/payments` | Get payment history |
| GET | `/tenant/complaints` | List my complaints |
| GET | `/tenant/complaints/:id` | Get complaint details |
| POST | `/tenant/complaints` | Create new complaint |
| POST | `/tenant/complaints/:id/comments` | Add comment |
| POST | `/tenant/complaints/:id/rate` | Rate resolution |
| PATCH | `/tenant/me` | Update profile |
| GET | `/tenant/notifications` | List notifications |
| POST | `/payments-proof/proofs` | Upload payment proof |
| GET | `/payments-proof/proofs/my` | List my proofs |
| GET | `/payments-proof/receipts/my` | List my receipts |
| POST | `/food/polls/:id/vote` | Vote on poll |
| GET | `/food/attendance/my` | Get my attendance |

---

# Appendix B: Tenant Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/tenant` | `TenantDashboard` | Dashboard overview |
| `/tenant/payments` | `TenantPaymentsPage` | Payment history |
| `/tenant/complaints` | `TenantComplaintsPage` | Complaint management |
| `/tenant/food` | `TenantFoodPage` | Food menu & polls |
| `/tenant/profile` | `TenantProfilePage` | Profile view |

---

# Appendix C: Tenant Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TENANT PORTAL DATA FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │  Login   │────▶│ Dashboard│────▶│ Payments │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│       │                │                │                       │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ Profile  │     │Complaints│     │   Food   │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│       │                │                │                       │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │Notifications│   │  Upload  │     │   Vote   │                │
│  └──────────┘     │  Proof   │     └──────────┘                │
│                   └──────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
**Author:** Opsora Development Team
