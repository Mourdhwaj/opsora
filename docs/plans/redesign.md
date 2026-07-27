# Opsora — Complete Page Redesign Plan

## All Three Personas | Every Page | Detailed Specs

---

# Design System Summary

## Dials (Opsora-Adjusted)

| Dial | Value | Rationale |
|------|-------|-----------|
| **Creativity** | **5** | Dashboard product, not agency portfolio. Clean with personality, not chaotic. |
| **Density** | **6** | Data-heavy dashboard. Not cockpit-dense, but more than gallery-airy. |
| **Variance** | **6** | Asymmetric enough to avoid boredom, but predictable enough for daily use. |
| **Motion Intent** | **4** | Subtle hover/entrance cues. No cinematic orchestration for a management tool. |

## Color System (Opsora Brand)

| Token | Hex | Role |
|-------|-----|------|
| Canvas | `#F8FAFC` | Page background |
| Surface | `#FFFFFF` | Cards, modals, sidebar |
| Ink | `#0F172A` | Primary text (never pure black) |
| Ink Secondary | `#475569` | Descriptions, metadata |
| Ink Muted | `#94A3B8` | Timestamps, disabled |
| Border | `#E2E8F0` | Structural lines |
| Accent | `#059669` | Primary action, success |
| Accent Light | `#D1FAE5` | Active backgrounds |
| Accent Dark | `#047857` | Hover states |
| Danger | `#DC2626` | Errors, delete, urgent |
| Warning | `#D97706` | Pending, caution |
| Info | `#2563EB` | Links, information |

## Typography

- **Display:** Geist (700-900 weight, -0.025em tracking)
- **Body:** Geist (400 weight, 1.65 leading, 65ch max-width)
- **Mono:** Geist Mono (metadata, timestamps, numbers)

## Component Rules

- **Cards:** `rounded-xl` (12px), white fill, whisper border, diffused shadow
- **Buttons:** Flat surface, no glow. Primary: accent fill. Secondary: ghost/outline
- **Inputs:** Label above, helper text optional, error below in danger color
- **Loaders:** Skeletal shimmer only, never circular spinners
- **Touch targets:** Minimum 44px on mobile

---

# PART 1: LOGIN PAGE

## Current State
- Split layout: dark left panel with brand, white right panel with form
- Basic email/password form
- Demo credentials shown below

## Redesign Specs

### Layout
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────┐  ┌───────────────────────────┐  │
│  │                   │  │                           │  │
│  │   [Warm cream     │  │   Sign in                 │  │
│  │    background     │  │   Enter your credentials  │  │
│  │    with brand]    │  │                           │  │
│  │                   │  │   [Email input]           │  │
│  │   Opsora logo     │  │   [Password input]        │  │
│  │   + tagline       │  │                           │  │
│  │                   │  │   [Sign in button]        │  │
│  │                   │  │                           │  │
│  │                   │  │   Demo credentials        │  │
│  └───────────────────┘  └───────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Changes
1. **Left panel:** Warm cream `#FFF8F0` background instead of dark `#0F172A`
2. **Brand section:** Larger Opsora logo, tagline "Operating system for modern PG management"
3. **Form panel:** Clean white with generous spacing
4. **Inputs:** Larger touch targets (h-12 instead of h-11), softer border radius
5. **Button:** Full-width accent green with subtle shadow on hover
6. **Demo credentials:** Cleaner presentation with role badges
7. **Mobile:** Full-width form, brand section hidden, logo at top
8. **Motion:** Fade-in on mount, subtle scale on button press

### Anti-Patterns to Avoid
- No dark gradient left panel (feels generic SaaS)
- No emojis in the form
- No "Scroll to explore" or similar filler text

---

# PART 2: OWNER/ADMIN DASHBOARD

## Current State
- 4 metric cards (Residents, Occupancy, Revenue, Complaints)
- 2 charts (Occupancy Trend, Revenue)
- Recent Activity feed

