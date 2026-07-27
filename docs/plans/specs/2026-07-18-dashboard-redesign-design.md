# Dashboard Redesign + Payment Flow + Checkout Flow

**Date:** 2026-07-18
**Status:** Approved
**Scope:** Mobile app dashboard, payment flow, checkout flow, seed data

---

## Problem Statement

1. **Number inconsistency:** Dashboard shows "33 active tenants" in hero stat but "77% occupancy" in pie chart — different metrics displayed together without context
2. **Navigation confusion:** Clicking "Paid" or "Not Paid" navigates to payments page showing all 168 historical records instead of current-month tenants
3. **Hardcoded dummy data:** `pendingResidents` in dashboard (lines 115-120) is hardcoded, not from API
4. **Static feel:** Dashboard cards have no entrance animations, feels "dead"
5. **Missing checkout flow:** No deposit refund handling when tenant moves out

---

## Design Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Occupancy display | Both metrics: "33 tenants in 43 beds (77%)" | User wants clarity on both tenant count and bed occupancy |
| Not Paid navigation | Dedicated `PendingTenants` screen | Tenant-centric with WhatsApp action, not payment-record-centric |
| Paid navigation | Dedicated `PaidTenants` screen | Clean list of paid tenants, separate from payment history |
| Dashboard layout | Full redesign with animations | User wants staggered entrance, neumorphic tabs, particle effects |
| Checkout flow | `CheckoutScreen` with deposit refund + deductions | User wants ₹5,000 deposit, ₹3,000 refund, deduction tracking |
| Seed data | ₹10,500 rent, ₹5,000 deposit, ₹3,000 refund, 12 months | Consistent data for demo |

---

## Architecture

### New Screens

```
apps/mobile/app/(owner)/
├── dashboard.tsx           # Redesigned with animations
├── pending-tenants.tsx     # NEW: Unpaid tenants for current month
├── paid-tenants.tsx        # NEW: Paid tenants for current month
├── checkout.tsx            # NEW: Checkout with deposit refund
└── _layout.tsx             # Updated tab config
```

### New API Endpoints

```
apps/api/src/routes/
├── dashboard.ts            # Add: GET /dashboard/pending-tenants, GET /dashboard/paid-tenants
├── residents.ts            # Update: POST /residents/:id/checkout (accept refundAmount + deductions)
└── invoices.ts             # Existing move-out endpoint (keep as-is)
```

### New Components

```
apps/mobile/src/components/
├── NeumorphicTab.tsx       # NEW: Animated pill tab with particle effects
├── AnimatedCard.tsx        # NEW: Card with staggered entrance animation
├── PendingTenantsList.tsx  # NEW: Tenant list with WhatsApp action
└── CheckoutSummary.tsx     # NEW: Deposit refund calculation display
```

---

## Detailed Spec

### 1. Occupancy Consistency

**API Response (existing):**
```json
{
  "properties": {
    "totalBeds": 43,
    "occupiedBeds": 33,
    "vacantBeds": 10,
    "occupancyRate": "76.7"
  },
  "tenants": {
    "active": 33
  }
}
```

**Display:**
```
┌─────────────────────────────────┐
│  [ProgressRing 76.7%]          │
│  33 tenants in 43 beds         │
│  10 beds vacant                 │
└─────────────────────────────────┘
```

### 2. Payment Flow

**New API: `GET /dashboard/pending-tenants`**
```json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Vikram Singh",
      "phone": "+919800000003",
      "roomNumber": "101",
      "bedNumber": "B1",
      "rentAmount": 10500,
      "paidAmount": 0,
      "balanceAmount": 10500,
      "status": "overdue",
      "dueDate": "2026-07-05"
    }
  ],
  "summary": {
    "total": 5,
    "overdue": 2,
    "pending": 2,
    "partial": 1
  }
}
```

**New API: `GET /dashboard/paid-tenants`**
```json
{
  "tenants": [
    {
      "id": "uuid",
      "name": "Amit Patel",
      "phone": "+919800000001",
      "roomNumber": "101",
      "bedNumber": "B1",
      "rentAmount": 10500,
      "paidAmount": 10500,
      "paidDate": "2026-07-03",
      "paymentMethod": "upi_direct"
    }
  ],
  "summary": {
    "total": 28,
    "totalCollected": 294000
  }
}
```

**PendingTenants Screen:**
```
┌─────────────────────────────────────┐
│ ← Pending Tenants (5)              │
├─────────────────────────────────────┤
│ [Remind All via WhatsApp]          │
├─────────────────────────────────────┤
│ Vikram Singh       Room 101        │
│ ₹10,500 due · Overdue             │
│                    [📱 Remind]      │
├─────────────────────────────────────┤
│ Neha Joshi         Room 205        │
│ ₹5,250 due · Partial (50%)        │
│                    [📱 Remind]      │
├─────────────────────────────────────┤
│ ...                                 │
└─────────────────────────────────────┘
```

**PaidTenants Screen:**
```
┌─────────────────────────────────────┐
│ ← Paid Tenants (28)                │
├─────────────────────────────────────┤
│ Total Collected: ₹2,94,000         │
├─────────────────────────────────────┤
│ Amit Patel         Room 101        │
│ ₹10,500 paid · Jul 3 · UPI        │
├─────────────────────────────────────┤
│ Priyanka Nair      Room 302        │
│ ₹10,500 paid · Jul 2 · NEFT       │
├─────────────────────────────────────┤
│ ...                                 │
└─────────────────────────────────────┘
```

