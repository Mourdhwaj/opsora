# Opsora — Master Feature List

## Purpose

This is the **single source of truth** for every feature in Opsora. Each feature is categorized by module, role, implementation status, and identified gaps. Use this to divide work into manageable tasks.

**Status Legend:**
- ✅ **Implemented** — Feature is built and functional in both API and frontend
- ⚠️ **Partial** — API exists but frontend is incomplete OR frontend exists but API is missing
- ❌ **Missing** — Feature is specified but not yet implemented
- 🔧 **Hardcoded** — Frontend uses mock/hardcoded data instead of real API calls

---

# 1. Authentication & Authorization

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 1.1 | Login (email/password) | POST /auth/login | /login page | ✅ | Rate limited (5/min/IP) |
| 1.2 | Registration (new owner) | POST /auth/register | — | ✅ | No frontend page yet |
| 1.3 | Get current user | GET /auth/me | middleware.ts | ✅ | |
| 1.4 | Logout | POST /auth/logout | auth-context.tsx | ✅ | Token revocation |
| 1.5 | Password reset | — | — | ❌ | Placeholder link only |
| 1.6 | Role-based route protection | — | middleware.ts | ✅ | owner/admin, staff, resident |

---

# 2. Owner/Admin Dashboard

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 2.1 | Dashboard overview (metrics) | GET /dashboard/overview | (dashboard)/dashboard/page.tsx | ✅ | 4 metric cards + activity feed |
| 2.2 | Occupancy trend chart | GET /dashboard/occupancy-trend | (dashboard)/dashboard/page.tsx | ⚠️ | API exists; frontend shows hardcoded fallback data |
| 2.3 | Revenue trend chart | — | (dashboard)/dashboard/page.tsx | 🔧 | Hardcoded fallback data, no API endpoint |
| 2.4 | Property-level dashboard | GET /dashboard/property/:id | — | ⚠️ | API exists; no dedicated frontend page |
| 2.5 | Revenue Intelligence Journey | — | — | ❌ | Monthly/yearly revenue tracking, growth % |
| 2.6 | Occupancy Journey | — | — | ❌ | Historical occupancy rates over time |
| 2.7 | Property selector/filter | — | (dashboard)/dashboard/page.tsx | ❌ | No property filter on dashboard |

---

# 3. Property Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 3.1 | Properties list | GET /properties | — | ⚠️ | API exists; no dedicated properties list page |
| 3.2 | Create property | POST /properties | — | ⚠️ | API exists; no create form in frontend |
| 3.3 | Update property | PUT /properties/:id | — | ⚠️ | API exists; no edit form in frontend |
| 3.4 | Delete property | DELETE /properties/:id | — | ⚠️ | API exists; no delete button in frontend |
| 3.5 | Property details | GET /properties/:id | — | ⚠️ | API exists; no details page |
| 3.6 | Property settings (WiFi, amenities) | PUT /properties/:id | — | ⚠️ | API supports it; no settings UI |

---

# 4. Floor Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 4.1 | Floors list | GET /properties/:id/floors | — | ⚠️ | API exists; used as dropdown in rooms page |
| 4.2 | Create floor | POST /floors | — | ⚠️ | API exists; auto-created with property |
| 4.3 | Update floor name | PUT /floors/:id | — | ❌ | API exists; no frontend UI |
| 4.4 | Delete floor | DELETE /floors/:id | — | ❌ | API exists; no frontend UI |

---