## Redesign Specs

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Dashboard                              [Property: All ▼] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────┐ │
│ │ Revenue     │ │ Occupancy   │ │ Residents   │ │Comp│ │
│ │ ₹1,24,000   │ │ 78.5%       │ │ 62          │ │ 3  │ │
│ │ +12% vs last│ │ 62/80 beds  │ │ Active      │ │Open│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────┘ │
│                                                         │
│ ┌──────────────────────┐ ┌────────────────────────────┐ │
│ │ Revenue Trend        │ │ Occupancy by Floor         │ │
│ │ [AreaChart]          │ │ [BarChart]                 │ │
│ │ Monthly collection   │ │ Floor-wise breakdown       │ │
│ └──────────────────────┘ └────────────────────────────┘ │
│                                                         │
│ ┌──────────────────────┐ ┌────────────────────────────┐ │
│ │ Urgent Tickets       │ │ Water Tanks                │ │
│ │ • AC not working     │ │ • Tank 1: 45% [warn]      │ │
│ │ • Leak in 302        │ │ • Tank 2: 78% [ok]        │ │
│ │ [View All →]         │ │ [Order Tanker →]           │ │
│ └──────────────────────┘ └────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Recent Activity                                     │ │
│ │ • Priya checked in Room 205          2h ago         │ │
│ │ • Payment received from Amit         4h ago         │ │
│ │ • AC Repair resolved                 6h ago         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Metric Cards
- **Not equal-width cards.** Use 2fr 1fr 1fr 1fr grid on desktop
- **Revenue card** gets more visual weight (it's the primary metric)
- **Each card** has: icon (top-left), value (large, bold), label (small, muted), trend indicator
- **Hover:** Subtle lift (translateY -2px) with shadow increase
- **Color coding:** Revenue = amber accent, Occupancy = emerald, Residents = blue, Complaints = red

### Charts
- **Revenue Trend:** AreaChart with gradient fill, smooth curves, no gridlines
- **Occupancy by Floor:** Horizontal BarChart showing floor-wise bed distribution
- **No heavy gridlines.** Subtle axis lines only
- **Tooltips:** Clean, minimal, with formatted currency

### Quick Actions Section
- **Not a button grid.** Use horizontal pill-style quick actions
- Actions: [+ Add Resident] [Generate Invoices] [Create Poll] [Order Tanker]
- **Each action** has icon + label, hover state with accent background

### Activity Feed
- **Timeline style** with vertical line connecting events
- Each event: icon (colored by type), description, timestamp
- **No card per event.** Clean list with subtle separators

### Mobile
- Single column, stacked cards
- Charts full-width
- Quick actions become 2x2 grid
- Activity feed collapses to show 3 items with "View All"

---

# PART 3: RESIDENTS PAGE (Owner)

## Current State
- Table with search and filters
- Add resident modal
- Resident detail panel (split view)

## Redesign Specs

### List View
```
┌─────────────────────────────────────────────────────────┐
│ Residents (62)                          [+ Add Resident]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [🔍 Search residents...]   Status: [All ▼]             │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Amit Patel        Room 101  ₹8,000   [Active]   │ │
│ │    +91 98000 00001   Bed B1    Since Jan 15        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 👤 Priya Sharma      Room 103  ₹8,000   [Active]   │ │
│ │    +91 98000 00002   Bed B2    Since Feb 1         │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 👤 Rahul Verma       Room 201  ₹7,500   [Active]   │ │
│ │    +91 98000 00003   Bed B1    Since Mar 10        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Showing 1-20 of 62          [← Previous] [Next →]      │
└─────────────────────────────────────────────────────────┘
```

### List Item Design
- **Not a table.** Use card-style list items with clear hierarchy
- **Left:** Avatar (initials in colored circle) + Name + Phone
- **Center:** Room number + Bed number
- **Right:** Rent amount + Status badge + Move-in date
- **Hover:** Subtle background shift, cursor pointer
- **Active/Selected:** Accent left border (3px)

### Resident Detail Panel
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to list              Amit Patel         [Active] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ Monthly Rent │ │ Deposit Paid │ │ Balance Due  │     │
│ │ ₹8,000       │ │ ₹10,000      │ │ ₹0           │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│ Payment History                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Jul 2026  ₹8,000  ₹8,000  ₹0      ✅ Paid        │ │
│ │ Jun 2026  ₹8,000  ₹8,000  ₹0      ✅ Paid        │ │
│ │ May 2026  ₹8,000  ₹8,000  ₹0      ✅ Paid        │ │
│ │ Apr 2026  ₹8,000  ₹6,000  ₹2,000  ⚠️ Partial     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Personal Information                                     │
│ 📱 +91 98000 00001                                       │
│ ✉️ amit@example.com                                     │
│ 👤 Male · DOB: Jan 15, 1995                             │
│ 💼 Software Engineer at TechCorp                         │
│                                                         │
│ Emergency Contact                                        │
│ 👤 Rajesh Patel (Father)                                │
│ 📱 +91 98000 00002                                       │
│                                                         │
│ [Edit] [Checkout]                                        │
└─────────────────────────────────────────────────────────┘
```

### Detail Panel Design
- **Slide-in from right** on desktop, full-screen on mobile
- **Header:** Back button + Name + Status badge
- **Quick stats:** 3 metric cards in a row
- **Payment history:** Clean table with status badges
- **Personal info:** Icon + value pairs, no card wrapping
- **Actions:** Edit and Checkout buttons at bottom

### Add Resident Flow (Multi-Step Wizard)
```
Step 1/7: Personal Info
Step 2/7: Identity
Step 3/7: Employment
Step 4/7: Emergency
Step 5/7: Room Allocation
Step 6/7: Financial
Step 7/7: Food Preferences
```

- **Progress bar** at top showing current step
- **Clean form layout** with label above input
- **Navigation:** Back + Next buttons at bottom
- **Validation:** Real-time inline errors

---

# PART 4: ROOMS & BEDS PAGE (Owner)

## Current State
- Grid of room cards grouped by floor
- Room detail panel with beds
- Tenant click-through

## Redesign Specs

### Floor Selector
- **Horizontal tab bar** at top (Floor 1, Floor 2, Floor 3, All)
- Active tab has accent underline
- Clean, no icons needed

### Room Grid
```
┌─────────────────────────────────────────────────────────┐
│ Rooms & Beds                    Floor: [1] [2] [3] [All]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Floor 1                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ │  101    │ │  102    │ │  103    │ │  104    │       │
│ │ Shared  │ │ Single  │ │ Shared  │ │ Couple  │       │
│ │ ●● ○○   │ │ ●○      │ │ ●○      │ │ ●●      │       │
│ │ 2/4     │ │ 1/1     │ │ 1/2     │ │ 2/2     │       │
│ │ ₹8k/bed │ │ ₹12k    │ │ ₹7.5k   │ │ ₹15k    │       │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                         │
│ Floor 2                                                  │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐                    │
│ │  201    │ │  202    │ │  203    │                    │
│ │ ...     │ │ ...     │ │ ...     │                    │
│ └─────────┘ └─────────┘ └─────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Room Card Design
- **Not square cards.** Use slightly rectangular cards (aspect-ratio: 4/3)
- **Top:** Room number (large, bold) + Room type badge
- **Middle:** Bed indicators (colored dots: green=occupied, gray=vacant)
- **Bottom:** Bed count + Rent per bed
- **Color coding:** Full = red-tinted, Partial = amber-tinted, Vacant = green-tinted
- **Hover:** Lift effect with shadow

### Room Detail Panel
- **Slide-in from right**
- **Header:** Room number + Type + Rent
- **Beds list:** Each bed shows occupant name or "Vacant"
- **Action buttons:** Edit Room, Add Bed
- **Click on tenant:** Opens tenant detail

---

# PART 5: PAYMENTS PAGE (Owner)

## Current State
- Payment list with search and filters
- Summary cards (Collected, Pending, Overdue)

## Redesign Specs

### Summary Section
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐ │
│ │ Collected       │ │ Pending         │ │ Overdue    │ │
│ │ ₹1,24,000       │ │ ₹18,000         │ │ ₹8,000     │ │
│ │ 84.9% of total  │ │ 12 payments     │ │ 3 payments │ │
│ └─────────────────┘ └─────────────────┘ └────────────┘ │
│                                                         │
│ Actions: [Generate Invoices] [Send Reminders] [Export]  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Payment List
```
┌─────────────────────────────────────────────────────────┐
│ Payments                              Status: [All ▼]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Amit Patel        Jul 2026   ₹8,000   ✅ Paid      │ │
│ │ Room 101          Due: Jul 5                            │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Priya Sharma      Jul 2026   ₹8,000   ⏳ Pending   │ │
│ │ Room 103          Due: Jul 5                            │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ Rahul Verma       Jul 2026   ₹7,500   🔴 Overdue   │ │
│ │ Room 201          Due: Jul 5 (8 days late)             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Showing 1-20 of 45          [← Previous] [Next →]       │
└─────────────────────────────────────────────────────────┘
```

### Payment Item Design
- **Left:** Tenant name + Room number
- **Center:** Period + Due date
- **Right:** Amount + Status badge (colored)
- **Click:** Opens payment detail modal
- **Actions on hover:** Record Payment, Send Reminder, View Receipt

### Record Payment Modal
```
┌─────────────────────────────────────────────────────────┐
│ Record Payment - Amit Patel                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Period: July 2026                                       │
│                                                         │
│ Total Due:        ₹8,000                                │
│ Already Paid:     ₹0                                    │
│ Balance:          ₹8,000                                │
│                                                         │
│ Amount to Record *                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ₹ 8,000                                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Payment Method                                          │
│ [Cash] [UPI] [NEFT/IMPS] [Cheque]                      │
│                                                         │
│ Transaction ID (optional)                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ e.g. UPI ref, cheque number                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                    [Cancel]  [Record Payment]           │
└─────────────────────────────────────────────────────────┘
```

### Payment Verification Queue
- **Dedicated section** at top of payments page
- Shows pending proofs with screenshot thumbnails
- **Three actions:** Verify, Reject, Request Reupload
- **Warning modal** before verification

---

# PART 6: COMPLAINTS / SERVICE DESK (Owner)

## Current State
- Stats cards (Total, New, In Progress, Resolved, Urgent)
- Filter bar
- Ticket list
- Detail panel with comments

## Redesign Specs

### Stats Bar
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│ │  15 │ │  8  │ │  4  │ │  3  │ │  2  │               │
│ │Total│ │New  │ │In P.│ │Resv.│ │Urgnt│               │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- **Not equal-width cards.** Use `grid-cols-5` with consistent sizing
- **Color coding:** Total = neutral, New = blue, In Progress = amber, Resolved = green, Urgent = red
- **Each card** has number (large) + label (small)

### Ticket List
```
┌─────────────────────────────────────────────────────────┐
│ Service Desk                           [+ Create Ticket]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [🔍 Search...] Status [All ▼] Priority [All ▼]          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔧  TKT-001  [P1-URGENT] [OPEN]                    │ │
│ │ AC not working in Room 205                          │ │
│ │ Priya Sharma · Room 205 · 2h ago                    │ │
│ │ SLA: ⚠️ 2h remaining                                │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 📶  TKT-002  [P2-HIGH] [IN_PROGRESS]               │ │
│ │ WiFi connectivity issues                            │ │
│ │ Amit Patel · Room 101 · 1d ago                      │ │
│ │ SLA: ✅ On track                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Ticket Item Design
- **Left:** Category icon (colored circle with emoji or icon)
- **Top:** Ticket number (mono) + Priority badge + Status badge
- **Middle:** Title (bold) + Description preview
- **Bottom:** Tenant name + Room + Time ago
- **SLA indicator:** Color-coded badge (green/amber/red)
- **Hover:** Background shift, cursor pointer

### Ticket Detail Panel
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to list              TKT-001  [P1-URGENT]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ AC not working in Room 205                              │
│ The AC unit is making a strange noise and not cooling   │
│ properly. It started yesterday evening.                 │
│                                                         │
│ Status: ● New → ● In Progress → ● Resolved → ● Closed  │
│         ✓        ○                ○            ○        │
│                                                         │
│ Assigned to: Rajesh Kumar (Maintenance)                 │
│ SLA: ⚠️ 2h 15m remaining                               │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ Activity Timeline                                       │
│ 🟢 Ticket created · Jul 13, 10:30 AM                   │
│ 🟡 Assigned to Rajesh Kumar · Jul 13, 11:00 AM         │
│ 💬 Rajesh Kumar: "On my way to check" · 11:15 AM       │
│                                                         │
│ ─────────────────────────────────────────────────────── │
│                                                         │
│ [✓] Internal note (not visible to tenant)               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Add a comment...                              [Send]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Assign Staff] [Mark Resolved]                          │
└─────────────────────────────────────────────────────────┘
```

### Detail Panel Design
- **Slide-in from right** on desktop
- **Header:** Back + Ticket number + Priority badge
- **Description:** Full text, not truncated
- **Status workflow:** Visual progress bar with dots
- **Assignment:** Staff name with reassign option
- **Timeline:** Vertical timeline with colored dots
- **Comment input:** With "Internal note" checkbox
- **Actions:** Assign Staff, Mark Resolved

---

# PART 7: IoT WATER DASHBOARD (Owner)

## Current State
- Summary cards
- Water consumption chart
- Tank level widgets

## Redesign Specs

### Summary Cards
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────┐ │
│ │ 💧 Total    │ │ 📊 Daily    │ │ 📈 Peak     │ │🚛  │ │
│ │ 12,500L     │ │ 416L        │ │ 850L        │ │ 2  │ │
│ │ Consumption │ │ Average     │ │ Usage       │ │Orders│ │
│ └─────────────┘ └─────────────┘ └─────────────┘ └────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Water Consumption Chart
- **LineChart** with smooth curves
- **Color-coded zones:** Green (low), Amber (moderate), Red (high)
- **Anomaly highlights:** Red dots on unusual readings
- **Calendar picker** for daily breakdown

### Tank Level Widget
```
┌─────────────────────────────────────────────────────────┐
│ Main Overhead Tank          Last updated: 5m ago        │
│                                                         │
│ ┌─────────────────────────────────────────────────┐    │
│ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│    │
│ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│    │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    │
│ └─────────────────────────────────────────────────┘    │
│                                                         │
│ Current Level: 65% · 3,250L / 5,000L                   │
│ Status: ✅ Normal                                       │
└─────────────────────────────────────────────────────────┘
```

- **Visual tank** with fill level
- **Color coding:** Green (>50%), Amber (20-50%), Red (<20%)
- **Last updated** timestamp with pulse indicator

---

# PART 8: IoT ELECTRICITY DASHBOARD (Owner)

## Current State
- Similar to water dashboard
- Hardcoded data

## Redesign Specs

### Summary Cards
- Total kWh consumed
- Average daily
- Peak load (kW)
- Total cost (₹)

### Electricity Chart (Stock Market Style)
- **AreaChart** with gradient fill
- **Color-coded bars:** Green (low), Amber (moderate), Red (high)
- **Cost trend** with up/down arrows
- **Calendar picker** for daily breakdown

### Cost Comparison
- Current month vs Previous month
- Current month vs Budget
- Visual indicators (up/down arrows, color coding)

---

# PART 9: FOOD MANAGEMENT (Owner)

## Current State
- Hardcoded mock data
- No real API integration

## Redesign Specs

### Food Page Layout
```
┌─────────────────────────────────────────────────────────┐
│ Food & Meals                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Today's Menu] [Polls] [Analytics]                      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Today's Menu - July 13, 2026                        │ │
│ │                                                     │ │
│ │ 🍳 Breakfast (7:30 - 9:00 AM)          [Edit]      │ │
│ │ • Poha, Boiled Eggs, Tea/Coffee, Fruit Bowl        │ │
│ │                                                     │ │
│ │ 🍛 Lunch (12:30 - 2:00 PM)              [Edit]      │ │
│ │ • Rice, Dal Makhani, Paneer Butter Masala, Roti    │ │
│ │                                                     │ │
│ │ 🍲 Dinner (8:00 - 9:30 PM)              [Edit]      │ │
│ │ • Rice, Rajma, Chicken Curry, Roti, Curd           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [+ Add Meal] [Create Poll]                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Menu Card Design
- **Meal type** with icon and time slot
- **Items list** in clean bullet format
- **Edit/Delete** buttons on hover
- **Special meal** badge if applicable

### Poll Management
- **Create poll** form with options
- **Active polls** list with vote counts
- **Results** visualization (bar chart)
- **Finalize** button to select winner

---

# PART 10: STAFF DASHBOARD

## Current State
- Summary cards (Pending Tasks, Open Complaints, Completed Today, Residents)
- Quick actions (My Tasks, Complaints, Daily Checklist)
- Today's attendance widget
- Recent tickets

## Redesign Specs

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────┐
│ Staff Dashboard                                         │
│ Welcome, Rajesh Kumar                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ My Tasks     │ │ Open Tickets │ │ Resolved     │     │
│ │ 5            │ │ 3            │ │ 12           │     │
│ │ Pending      │ │ Assigned     │ │ This Month   │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Today's Attendance                                  │ │
│ │ ✅ Checked in at 9:00 AM                            │ │
│ │ [Check Out]                                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌──────────────────────┐ ┌────────────────────────────┐ │
│ │ My Tasks             │ │ My Tickets                 │ │
│ │ • Morning inspection │ │ • TKT-001: AC not working  │ │
│ │ • Check WiFi         │ │ • TKT-002: WiFi issues     │ │
│ │ • Restock supplies   │ │                            │ │
│ │ [View All →]         │ │ [View All →]               │ │
│ └──────────────────────┘ └────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Attendance Widget
- **Large, prominent** check-in/check-out button
- **Visual indicator:** Green dot when checked in
- **Duration** shown after checkout

### Task List
- **Checkbox** for each task
- **Priority badge** (high/medium/low)
- **Title** with strikethrough when completed
- **Click** to expand details

### Ticket List
- **Compact view** with ticket number, title, status
- **Click** to open full detail
- **SLA indicator** if applicable

---

# PART 11: STAFF COMPLAINTS

## Current State
- Ticket list grouped by status
- Detail panel with comments

## Redesign Specs

### Ticket Groups
```
┌─────────────────────────────────────────────────────────┐
│ Complaints                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ New Tickets (3)                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔧  TKT-001  [P1-URGENT]                           │ │
│ │ AC not working in Room 205                          │ │
│ │ Priya Sharma · 2h ago                               │ │
│ │ SLA: ⚠️ 2h remaining                                │ │
│ │                                    [Accept]          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ In Progress (2)                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 📶  TKT-002  [P2-HIGH]                             │ │
│ │ WiFi connectivity issues                            │ │
│ │ Amit Patel · 1d ago                                 │ │
│ │ SLA: ✅ On track                                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Resolved (3)                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🧹  TKT-003  [P3-MEDIUM]                           │ │
│ │ Cleaning schedule issue                             │ │
│ │ Rahul Verma · 2d ago                                │ │
│ │ SLA: ✅ Completed                                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Ticket Group Design
- **Collapsible sections** with count badges
- **Color-coded headers:** New = blue, In Progress = amber, Resolved = green
- **Accept button** for new tickets
- **Click** to open full detail

---

# PART 12: STAFF TASKS

## Current State
- Hardcoded mock data
- No API integration

## Redesign Specs

### Tasks Page
```
┌─────────────────────────────────────────────────────────┐
│ My Tasks                                                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [All] [Pending] [In Progress] [Completed]               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✓  Morning floor inspection           [high]        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ○  Check WiFi connectivity on all floors [medium]   │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ○  Restock cleaning supplies           [low]        │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ◐  Verify water tank levels            [high]       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Task Item Design
- **Checkbox** on left
- **Title** (strikethrough when completed)
- **Priority badge** on right
- **Status indicator** (pending/in_progress/completed)
- **Click** to expand details

---

# PART 13: STAFF CHECKLIST

## Current State
- Hardcoded checklist items
- Local state only (not persisted)

## Redesign Specs

### Checklist Page
```
┌─────────────────────────────────────────────────────────┐
│ Daily Checklist                                         │
│ Complete your daily duties                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 5 of 8 completed                    63%            │ │
│ │ ████████████████████░░░░░░░░░░░░░░░░               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✅ Check all floor bathrooms are clean              │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ✅ Verify common area is tidy                       │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ✅ Check water levels in tanks                      │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ○  Check kitchen supplies                           │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ○  Verify visitor log is updated                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Checklist Item Design
- **Checkmark icon** (filled when completed)
- **Task description** (strikethrough when completed)
- **Click** to toggle completion
- **Progress bar** at top with percentage

---

# PART 14: STAFF RESIDENTS VIEW

## Current State
- Basic table with name, room, bed, phone, status
- Read-only

## Redesign Specs

### Residents List
```
┌─────────────────────────────────────────────────────────┐
│ Residents                                               │
│ View resident information                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [🔍 Search residents...]                                │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 Amit Patel        Room 101  Bed B1   +91 980... │ │
│ │    [Active]                                         │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ 👤 Priya Sharma      Room 103  Bed B2   +91 980... │ │
│ │    [Active]                                         │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Resident Item Design
- **Avatar** (initials in colored circle)
- **Name** (bold)
- **Room + Bed** (mono font)
- **Phone** (truncated on mobile)
- **Status badge**
- **Click** to view details (read-only)

---

# PART 15: TENANT DASHBOARD

## Current State
- Welcome header
- 4 metric cards (Room, Rent, Open Tickets, Since)
- Payment status card
- Quick actions (Pay Rent, Raise Complaint, Today's Menu)

## Redesign Specs

### Dashboard Layout
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
│ Payment Status                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Latest: July 2026                                   │ │
│ │ Due: July 5, 2026                                   │ │
│ │                                                     │ │
│ │ ₹8,000                              [paid]          │ │
│ │                                                     │ │
│ │ You have 1 pending payment(s) totaling ₹8,000       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                         [View all →]   │
│                                                         │
│ Quick Actions                                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 💳           │ │ ⚠️           │ │ 🍽️           │     │
│ │ Pay Rent     │ │ Raise        │ │ Today's      │     │
│ │              │ │ Complaint    │ │ Menu         │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Metric Cards
- **2x2 grid** on mobile, 4 columns on desktop
- **Each card:** Icon + Value + Label
- **Color coding:** Room = neutral, Rent = amber, Tickets = red, Since = blue

### Payment Status Card
- **Full-width** card with payment details
- **Status badge** (paid/pending/overdue)
- **"View all"** link to payments page

### Quick Actions
- **3 cards** in a row
- **Each card:** Icon + Label
- **Click** navigates to respective page

---

# PART 16: TENANT PAYMENTS

## Current State
- Basic payment history table
- No proof upload

## Redesign Specs

### Payments Page
```
┌─────────────────────────────────────────────────────────┐
│ My Payments                                             │
│ View your rent payment history                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Summary                                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌────────────┐ │
│ │ Total Paid      │ │ Total Due       │ │ Balance    │ │
│ │ ₹48,000         │ │ ₹56,000         │ │ ₹8,000     │ │
│ │ 6 payments      │ │ 7 payments      │ │ 1 pending  │ │
│ └─────────────────┘ └─────────────────┘ └────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Jul 2026  │ ₹8,000  │ ₹0      │ ₹8,000  │ pending │ │
│ │ Jun 2026  │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    │ │
│ │ May 2026  │ ₹8,000  │ ₹8,000  │ ₹0      │ paid    │ │
│ │ Apr 2026  │ ₹8,000  │ ₹6,000  │ ₹2,000  │ partial │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Upload Payment Proof]                                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Payment Item Design
- **Period** (Month/Year)
- **Rent amount**
- **Paid amount**
- **Balance**
- **Status badge** (colored)
- **Due date**

