# Opsora — Integration Analysis & Journey Tracking Design

## Document Purpose

This document provides a **comprehensive MBA-level functional review** of all four specification documents, identifies integration gaps across Owner/Tenant/Staff views, and designs the **Journey Tracking** system where all three profiles can see their complete journey with historical data.

**Author:** Strategic Analysis Team  
**Date:** July 2026  
**Review Type:** Harvard Business School Functional Audit

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature Integration Matrix](#2-feature-integration-matrix)
3. [Cross-View Data Flow Analysis](#3-cross-view-data-flow-analysis)
4. [Gap Analysis & Recommendations](#4-gap-analysis--recommendations)
5. [Revenue Intelligence Dashboard (Owner Journey)](#5-revenue-intelligence-dashboard-owner-journey)
6. [Tenant Stay Journey](#6-tenant-stay-journey)
7. [Staff Performance Journey](#7-staff-performance-journey)
8. [Implementation Roadmap](#8-implementation-roadmap)

---

# 1. Executive Summary

## Current State Assessment

Opsora has built a solid foundation for PG/hostel management across three user roles. However, the current implementation lacks **historical journey tracking** — the ability for any user to see their complete trajectory over time.

### Key Findings

| Dimension | Owner | Tenant | Staff |
|-----------|-------|--------|-------|
| **Data Richness** | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ |
| **Historical Views** | ★★☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ |
| **Cross-Module Integration** | ★★★☆☆ | ★★☆☆☆ | ★★☆☆☆ |
| **Actionable Insights** | ★★☆☆☆ | ★☆☆☆☆ | ★☆☆☆☆ |
| **Mobile Experience** | ★★★☆☆ | ★★★☆☆ | ★★☆☆☆ |

### The Missing Piece: Journey Tracking

Every stakeholder needs to answer: **"How am I doing over time?"**

- **Owner:** "How much did I earn last month? Last quarter? Last year? What's my growth trajectory?"
- **Tenant:** "How long have I stayed? What's my total payment history? How many complaints did I raise and resolve?"
- **Staff:** "How many tickets did I resolve this month? What's my attendance record? How am I performing?"

---

# 2. Feature Integration Matrix

## 2.1 Owner ↔ Tenant Integration Points

| Feature | Owner View | Tenant View | Integration Status |
|---------|-----------|-------------|-------------------|
| **Payments** | Full CRUD, bulk operations, verification queue | View history, upload proof | ✅ Partially Integrated |
| **Complaints** | Service desk, assignment, SLA tracking | Create, track, rate | ✅ Well Integrated |
| **Rooms** | Full management, grid view | View assigned room | ⚠️ One-way only |
| **Food** | Menu management, polls, attendance | View menu, vote | ✅ Integrated |
| **IoT** | Dashboard, device management | View consumption (future) | ❌ Not Integrated |
| **Notifications** | System-wide management | Receive notifications | ✅ Integrated |

### Integration Gap #1: Bidirectional Communication
**Current:** Owner → Tenant communication is one-way (notifications only).
**Recommendation:** Implement in-app messaging with read receipts and response tracking.

### Integration Gap #2: Real-Time Payment Status
**Current:** Tenant uploads proof → Owner verifies → Status updates.
**Missing:** Real-time status updates to tenant during verification process.

## 2.2 Owner ↔ Staff Integration Points

| Feature | Owner View | Staff View | Integration Status |
|---------|-----------|------------|-------------------|
| **Complaints** | Full oversight, assignment | Handle assigned tickets | ✅ Well Integrated |
| **Tasks** | Create, assign | View, complete | ⚠️ Basic Integration |
| **Attendance** | View all staff | Self check-in/out | ✅ Integrated |
| **Performance** | View metrics (limited) | Self-view only | ❌ Not Integrated |
| **Residents** | Full management | View only | ✅ Appropriate |

### Integration Gap #3: Task Management
**Current:** Tasks use hardcoded data in frontend, not fetched from API.
**Recommendation:** Implement full task CRUD with API integration.

### Integration Gap #4: Performance Metrics
**Current:** Staff has basic stats, owner has limited visibility.
**Recommendation:** Build comprehensive performance dashboard for both views.

## 2.3 Tenant ↔ Staff Integration Points

| Feature | Tenant View | Staff View | Integration Status |
|---------|------------|------------|-------------------|
| **Complaints** | Create, track, rate | Handle, resolve | ✅ Well Integrated |
| **Communication** | Public comments | Public + internal notes | ✅ Integrated |
| **Food** | View menu, vote | View attendance | ⚠️ Limited |
| **Residents** | View own profile | View all residents | ⚠️ One-way |

### Integration Gap #5: Direct Communication
**Current:** All communication goes through complaint comments.
**Recommendation:** Add direct messaging for non-complaint inquiries.

---

# 3. Cross-View Data Flow Analysis

## 3.1 Payment Journey (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PAYMENT JOURNEY FLOW                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OWNER                          SYSTEM                    TENANT        │
│  ─────                          ──────                    ──────        │
│                                                                         │
│  1. Generate Invoice ──────────▶ Auto-calculate charges                 │
│                                 Store in rent_payments                 │
│                                        │                               │
│                                        ▼                               │
│                                 Send notification ◀── "Payment Due"    │
│                                        │                               │
│                                        ▼                               │
│  4. Verify Proof ◀──────────── Receipt generated  ◀── Upload Proof    │
│     │                           Status updated                         │
│     ├─ Confirm ────────────────▶ Mark as paid                          │
│     │                           Send confirmation ◀── Notification     │
│     │                                                                   │
│     └─ Reject ────────────────▶ Status stays pending                   │
│                                 Send rejection reason ◀── Notification  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Points Available for Journey Tracking:
- Monthly revenue trends (Owner)
- Individual payment history (Tenant)
- Collection rates over time (Owner)
- Late payment patterns (Owner)
- Payment method preferences (Owner/Tenant)

## 3.2 Complaint Journey (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMPLAINT JOURNEY FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TENANT          OWNER              STAFF              SYSTEM           │
│  ──────          ─────              ─────              ──────           │
│                                                                         │
│  1. Create ─────▶ Notification ──── Notification                         │
│     Ticket        received          received                            │
│                                                                         │
│                   2. Assign ───────▶ Ticket appears                     │
│                      Staff           in queue                           │
│                                                                         │
│                                      3. Accept ────▶ Status: in_progress│
│                                                                         │
│                                      4. Work ──────▶ Comments added     │
│                                         │              Internal notes   │
│                                         │              SLA tracking     │
│                                                                         │
│  5. Track ◀───── Status updates ◀── Status changes                      │
│     Progress                                                          │
│                                                                         │
│                                      6. Resolve ───▶ Status: resolved   │
│                                         │              Resolution notes  │
│                                                                         │
│  7. Rate ◀────── Rating stored ◀──── Rating submitted                   │
│     Resolution                                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Points Available for Journey Tracking:
- Complaint frequency by category (Owner)
- Resolution time trends (Owner/Staff)
- Staff performance metrics (Owner)
- Tenant satisfaction ratings (Owner/Tenant)
- SLA compliance rates (Owner/Staff)

## 3.3 Resident Journey (End-to-End)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        RESIDENT JOURNEY FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  OWNER                SYSTEM                 TENANT                     │
│  ─────                ──────                 ──────                     │
│                                                                         │
│  1. Check-in ────────▶ Profile created                                │
│     Allocate bed       Room occupied                                   │
│     Set deposit        Payments generated                              │
│                        Welcome notification                             │
│                                        │                               │
│                                        ▼                               │
│  2. Manage ◀─────────────────────────── Daily life                      │
│     Payments           Payments tracked                                 │
│     Complaints         Complaints raised                                │
│     Food               Meals tracked                                    │
│                                                                         │
│  3. Checkout ─────────▶ Profile archived                               │
│     Free bed           Room freed                                      │
│     Refund deposit     Final settlement                                │
│                        Activity logged                                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Points Available for Journey Tracking:
- Total tenure duration (Owner/Tenant)
- Total payments made (Owner/Tenant)
- Complaint history and resolution (Owner/Tenant)
- Room/bed history (Owner)
- Deposit refund calculation (Owner/Tenant)

---

# 4. Gap Analysis & Recommendations

## 4.1 Critical Gaps (Must Fix)

### Gap #1: No Historical Revenue Tracking
**Impact:** Owner cannot see revenue trends over months/years
**Current:** Dashboard shows only current month metrics
**Recommendation:** Build Revenue Intelligence Dashboard with:
- Monthly revenue trends (12 months)
- Year-over-year comparison
- Revenue by property breakdown
- Collection rate trends
- Outstanding amount trends

### Gap #2: No Tenant Stay Summary
**Impact:** Tenant cannot see their complete journey
**Current:** Dashboard shows only current status
**Recommendation:** Build Tenant Stay Journey with:
- Total tenure duration
- Payment history timeline
- Complaint history with resolution times
- Food attendance patterns
- Stay milestones (1 month, 6 months, 1 year)

### Gap #3: No Staff Performance Dashboard
**Impact:** Staff cannot see their performance trajectory
**Current:** Basic stats only
**Recommendation:** Build Staff Performance Journey with:
- Ticket resolution trends
- Attendance patterns
- Task completion rates
- Average resolution time
- Performance scores over time

## 4.2 Important Gaps (Should Fix)

### Gap #4: Incomplete Task Management
**Impact:** Tasks are hardcoded, not from API
**Recommendation:** Implement full task CRUD with database storage

### Gap #5: Limited IoT Integration for Tenants
**Impact:** Tenants cannot see their utility consumption
**Recommendation:** Add tenant-specific consumption view

### Gap #6: No Export/Download Functionality
**Impact:** Users cannot export their data
**Recommendation:** Add PDF/CSV export for all journey data

## 4.3 Nice-to-Have Gaps

### Gap #7: No Predictive Analytics
**Impact:** No forecasting for revenue, occupancy, or maintenance
**Recommendation:** Implement ML-based predictions (future phase)

### Gap #8: No Comparison Views
**Impact:** Cannot compare performance across periods
**Recommendation:** Add period-over-period comparison tools

---

# 5. Revenue Intelligence Dashboard (Owner Journey)

## 5.1 Overview

The Revenue Intelligence Dashboard provides owners with comprehensive financial insights across multiple time horizons.

### Page Route
```
GET /dashboard/journey
Component: apps/web/src/app/(dashboard)/journey/page.tsx
```

### API Endpoint
```
GET /dashboard/revenue-journey
Headers: Authorization: Bearer <token>
Role: owner | admin

Query Parameters:
  period: "monthly" | "quarterly" | "yearly"
  startDate?: string (YYYY-MM-DD)
  endDate?: string (YYYY-MM-DD)
  propertyId?: string

Response: {
  summary: {
    totalRevenue: number,
    totalCollected: number,
    totalPending: number,
    collectionRate: string,
    averageMonthlyRevenue: number,
    revenueGrowth: string,        // % change vs previous period
    occupancyRate: string,
    averageRentPerBed: number
  },
  monthlyTrend: [{
    month: string,               // "2026-01", "2026-02", etc.
    expected: number,
    collected: number,
    pending: number,
    collectionRate: string,
    tenantCount: number,
    occupancyRate: string
  }],
  yearlyComparison: {
    currentYear: number,
    previousYear: number,
    growth: string
  },
  propertyBreakdown: [{
    propertyId: string,
    propertyName: string,
    revenue: number,
    collected: number,
    occupancyRate: string
  }],
  paymentMethodBreakdown: [{
    method: string,
    count: number,
    totalAmount: number
  }],
  topPerformers: [{
    tenantProfileId: string,
    tenantName: string,
    roomNumber: string,
    totalPaid: number,
    onTimeRate: string
  }],
  alerts: [{
    type: "high_pending" | "low_occupancy" | "overdue_payments",
    message: string,
    count: number,
    severity: "info" | "warning" | "critical"
  }]
}
```

## 5.2 UI Components

### Journey Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ Revenue Intelligence Journey                            │
│ Track your financial performance over time              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Monthly] [Quarterly] [Yearly]    Property: [All ▼]    │
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────┐ │
│ │ 💰          │ │ 📈          │ │ 📊          │ │ 🏠 │ │
│ │ ₹12.5L      │ │ +12.3%      │ │ 85%         │ │ 3  │ │
│ │ Total Rev   │ │ Growth      │ │ Collection  │ │Prop│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────┘ │
│                                                         │
│ Revenue Trend (12 Months)                               │
│ ┌─────────────────────────────────────────────────────┐│
│ │  [AreaChart: Month vs Revenue]                       ││
│ │  Green area with gradient fill                       ││
│ │  Tooltip showing exact amounts                       ││
│ │  Comparison line for previous year                   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Collection Rate Trend                                   │
│ ┌─────────────────────────────────────────────────────┐│
│ │  [LineChart: Month vs Collection %]                  ││
│ │  Target line at 95%                                  ││
│ │  Color-coded: Green (>90%), Amber (80-90%), Red (<80%)│
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Property Performance                                    │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Sunshine PG    ████████████████  ₹8.5L  85%  35 tenants││
│ │ Green Valley   ██████████        ₹4.0L  78%  18 tenants││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Year-over-Year Comparison                               │
│ ┌─────────────────────────────────────────────────────┐│
│ │  2025: ₹10.2L  │  2026: ₹12.5L  │  Growth: +22.5%  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Alerts & Insights                                      │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⚠️ 8 payments overdue (₹48,000 pending)             ││
│ │ 📉 Green Valley occupancy dropped to 78%            ││
│ │ ✅ Sunshine PG collection rate at 95%               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Metrics Cards

**Card 1: Total Revenue**
- Icon: IndianRupee (green)
- Value: Formatted currency (₹12.5L)
- Subtitle: "Total revenue in selected period"
- Trend indicator: ↑ 12.3% vs previous period

**Card 2: Collection Rate**
- Icon: TrendingUp (accent)
- Value: Percentage (85%)
- Subtitle: "Of expected revenue collected"
- Color coding: Green (>90%), Amber (80-90%), Red (<80%)

**Card 3: Occupancy Rate**
- Icon: BedDouble (blue)
- Value: Percentage (78.5%)
- Subtitle: "Average occupancy in period"
- Trend indicator

**Card 4: Revenue Growth**
- Icon: ArrowUpRight (green) or ArrowDownRight (red)
- Value: Percentage (+12.3%)
- Subtitle: "vs previous period"

### Charts

**Revenue Trend Chart (AreaChart)**
- X-axis: Month (Jan, Feb, Mar, etc.)
- Y-axis: Revenue in ₹ (formatted as ₹X.XL for lakhs)
- Green gradient fill
- Previous year comparison line (dashed)
- Interactive tooltips

**Collection Rate Chart (LineChart)**
- X-axis: Month
- Y-axis: Collection percentage (0-100%)
- Target line at 95% (dashed)
- Color-coded dots based on performance

**Property Breakdown (Horizontal BarChart)**
- Each property as a bar
- Revenue on X-axis
- Occupancy rate as secondary metric
- Click to drill down

## 5.3 Data Visualization

### Revenue Waterfall
Shows how revenue flows through the system:
```
Expected Revenue (₹12.5L)
  - Pending Payments (₹1.8L)
  - Late Fees Applied (₹0.2L)
  - Discounts Given (₹0.1L)
  ═══════════════════════════
  = Net Collected (₹10.8L)
```

### Monthly Comparison Table
| Month | Expected | Collected | Pending | Rate | Trend |
|-------|----------|-----------|---------|------|-------|
| Jul 2026 | ₹1.05L | ₹0.89L | ₹0.16L | 84.8% | ↓ |
| Jun 2026 | ₹1.02L | ₹0.97L | ₹0.05L | 95.1% | ↑ |
| May 2026 | ₹0.98L | ₹0.92L | ₹0.06L | 93.9% | → |

---

# 6. Tenant Stay Journey

## 6.1 Overview

The Tenant Stay Journey provides residents with a comprehensive view of their entire stay history.

### Page Route
```
GET /tenant/journey
Component: apps/web/src/app/tenant/journey/page.tsx
```

### API Endpoint
```
GET /tenant/journey
Headers: Authorization: Bearer <token>
Role: resident

Response: {
  staySummary: {
    totalDays: number,
    totalMonths: number,
    propertyName: string,
    roomNumber: string,
    bedNumber: string,
    moveInDate: string,
    currentRent: number,
    totalPaid: number,
    totalBalance: number,
    depositPaid: number,
    depositRefundEstimate: number
  },
  paymentJourney: {
    totalPayments: number,
    paidCount: number,
    pendingCount: number,
    partialCount: number,
    totalAmountPaid: number,
    averagePaymentTime: string,    // "3.2 days before due"
    onTimeRate: string,            // "92%"
    monthlyHistory: [{
      month: string,
      rentAmount: number,
      totalAmount: number,
      paidAmount: number,
      balanceAmount: number,
      paymentStatus: string,
      paidDate?: string,
      daysEarly?: number          // Negative if late
    }]
  },
  complaintJourney: {
    totalComplaints: number,
    resolvedCount: number,
    openCount: number,
    averageResolutionTime: string, // "2.3 days"
    satisfactionRating: string,    // "4.2/5"
    recentComplaints: [{
      ticketNumber: string,
      title: string,
      category: string,
      priority: string,
      status: string,
      createdAt: string,
      resolvedAt?: string,
      rating?: number
    }]
  },
  milestones: [{
    type: string,                  // "1_month", "6_months", "1_year"
    title: string,
    date: string,
    achieved: boolean,
    icon: string
  }],
  timeline: [{
    date: string,
    type: string,                  // "check_in", "payment", "complaint", "resolution"
    title: string,
    description: string,
    icon: string,
    color: string
  }]
}
```

## 6.2 UI Components

### Journey Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ My Stay Journey                                         │
│ Your complete stay history at Sunshine PG               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────┐                                                 │
│  │ AP │ Amit Patel                                      │
│  └────┘ Room 101 · Bed B1                               │
│  📅 Since January 15, 2026 (6 months)                   │
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 💰           │ │ 🎫           │ │ ⭐           │     │
│ │ ₹48,000      │ │ 3            │ │ 4.2/5        │     │
│ │ Total Paid   │ │ Complaints   │ │ Satisfaction │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│ Stay Milestones                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ 1 Month    ✅ 3 Months    ✅ 6 Months    🎯 1 Year ││
│ │ Jan 15       Apr 15         Jul 13         (172 days) ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Payment History                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │  [AreaChart: Month vs Paid/Total]                    ││
│ │  Green: Paid amount                                  ││
│ │  Gray: Total due                                     ││
│ │  Dots showing payment dates                          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Monthly Breakdown                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Jul 2026  │ ₹8,000  │ ₹8,000  │ ₹0      │ ✅ Paid ││
│ │ Jun 2026  │ ₹8,000  │ ₹8,000  │ ₹0      │ ✅ Paid ││
│ │ May 2026  │ ₹8,000  │ ₹8,000  │ ₹0      │ ✅ Paid ││
│ │ Apr 2026  │ ₹8,000  │ ₹6,000  │ ₹2,000  │ ⚠️ Part ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ My Complaints                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ TKT-001  AC not working    [resolved] ⭐⭐⭐⭐⭐      ││
│ │ TKT-003  WiFi slow         [open]                   ││
│ │ TKT-005  Water leak        [resolved] ⭐⭐⭐⭐        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Timeline                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🟢 Jul 13  Payment received for July 2026          ││
│ │ 🟢 Jul 10  Complaint TKT-003 created                ││
│ │ 🟢 Jul 08  Payment received for June 2026           ││
│ │ 🟢 Jun 15  Complaint TKT-001 resolved               ││
│ │ 🟢 Jun 01  Payment received for May 2026            ││
│ │ ...                                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Milestone System

**Milestone Types:**
| Milestone | Days | Icon | Reward |
|-----------|------|------|--------|
| Welcome | 0 | 🎉 | Welcome message |
| 1 Month | 30 | 🌟 | Stay summary |
| 3 Months | 90 | 🏆 | Loyalty badge |
| 6 Months | 180 | 🎖️ | Extended stay benefits |
| 1 Year | 365 | 🏠 | Resident of the year |
| 2 Years | 730 | 💎 | VIP resident |

### Payment Timeline

**Visual Timeline:**
```
Jan 2026  ────●──── Apr 2026  ────●──── Jul 2026
   │              │              │
   ▼              ▼              ▼
 Check-in      3 Months       6 Months
 ₹8,000        ₹24,000        ₹48,000
 Paid          Total Paid     Total Paid
```

### Complaint Resolution Pattern

**Visual:**
```
Complaints Over Time:
Jan: 0  Feb: 1  Mar: 0  Apr: 1  May: 0  Jun: 1  Jul: 0

Resolution Time Trend:
Avg: 2.3 days
Best: 1 day (TKT-005)
Worst: 4 days (TKT-001)
```

---

# 7. Staff Performance Journey

## 7.1 Overview

The Staff Performance Journey provides staff members with comprehensive performance metrics and growth tracking.

### Page Route
```
GET /staff-portal/journey
Component: apps/web/src/app/staff-portal/journey/page.tsx
```

### API Endpoint
```
GET /staff/journey
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: {
  performanceSummary: {
    totalAssigned: number,
    resolved: number,
    open: number,
    resolutionRate: string,        // "85%"
    averageResolutionTime: string, // "4.2 hours"
    slaComplianceRate: string,     // "92%"
    satisfactionRating: string,    // "4.5/5"
    currentStreak: number,         // Days without SLA breach
    bestStreak: number
  },
  monthlyTrend: [{
    month: string,
    assigned: number,
    resolved: number,
    avgResolutionHours: number,
    slaBreaches: number,
    rating: number
  }],
  attendanceJourney: {
    totalDays: number,
    presentDays: number,
    absentDays: number,
    attendanceRate: string,        // "95%"
    averageCheckIn: string,        // "9:15 AM"
    averageCheckOut: string,       // "5:45 PM"
    averageWorkHours: string,      // "8.5 hours"
    monthlyAttendance: [{
      month: string,
      present: number,
      absent: number,
      late: number,
      averageHours: number
    }]
  },
  taskJourney: {
    totalTasks: number,
    completed: number,
    pending: number,
    completionRate: string,        // "88%"
    averageCompletionTime: string, // "2.1 hours"
    taskTypes: [{
      type: string,
      count: number,
      completed: number
    }]
  },
  categoryExpertise: [{
    category: string,
    totalHandled: number,
    resolved: number,
    avgResolutionHours: number,
    rating: number
  }],
  timeline: [{
    date: string,
    type: string,                  // "ticket_resolved", "task_completed", "attendance"
    title: string,
    description: string,
    icon: string,
    color: string
  }]
}
```

## 7.2 UI Components

### Journey Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ My Performance Journey                                  │
│ Track your growth and achievements                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────┐                                                 │
│  │ RK │ Rajesh Kumar                                    │
│  └────┘ Maintenance Staff · Sunshine PG                 │
│  📅 Since January 10, 2026 (6 months)                   │
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 📊           │ │ ⏱️           │ │ ⭐           │     │
│ │ 85%          │ │ 4.2 hrs      │ │ 4.5/5        │     │
│ │ Resolution   │ │ Avg Time     │ │ Rating       │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│ Performance Trend                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │  [LineChart: Month vs Resolution Rate]               ││
│ │  Target line at 90%                                  ││
│ │  Color-coded performance zones                       ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Attendance Overview                                     │
│ ┌─────────────────────────────────────────────────────┐│
│ │  Attendance: 95% (114/120 days)                     ││
│ │  ████████████████████░░░░░ 95%                       ││
│ │                                                     ││
│ │  Avg Check-in: 9:15 AM                              ││
│ │  Avg Check-out: 5:45 PM                             ││
│ │  Avg Work Hours: 8.5 hours                          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Monthly Performance                                     │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Jul 2026  │ 12 │ 10 │ 3.5h │ 0 │ ⭐ 4.6           ││
│ │ Jun 2026  │ 15 │ 14 │ 4.0h │ 1 │ ⭐ 4.4           ││
│ │ May 2026  │ 10 │ 9  │ 4.2h │ 0 │ ⭐ 4.5           ││
│ │ Apr 2026  │ 18 │ 16 │ 4.5h │ 2 │ ⭐ 4.2           ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Category Expertise                                      │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🔧 Plumbing     │ 15 handled │ 93% resolved │ 4.7  ││
│ │ ⚡ Electrical   │ 12 handled │ 83% resolved │ 4.3  ││
│ │ 🧹 Cleaning     │ 8 handled  │ 100% resolved│ 4.8  ││
│ │ 🛠️ Maintenance  │ 20 handled │ 80% resolved │ 4.2  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Achievements                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🏆 Quick Responder    Resolved 5 tickets in 1 day  ││
│ │ ⭐ Perfect Month      100% resolution in March      ││
│ │ 🎯 SLA Champion       30 days without SLA breach    ││
│ │ 🌟 Customer Favorite  5-star rating from 3 tenants  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Timeline                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🟢 Jul 13  Resolved TKT-001 (AC repair)            ││
│ │ 🟢 Jul 12  Completed task: Floor inspection         ││
│ │ 🟢 Jul 11  Resolved TKT-003 (WiFi issue)           ││
│ │ 🟢 Jul 10  Checked in at 9:00 AM                    ││
│ │ ...                                                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Achievement System

**Achievement Types:**
| Achievement | Criteria | Icon | Points |
|-------------|----------|------|--------|
| Quick Responder | 5 tickets in 1 day | 🏆 | 100 |
| Perfect Month | 100% resolution rate | ⭐ | 200 |
| SLA Champion | 30 days no breach | 🎯 | 150 |
| Customer Favorite | 5-star rating × 3 | 🌟 | 175 |
| Early Bird | Check-in before 9 AM × 10 | 🌅 | 50 |
| Night Owl | Check-out after 6 PM × 10 | 🌙 | 50 |
| All-Rounder | Handle all categories | 🎯 | 200 |
| Speed Demon | Avg resolution < 2 hours | ⚡ | 150 |

### Performance Zones

| Zone | Resolution Rate | Color | Badge |
|------|-----------------|-------|-------|
| Excellent | > 90% | Green | 🏆 |
| Good | 80-90% | Blue | ⭐ |
| Average | 70-80% | Amber | 📊 |
| Needs Improvement | < 70% | Red | ⚠️ |

---

# 8. Implementation Roadmap

## Phase 1: API Endpoints (Week 1)

### 1.1 Owner Revenue Journey Endpoint
```typescript
// apps/api/src/routes/dashboard.ts
app.get('/dashboard/revenue-journey', { preHandler: [authenticate] }, async (request, reply) => {
  // Implementation
});
```

### 1.2 Tenant Stay Journey Endpoint
```typescript
// apps/api/src/routes/tenant.ts
app.get('/tenant/journey', { preHandler: [authenticate] }, async (request, reply) => {
  // Implementation
});
```

### 1.3 Staff Performance Journey Endpoint
```typescript
// apps/api/src/routes/staff-portal.ts
app.get('/staff/journey', { preHandler: [authenticate] }, async (request, reply) => {
  // Implementation
});
```

## Phase 2: Frontend Pages (Week 2)

### 2.1 Owner Journey Page
- Create `/dashboard/journey/page.tsx`
- Implement Revenue Intelligence Dashboard
- Add interactive charts and filters

### 2.2 Tenant Journey Page
- Create `/tenant/journey/page.tsx`
- Implement Stay Journey view
- Add milestone tracking

### 2.3 Staff Journey Page
- Create `/staff-portal/journey/page.tsx`
- Implement Performance Journey view
- Add achievement system

## Phase 3: Integration (Week 3)

### 3.1 Navigation Updates
- Add "Journey" link to all three navigation menus
- Update sidebar layouts

### 3.2 Data Visualization
- Implement all charts using Recharts
- Add responsive layouts
- Add loading and error states

## Phase 4: Polish (Week 4)

### 4.1 Animations
- Add smooth transitions
- Implement chart animations
- Add micro-interactions

### 4.2 Export Features
- PDF export for journey reports
- CSV export for data analysis
- Print-friendly layouts

---

# Appendix A: API Route Summary for Journey Tracking

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/dashboard/revenue-journey` | owner, admin | Owner revenue analytics |
| GET | `/tenant/journey` | resident | Tenant stay summary |
| GET | `/staff/journey` | staff, owner, admin | Staff performance metrics |

---

# Appendix B: Frontend Route Summary for Journey Tracking

| Route | Component | Role |
|-------|-----------|------|
| `/dashboard/journey` | `RevenueJourneyPage` | owner, admin |
| `/tenant/journey` | `TenantJourneyPage` | resident |
| `/staff-portal/journey` | `StaffJourneyPage` | staff, owner, admin |

---

**Document Version:** 1.0  
**Last Updated:** July 13, 2026  
**Author:** Opsora Strategic Analysis Team