# 5. Room & Bed Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 5.1 | Rooms grid view (with tenants) | GET /rooms/with-tenants | (dashboard)/rooms/page.tsx | ✅ | Visual grid grouped by floor |
| 5.2 | Room detail panel | GET /rooms/:id/details | (dashboard)/rooms/page.tsx | ✅ | Side panel with beds + tenants |
| 5.3 | Tenant detail from room | GET /residents/:id/details | (dashboard)/rooms/page.tsx | ✅ | Click-through from room |
| 5.4 | Record payment from room | POST /payments/:id/pay | (dashboard)/rooms/page.tsx | ✅ | Payment modal |
| 5.5 | Create room | POST /rooms | — | ⚠️ | API exists; no create form in frontend |
| 5.6 | Update room | PUT /rooms/:id | — | ⚠️ | API exists; no edit form |
| 5.7 | Delete room | DELETE /rooms/:id | — | ⚠️ | API exists; no delete button |
| 5.8 | Room floor filter | — | (dashboard)/rooms/page.tsx | ✅ | Dropdown filter |
| 5.9 | Room gender/category system | — | (dashboard)/rooms/page.tsx | ✅ | Visual badges on room cards |
| 5.10 | Room create form (multi-step) | — | — | ❌ | Specified but not built |
| 5.11 | Bulk room creation | — | — | ❌ | Specified but not built |

---

# 6. Resident Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 6.1 | Residents list (paginated) | GET /residents | (dashboard)/residents/page.tsx | ✅ | Search, filter, pagination |
| 6.2 | Resident detail panel | GET /residents/:id/details | (dashboard)/residents/page.tsx | ✅ | Split view with payment history |
| 6.3 | Check-in (add resident) | POST /residents | (dashboard)/residents/page.tsx | ⚠️ | API exists; frontend has inline form but complex multi-step form is missing |
| 6.4 | Edit resident | PUT /residents/:id | — | ⚠️ | API exists; no edit UI |
| 6.5 | Checkout resident | POST /residents/:id/checkout | — | ⚠️ | API exists (with validation); no frontend UI |
| 6.6 | Resident status filter | — | (dashboard)/residents/page.tsx | ✅ | Active/All filter |
| 6.7 | Smart room allocation (AI) | POST /allocation/suggest | — | ⚠️ | API exists; no UI integration |
| 6.8 | Allocation rooms endpoint | GET /allocation/rooms | — | ⚠️ | API exists; no UI |
| 6.9 | Resident stay journey | — | — | ❌ | Stay duration, milestones, timeline |
| 6.10 | Resident documents upload | — | — | ❌ | Aadhaar, PAN, passport storage |
| 6.11 | Emergency contact display | — | — | ❌ | In detail panel |
| 6.12 | File upload | POST /upload | — | ⚠️ | API exists; no upload component |
| 6.13 | Serve uploaded files | GET /uploads/:filename | — | ✅ | Static serving |

---

# 7. Payments Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 7.1 | Payments list | GET /payments | (dashboard)/payments/page.tsx | ✅ | Search, status filter |
| 7.2 | Payment summary | GET /payments/summary | — | ⚠️ | API exists; no summary cards on payments page |
| 7.3 | Record payment | POST /payments/:id/pay | (dashboard)/rooms/page.tsx | ✅ | From room detail |
| 7.4 | Create payment record | POST /payments | — | ⚠️ | API exists; no frontend |
| 7.5 | Payment detail | GET /payments/:id | — | ❌ | No frontend |
| 7.6 | Invoice generation | POST /payments-proof/invoices/generate | — | ⚠️ | API exists; no frontend |
| 7.7 | Invoice list | GET /payments-proof/invoices | — | ⚠️ | API exists; no frontend |
| 7.8 | Billing calculation | POST /payments-proof/billing/calculate | — | ⚠️ | API exists; no frontend |
| 7.9 | Billing config | GET/PUT /payments-proof/billing-config | — | ⚠️ | API exists; no settings UI |
| 7.10 | Payment proof upload | POST /payments-proof/proofs | — | ⚠️ | API exists; no tenant upload UI |
| 7.11 | Payment proof list (my) | GET /payments-proof/proofs/my | — | ⚠️ | API exists; no tenant UI |
| 7.12 | Payment proof verification | POST /payments-proof/proofs/:id/verify | — | ⚠️ | API exists; no owner verification UI |
| 7.13 | Payment proof queue | GET /payments-proof/proofs | — | ⚠️ | API exists; no owner queue UI |
| 7.14 | Receipt generation | GET /payments-proof/receipts | — | ⚠️ | API exists; no print receipt UI |
| 7.15 | Payment reminders | POST /payments-proof/reminders | — | ⚠️ | API exists; no send reminder UI |
| 7.16 | Bulk reminders | POST /payments-proof/reminders/bulk | — | ⚠️ | API exists; no bulk send UI |
| 7.17 | Payment dashboard | GET /payments-proof/dashboard | — | ⚠️ | API exists; no dedicated UI |
| 7.18 | Payment activities log | GET /payments-proof/activities | — | ⚠️ | API exists; no frontend |
| 7.19 | Payment receipt print | — | — | ❌ | HTML receipt template |
| 7.20 | Revenue journey (monthly/yearly) | — | — | ❌ | Historical revenue tracking page |
| 7.21 | Tenant: My invoices | GET /payments-proof/my-invoices | — | ⚠️ | API exists; no tenant frontend |
| 7.22 | Tenant: Payment overview | GET /payments-proof/my-overview | — | ⚠️ | API exists; no tenant frontend |
| 7.23 | Proof detail | GET /payments-proof/proofs/:id | — | ⚠️ | API exists; no frontend |
| 7.24 | Tenant: My receipts | GET /payments-proof/receipts/my | — | ⚠️ | API exists; no tenant frontend |