### Upload Payment Proof Modal
```
┌─────────────────────────────────────────────────────────┐
│ Upload Payment Proof                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Payment Period: July 2026                               │
│ Amount Due: ₹8,000                                      │
│                                                         │
│ Upload Screenshot *                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │    📷 Click to upload or drag and drop              │ │
│ │    PNG, JPG, GIF up to 10MB                         │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Transaction ID *                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ e.g. UPI ref: txn_1234567890                       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Amount *                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ₹ 8,000                                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Payment Method                                          │
│ [UPI] [Bank Transfer] [Cash]                            │
│                                                         │
│                    [Cancel]  [Upload Proof]              │
└─────────────────────────────────────────────────────────┘
```

---

# PART 17: TENANT COMPLAINTS

## Current State
- Complaint list
- Create complaint modal
- Detail panel with comments

## Redesign Specs

### Complaints Page
```
┌─────────────────────────────────────────────────────────┐
│ My Complaints                               [+ New Ticket]│
│ Track and manage your maintenance requests              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ TKT-001  [P1-URGENT] [OPEN]                        │ │
│ │ AC not working in Room 205                          │ │
│ │ Room 101 · Jul 13, 2026 10:30 AM                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ TKT-002  [P2-HIGH] [IN_PROGRESS]                   │ │
│ │ WiFi connectivity issues                            │ │
│ │ Room 101 · Jul 12, 2026 2:15 PM                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ TKT-003  [P3-MEDIUM] [RESOLVED]                    │ │
│ │ Leaky faucet in bathroom                            │ │
│ │ Room 101 · Jul 10, 2026 9:00 AM                    │ │
│ │ ✅ Resolved - Jul 11, 2026                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Create Complaint Modal
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
│ [Urgent] [High] [Medium] [Low]                          │
│                                                         │
│ Title *                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Brief description of the issue                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Description *                                           │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Provide details about the issue...                  │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│                    [Cancel]  [Submit Ticket]            │
└─────────────────────────────────────────────────────────┘
```

