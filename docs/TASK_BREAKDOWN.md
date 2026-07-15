# Opsora — Task Breakdown & Implementation Plan

## Purpose

This document converts the [Master Feature List](./MASTER_FEATURE_LIST.md) into **actionable, prioritized task cards** organized by implementation phase. Each task is scoped to be completable in a single work session (2-4 hours).

**Approach:** Build from the inside out — fix existing broken features first, then add missing frontend for existing APIs, then build new features.

---

# Phase 0: Bug Fixes & Quick Wins (Day 1)

> Fix things that are broken right now. Zero new features.

| Task ID | Task | Type | Est. | Files to Touch |
|---------|------|------|------|----------------|
| **F-0.1** | **Fix staff-portal/residents calling `/staff/residents`** — Change to `/residents` and update response parsing (response shape is `{ data: [], pagination: {} }` not `{ residents: [] }`) | Bug Fix | 1hr | `apps/web/src/app/staff-portal/residents/page.tsx` |
| **F-0.2** | **Connect staff tasks to real API** — Replace hardcoded `defaultTasks` with `GET /staff/tasks` API call. Remove entire mock data block. | Bug Fix | 1.5hr | `apps/web/src/app/staff-portal/tasks/page.tsx` |
| **F-0.3** | **Connect staff task completion to API** — Wire checkbox toggle to `PATCH /staff/tasks/:id/complete` | Bug Fix | 1hr | `apps/web/src/app/staff-portal/tasks/page.tsx` |
| **F-0.4** | **Connect owner food page to real API** — Replace mock `mockMenu` with `GET /food/menus`. Handle the data model (polls + menu items are separate). | Bug Fix | 2hr | `apps/web/src/app/(dashboard)/food/page.tsx` |
| **F-0.5** | **Connect tenant food page to real API** — Replace mock menu with `GET /food/menus`. Wire vote button to `POST /food/polls/:id/vote`. | Bug Fix | 2hr | `apps/web/src/app/tenant/food/page.tsx` |
| **F-0.6** | **Connect IoT water page to real API** — Replace hardcoded data with `GET /iot/analytics/water` and `GET /iot/analytics/water/daily` | Bug Fix | 2hr | `apps/web/src/app/(dashboard)/iot/water/page.tsx` |
| **F-0.7** | **Connect IoT electricity page to real API** — Replace hardcoded data with `GET /iot/analytics/electricity` and `GET /iot/analytics/electricity/daily` | Bug Fix | 2hr | `apps/web/src/app/(dashboard)/iot/electricity/page.tsx` |
| **F-0.8** | **Connect owner dashboard occupancy trend to API** — Use `GET /dashboard/occupancy-trend` instead of hardcoded fallback | Bug Fix | 1.5hr | `apps/web/src/app/(dashboard)/dashboard/page.tsx` |
| **F-0.9** | **Add revenue trend endpoint + connect dashboard** — Add `GET /dashboard/revenue-trend` to dashboard.ts and wire to owner dashboard | Bug Fix | 1.5hr | `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/api/src/routes/dashboard.ts` |

**Phase 0 Estimated Total: 13-15 hours (1.5-2 days)**

**Phase 0 Output:** All existing features work with real data. No more hardcoded mock data in production pages.

---

# Phase 1: Payment System Completion (Days 2-3)

> Complete the payment flow end-to-end. This is the revenue engine.

## 1A: Tenant Payment Flow

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **P-1.1** | **Tenant: Payment history page** — Enhance `/tenant/payments` to use `GET /tenant/payments` with summary cards (total paid, pending, collection rate) | Frontend | 1.5hr | — |
| **P-1.2** | **Tenant: Payment proof upload** — Build upload modal with file picker, transaction ID input, amount field. Call `POST /payments-proof/proofs` | Frontend | 2hr | — |
| **P-1.3** | **Tenant: My proofs list** — Show uploaded proofs with status (pending/confirmed/rejected). Call `GET /payments-proof/proofs/my` | Frontend | 1hr | P-1.2 |
| **P-1.3a** | **Tenant: My invoices list** — Show invoices with payment status. Call `GET /payments-proof/my-invoices` | Frontend | 1hr | — |
| **P-1.3b** | **Tenant: Payment overview** — Summary page with overview stats. Call `GET /payments-proof/my-overview` | Frontend | 1hr | — |

