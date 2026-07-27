# Opsora Mobile App — UI Redesign Spec

## Overview

Complete redesign of the Opsora mobile app (Expo/React Native) to match a modern, premium financial-app aesthetic inspired by the "Rocket" finance app reference. The redesign covers the navigation system, dashboard, list pages (residents, payments, issues), and issue detail page.

**Approach:** Build reusable shared components + new theme first, then migrate all pages to use them.

## Problems Being Solved

1. **"Dashboard" appears twice** — hamburger menu header + page title both show it
2. **Duplicate navigation** — hamburger menu + bottom quick actions both link to same screens
3. **Tight card spacing** — metric cards packed with no breathing room
4. **Uninformative charts** — occupancy/revenue bar charts don't give actionable insights
5. **Quick Stats duplicates top metrics** — same data shown twice
6. **Unprofessional emojis** — 🎫💰👥 used instead of proper icons
7. **No pagination** — all lists fetch `limit: 100` with no load-more
8. **No time-based sorting/filtering** — no way to filter by date range
9. **Issue detail navigation broken** — list-to-detail may not work properly

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Color theme | Purple gradient (`#6C3CE1` → `#8B5CF6`) | Matches reference app, modern premium feel |
| Font | Geist (from web app) | Cross-platform consistency |
| Navigation | Bottom tabs (5 items) + More screen | Removes hamburger, cleaner mobile UX |
| Dashboard charts | Revenue trend line/area chart | Actionable for PG owner |
| Pagination | Load More button (20 per page) | Simple, predictable, native feel |
| Icons | `lucide-react-native` | Professional, consistent, lightweight |
| List sorting | Time window filter (This Month / 3M / All) | PG owners think in monthly cycles |

## Section 1: Theme & Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#6C3CE1` | Buttons, active states, links |
| `primaryLight` | `#8B5CF6` | Gradients, hover states |
| `primaryDark` | `#5528C8` | Pressed states |
| `primaryGradient` | `#6C3CE1` → `#8B5CF6` | Header backgrounds |
| `background` | `#F8F7FC` | Page background (light lavender) |
| `surface` | `#FFFFFF` | Cards, modals |
| `text` | `#1A1A2E` | Primary text (near-black) |
| `textSecondary` | `#6B7280` | Secondary text |
| `textMuted` | `#9CA3AF` | Placeholder, timestamps |
| `border` | `#E5E7EB` | Default borders |
| `borderLight` | `#F3F4F6` | Divider lines |
| `success` | `#22C55E` | Positive indicators |
| `warning` | `#F59E0B` | Caution indicators |
| `danger` | `#EF4444` | Error, urgent indicators |
| `info` | `#3B82F6` | Informational |

### Typography

| Element | Size | Weight | Font |
|---------|------|--------|------|
| Page title | 28px | 800 | Geist |
| Section title | 16px | 700 | Geist |
| Card title | 16px | 600 | Geist |
| Body | 14px | 400 | Geist |
| Label | 12px | 500-600 | Geist |
| Stat number | 24-32px | 800 | Geist |
| Badge | 11px | 600 | Geist |

### Spacing & Radius

| Token | Value |
|-------|-------|
| Horizontal padding | 16px |
| Card gap | 12px |
| Card padding | 16px |
| Card radius | 12px |
| Badge radius | 8px |
| Avatar radius | 20px (full circle) |
| Button radius | 10px |

### Shadows

- Card: `shadowColor: '#6C3CE1', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2`
- FAB: `shadowColor: '#6C3CE1', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6`

## Section 2: Navigation — Bottom Tab Bar

### Structure

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│Dashboard │Residents │ Payments │  Issues  │   More   │
│  (home)  │  (users) │ (credit) │ (alert)  │ (grid)   │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

### Behavior

- **5 tabs** in bottom bar
- Active tab: purple color, filled icon
- Inactive tab: gray color, outline icon
- **No hamburger menu** — removed entirely
- Top header: page title (left) + optional action button (right)

### More Screen

Grid layout (2 columns) with remaining screens:
- Properties (`Building`)
- Room Layout (`LayoutGrid`)
- Food & Meals (`UtensilsCrossed`)
- Water IoT (`Droplets`)
- Electricity (`Zap`)
- Group Check-in (`UserPlus`)
- Archive (`Archive`)
- Settings (`Settings`)

Each item: icon + label in a card-style grid cell.

### Icon Library

Use `lucide-react-native` for all icons:
- Dashboard: `LayoutDashboard`
- Residents: `Users`
- Payments: `CreditCard`
- Issues: `AlertCircle`
- More: `Grid2x2` or `MoreHorizontal`

## Section 3: Dashboard Layout