---

# 8. Complaints / Service Desk

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 8.1 | Complaints list | GET /complaints | (dashboard)/complaints/page.tsx | ✅ | Search, filter by status/priority/category |
| 8.2 | Complaint detail | GET /complaints/:id | (dashboard)/complaints/page.tsx | ✅ | Side panel with comments |
| 8.3 | Create complaint | POST /complaints | (dashboard)/complaints/page.tsx | ✅ | Create modal with category/priority |
| 8.4 | Update status | PATCH /complaints/:id/status | (dashboard)/complaints/page.tsx | ✅ | Status changes |
| 8.5 | Add comment | POST /complaints/:id/comments | (dashboard)/complaints/page.tsx | ✅ | Public comments |
| 8.6 | Rate resolution | POST /complaints/:id/rate | — | ⚠️ | API exists; owner UI missing |
| 8.7 | Staff assignment | PATCH via status endpoint | (dashboard)/complaints/page.tsx | ✅ | Assign dropdown |
| 8.8 | Staff list (for assignment) | GET /staff/list | (dashboard)/complaints/page.tsx | ✅ | Dropdown with ticket counts |
| 8.9 | Stats cards (5 cards) | — | (dashboard)/complaints/page.tsx | ✅ | Total, New, In Progress, Resolved, Urgent |
| 8.10 | Status workflow progress bar | — | (dashboard)/complaints/page.tsx | ✅ | Visual progress |
| 8.11 | Activity timeline | — | (dashboard)/complaints/page.tsx | ✅ | Comments + status changes |
| 8.12 | Internal notes (owner/staff) | — | (dashboard)/complaints/page.tsx | ❌ | Specified but not implemented |
| 8.13 | SLA tracking indicators | — | — | ❌ | No SLA badges in owner UI |

---

