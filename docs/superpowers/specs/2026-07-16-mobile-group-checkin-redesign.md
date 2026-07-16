# Mobile Group Check-in Redesign

**Date:** 2026-07-16
**Status:** Approved
**Scope:** Redesign the group check-in flow in the mobile app to use a card-based UI with visual bed grid, matching all web app fields.

---

## Problem

The current 5-step wizard (`apps/mobile/app/(details)/check-in.tsx`, 502 lines) has:
- Too many taps per resident (filling details one-by-one through tabs)
- Confusing step flow (Group → Rooms → Details → Financial → Review)
- Plain visual design that doesn't match the premium purple theme
- Fewer fields than the web version (missing identity docs, emergency contact, blood group, meal plan, etc.)

## Solution

A 4-step card-based flow with visual bed grid:

1. **Group** — Property + gender composition counters
2. **Bed Grid** — Visual floor/room/bed grid, tap to assign
3. **Resident Cards** — Swipeable card stack with collapsible sections, all web-parity fields
4. **Review** — Summary cards + submit

---

## Step 1: Group Composition

**UI:**
- Gradient header card: "New Group Check-in"
- Property selector: horizontal scrollable pills with `theme.colors.primary` active state
- Three counter rows (Male, Female, Couples) with large +/- buttons
- Each row: icon (lucide `User`/`User`/`Heart`), label, counter controls
- Bottom: "Total Residents: X" with purple accent

**Behavior:**
- Property must be selected before proceeding
- Counters: min 0, no max (API will validate)
- "Find Rooms" button triggers `POST /allocation/suggest-group` with `{ males, females, couples, propertyId }`
- Loading state: spinner on button
- Error: alert with API error message

**API:** `POST /allocation/suggest-group` → returns `{ combinations: RoomCombination[], bestFitIndex: number, message?: string }`

---

## Step 2: Visual Bed Grid

**UI:**
- Scrollable list grouped by floor → room → beds
- Floor: section header with floor number
- Room: card showing room number, type, rent per bed, vacant count
- Beds: grid of tappable squares inside room card

**Bed states:**
| State | Visual | Interaction |
|-------|--------|-------------|
| Vacant (unselected) | Light surface, dashed border, bed number | Tap to assign |
| Vacant (selected) | `theme.colors.primary` bg, white text, pulse animation | Tap to unassign |
| Occupied | Gray bg, lock icon | Not tappable |
| Gender-locked | Subtle overlay | Not tappable (opposite gender assigned in room) |

**Interaction:**
- Tap vacant bed → highlights purple + creates resident card entry with pre-filled gender
- Tap again → unassigns (removes resident card)
- Floating bottom badge: "X/Y beds assigned" with progress bar
- If no rooms match: warning card with partial allocation message

**Components to create:**
- `BedGrid.tsx` — floor/room/bed grid layout
- `BedSquare.tsx` — individual bed with state handling
- `FloorSection.tsx` — floor group header

---

## Step 3: Resident Cards (Swipeable Stack)

**UI:**
- Top: horizontal scrollable row of resident chips (avatar/icon + name/bed number)
  - Empty circle = incomplete, green checkmark = all required fields filled
- Active card: full-width scrollable form card

**Card sections (collapsible):**

| Section | Fields | Default state |
|---------|--------|---------------|
| **Personal** | Full Name*, Phone*, Email, Gender (locked), DOB, Blood Group | Expanded |
| **Identity** | Aadhaar Number, PAN Number, Passport Number | Collapsed |
| **Employment** | Occupation, Company Name, College Name, Work Address | Collapsed |
| **Emergency** | Emergency Contact Name, Phone, Relation | Collapsed |
| **Financial** | Move-in Date (default: today), Rent Amount (pre-filled from bed), Deposit Paid | Collapsed |
| **Food** | Food Preference (Veg/Non-Veg/Vegan), Meal Plan (Lunch/Dinner/Both), Special Dietary | Collapsed |

**Navigation:**
- Left/right arrow buttons at bottom
- Progress bar: "Resident 2 of 5 — 3/6 sections complete"
- Tapping a resident chip jumps to that card

**Validation:**
- Required: Full Name, Phone (red border + inline error)
- Missing required fields → card marked incomplete (yellow icon)
- Gender is read-only (set from bed assignment)

**Components to create:**
- `ResidentCard.tsx` — single resident form card
- `CollapsibleSection.tsx` — expandable section wrapper
- `ResidentChipBar.tsx` — horizontal resident selector

---

## Step 4: Review & Submit

**UI:**
- Summary bar at top: "5 residents · ₹40,000/month total · ₹20,000 deposits"
- Scrollable list of resident summary cards

**Summary card:**
```
┌─────────────────────────────────┐
│ 👤 Name                 ✓/⚠    │
│ 📱 Phone · Gender               │
│ 🏠 Room · Bed · ₹rent/mo       │
│ 💼 Occupation (if filled)       │
│ 🍽 Food pref (if filled)        │
└─────────────────────────────────┘
```

- Green checkmark = all required fields filled
- Yellow warning = missing required fields, shows "Missing: X"
- Tap card → jumps back to Step 3 on that resident

**Submit:**
- Full-width green button: "Check In N Residents"
- Loading spinner during API call
- On success: alert "N resident(s) checked in!" → navigate to `/(owner)/residents`
- On error: inline error card with retry button (not alert)

**API:** `POST /residents/checkin-group` with `{ propertyId, moveInDate, residents: [...] }`

---

## Files to modify

| File | Action | Description |
|------|--------|-------------|
| `apps/mobile/app/(details)/check-in.tsx` | **Rewrite** | Replace 502-line wizard with 4-step card-based flow |
| `apps/mobile/src/components/checkin/BedGrid.tsx` | **Create** | Visual bed grid with floor/room/bed layout |
| `apps/mobile/src/components/checkin/BedSquare.tsx` | **Create** | Individual bed square with state handling |
| `apps/mobile/src/components/checkin/ResidentCard.tsx` | **Create** | Swipeable resident form card with collapsible sections |
| `apps/mobile/src/components/checkin/CollapsibleSection.tsx` | **Create** | Expandable section wrapper |
| `apps/mobile/src/components/checkin/ResidentChipBar.tsx` | **Create** | Horizontal resident selector with completion status |
| `apps/mobile/src/components/checkin/ReviewCard.tsx` | **Create** | Summary card for review step |
| `apps/mobile/src/components/index.ts` | **Update** | Export new checkin components |

## Types

Reuse existing types from `apps/mobile/src/types/index.ts`:
- `GroupCheckinResident` — extend with new fields (dateOfBirth, bloodGroup, aadhaarNumber, panNumber, passportNumber, collegeName, emergencyName, emergencyPhone, emergencyRelation, moveInDate, mealPlan, specialDietary)
- `RoomCombination`, `RoomAssignment`, `AllocationRoom` — unchanged

## API Endpoints (existing, no changes)

- `POST /allocation/suggest-group` — room suggestions
- `POST /residents/checkin-group` — create residents + mark beds occupied

## Visual Design

- All colors use `theme.colors.*` tokens
- All text uses `theme.font.*` families
- Cards use `theme.borderRadius.lg` and `theme.spacing.*`
- Primary actions use `theme.colors.primary` purple
- Success state uses `theme.colors.success` green
- Warning state uses `theme.colors.warning` yellow
- Consistent with existing purple gradient theme