## 1B: Owner Payment Management

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **P-1.4** | **Owner: Payment summary cards** — Add 3 summary cards (Collected, Pending, Overdue) to payments page using `GET /payments/summary` | Frontend | 1hr | — |
| **P-1.5** | **Owner: Payment verification queue** — Build proof verification page showing pending proofs with screenshot preview, verify/reject buttons. Call `GET /payments-proof/proofs` + `POST /payments-proof/proofs/:id/verify` | Frontend | 2hr | — |
| **P-1.6** | **Owner: Invoice generation** — Build invoice generation modal with billing calculation. Call `POST /payments-proof/billing/calculate` + `POST /payments-proof/invoices/generate` | Frontend | 2hr | — |
| **P-1.7** | **Owner: Invoice list** — Build invoices page showing all generated invoices. Call `GET /payments-proof/invoices` | Frontend | 1hr | P-1.6 |
| **P-1.8** | **Owner: Billing configuration** — Build settings page for electricity/water/maintenance charges and food rates. Call `GET/PUT /payments-proof/billing-config` | Frontend | 1.5hr | — |
| **P-1.9** | **Owner: Send payment reminders** — Add "Send Reminder" button to pending payments. Call `POST /payments-proof/reminders` | Frontend | 1hr | — |
| **P-1.10** | **Owner: Bulk reminders** — Add "Send All Reminders" button. Call `POST /payments-proof/reminders/bulk` | Frontend | 1hr | P-1.9 |
| **P-1.11** | **Owner: Receipt generation/print** — Build printable receipt template. Call `GET /payments-proof/receipts` | Frontend | 1.5hr | — |