### Category Selector
- **Icon grid** with emoji or icon for each category
- **Selected state** has accent border
- **Hover** shows category label

### Priority Selector
- **Color-coded buttons:** Urgent (red), High (orange), Medium (amber), Low (blue)
- **Selected state** has solid fill

---

# PART 18: TENANT FOOD

## Current State
- Hardcoded mock data
- No real API integration

## Redesign Specs

### Food Page
```
┌─────────────────────────────────────────────────────────┐
│ Food & Meals                                            │
│ View today's menu and weekly meal plan                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Today's Menu] [Weekly Plan]                            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🍳 Breakfast (7:30 - 9:00 AM)                      │ │
│ │ • Poha                                              │ │
│ │ • Boiled Eggs                                       │ │
│ │ • Tea/Coffee                                        │ │
│ │ • Fruit Bowl                                        │ │
│ │                                                     │ │
│ │ [👍 Vote this meal]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🍛 Lunch (12:30 - 2:00 PM)                         │ │
│ │ • Rice                                              │ │
│ │ • Dal Makhani                                       │ │
│ │ • Paneer Butter Masala                              │ │
│ │ • Roti, Salad                                       │ │
│ │                                                     │ │
│ │ [👍 Vote this meal]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Menu Card Design
- **Meal type** with icon and time slot
- **Items list** in clean format
- **Vote button** with count
- **Voted state** shows "Voted ✓"

---

# PART 19: TENANT PROFILE

## Current State
- Basic profile info display

## Redesign Specs

### Profile Page
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
│ [Edit Profile]                                          │
└─────────────────────────────────────────────────────────┘
```