# 9. Staff Complaint Handling

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 9.1 | Ticket list (with filters) | GET /staff/tickets | staff-portal/complaints/page.tsx | ✅ | Pagination, search, sort |
| 9.2 | Ticket detail | GET /staff/tickets/:id | staff-portal/complaints/page.tsx | ✅ | With SLA, comments, metadata |
| 9.3 | Public reply | POST /staff/tickets/:id/reply | staff-portal/complaints/page.tsx | ✅ | Visible to tenant |
| 9.4 | Internal work note | POST /staff/tickets/:id/work-note | staff-portal/complaints/page.tsx | ✅ | Not visible to tenant |
| 9.5 | Update status | PATCH /staff/tickets/:id/status | staff-portal/complaints/page.tsx | ✅ | Auto-assign on status change |
| 9.6 | Assign ticket | PATCH /staff/tickets/:id/assign | staff-portal/complaints/page.tsx | ⚠️ | API exists; assignment UI uses status endpoint |
| 9.7 | Accept ticket (self-assign) | Via status endpoint | staff-portal/complaints/page.tsx | ✅ | Auto-assigns to current staff |
| 9.8 | Mark as resolved | PATCH /staff/tickets/:id/status | staff-portal/complaints/page.tsx | ✅ | With resolution notes |
| 9.9 | Create ticket (staff) | POST /staff/tickets | staff-portal/complaints/page.tsx | ⚠️ | API exists; no create button in frontend |
| 9.10 | SLA status display | — | staff-portal/complaints/page.tsx | ⚠️ | API returns SLA data; UI shows basic indicators |
| 9.11 | SLA badge colors | — | — | ❌ | Green/amber/red based on time remaining |

---

# 10. Staff Tasks

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 10.1 | Tasks list | GET /staff/tasks | staff-portal/tasks/page.tsx | 🔧 | Frontend uses **hardcoded data**, not API |
| 10.2 | Complete task | PATCH /staff/tasks/:id/complete | staff-portal/tasks/page.tsx | 🔧 | Toggle exists but uses local state |
| 10.3 | Task filter (all/pending/done) | — | staff-portal/tasks/page.tsx | ✅ | Filter tabs |
| 10.4 | Create task (owner assigns) | — | — | ❌ | No task creation UI for owner |
| 10.5 | Task priority display | — | staff-portal/tasks/page.tsx | ✅ | Badge display |

---

# 11. Staff Daily Checklist

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 11.1 | Checklist display | — | staff-portal/checklist/page.tsx | ✅ | With progress bar |
| 11.2 | Toggle items | — | staff-portal/checklist/page.tsx | ✅ | Click to complete |
| 11.3 | Progress bar | — | staff-portal/checklist/page.tsx | ✅ | Visual percentage |
| 11.4 | Persistence (server-side) | — | staff-portal/checklist/page.tsx | ❌ | Uses local state only |
| 11.5 | Customizable checklist items | — | — | ❌ | Owner should configure items |

---

# 12. Staff Attendance

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 12.1 | Check-in | POST /staff/checkin | staff-portal/page.tsx | ⚠️ | API exists; dashboard shows basic widget |
| 12.2 | Check-out | POST /staff/checkout | staff-portal/page.tsx | ⚠️ | API exists; dashboard shows basic widget |
| 12.3 | Today's attendance display | — | staff-portal/page.tsx | ✅ | Widget on dashboard |
| 12.4 | Attendance history | — | staff-portal/page.tsx | ⚠️ | Profile endpoint returns history; limited UI |
| 12.5 | Attendance stats | — | — | ❌ | No attendance analytics |
| 12.6 | Late check-in detection | — | — | ❌ | No auto-detection |

---

# 13. Staff Profile & Performance

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 13.1 | Staff profile | GET /staff/profile | — | ⚠️ | API exists; no dedicated profile page |
| 13.2 | Performance stats | — | — | ⚠️ | API returns stats; no frontend |
| 13.3 | Performance journey | — | — | ❌ | Monthly trends, resolution rates |
| 13.4 | Achievement system | — | — | ❌ | Badges, streaks, milestones |
| 13.5 | Category expertise view | — | — | ❌ | Performance by complaint category |

---

# 14. Staff Residents View

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 14.1 | Residents list (read-only) | GET /residents | staff-portal/residents/page.tsx | ⚠️ | Frontend calls /staff/residents (non-existent endpoint) |
| 14.2 | Resident details | — | — | ❌ | Staff cannot view resident details |

---