## 1C: Payment Backend (if needed)

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **P-1.12** | **Add revenue trend endpoint** — Add `GET /dashboard/revenue-trend` that returns monthly revenue data for charts (if `occupancy-trend` doesn't cover it) | Backend | 1hr | — |

**Phase 1 Output:** Complete payment lifecycle — tenant pays → uploads proof → owner verifies → receipt generated. Billing is configurable.

---

# Phase 2: Resident Management Completion (Days 4-5)

> Complete the resident lifecycle — check-in to checkout.

## 2A: Check-In Flow

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **R-2.1** | **Owner: Multi-step check-in form** — Build 7-step wizard (Personal → Identity → Employment → Emergency → Room → Financial → Food) calling `POST /residents` | Frontend | 3hr | — |
| **R-2.2** | **Owner: Room suggestion integration** — Add "Suggest Room" button in check-in step 5. Call `POST /allocation/suggest` and display ranked suggestions | Frontend | 1.5hr | R-2.1 |

## 2B: Resident Detail & Edit

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **R-2.3** | **Owner: Edit resident** — Add edit button to resident detail panel. Build edit modal. Call `PUT /residents/:id` | Frontend | 1.5hr | — |
| **R-2.4** | **Owner: Resident detail enhancements** — Add emergency contact, food preferences, document links to detail panel | Frontend | 1hr | — |
| **R-2.5** | **Owner: Checkout resident** — Add checkout button with confirmation dialog. Validate pending payments/complaints. Call `POST /residents/:id/checkout` | Frontend | 1.5hr | — |

## 2C: Property Management (New Pages)

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **R-2.6** | **Owner: Properties list page** — Build `/dashboard/properties` page with property cards showing beds, occupancy. Call `GET /properties` | Frontend | 1.5hr | — |
| **R-2.7** | **Owner: Create property form** — Modal with property details. Call `POST /properties` | Frontend | 1hr | R-2.6 |
| **R-2.8** | **Owner: Property detail page** — Build `/dashboard/properties/:id` with rooms, floors, stats. Call `GET /properties/:id` + `GET /dashboard/property/:id` | Frontend | 1.5hr | R-2.6 |
| **R-2.9** | **Owner: Room creation form** — Modal to add rooms with beds auto-generation. Call `POST /rooms` | Frontend | 1.5hr | — |
| **R-2.10** | **Owner: Room edit/delete** — Edit and delete buttons on room detail. Call `PUT/DELETE /rooms/:id` | Frontend | 1hr | — |

**Phase 2 Output:** Full resident lifecycle management. Property CRUD operations complete.

---

# Phase 3: Complaints & Service Desk Polish (Days 6-7)

> Enhance the existing complaint system with missing features.

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **C-3.1** | **Owner: Internal notes** — Add "Internal note" checkbox to owner comment input. Send `isInternal: true` | Frontend | 1hr | — |
| **C-3.2** | **Owner: Resolution rating display** — Show tenant ratings on resolved complaints in detail panel | Frontend | 1hr | — |
| **C-3.3** | **Staff: Create ticket** — Add "Create Ticket" button to staff complaints page. Call `POST /staff/tickets` | Frontend | 1hr | — |
| **C-3.4** | **SLA indicators** — Display SLA status badges (green/amber/red) on complaint cards. Use `slaStatus` from API response | Frontend | 1.5hr | — |
| **C-3.5** | **SLA timer countdown** — Show remaining time on ticket detail panel | Frontend | 1hr | C-3.4 |

**Phase 3 Output:** Complete service desk with internal notes, SLA tracking, and staff ticket creation.

---

# Phase 4: Staff Portal Completion (Days 8-9)

> Complete the staff experience.

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **S-4.1** | **Staff: Profile page** — Build `/staff-portal/profile` with stats, attendance history. Call `GET /staff/profile` | Frontend | 1.5hr | — |
| **S-4.2** | **Staff: Attendance history** — Show monthly attendance table on profile page. Data from `/staff/profile` response | Frontend | 1hr | S-4.1 |
| **S-4.3** | **Staff: Checklist persistence** — Add API endpoint to save/load checklist state, or use localStorage with date key | Backend+FE | 2hr | — |
| **S-4.4** | **Staff: Resident detail view** — Allow staff to view resident details (read-only). Call `GET /residents/:id/details` | Frontend | 1hr | — |
| **S-4.5** | **Owner: Task creation** — Build task assignment form for owners. Call `POST /tasks` (needs API endpoint) | Backend+FE | 2hr | — |

**Phase 4 Output:** Staff portal fully functional with profile, attendance tracking, and task management.

---

# Phase 5: User Management & Settings (Days 10-11)

> Admin capabilities.

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **U-5.1** | **Owner: Users list page** — Build `/dashboard/users` with user cards/table. Call `GET /users` | Frontend | 1.5hr | — |
| **U-5.2** | **Owner: Create user** — Modal with role selection. Call `POST /users` | Frontend | 1hr | U-5.1 |
| **U-5.3** | **Owner: Edit/deactivate user** — Edit modal + deactivate confirmation. Call `PUT/DELETE /users/:id` | Frontend | 1hr | U-5.1 |
| **U-5.4** | **Owner: App settings page** — Build `/dashboard/settings` with billing config, property defaults | Frontend | 2hr | — |
| **U-5.5** | **Owner: Notifications center** — Build notification dropdown/page with mark-as-read. Call `GET /notifications` + `PATCH /notifications/:id/read` | Frontend | 2hr | — |

**Phase 5 Output:** Admin panel with user management, settings, and notifications.

---

# Phase 6: IoT Dashboard Real Data (Days 12-13)

> Replace hardcoded IoT pages with real data visualization.

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **I-6.1** | **Owner: Water tank management** — Build tank list, create/edit forms. Call `GET/POST/PUT /water-tanks` | Frontend | 2hr | — |
| **I-6.2** | **Owner: Water analytics charts** — Build real charts with `GET /iot/analytics/water` data. Calendar date picker for daily view | Frontend | 2hr | — |
| **I-6.3** | **Owner: Electricity meter management** — Build meter list, create/edit forms. Call `GET/POST/PUT /electricity-meters` | Frontend | 2hr | — |
| **I-6.4** | **Owner: Electricity analytics charts** — Stock-market style charts with `GET /iot/analytics/electricity` | Frontend | 2hr | — |
| **I-6.5** | **Owner: Tanker orders** — Order management UI. Call `POST/PATCH /tanker-orders` | Frontend | 1.5hr | — |

**Phase 6 Output:** IoT dashboards showing real sensor data with proper charts.

---

# Phase 7: Food Management (Days 14-15)

> Complete the food module.

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **F-7.1** | **Owner: Poll creation** — Build poll creation form with options, dates. Call `POST /food/polls` | Frontend | 1.5hr | — |
| **F-7.2** | **Owner: Poll management** — List polls, publish, finalize. Call `GET/POST /food/polls/:id/publish|finalize` | Frontend | 1.5hr | F-7.1 |
| **F-7.3** | **Tenant: Vote on poll** — Show active polls with vote buttons. Call `POST /food/polls/:id/vote` | Frontend | 1hr | — |
| **F-7.4** | **Owner: Menu management** — Build menu creation/editing UI. Call `POST/GET /food/menus` | Frontend | 1.5hr | — |
| **F-7.5** | **Owner: Meal attendance tracking** — Show attendance counts per meal. Call `GET /food/attendance` | Frontend | 1hr | — |
| **F-7.6** | **Cook dashboard** — Dedicated view for kitchen staff. Call `GET /food/cook/today` | Frontend | 1hr | — |
| **F-7.7** | **Owner: Food analytics** — Attendance trends, popular meals, wastage. Call `GET /food/analytics` | Frontend | 1.5hr | — |

**Phase 7 Output:** Complete food management with polls, menus, attendance, and analytics.

---

# Phase 8: Journey Tracking Pages (Days 16-18)

> Build the historical journey pages for all three roles. New feature.

## 8A: Backend APIs

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **J-8.1** | **Owner: Revenue Journey API** — `GET /dashboard/revenue-journey` returning monthly trends, yearly comparison, property breakdown, alerts | Backend | 2hr | — |
| **J-8.2** | **Tenant: Stay Journey API** — `GET /tenant/journey` returning stay summary, payment history, complaint timeline, milestones | Backend | 2hr | — |
| **J-8.3** | **Staff: Performance Journey API** — `GET /staff/journey` returning resolution trends, attendance, achievements, category expertise | Backend | 2hr | — |

## 8B: Frontend Pages

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **J-8.4** | **Owner: Revenue Journey page** — Build `/dashboard/journey` with revenue charts, property comparison, YoY growth, alerts | Frontend | 3hr | J-8.1 |
| **J-8.5** | **Tenant: Stay Journey page** — Build `/tenant/journey` with stay summary, milestones, payment timeline, complaint history | Frontend | 2.5hr | J-8.2 |
| **J-8.6** | **Staff: Performance Journey page** — Build `/staff-portal/journey` with performance charts, attendance, achievements | Frontend | 2.5hr | J-8.3 |

## 8C: Navigation Integration

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **J-8.7** | **Add Journey link to Owner sidebar** | Frontend | 15min | J-8.4 |
| **J-8.8** | **Add Journey link to Tenant navigation** | Frontend | 15min | J-8.5 |
| **J-8.9** | **Add Journey link to Staff sidebar** | Frontend | 15min | J-8.6 |

**Phase 8 Output:** All three roles can see their complete journey with historical data and insights.

---

# Phase 9: Polish & Reports (Days 19-21)

> Final polish, exports, and advanced features.

| Task ID | Task | Type | Est. | Dependencies |
|---------|------|------|------|-------------|
| **Z-9.1** | **Receipt print template** — HTML receipt for A4 printing with property branding | Frontend | 1.5hr | — |
| **Z-9.2** | **PDF export** — Export payment reports, resident lists to PDF | Frontend | 2hr | — |
| **Z-9.3** | **CSV export** — Export data tables to CSV | Frontend | 1hr | — |
| **Z-9.4** | **WebSocket integration** — Connect frontend to WS for real-time notifications | Frontend | 2hr | — |
| **Z-9.5** | **Weekly menu plan tab** — Add tab to tenant food page for upcoming week | Frontend | 1hr | — |
| **Z-9.6** | **Mobile bottom navigation** — Add bottom nav bars for tenant and staff portals | Frontend | 2hr | — |
| **Z-9.7** | **Password reset flow** — Build forgot password → email → reset flow | Backend+FE | 3hr | — |

---

# Implementation Summary

| Phase | Focus | Days | Tasks | Key Deliverable |
|-------|-------|------|-------|----------------|
| **Phase 0** | Bug Fixes | 1 | 9 | All existing pages use real data |
| **Phase 1** | Payments | 2 | 12 | Complete payment lifecycle |
| **Phase 2** | Residents | 2 | 10 | Full resident management |
| **Phase 3** | Complaints | 1 | 5 | Enhanced service desk |
| **Phase 4** | Staff Portal | 2 | 5 | Complete staff experience |
| **Phase 5** | Admin | 2 | 5 | User management & settings |
| **Phase 6** | IoT | 2 | 5 | Real IoT dashboards |
| **Phase 7** | Food | 2 | 7 | Complete food module |
| **Phase 8** | Journeys | 3 | 9 | Historical tracking for all roles |
| **Phase 9** | Polish | 3 | 7 | Exports, real-time, mobile |
| **TOTAL** | | **21 days** | **74 tasks** | **Full product** |

---

# Dependency Graph

```
Phase 0 (Bug Fixes)
    ↓
Phase 1 (Payments) ←── Phase 2 (Residents) ←── Phase 3 (Complaints)
    ↓                      ↓                        ↓
Phase 4 (Staff)        Phase 5 (Admin)          Phase 6 (IoT)
    ↓                      ↓                        ↓
Phase 7 (Food) ←───────────┴────────────────────────┘
    ↓
Phase 8 (Journeys) ←── needs data from all above phases
    ↓
Phase 9 (Polish)
```

---

# Quick Start: What to Build First

If you want to make the biggest impact in the least time, do these 3 tasks today:

1. **F-0.1** (30min) — Fix staff residents page (broken right now)
2. **F-0.2** (1hr) — Connect staff tasks to real API
3. **F-0.4** (1hr) — Connect owner food page to real API

**Total: 2.5 hours → Fixes 3 broken features**

---

# After Quick Start: Next Priority

These 5 tasks unlock the most value:

1. **P-1.2** — Tenant payment proof upload (revenue flow)
2. **P-1.5** — Owner payment verification queue (revenue flow)
3. **R-2.5** — Checkout resident (resident lifecycle)
4. **C-3.3** — Staff create ticket (service desk)
5. **S-4.1** — Staff profile page (staff morale)

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