### Profile Design
- **Avatar** (initials in colored circle)
- **Name** (large, bold)
- **Property** (subtitle)
- **Info sections** with icon + label + value
- **Edit button** at bottom

---

# PART 20: LOGIN PAGE (All Roles)

## Current State
- Split layout with dark left panel

## Redesign Specs

### Login Layout
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌───────────────────┐  ┌───────────────────────────┐  │
│  │                   │  │                           │  │
│  │   Opsora          │  │   Sign in                 │  │
│  │                   │  │   Enter your credentials  │  │
│  │   Operating       │  │                           │  │
│  │   system for      │  │   Email                   │  │
│  │   modern PG       │  │   [input]                 │  │
│  │   management      │  │                           │  │
│  │                   │  │   Password                │  │
│  │                   │  │   [input]                 │  │
│  │                   │  │                           │  │
│  │                   │  │   [Sign in]               │  │
│  │                   │  │                           │  │
│  │                   │  │   Demo credentials        │  │
│  └───────────────────┘  └───────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Login Design
- **Left panel:** Warm cream background with brand
- **Right panel:** Clean white with form
- **Inputs:** Larger touch targets (h-12)
- **Button:** Full-width accent green
- **Demo credentials:** Clean presentation with role badges
- **Mobile:** Full-width form, brand at top

---

# Implementation Priority

## Phase 1: Quick Wins (1-2 days)
1. Fix hardcoded data in staff tasks, food pages, IoT dashboards
2. Connect dashboard charts to real API
3. Fix staff residents endpoint

## Phase 2: Core Pages (3-5 days)
4. Owner Dashboard redesign
5. Residents page redesign
6. Rooms page redesign
7. Payments page redesign

## Phase 3: Service Desk (2-3 days)
8. Complaints page redesign
9. Staff complaints page redesign
10. Staff tasks page redesign

## Phase 4: Tenant Portal (2-3 days)
11. Tenant dashboard redesign
12. Tenant payments page redesign
13. Tenant complaints page redesign
14. Tenant food page redesign

## Phase 5: IoT & Food (2-3 days)
15. Water IoT dashboard redesign
16. Electricity IoT dashboard redesign
17. Food management page redesign

## Phase 6: Polish (1-2 days)
18. Login page redesign
19. Mobile responsiveness audit
20. Animation and micro-interactions

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
**Design System:** design-taste-frontend + impeccable