# 15. IoT — Water Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 15.1 | Water tanks list | GET /water-tanks | — | ⚠️ | API exists; no list page |
| 15.2 | Create water tank | POST /water-tanks | — | ⚠️ | API exists; no create form |
| 15.3 | Update water tank | PUT /water-tanks/:id | — | ⚠️ | API exists; no edit form |
| 15.4 | Water readings | GET/POST /water-tanks/:id/readings | — | ⚠️ | API exists; no readings UI |
| 15.5 | Water analytics | GET /iot/analytics/water | (dashboard)/iot/water/page.tsx | ⚠️ | API exists; frontend shows hardcoded data |
| 15.6 | Water daily breakdown | GET /iot/analytics/water/daily | (dashboard)/iot/water/page.tsx | ⚠️ | API exists; frontend shows hardcoded data |
| 15.7 | Tank level widget | — | (dashboard)/iot/water/page.tsx | 🔧 | Hardcoded level display |
| 15.8 | Tanker orders | POST/PATCH /tanker-orders | — | ⚠️ | API exists; no frontend |
| 15.9 | Water consumption journey | — | — | ❌ | Historical consumption tracking |

---

# 16. IoT — Electricity Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 16.1 | Electricity meters list | GET /electricity-meters | — | ⚠️ | API exists; no list page |
| 16.2 | Create meter | POST /electricity-meters | — | ⚠️ | API exists; no create form |
| 16.3 | Update meter | PUT /electricity-meters/:id | — | ⚠️ | API exists; no edit form |
| 16.4 | Electricity readings | GET/POST /electricity-meters/:id/readings | — | ⚠️ | API exists; no readings UI |
| 16.5 | Electricity analytics | GET /iot/analytics/electricity | (dashboard)/iot/electricity/page.tsx | ⚠️ | API exists; frontend shows hardcoded data |
| 16.6 | Electricity daily breakdown | GET /iot/analytics/electricity/daily | (dashboard)/iot/electricity/page.tsx | ⚠️ | API exists; frontend shows hardcoded data |
| 16.7 | Cost trend display | — | (dashboard)/iot/electricity/page.tsx | 🔧 | Hardcoded cost data |
| 16.8 | Electricity consumption journey | — | — | ❌ | Historical cost tracking |

---

# 17. Food Management

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 17.1 | Food polls list | GET /food/polls | — | ⚠️ | API exists; no poll list page |
| 17.2 | Create poll | POST /food/polls | — | ⚠️ | API exists; no create form |
| 17.3 | Publish poll | POST /food/polls/:id/publish | — | ⚠️ | API exists; no publish button |
| 17.4 | Vote on poll | POST /food/polls/:id/vote | — | ⚠️ | API exists; no vote UI |
| 17.5 | Poll results | GET /food/polls/:id/results | — | ⚠️ | API exists; no results display |
| 17.6 | Finalize poll | POST /food/polls/:id/finalize | — | ⚠️ | API exists; no finalize UI |
| 17.7 | Meal attendance | POST/GET /food/attendance | — | ⚠️ | API exists; no attendance UI |
| 17.8 | Cook dashboard | GET /food/cook/today | — | ⚠️ | API exists; no cook view |
| 17.9 | Cook date view | GET /food/cook/date/:date | — | ⚠️ | API exists; no date picker |
| 17.10 | Ingredients list | GET /food/ingredients | — | ⚠️ | API exists; no UI |
| 17.11 | Create ingredient | POST /food/ingredients | — | ⚠️ | API exists; no UI |
| 17.12 | Ingredient formulas | GET /food/ingredients/formulas | — | ⚠️ | API exists; no UI |
| 17.13 | Food ratings | POST/GET /food/ratings | — | ⚠️ | API exists; no rating UI |
| 17.14 | Food analytics | GET /food/analytics | — | ⚠️ | API exists; no analytics page |
| 17.15 | Attendance trends | GET /food/analytics/attendance-trends | — | ⚠️ | API exists; no chart |
| 17.16 | Food recommendations | GET /food/analytics/recommendations | — | ⚠️ | API exists; no UI |
| 17.17 | Menu display (today) | GET /food/menus | (dashboard)/food/page.tsx | ⚠️ | API exists; frontend uses hardcoded mock data |
| 17.18 | Menu display (tenant) | GET /food/menus | tenant/food/page.tsx | ⚠️ | API exists; frontend uses hardcoded mock data |
| 17.19 | Weekly menu plan | GET /food/menus/upcoming | tenant/food/page.tsx | ❌ | Specified; no tab in frontend |
| 17.20 | Tenant vote on meal | — | tenant/food/page.tsx | 🔧 | Vote button exists; no API call |
| 17.21 | Poll detail | GET /food/polls/:id | — | ⚠️ | API exists; no frontend |
| 17.22 | Cook date view | GET /food/cook/date/:date | — | ⚠️ | API exists; no frontend |
| 17.23 | Create ingredient | POST /food/ingredients | — | ⚠️ | API exists; no frontend |
| 17.24 | Ingredient formulas | GET /food/ingredients/formulas | — | ⚠️ | API exists; no frontend |
| 17.25 | Food ratings list | GET /food/ratings | — | ⚠️ | API exists; no frontend |
| 17.26 | Food rating summary | GET /food/ratings/summary | — | ⚠️ | API exists; no frontend |
| 17.27 | Food recommendations | GET /food/analytics/recommendations | — | ⚠️ | API exists; no frontend |

