# Opsora — Staff Portal Complete Specification

## Document Purpose

This document provides **comprehensive flow specifications** exclusively for the **Staff Portal** of Opsora. It covers every feature, API endpoint, UI component, and workflow that a staff member can access and use.

**Repository:** `https://github.com/Mourdhwaj/opsora.git`
**Architecture:** Turborepo monorepo with `apps/api` (Fastify + Drizzle ORM + SQLite) and `apps/web` (Next.js 16 App Router + Tailwind v4)
**Current Date:** July 2026
**Role Access:** `staff` | `owner` | `admin` (owners/admins have elevated access)

---

# Table of Contents

1. [Overview & Navigation Structure](#1-overview--navigation-structure)
2. [Staff Dashboard](#2-staff-dashboard)
3. [Attendance (Check-in / Check-out)](#3-attendance-check-in--check-out)
4. [My Profile & Performance](#4-my-profile--performance)
5. [Complaints / Ticket Management](#5-complaints--ticket-management)
6. [Ticket Detail & SLA Tracking](#6-ticket-detail--sla-tracking)
7. [Ticket Comments & Work Notes](#7-ticket-comments--work-notes)
8. [Ticket Assignment](#8-ticket-assignment)
9. [My Tasks](#9-my-tasks)
10. [Daily Checklist](#10-daily-checklist)
11. [Residents View](#11-residents-view)
12. [Staff List (Assignment Dropdown)](#12-staff-list-assignment-dropdown)
13. [SLA (Service Level Agreement) System](#13-sla-service-level-agreement-system)
14. [Mobile-First Design](#14-mobile-first-design)

---

# 1. Overview & Navigation Structure

## 1.1 Staff Portal Layout

The staff portal uses the `staff-portal` route group with a dedicated layout.

### Navigation Structure
```
┌─────────────────────────────────────────────────────────┐
│  🏠 Opsora Staff Portal                                │
├─────────────────────────────────────────────────────────┤
│  📊 Dashboard                                           │
│  🎫 Complaints                                          │
│  📋 My Tasks                                            │
│  ☑️ Daily Checklist                                     │
│  👥 Residents                                           │
├─────────────────────────────────────────────────────────┤
│  👤 Staff Name                                          │
│  🚪 Logout                                              │
└─────────────────────────────────────────────────────────┘
```

### Route Protection
```typescript
// apps/web/src/middleware.ts
const STAFF_PORTAL_ROUTES = ["/staff-portal"];

// Role-based access
if (role === "staff") {
  // Staff can only access /staff-portal/* routes
  if (!pathname.startsWith("/staff-portal")) {
    return NextResponse.redirect(new URL("/staff-portal", request.url));
  }
}
```

### Access Control
```typescript
// apps/api/src/routes/staff-portal.ts
function requireStaffAccess(request: any, reply: any): boolean {
  const role = request.user!.role;
  if (!['staff', 'owner', 'admin'].includes(role)) {
    reply.status(403).send({ error: 'Staff access required' });
    return false;
  }
  return true;
}
```

**Key Points:**
- Staff members can access the staff portal
- Owners and admins also have access (for oversight)
- Owners/admins see all tickets; staff see only their assigned tickets

---

# 2. Staff Dashboard

## 2.1 Dashboard Page

### User Story
As a staff member, I want to see a summary of my work items so that I can prioritize my day effectively.

### Page Route
```
GET /staff-portal
Component: apps/web/src/app/staff-portal/page.tsx
```

### API Endpoint
```
GET /staff/dashboard
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: {
  counts: {
    myOpen: number,           // Tickets assigned to me (open)
    allOpen: number,          // All open tickets
    inProgress: number,       // In-progress tickets
    resolvedToday: number,    // Resolved today
    slaBreached: number       // SLA breached tickets
  },
  categoryBreakdown: [{
    category: string,
    count: number
  }],
  priorityBreakdown: [{
    priority: string,
    count: number
  }],
  recentTickets: Complaint[], // Last 5 tickets
  myTasks: Task[],            // My assigned tasks
  attendance: {               // Today's attendance
    checkIn?: string,
    checkOut?: string,
    status: string
  }
}
```

### UI Components

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Staff Dashboard                                         │
│ Welcome, Rajesh Kumar                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ │ 📋           │ │ ⚠️           │ │ ✅           │ │ 👥           │
│ │ 5            │ │ 3            │ │ 12           │ │ 62           │
│ │ Pending      │ │ Open         │ │ Completed    │ │ Residents    │
│ │ Tasks        │ │ Complaints   │ │ Today        │ │              │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
│                                                         │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ 📋           │ │ ⚠️           │ │ ☑️           │     │
│ │ My Tasks     │ │ Complaints   │ │ Daily        │     │
│ │ View         │ │ Handle       │ │ Checklist    │     │
│ │ assigned     │ │ resident     │ │ Complete     │     │
│ │ tasks        │ │ issues       │ │ daily duties │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Today's Attendance                                      │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Checked in at 9:00 AM                            ││
│ │ ⏳ Not checked out yet                              ││
│ │ [Check Out]                                         ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│ My Recent Tickets                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🔧 TKT-001  AC not working   [in_progress]  2h ago ││
│ │ 📶 TKT-002  WiFi issues      [open]         1d ago ││
│ │ 🧹 TKT-003  Cleaning         [resolved]     2d ago ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Dashboard Cards
| Card | Icon | Description | Color |
|------|------|-------------|-------|
| Pending Tasks | 📋 | Tasks assigned to me | Accent |
| Open Complaints | ⚠️ | Unresolved complaints | Warning |
| Completed Today | ✅ | Resolved today | Success |
| Residents | 👥 | Total residents | Info |

### Quick Actions
| Action | Icon | Route |
|--------|------|-------|
| My Tasks | 📋 | `/staff-portal/tasks` |
| Complaints | ⚠️ | `/staff-portal/complaints` |
| Daily Checklist | ☑️ | `/staff-portal/checklist` |

---

# 3. Attendance (Check-in / Check-out)

## 3.1 Check-In

### User Story
As a staff member, I want to check in when I arrive at work so that my attendance is recorded.

### API Endpoint
```
POST /staff/checkin
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Request: {
  location?: string           // Optional location info
}

Response: { message: "Checked in successfully" }
```

### Step-by-Step Flow

1. **Staff Arrives at Work**
2. **Staff Opens Staff Portal**
3. **Staff Clicks "Check In"** button on dashboard
4. **API Call:** `POST /staff/checkin`
5. **Backend Processing:**
   - Validates staff has a linked staff profile
   - Checks if already checked in today
   - Creates or updates attendance record:
     - `checkIn: current timestamp`
     - `status: "present"`
6. **Response:** Success message
7. **UI Update:** Show "Checked in at {time}"

### Edge Cases
- **No staff profile linked:** Return 400 "No staff profile linked"
- **Already checked in:** Return 400 "Already checked in today"
- **No attendance record:** Create new record with check-in time

---

## 3.2 Check-Out

### User Story
As a staff member, I want to check out when I leave work so that my attendance is complete.

### API Endpoint
```
POST /staff/checkout
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Request: {
  location?: string
}

Response: { message: "Checked out successfully" }
```

### Step-by-Step Flow

1. **Staff Finishes Work**
2. **Staff Clicks "Check Out"** button on dashboard
3. **API Call:** `POST /staff/checkout`
4. **Backend Processing:**
   - Validates staff has checked in today
   - Validates not already checked out
   - Updates attendance record:
     - `checkOut: current timestamp`
5. **Response:** Success message
6. **UI Update:** Show "Checked out at {time}"

### Edge Cases
- **Not checked in:** Return 400 "Not checked in today"
- **Already checked out:** Return 400 "Already checked out today"

---

## 3.3 Attendance UI

**Dashboard Attendance Widget:**
```
┌─────────────────────────────────────────────────────────┐
│ Today's Attendance                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Checked in at 9:00 AM                            ││
│ │ ⏳ Not checked out yet                              ││
│ │                                                     ││
│ │ [Check Out]                                         ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ OR                                                     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⏳ Not checked in yet                               ││
│ │                                                     ││
│ │ [Check In]                                          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ OR                                                     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Checked in at 9:00 AM                            ││
│ │ ✅ Checked out at 5:30 PM                           ││
│ │ Duration: 8h 30m                                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 4. My Profile & Performance

## 4.1 Staff Profile

### User Story
As a staff member, I want to view my profile and performance stats so that I can track my work.

### API Endpoint
```
GET /staff/profile
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: {
  user: {
    id: string,
    email: string,
    fullName: string,
    role: string,
    phone: string
  },
  staff: {
    id: string,
    propertyId: string,
    fullName: string,
    phone: string,
    role: string,
    salary: number,
    shiftStart: string,
    shiftEnd: string,
    weeklyOff: string,
    isActive: boolean,
    joinedDate: string
  } | null,
  stats: {
    totalAssigned: number,
    resolved: number,
    open: number,
    avgResolutionHours: number
  },
  recentAttendance: StaffAttendance[]
}
```

### UI Components

**Profile Page:**
```
┌─────────────────────────────────────────────────────────┐
│ My Profile                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────┐                                                 │
│  │ RK │ Rajesh Kumar                                    │
│  └────┘ Maintenance Staff                               │
│                                                         │
│ 📋 Full Name                                            │
│    Rajesh Kumar                                         │
│                                                         │
│ ✉️ Email                                                │
│    staff@sunshinepg.com                                 │
│                                                         │
│ 📱 Phone                                                │
│    +919800000003                                        │
│                                                         │
│ 💼 Role                                                 │
│    Maintenance                                          │
│                                                         │
│ 🏠 Property                                             │
│    Sunshine PG                                          │
│                                                         │
│ ⏰ Shift                                                │
│    9:00 AM - 6:00 PM                                    │
│                                                         │
│ 📅 Weekly Off                                           │
│    Sunday                                               │
│                                                         │
│ 📅 Joined                                               │
│    January 10, 2026                                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Performance Stats                                       │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │     25      │ │     20      │ │     5       │        │
│ │  Assigned   │ │  Resolved   │ │   Open      │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                         │
│ Resolution Rate: 80%                                    │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ Recent Attendance                                       │
│ ┌─────────────────────────────────────────────────────┐│
│ │ July 13, 2026  │ ✅ 9:00 AM  │ ✅ 5:30 PM  │ 8.5h  ││
│ │ July 12, 2026  │ ✅ 9:15 AM  │ ✅ 5:45 PM  │ 8.5h  ││
│ │ July 11, 2026  │ ✅ 8:50 AM  │ ✅ 5:20 PM  │ 8.5h  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 5. Complaints / Ticket Management

## 5.1 Ticket List

### User Story
As a staff member, I want to see all complaints so that I can handle resident issues efficiently.

### Page Route
```
GET /staff-portal/complaints
Component: apps/web/src/app/staff-portal/complaints/page.tsx
```

### API Endpoint
```
GET /staff/tickets?page=1&limit=25&status=&priority=&category=&search=&myTickets=true
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: {
  data: Complaint[],
  pagination: { page, limit, total, totalPages }
}
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 25) |
| status | string | Filter by status (comma-separated for multiple) |
| priority | string | Filter by priority |
| category | string | Filter by category |
| assignedTo | string | Filter by assigned staff ID |
| search | string | Search in title, ticket number, description |
| myTickets | string | "true" to show only my tickets |
| sort | string | Sort field (updatedAt, createdAt, priority, status, category) |
| order | string | Sort order (asc, desc) |

### Response Enrichment
Each ticket in the response is enriched with:
- `assignedStaffName`: Name of assigned staff member
- `slaDue`: SLA due date/time
- `slaStatus`: "on_track" | "warning" | "breached" | "completed"
- `timeAgo`: Human-readable time since update

### UI Components

**Complaints Page Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Complaints                                              │
│ Handle resident issues and track resolution             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│ │     8       │ │     4       │ │     6       │        │
│ │    New      │ │ In Progress │ │  Resolved   │        │
│ └─────────────┘ └─────────────┘ └─────────────┘        │
│                                                         │
│ Filters: [Search] [Status ▼] [Priority ▼] [Category ▼] │
│          [My Tickets Only] [Sort: Updated ▼]            │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ New Tickets (3)                                     ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 🔧  TKT-001  [P1-URGENT]                           ││
│ │ AC not working in Room 205                          ││
│ │ 👤 Priya Sharma · 📍 Room 205 · 🕐 2h ago          ││
│ │ SLA: ⚠️ 2h remaining                                ││
│ │                                    [Accept]          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ In Progress (2)                                     ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 📶  TKT-002  [P2-HIGH]                             ││
│ │ WiFi connectivity issues                            ││
│ │ 👤 Amit Patel · 📍 Room 101 · 🕐 1d ago            ││
│ │ SLA: ✅ On track                                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Resolved (3)                                        ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 🧹  TKT-003  [P3-MEDIUM]                           ││
│ │ Cleaning schedule issue                             ││
│ │ 👤 Rahul Verma · 📍 Room 301 · 🕐 2d ago           ││
│ │ SLA: ✅ Completed                                   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Ticket Row Elements
- Category icon (emoji)
- Ticket number (monospace)
- Priority badge (color-coded)
- Status badge
- Title (bold, truncated)
- Tenant name with icon
- Room number with icon
- Created timestamp / time ago
- SLA indicator (if applicable)
- "Accept" button (for new tickets only)

### Ticket Grouping
| Group | Status | Count | Color |
|-------|--------|-------|-------|
| New Tickets | open | Shows count | Blue |
| In Progress | in_progress | Shows count | Amber |
| Resolved | resolved, closed | Shows count | Green |

---

## 5.2 Filter & Search

### Status Filter
```
[All] [Open] [In Progress] [Resolved] [Closed]
```

### Priority Filter
```
[All] [Urgent] [High] [Medium] [Low]
```

### Category Filter
```
[All] [Plumbing] [Electrical] [Cleaning] [Maintenance] [WiFi] [Food] [Security] [Noise] [Other]
```

### Search
- Searches in: title, ticket number, description
- Real-time filtering as user types

### My Tickets Toggle
- Toggle to show only tickets assigned to current staff member
- Useful for focusing on own workload

---

# 6. Ticket Detail & SLA Tracking

## 6.1 Ticket Detail

### User Story
As a staff member, I want to view full ticket details so that I can understand and resolve the issue.

### API Endpoint
```
GET /staff/tickets/:id
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: {
  id: string,
  ticketNumber: string,
  category: string,
  priority: string,
  title: string,
  description: string,
  status: string,
  assignedTo: string,
  assignedAt: string,
  resolvedAt: string,
  closedAt: string,
  resolutionNotes: string,
  createdAt: string,
  updatedAt: string,
  
  // Enriched fields
  comments: Comment[],
  assignedStaffInfo: {
    id: string,
    fullName: string,
    role: string,
    phone: string
  } | null,
  property: {
    name: string,
    address: string
  },
  creatorName: string,
  
  // SLA fields
  slaDue: string,              // SLA deadline
  slaStatus: string,           // "on_track" | "warning" | "breached" | "completed"
  slaRemainingHours: number    // Hours remaining until SLA breach
}
```

### UI Components

**Detail Panel:**
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to list              ✕                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ TKT-001  [P1-URGENT]                                   │
│ AC not working in Room 205                              │
│                                                         │
│ The AC unit is making a strange noise and not cooling   │
│ properly. It started yesterday evening.                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ SLA Status                                              │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⏰ Due: July 13, 2026 2:30 PM                       ││
│ │ ⚠️ 2h 15m remaining                                 ││
│ │ Status: ⚠️ Warning                                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Reported By                                             │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Priya Sharma                                     ││
│ │ 📍 Room 205 · Sunshine PG                           ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Status                                                  │
│ ● New ──▶ ● In Progress ──▶ ● Resolved ──▶ ● Closed    │
│   ✓           ✓                ○              ○         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [Mark as Resolved]                                      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Activity                                                │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🟢 Ticket created                                   ││
│ │    July 13, 2026 10:30 AM                           ││
│ │                                                     ││
│ │ 🟡 Assigned to Rajesh Kumar                         ││
│ │    July 13, 2026 11:00 AM                           ││
│ │                                                     ││
│ │ 💬 Rajesh Kumar: "On my way to check"               ││
│ │    July 13, 2026 11:15 AM                           ││
│ │                                                     ││
│ │ 🟡 [Internal] Checked AC filter                     ││
│ │    July 13, 2026 11:30 AM                           ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [✓] Internal note (not visible to tenant)               │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Reply to tenant...                            [Send]││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 7. Ticket Comments & Work Notes

## 7.1 Public Reply (Visible to Tenant)

### User Story
As a staff member, I want to reply to tenants so that they know the status of their complaint.

### API Endpoint
```
POST /staff/tickets/:id/reply
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Request: {
  comment: string
}

Response: {
  id: string,
  complaintId: string,
  userId: string,
  comment: string,
  isInternal: false,
  authorName: string,
  authorRole: string,
  createdAt: string
}
```

### Step-by-Step Flow

1. **Staff Types Reply** in comment input
2. **"Internal note" checkbox is UNCHECKED**
3. **Staff Clicks Send** or presses Enter
4. **API Call:** `POST /staff/tickets/:id/reply`
5. **Backend Processing:**
   - Validates comment is not empty
   - Creates comment record with `isInternal: false`
   - Updates ticket `updatedAt` timestamp
   - Creates activity log entry
6. **Response:** Created comment with author info
7. **UI Update:** Append comment to timeline

---

## 7.2 Internal Work Note (Not Visible to Tenant)

### User Story
As a staff member, I want to add internal notes so that I can track my work without exposing details to tenants.

### API Endpoint
```
POST /staff/tickets/:id/work-note
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Request: {
  note: string
}

Response: {
  id: string,
  complaintId: string,
  userId: string,
  comment: string,
  isInternal: true,
  authorName: string,
  authorRole: string
}
```

### Step-by-Step Flow

1. **Staff Types Note** in comment input
2. **"Internal note" checkbox is CHECKED**
3. **Staff Clicks Send**
4. **API Call:** `POST /staff/tickets/:id/work-note`
5. **Backend Processing:**
   - Validates note is not empty
   - Creates comment record with `isInternal: true`
   - Updates ticket `updatedAt`
   - Creates activity log entry
6. **Response:** Created note
7. **UI Update:** Append note to timeline (with "Internal" badge)

### Comment Input UI
```
┌─────────────────────────────────────────────────────────┐
│ [✓] Internal note (not visible to tenant)               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Add internal note...                          [Send]││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Comment Timeline

**Public Comment:**
```
┌─────────────────────────────────────────────────────────┐
│ 💬 Rajesh Kumar                                         │
│ On my way to check the AC unit                          │
│ July 13, 2026 11:15 AM                                 │
└─────────────────────────────────────────────────────────┘
```

**Internal Note:**
```
┌─────────────────────────────────────────────────────────┐
│ 💬 Rajesh Kumar  [Internal]                             │
│ Checked AC filter - needs replacement                  │
│ July 13, 2026 11:30 AM                                 │
└─────────────────────────────────────────────────────────┘
```

### Comment Types Comparison
| Type | Visibility | Badge | Use Case |
|------|------------|-------|----------|
| Public Reply | Tenant + Staff + Owner | None | Status updates, questions |
| Internal Note | Staff + Owner only | [Internal] | Notes, coordination, diagnostics |

---

# 8. Ticket Assignment

## 8.1 Assign Ticket

### User Story
As a staff member or owner, I want to assign tickets to specific staff members so that the right person handles the issue.

### API Endpoint
```
PATCH /staff/tickets/:id/assign
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Request: {
  staffId: string
}

Response: Updated complaint
```

### Step-by-Step Flow

1. **Staff/Owner Opens Ticket Detail**
2. **Clicks "Assign" or selects from dropdown**
3. **Staff List Dropdown Opens** (see Section 12)
4. **Selects Staff Member**
5. **API Call:** `PATCH /staff/tickets/:id/assign`
6. **Backend Processing:**
   - Validates ticket exists
   - Validates target staff member exists
   - Updates ticket:
     - `assignedTo: staffId`
     - `assignedAt: current timestamp`
     - `status: "in_progress"` (if was "open")
     - `updatedAt: current timestamp`
   - Creates activity log entry
   - Creates internal work note: "Assigned to {staffName} ({role})"
7. **Response:** Updated ticket
8. **UI Update:** Refresh ticket detail

### Edge Cases
- **Invalid staff ID:** Return 400 "Invalid staff member"
- **Ticket not found:** Return 404 "Ticket not found"
- **Already assigned:** Reassign (update assignedTo)

---

## 8.2 Accept Ticket (Self-Assign)

### User Story
As a staff member, I want to accept unassigned tickets so that I can take ownership of issues.

### Flow

1. **Staff Sees "Accept" Button** on unassigned ticket
2. **Staff Clicks "Accept"**
3. **API Call:** `PATCH /staff/tickets/:id/status`
   ```json
   {
     "status": "in_progress"
   }
   ```
4. **Backend Processing:**
   - Auto-assigns ticket to current staff member
   - Sets `assignedAt` timestamp
   - Updates status to "in_progress"
5. **Response:** Updated ticket
6. **UI Update:** Move ticket to "In Progress" group

---

# 9. My Tasks

## 9.1 Tasks List

### User Story
As a staff member, I want to view my assigned tasks so that I can complete my daily duties.

### Page Route
```
GET /staff-portal/tasks
Component: apps/web/src/app/staff-portal/tasks/page.tsx
```

### API Endpoint
```
GET /staff/tasks
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: Task[]
```

### Task Data Model
```typescript
{
  id: string;
  tenantId: string;
  propertyId: string;
  assignedTo: string;         // Staff ID
  title: string;
  description?: string;
  taskType: string;           // "maintenance" | "cleaning" | "inspection" | etc.
  priority: string;           // "high" | "medium" | "low"
  status: string;             // "pending" | "in_progress" | "completed"
  scheduledDate?: string;
  scheduledTime?: string;
  completedAt?: string;
  completionNotes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
```

### UI Components

**Tasks Page:**
```
┌─────────────────────────────────────────────────────────┐
│ My Tasks                                                │
│ Manage your assigned tasks                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [All] [Pending] [In Progress] [Completed]               │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✓  Morning floor inspection           [high] [done] ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ○  Check WiFi connectivity on all floors [medium]   ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ○  Restock cleaning supplies           [low] [pend] ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ◐  Verify water tank levels            [high] [prog]││
│ ├─────────────────────────────────────────────────────┤│
│ │ ○  Update visitor log                  [low] [pend] ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Task Row Elements
- Checkbox (toggle complete)
- Task title (strikethrough if completed)
- Priority badge (high/medium/low)
- Status badge (pending/in_progress/completed)

### Filter Tabs
| Tab | Description |
|-----|-------------|
| All | Show all tasks |
| Pending | Not yet started |
| In Progress | Currently working on |
| Completed | Finished tasks |

---

## 9.2 Complete Task

### API Endpoint
```
PATCH /staff/tasks/:id/complete
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Request: {
  completionNotes?: string
}

Response: { message: "Task completed" }
```

### Step-by-Step Flow

1. **Staff Clicks Checkbox** on task
2. **API Call:** `PATCH /staff/tasks/:id/complete`
3. **Backend Processing:**
   - Validates task exists
   - Updates task:
     - `status: "completed"`
     - `completedAt: current timestamp`
     - `completionNotes: optional notes`
4. **Response:** Success message
5. **UI Update:** Toggle checkbox, strikethrough title, update status badge

### Edge Cases
- **Task not found:** Return 404
- **Already completed:** Return 400 "Task already completed"

---

# 10. Daily Checklist

## 10.1 Checklist Page

### User Story
As a staff member, I want to complete a daily checklist so that I ensure all routine duties are performed.

### Page Route
```
GET /staff-portal/checklist
Component: apps/web/src/app/staff-portal/checklist/page.tsx
```

### UI Components

**Checklist Page:**
```
┌─────────────────────────────────────────────────────────┐
│ Daily Checklist                                         │
│ Complete your daily duties                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 5 of 8 completed                    63%            ││
│ │ ████████████████████░░░░░░░░░░░░░░░░               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Check all floor bathrooms are clean              ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ✅ Verify common area is tidy                       ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ✅ Check water levels in tanks                      ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ✅ Inspect entrance and security                    ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ✅ Review pending complaints                        ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ○  Check kitchen supplies                           ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ○  Verify visitor log is updated                    ││
│ ├─────────────────────────────────────────────────────┤│
│ │ ○  Report any maintenance issues                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Checklist Elements
- Progress bar with percentage
- Checkmark icon (filled if completed)
- Task description (strikethrough if completed)
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

### Progress Calculation
```typescript
const completed = items.filter(i => i.completed).length;
const progress = Math.round((completed / items.length) * 100);
```

### Note
- Currently uses local state (not persisted to server)
- Future enhancement: Save checklist state to database

---

# 11. Residents View

## 11.1 Residents List

### User Story
As a staff member, I want to view resident information so that I can assist them.

### Page Route
```
GET /staff-portal/residents
Component: apps/web/src/app/staff-portal/residents/page.tsx
```

### API Endpoint
```
GET /residents
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: {
  data: Resident[],
  pagination: { total, page, limit }
}
```

### UI Components

**Residents Page:**
```
┌─────────────────────────────────────────────────────────┐
│ Residents                                               │
│ View resident information                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Name         │ Room  │ Bed  │ Phone      │ Status   ││
│ ├─────────────────────────────────────────────────────┤│
│ │ 👤 Amit      │ 101   │ B1   │ +919800... │ active   ││
│ │ 👤 Priya     │ 103   │ B2   │ +919800... │ active   ││
│ │ 👤 Rahul     │ 201   │ B1   │ +919800... │ active   ││
│ │ 👤 Neha      │ 202   │ B1   │ +919800... │ active   ││
│ │ 👤 Vikram    │ 301   │ B2   │ +919800... │ active   ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Residents Table Columns
| Column | Description |
|--------|-------------|
| Name | Avatar + Full name |
| Room | Room number |
| Bed | Bed number |
| Phone | Contact number |
| Status | Active/Inactive badge |

### Staff Limitations
- Staff can only **view** resident information
- Staff **cannot** edit, add, or remove residents
- Limited fields compared to owner view (no financial details)

---

# 12. Staff List (Assignment Dropdown)

## 12.1 Get Staff List

### User Story
As a staff member or owner, I want to see all staff members so that I can assign tickets to the right person.

### API Endpoint
```
GET /staff/list
Headers: Authorization: Bearer <token>
Role: staff | owner | admin

Response: [{
  id: string,
  fullName: string,
  role: string,
  phone: string,
  openTicketCount: number    // Current open tickets assigned
}]
```

### UI Components

**Staff Dropdown:**
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
│ ┌─────────────────────────────────────────────────────┐│
│ │ 👤 Manoj Singh · Cleaning                           ││
│ │    📱 +919800000005 · 0 open tickets               ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Staff Row Elements
- Avatar with initials
- Full name
- Role (Maintenance, Security, Cleaning, etc.)
- Phone number
- Open ticket count (helps with workload balancing)

---

# 13. SLA (Service Level Agreement) System

## 13.1 SLA Configuration

### SLA Hours by Priority
```typescript
const SLA_HOURS: Record<string, number> = {
  urgent: 4,     // 4 hours
  high: 8,       // 8 hours
  medium: 24,    // 24 hours (1 day)
  low: 72,       // 72 hours (3 days)
};
```

### SLA Calculation
```typescript
function getSLADueDate(priority: string, createdAt: string): string {
  const hours = SLA_HOURS[priority] || 24;
  const created = new Date(createdAt).getTime();
  return new Date(created + hours * 3600000).toISOString();
}
```

## 13.2 SLA Status

### Status Values
| Status | Description | Color |
|--------|-------------|-------|
| on_track | More than 1 hour remaining | Green |
| warning | Less than 1 hour remaining | Amber |
| breached | Past SLA deadline | Red |
| completed | Ticket resolved/closed | Gray |

### SLA Status Calculation
```typescript
function getSLAStatus(slaDue: string, status: string): string {
  if (status === 'resolved' || status === 'closed') return 'completed';
  const now = Date.now();
  const due = new Date(slaDue).getTime();
  if (now > due) return 'breached';
  if (now > due - 3600000) return 'warning';  // Within 1 hour
  return 'on_track';
}
```

## 13.3 SLA UI Indicators

**SLA Badge on Ticket List:**
```
┌─────────────────────────────────────────────────────────┐
│ TKT-001  [P1-URGENT]                                   │
│ AC not working                                          │
│ SLA: ⚠️ 2h remaining                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TKT-002  [P2-HIGH]                                     │
│ WiFi issues                                             │
│ SLA: ✅ On track (6h remaining)                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ TKT-004  [P1-URGENT]                                   │
│ Water leak                                              │
│ SLA: 🔴 Breached (2h overdue)                           │
└─────────────────────────────────────────────────────────┘
```

**SLA Detail in Ticket View:**
```
┌─────────────────────────────────────────────────────────┐
│ SLA Status                                              │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ⏰ Due: July 13, 2026 2:30 PM                       ││
│ │ ⚠️ 2h 15m remaining                                 ││
│ │ Status: ⚠️ Warning                                  ││
│ └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

# 14. Mobile-First Design

## 14.1 Responsive Layout

The staff portal is designed mobile-first:

| Breakpoint | Layout |
|------------|--------|
| < 640px (Mobile) | Single column, stacked cards |
| 640-1024px (Tablet) | Two column grid |
| > 1024px (Desktop) | Full layout with sidebar |

## 14.2 Mobile Navigation

**Bottom Navigation Bar (Future):**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│                    [Content Area]                       │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  📊      🎫      📋      ☑️      👥                    │
│  Home  Tickets   Tasks  Check  Residents                │
└─────────────────────────────────────────────────────────┘
```

## 14.3 Touch-Friendly Design

- **Minimum tap target:** 44px x 44px
- **Spacing between elements:** 8px minimum
- **Font size:** 16px minimum for body text
- **Contrast ratio:** 4.5:1 for accessibility

## 14.4 Pull-to-Refresh

All list views support pull-to-refresh gesture on mobile.

## 14.5 Quick Actions

**Mobile Quick Actions:**
```
┌─────────────────────────────────────────────────────────┐
│ Quick Actions                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ ✅              │  │ ⏰              │               │
│ │ Check In        │  │ Check Out       │               │
│ └─────────────────┘  └─────────────────┘               │
│                                                         │
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ 📋              │  │ ⚠️              │               │
│ │ My Tasks        │  │ New Tickets     │               │
│ └─────────────────┘  └─────────────────┘               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# Appendix A: Staff API Routes Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff/dashboard` | Dashboard overview |
| GET | `/staff/profile` | Staff profile & stats |
| POST | `/staff/checkin` | Check in for today |
| POST | `/staff/checkout` | Check out for today |
| GET | `/staff/tickets` | List tickets (filtered) |
| GET | `/staff/tickets/:id` | Ticket detail |
| POST | `/staff/tickets` | Create new ticket |
| POST | `/staff/tickets/:id/reply` | Add public reply |
| POST | `/staff/tickets/:id/work-note` | Add internal note |
| PATCH | `/staff/tickets/:id/status` | Update ticket status |
| PATCH | `/staff/tickets/:id/assign` | Assign ticket |
| GET | `/staff/list` | List all staff |
| GET | `/staff/tasks` | List my tasks |
| PATCH | `/staff/tasks/:id/complete` | Complete task |

---

# Appendix B: Staff Frontend Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/staff-portal` | `StaffPortalDashboard` | Dashboard overview |
| `/staff-portal/complaints` | `StaffComplaintsPage` | Complaint handling |
| `/staff-portal/tasks` | `StaffTasksPage` | Task management |
| `/staff-portal/checklist` | `StaffChecklistPage` | Daily checklist |
| `/staff-portal/residents` | `StaffResidentsPage` | Resident view |

---

# Appendix C: Staff Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    STAFF PORTAL DATA FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │  Login   │────▶│Dashboard │────▶│Check-in  │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│       │                │                │                       │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ Profile  │     │Tickets   │     │  Tasks   │                │
│  └──────────┘     └──────────┘     └──────────┘                │
│       │                │                │                       │
│       │                │                │                       │
│       ▼                ▼                ▼                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │Attendance│     │ Ticket   │     │ Checklist│                │
│  └──────────┘     │ Detail   │     └──────────┘                │
│                   └──────────┘                                 │
│                        │                                       │
│                        ▼                                       │
│                   ┌──────────┐                                 │
│                   │ Comments │                                 │
│                   │ & Notes  │                                 │
│                   └──────────┘                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0
**Last Updated:** July 13, 2026
**Author:** Opsora Development Team