### 3. Dashboard Layout Redesign

**New order:**
1. GradientHeader (greeting + bell)
2. Occupancy Card (ProgressRing + "33 tenants in 43 beds")
3. Payment Status Card (neumorphic tabs: Total/Paid/Not Paid + collection rate + pending list)
4. Revenue Chart (collapsible, range selector)
5. Recent Activity (last 3)

**Neumorphic Tab Design (from Uiverse.io inspiration):**
- Background: `linear-gradient(145deg, #e6e6e6, #ffffff)` → React Native: dual shadow
- Selected state: Primary color bg + white text + inset shadow
- Particle effect: Small dots burst outward on selection (Animated API)
- Glow effect: Animated border opacity on selected tab

**Animation Sequence (staggered entrance):**
```
t=0ms    → Occupancy card slides up + fades in
t=100ms  → Payment card slides up + fades in
t=200ms  → Revenue chart slides up + fades in
t=300ms  → Activity card slides up + fades in
```

### 4. Checkout Flow

**Updated API: `POST /residents/:id/checkout`**
```typescript
{
  tenantProfileId: string;
  moveOutDate: string;
  refundAmount: number;
  deductions: Array<{
    reason: string;
    amount: number;
  }>;
  notes?: string;
}
```

**Response:**
```json
{
  "message": "Resident checked out successfully",
  "resident": "Amit Patel",
  "depositPaid": 5000,
  "totalDeductions": 2000,
  "deductions": [
    { "reason": "Damage to bed", "amount": 1500 },
    { "reason": "Cleaning fee", "amount": 500 }
  ],
  "refundAmount": 3000,
  "refundStatus": "pending",
  "moveOutDate": "2026-07-18"
}
```

**CheckoutScreen UI:**
```
┌─────────────────────────────────────┐
│ ← Checkout Resident                │
├─────────────────────────────────────┤
│ [Avatar]                           │
│ Amit Patel                         │
│ Room 101 · Bed B1                  │
│ Stayed: Jan 15 - Jul 18, 2026     │
├─────────────────────────────────────┤
│ Deposit Summary                    │
│ ┌─────────────────────────────┐    │
│ │ Deposit Paid       ₹5,000  │    │
│ │ Pending Rent       ₹0      │    │
│ │ ─────────────────────────  │    │
│ │ Total Deductions   ₹2,000  │    │
│ │ ═════════════════════════  │    │
│ │ Refund Amount      ₹3,000  │    │
│ └─────────────────────────────┘    │
├─────────────────────────────────────┤
│ Deductions                         │
│ • Damage to bed          ₹1,500   │
│ • Cleaning fee           ₹500     │
│ [+ Add Deduction]                  │
├─────────────────────────────────────┤
│ [Cancel]           [Confirm ₹3,000]│
└─────────────────────────────────────┘
```

### 5. Seed Data Changes

| Field | Current | New |
|-------|---------|-----|
| Rent | `7000 + floor * 1000` | ₹10,500 fixed |
| Deposit | ₹15,000 | ₹5,000 |
| Refund | N/A | ₹3,000 (₹2,000 deduction) |
| Months | 7 (Jan-Jul 2026) | 12 (Aug 2025 - Jul 2026) |
| Residents | 28 | 28 (keep same) |

**Deduction breakdown for seed:**
- Damage to bed: ₹1,200
- Cleaning fee: ₹500
- Painting charge: ₹300
- Total: ₹2,000 → Refund: ₹3,000

---

## Files to Modify

### API
1. `apps/api/src/routes/dashboard.ts` — Add pending-tenants and paid-tenants endpoints
2. `apps/api/src/routes/residents.ts` — Update checkout endpoint for refund/deductions
3. `apps/api/src/lib/seed.ts` — Update rent/deposit/refund values, 12 months data

### Mobile
4. `apps/mobile/app/(owner)/dashboard.tsx` — Redesign layout, add animations, remove dummy data
5. `apps/mobile/app/(owner)/pending-tenants.tsx` — NEW screen
6. `apps/mobile/app/(owner)/paid-tenants.tsx` — NEW screen
7. `apps/mobile/app/(owner)/checkout.tsx` — NEW screen
8. `apps/mobile/app/(owner)/_layout.tsx` — Update tab config
9. `apps/mobile/src/components/NeumorphicTab.tsx` — NEW component
10. `apps/mobile/src/components/AnimatedCard.tsx` — NEW component
11. `apps/mobile/src/components/PaymentReminder.tsx` — Update to use real API data
12. `apps/mobile/src/components/index.ts` — Export new components

---

## Acceptance Criteria

1. Dashboard shows "X tenants in Y beds (Z%)" — no conflicting numbers
2. Tapping "Not Paid" navigates to PendingTenants screen with WhatsApp buttons
3. Tapping "Paid" navigates to PaidTenants screen with clean list
4. All payment data comes from API, zero hardcoded dummy data
5. Dashboard cards animate on entrance (staggered slide-up + fade)
6. Neumorphic tabs have particle/glow effects on selection
7. Checkout screen shows deposit breakdown with deduction entry
8. Seed generates 12 months of data with ₹10,500 rent, ₹5,000 deposit
9. After checkout, bed status updates to vacant, resident archived with refund info