---

# 18. Notifications

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 18.1 | Notifications list | GET /notifications | — | ⚠️ | API exists; no notification page |
| 18.2 | Mark as read | PATCH /notifications/:id/read | — | ⚠️ | API exists; no UI |
| 18.3 | Mark all as read | POST /notifications/read-all | — | ⚠️ | API exists; no UI |
| 18.4 | Activity logs | GET /activity-logs | — | ⚠️ | API exists; no audit log page |
| 18.5 | Notification bell (header) | — | layouts | ⚠️ | Icon exists; no count badge |
| 18.6 | Tenant notifications | GET /tenant/notifications | — | ⚠️ | API exists; no tenant notification page |

---

# 19. User Management (Owner/Admin)

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 19.1 | Users list | GET /users | — | ❌ | API exists; no users management page |
| 19.2 | Create user | POST /users | — | ❌ | API exists; no create form |
| 19.3 | Update user | PUT /users/:id | — | ❌ | API exists; no edit form |
| 19.4 | Delete (deactivate) user | DELETE /users/:id | — | ❌ | API exists; no delete button |
| 19.5 | User details | GET /users/:id | — | ❌ | API exists; no details page |

---

# 20. File Upload

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 20.1 | File upload | POST /upload | — | ⚠️ | API exists; no upload component |
| 20.2 | Serve uploaded files | GET /uploads/:filename | — | ✅ | Static serving |

---

# 21. WebSocket (Real-Time)

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 21.1 | WebSocket connection | WS /ws | — | ⚠️ | API exists with auth; no frontend connection |
| 21.2 | Broadcast to tenant | — | — | ⚠️ | Backend helper exists; not used anywhere |
| 21.3 | Real-time notifications | — | — | ❌ | WebSocket not connected to notification flow |

---

# 22. Settings & Configuration

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 22.1 | Billing configuration | GET/PUT /payments-proof/billing-config | — | ❌ | API exists; no settings page |
| 22.2 | Property settings | PUT /properties/:id | — | ❌ | API exists; no settings UI |
| 22.3 | Profile settings | — | — | ❌ | No settings page |
| 22.4 | App configuration | — | — | ❌ | No config page |

---

# 23. Reports & Analytics

| # | Feature | API | Frontend | Status | Notes |
|---|---------|-----|----------|--------|-------|
| 23.1 | Revenue report | — | — | ❌ | Monthly/yearly breakdown |
| 23.2 | Occupancy report | — | — | ❌ | Historical occupancy data |
| 23.3 | Complaint resolution report | — | — | ❌ | SLA compliance, resolution times |
| 23.4 | Staff performance report | — | — | ❌ | Tickets resolved, attendance |
| 23.5 | Food cost report | — | — | ❌ | Meal costs, attendance patterns |
| 23.6 | Export to PDF/CSV | — | — | ❌ | No export functionality |