### Section 3.1 — Gradient Header

```
┌─────────────────────────────────────┐
│  ◻ Gradient background (purple)     │
│                                     │
│  Good evening, Rajesh      🔔      │
│  Your PG at a Glance               │
│                                     │
└─────────────────────────────────────┘
```

- Full-width purple gradient
- Time-based greeting: "Good morning/afternoon/evening, {FirstName}"
- Notification bell icon (top right)
- Subtitle: "Your PG at a Glance"

### Section 3.2 — Hero Stat Card

```
┌─────────────────────────────────────┐
│  Total Revenue This Month           │
│  ₹1,85,000          ↑ 12% vs last  │
│  from 31 active tenants             │
└─────────────────────────────────────┘
```

- White card that overlaps gradient bottom (negative margin or absolute positioning)
- Large revenue number (24-32px, bold)
- Percentage change vs last month (green ↑ or red ↓)
- Subtitle: "from X active tenants"

### Section 3.3 — Quick Actions Row

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  🏢  │ │  👥  │ │  💳  │ │  ⚠️  │
│ Prop │ │ Resi │ │ Pay  │ │Issue │
└──────┘ └──────┘ └──────┘ └──────┘
```

- 4 circular icon buttons in a row
- Purple gradient icon on light purple (`#F0EBFF`) background
- Labels below icons (12px)
- Replaces both hamburger items AND bottom quick actions

### Section 3.4 — Revenue Trend Chart

```
┌─────────────────────────────────────┐
│  Revenue Trend        [1M][3M][6M] │
│                                     │
│  ╭──────╮                           │
│ ╭╯      ╰───╮                       │
│╭╯           ╰────╮                  │
│╰╮               ╰──╮               │
│  ╰─────────────────╯               │
│  Jan  Feb  Mar  Apr  May  Jun      │
│  ● Collected  ○ Expected           │
└─────────────────────────────────────┘
```

- Line/area chart with purple fill
- Time range selector: 1M | 3M | 6M (pill-style buttons)
- Two lines: Collected (solid purple) vs Expected (dashed gray)
- X-axis: months, Y-axis: ₹ amounts
- Use `react-native-chart-kit` (already installed) with `react-native-svg` for the line chart

### Section 3.5 — Occupancy Overview

```
┌─────────────────────────────────────┐
│  Occupancy Overview                 │
│                                     │
│  ┌─────┐  75/100 beds occupied     │
│  │ 75% │  75% occupancy rate       │
│  └─────┘  ████████████░░░░░░       │
│                                     │
│  Property A    45/50  (90%) 🔴     │
│  Property B    30/50  (60%) 🟡     │
└─────────────────────────────────────┘
```

- Circular progress or horizontal bar showing overall occupancy
- Color-coded: green (>70%), yellow (50-70%), red (<50%)
- Per-property breakdown below (name + progress bar + percentage)

### Section 3.6 — Recent Activity

```
┌─────────────────────────────────────┐
│  Recent Activity                    │
│                                     │
│  [👤] Amit Patel checked in         │
│      by Rajesh Kumar · 1d ago       │
│                                     │
│  [💳] Payment received              │
│      by System · 1d ago             │
│                                     │
│  [⚠️] Complaint created             │
│      by Amit Patel · 1d ago         │
└─────────────────────────────────────┘
```

- Timeline-style list
- Professional lucide icons (not emojis):
  - `UserPlus` for check-in
  - `CreditCard` for payment
  - `AlertCircle` for complaint
  - `BedDouble` for bed allocation
  - `CheckCircle` for resolved
- Each item: icon (colored circle bg) + action text + "by {actor} · {time}"
- Show last 5 items
- "View All" link at bottom

### Removed Sections

- **Quick Stats** — removed (duplicates hero card and occupancy)
- **Water Tanks** — moved to More > Water IoT
- **Property Occupancy** — merged into Occupancy Overview section

## Section 4: List Pages (Residents, Payments, Issues)

### Shared Pattern

All list pages follow this structure:

```
┌─────────────────────────────────────┐
│  Page Title                  [+Add] │
│                                     │
│  [🔍 Search...                ]     │
│                                     │
│  [All] [Active] [Inactive] [Moved] │  ← filter chips
│  [This Month] [3 Months] [All]     │  ← time window
│                                     │
│  Showing 1-20 of 45                 │
│                                     │
│  ┌─ Card 1 ─────────────────────┐  │
│  │ ...                          │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌─ Card 2 ─────────────────────┐  │
│  │ ...                          │  │
│  └──────────────────────────────┘  │
│                                     │
│  [    Load More (25 remaining)   ]  │
└─────────────────────────────────────┘
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `PageHeader` | `title`, `action?` | Title + optional right action button |
| `SearchInput` | `value`, `onChange`, `placeholder` | Search bar with clear button |
| `FilterChips` | `options`, `selected`, `onSelect` | Horizontal scrollable chip filters |
| `TimeFilter` | `selected`, `onSelect` | "This Month" / "3 Months" / "All" pills |
| `ListCounter` | `showing`, `total` | "Showing 1-20 of 45" |
| `LoadMoreButton` | `onPress`, `loading`, `remaining` | Purple outline button with count |
| `EmptyState` | `title`, `message`, `icon` | Empty state with lucide icon |
| `MoreGrid` | `items` | 2-column grid for More screen items |

### Residents Page

**Card Layout:**
```
┌─────────────────────────────────────┐
│  [Avatar: initials]                 │
│  Amit Patel                        │
│  📱 98765 43210 · Room A-101       │
│  Move-in: Jan 15, 2026    ₹8,500   │
│  [Active]                          │
└─────────────────────────────────────┘
```

- Avatar: initials in colored circle (color derived from name hash)
- Name (bold), phone + room (secondary)
- Move-in date + rent amount
- Status badge (Active/Inactive/Moved Out)
- Tap → navigate to detail page

### Payments Page

**Summary Bar:**
```
┌───────────────┐ ┌───────────────┐
│   Collected   │ │    Pending    │
│  ₹1,25,000    │ │  ₹45,000     │
│   (green)     │ │   (red)       │
└───────────────┘ └───────────────┘
```

**Card Layout:**
```
┌─────────────────────────────────────┐
│  💳 Amit Patel            [Paid]    │
│  March 2026 · Room A-101           │
│                                     │
│  Total: ₹8,500  Paid: ₹8,500      │
│  Balance: ₹0                      │
│  Due: Mar 5, 2026                  │
└─────────────────────────────────────┘
```

- CreditCard icon (left)
- Tenant name (bold) + Status badge (right)
- Month/Year + Room
- Three amounts: Total, Paid, Balance
- Due date

### Issues Page

**Summary Bar:**
```
┌───────────────┐ ┌───────────────┐
│    Open       │ │    Urgent     │
│      4        │ │      1        │
│  (orange)     │ │   (red)       │
└───────────────┘ └───────────────┘
```

**Card Layout:**
```
┌─────────────────────────────────────┐
│  ⚠️ #1234           [Open] [Urgent] │
│  Water leakage in Room B-203       │
│  The pipe under the sink is...     │
│                                     │
│  🔧 Plumbing          Mar 15, 2026 │
└─────────────────────────────────────┘
```

- AlertCircle icon (colored by priority)
- Ticket number + Status badge + Priority badge
- Title (bold, 16px)
- Description (2 lines max, secondary text)
- Category icon + name + date

### Pagination

- **Page size:** 20 items
- **Load More button:** Purple outline, shows "Load More (X remaining)"
- **Loading state:** Spinner inside button while fetching
- **Counter:** "Showing 1-20 of 45" above the list
- **Backend params:** `?page=1&limit=20` (offset-based)
- **Time filter params:** `?startDate=2026-04-01&endDate=2026-04-30`

## Section 5: Issue Detail Page

### Layout

**Header Card (gradient overlay):**
```
┌─────────────────────────────────────┐
│  #1234        [Urgent]    [Open]    │
│                                     │
│  Water leakage in Room B-203       │
│                                     │
│  The pipe under the sink has been   │
│  leaking for 2 days. Water is      │
│  dripping constantly.              │
└─────────────────────────────────────┘
```

**Details Card:**
```
┌─────────────────────────────────────┐
│  Details                            │
│                                     │
│  🏷️  Category      Plumbing        │
│  ⚠️  Priority       Urgent          │
│  🕐  Created        2 days ago      │
│  ✅  Resolved       —               │
│  👤  Resident       Amit Patel      │
│  👨‍💼  Assigned To    Rajesh Kumar    │
└─────────────────────────────────────┘
```

- Each row: icon + label (left) + value (right, bold)
- Divider lines between rows

**Actions Card:**
```
┌─────────────────────────────────────┐
│  Actions                            │
│                                     │
│  Change Status              ›      │
│                                     │
│  Assign Staff                      │
│  ☐ Rajesh Kumar          (2 open)  │
│  ☑ Priya Sharma          (1 open)  │
│  ☐ System Admin          (0 open)  │
└─────────────────────────────────────┘
```

- "Change Status" → opens bottom sheet
- Staff list → tap to assign (checkmark on assigned)
- Status transitions: open → in_progress → resolved → closed

**Comments Section:**
```
┌─────────────────────────────────────┐
│  Comments (3)                       │
│                                     │
│  [Avatar] Rajesh Kumar              │
│  Looking into this now...           │
│  2 hours ago                        │
│                                     │
│  [Avatar] Amit Patel                │
│  Please fix ASAP                    │
│  1 day ago                          │
│                                     │
│  ┌─ Add comment...          [Send] │
└─────────────────────────────────────┘
```

- Timeline-style with avatars
- Add comment input at bottom
- Internal notes toggle (visible to staff only)

## Section 6: Shared Component Library

### New Components to Create

| Component | File | Description |
|-----------|------|-------------|
| `GradientHeader` | `src/components/GradientHeader.tsx` | Purple gradient background with content overlay |
| `HeroStatCard` | `src/components/HeroStatCard.tsx` | Large stat card with trend indicator |
| `IconActionButton` | `src/components/IconActionButton.tsx` | Circular icon button for quick actions |
| `LineChart` | `src/components/LineChart.tsx` | Revenue trend line/area chart |
| `ProgressRing` | `src/components/ProgressRing.tsx` | Circular progress for occupancy |
| `TimeFilter` | `src/components/TimeFilter.tsx` | Time window pill selector |
| `LoadMoreButton` | `src/components/LoadMoreButton.tsx` | Pagination load-more button |
| `PageHeader` | `src/components/PageHeader.tsx` | Title + action button header |
| `FilterChips` | `src/components/FilterChips.tsx` | Horizontal scrollable filter chips |

### Updated Components

| Component | Changes |
|-----------|---------|
| `Card` | New shadow style (purple-tinted), consistent radius |
| `StatusBadge` | New color scheme matching purple theme |
| `EmptyState` | Use lucide icons instead of emojis |
| `LoadingSkeleton` | Match new layout structure |

### Theme File Update

Update `src/lib/theme.ts` with new purple palette, Geist font references, and consistent spacing tokens.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/theme.ts` | New color palette, typography, spacing |
| `app/(owner)/_layout.tsx` | Replace Tabs+drawer with bottom tabs (5 items) |
| `app/(owner)/dashboard.tsx` | Complete rewrite with new layout |
| `app/(owner)/residents.tsx` | Add pagination, time filter, new card layout |
| `app/(owner)/payments.tsx` | Add pagination, time filter, new card layout |
| `app/(owner)/complaints.tsx` | Add pagination, time filter, new card layout |
| `app/(owner)/complaints/[id].tsx` | Redesign with icons, proper layout |
| `app/(owner)/more.tsx` | New grid layout for secondary screens |
| `src/components/index.ts` | Export new components |