---

# Summary Statistics

| Category | Total Features | ✅ Implemented | ⚠️ Partial | ❌ Missing | 🔧 Hardcoded |
|----------|---------------|----------------|------------|-----------|--------------|
| Authentication | 6 | 5 | 0 | 1 | 0 |
| Owner Dashboard | 7 | 1 | 1 | 5 | 1 |
| Property Management | 6 | 0 | 6 | 0 | 0 |
| Floor Management | 4 | 0 | 4 | 0 | 0 |
| Room & Bed Management | 11 | 5 | 4 | 2 | 0 |
| Resident Management | 11 | 2 | 4 | 5 | 0 |
| Payments Management | 20 | 2 | 12 | 6 | 0 |
| Owner Complaints | 13 | 8 | 2 | 3 | 0 |
| Staff Complaints | 11 | 7 | 3 | 1 | 0 |
| Staff Tasks | 5 | 1 | 0 | 2 | 2 |
| Staff Checklist | 5 | 3 | 0 | 2 | 0 |
| Staff Attendance | 6 | 2 | 2 | 2 | 0 |
| Staff Profile | 5 | 0 | 2 | 3 | 0 |
| Staff Residents | 2 | 0 | 1 | 1 | 0 |
| IoT Water | 9 | 0 | 7 | 2 | 1 |
| IoT Electricity | 8 | 0 | 6 | 2 | 1 |
| Food Management | 20 | 0 | 14 | 4 | 2 |
| Notifications | 6 | 0 | 6 | 0 | 0 |
| User Management | 5 | 0 | 0 | 5 | 0 |
| File Upload | 2 | 1 | 1 | 0 | 0 |
| WebSocket | 3 | 0 | 2 | 1 | 0 |
| Settings | 4 | 0 | 0 | 4 | 0 |
| Reports | 6 | 0 | 0 | 6 | 0 |
| **TOTAL** | **170** | **37** | **77** | **51** | **7** |

**Implementation: 22% complete | Partial: 45% | Missing: 30% | Hardcoded: 4%**

---

# Key Gaps Requiring Immediate Attention

## P0 — Critical (Blocks core functionality)

1. **Task Management (10.1-10.5)** — Staff tasks use hardcoded data, not connected to API
2. **Staff Residents Endpoint (14.1)** — Frontend calls non-existent `/staff/residents` endpoint
3. **Food Pages Hardcoded (17.17-17.20)** — Both owner and tenant food pages use mock data

## P1 — High Priority (Core features incomplete)

4. **Property Management UI (3.1-3.6)** — API fully built, no frontend pages
5. **Payment Proof Flow (7.10-7.13)** — API fully built, no tenant upload or owner verification UI
6. **User Management (19.1-19.5)** — API fully built, no admin page
7. **IoT Dashboards (15.5-15.9, 16.5-16.8)** — APIs built, frontends show hardcoded data
8. **Invoice Generation (7.6-7.8)** — API built, no UI
9. **Checkout Resident (6.5)** — API built with validation, no frontend UI

## P2 — Medium Priority (Enhances experience)

10. **Notifications UI (18.1-18.6)** — API built, no notification center
11. **Settings Pages (22.1-22.4)** — No settings/configuration UI
12. **Receipt Print (7.19)** — No printable receipt template
13. **Staff Profile Page (13.1-13.2)** — API exists, no dedicated page
14. **Journey Tracking Pages (2.5-2.7, 6.9, 13.3-13.5, 15.9, 16.8, 20.6)** — Historical tracking for all roles

## P3 — Nice to Have (Polish & completeness)

15. **Reports & Analytics (23.1-23.6)** — No report generation or export
16. **WebSocket Real-Time (21.1-21.3)** — Backend ready, frontend not connected
17. **Password Reset (1.5)** — Not implemented
18. **Weekly Menu Plan (17.19)** — Specified but not built

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