## Success Criteria

1. No duplicate "Dashboard" text anywhere
2. No hamburger menu — bottom tabs only
3. Dashboard matches Rocket app reference layout
4. All list pages have pagination (Load More)
5. All list pages have time window filter
6. Zero emojis in navigation/UI — all lucide icons
7. Charts show meaningful, actionable data
8. Proper spacing between all cards (12px gap)
9. Issue detail page opens correctly from list
10. All screens use consistent purple theme

## Section 7: Dependencies to Install

| Package | Purpose |
|---------|---------|
| `lucide-react-native` | Professional icon library for all UI icons |

**Note:** `react-native-chart-kit` and `react-native-svg` are already installed.

## Section 8: More Screen Grid Layout

```
┌─────────────────────────────────────┐
│  More                               │
│                                     │
│  ┌───────────┐  ┌───────────┐      │
│  │ 🏢        │  │ 🔲        │      │
│  │Properties │  │Room Layout│      │
│  └───────────┘  └───────────┘      │
│                                     │
│  ┌───────────┐  ┌───────────┐      │
│  │ 🍽️        │  │ 💧        │      │
│  │Food&Meals │  │Water IoT  │      │
│  └───────────┘  └───────────┘      │
│                                     │
│  ┌───────────┐  ┌───────────┐      │
│  │ ⚡        │  │ ➕        │      │
│  │Electricity│  │Group Check│      │
│  └───────────┘  └───────────┘      │
│                                     │
│  ┌───────────┐  ┌───────────┐      │
│  │ 📦        │  │ ⚙️        │      │
│  │ Archive   │  │ Settings  │      │
│  └───────────┘  └───────────┘      │
└─────────────────────────────────────┘
```

- 2-column grid
- Each cell: icon (40px, purple bg) + label (14px, bold)
- Card-style cells with rounded corners and subtle shadow
- Tap → navigate to screen
- lucide-react-native icons: `Building`, `LayoutGrid`, `UtensilsCrossed`, `Droplets`, `Zap`, `UserPlus`, `Archive`, `Settings`
