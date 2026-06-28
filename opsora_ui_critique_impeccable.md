
# OPSORA — CRITICAL UI/UX REVIEW & IMPROVEMENT ROADMAP
## Using Impeccable Design Skills for Anti-Pattern Detection

**Prepared for:** Mourdhwaj | **Date:** 2026-06-28
**Scope:** Frontend critique, user journey flaws, anti-pattern analysis, actionable recommendations

---

## PART 1: WHAT'S WRONG WITH OPSORA RIGHT NOW

### 1.1 THE FRONTEND DOESN'T EXIST

Your `apps/web` directory is a **Git submodule** with zero actual code. There is no:
- Login page
- Dashboard
- Resident management UI
- Payment verification interface
- Complaint ticket system
- IoT charts
- Food poll screens
- Staff portal
- Tenant (resident) mobile view

**What a client sees when they open your repo:** A backend API with 40+ tables and no way to interact with it. They cannot demo anything. They cannot visualize the product. They see code, not a business tool.

**This is a deal-breaker.** No Indian PG owner will sign up for an API. They need a screen they can tap on their phone while standing in their property.

---

### 1.2 THE BACKEND-ONLY MINDSET

Your system design document is 50,000+ words. Your backend has 17 route modules. Your database has 40 tables. But all of this is invisible to the person who matters — the **PG owner who pays the subscription**.

The owner doesn't care about:
- Your Drizzle ORM schema
- Your JWT token revocation strategy
- Your SQLite WAL mode configuration
- Your Turborepo monorepo structure

The owner cares about:
- "Can I see who's paid and who hasn't?"
- "Can I check water levels without walking to the tank?"
- "Can I send a rent reminder in 2 taps?"
- "Can my cook see how many people are eating today?"

**Your product is built for engineers, not for users.**

---

## PART 2: CRITICAL USER JOURNEY FLAWS

### 2.1 THE CHECKOUT FLOW IS DANGEROUS

**Current backend behavior:**
```
POST /residents/:id/checkout
→ Sets status to 'checked_out'
→ Frees the bed
→ Done. No questions asked.
```

**What's missing:**
- No financial reconciliation (pending rent? deposit refund?)
- No complaint closure check (leave with open tickets?)
- No asset return verification (keys? furniture?)
- No checkout receipt generation
- No notification to the resident
- No audit trail of why they left

**Real-world scenario:** A resident with ₹45,000 pending rent and 3 open complaints clicks "checkout." The system says "Done!" The owner loses money and the complaints vanish into thin air.

**What the UI must do:**
1. Show a **warning modal** before checkout with:
   - Financial summary (rent due, deposit paid, refund calculation)
   - List of open complaints
   - Require typing "CHECKOUT" to confirm if issues exist
   - Generate a checkout receipt PDF

---

### 2.2 PAYMENT VERIFICATION HAS NO SAFEGUARDS

**Current backend behavior:**
```
POST /payments-proof/proofs/:id/verify
→ Updates status to 'approved' or 'rejected'
→ Done. No preview. No double-check.
```

**What's missing:**
- No screenshot preview before approval
- No amount mismatch detection (invoice says ₹8,000, proof shows ₹5,000)
- No fraud indicators (same screenshot uploaded twice?)
- No batch verification (approve 10 payments one by one?)
- No undo capability

**Real-world scenario:** An owner is tired at 11 PM. They click "approve" on a payment proof. The screenshot was from last month. The resident never actually paid. The owner can't undo it.

**What the UI must do:**
1. Show the **payment screenshot prominently** in the verification modal
2. Highlight amount mismatches in red
3. Show invoice amount vs. claimed amount side-by-side
4. Require a reason for rejection
5. Show "This action cannot be undone" warning
6. Allow batch actions with a checklist

---

### 2.3 INVOICE GENERATION IS BLIND

**Current backend behavior:**
```
POST /payments-proof/invoices/generate
→ Creates invoices for ALL active residents
→ No preview. No confirmation. No undo.
```

**What's missing:**
- No "who will be affected?" preview
- No "how much total revenue?" calculation
- No "some already have invoices" warning
- No scheduling (generate on 1st of every month automatically?)
- No customization per resident (different rent amounts?)

**Real-world scenario:** An owner clicks "generate invoices" and 28 residents get billed. But 5 of them had already paid cash. Now they have duplicate invoices. The owner looks unprofessional.

**What the UI must do:**
1. Show a **confirmation modal** with:
   - Number of residents affected
   - Number already invoiced (will be skipped)
   - Total invoice value
   - Require typing "GENERATE" to confirm

---

### 2.4 ROOM ALLOCATION IS INVISIBLE

**Current backend behavior:**
```
POST /allocation/suggest
→ Returns JSON array of room suggestions
→ No visual floor map
→ No drag-and-drop
→ No "this room is male-only" indicator
```

**What's missing:**
- No visual floor plan (Floor 1 → Room 101, 102, 103...)
- No color-coding by gender (blue for male, pink for female, green for mixed)
- No vacancy visualization (green bed = vacant, red = occupied)
- No "couple room" indicator
- No budget filter slider

**Real-world scenario:** A new resident arrives. The owner opens the app, sees a JSON list of room numbers, and has no idea which floor or which room type. They walk around the building with a notebook instead.

**What the UI must do:**
1. Show a **visual floor map** with:
   - Each floor as a horizontal row
   - Each room as a card with bed count
   - Color-coded by gender
   - Occupied beds shown as filled circles
   - Tap to allocate, drag to move

---

### 2.5 COMPLAINTS HAVE NO URGENCY VISUALIZATION

**Current backend behavior:**
```
GET /complaints
→ Returns list with status and priority
→ No SLA timer
→ No "this is 3 hours overdue" indicator
```

**What's missing:**
- No visual urgency (red pulse for overdue urgent tickets)
- No SLA countdown ("4 hours left to resolve")
- No assignment visibility ("who is working on this?")
- No resident satisfaction rating after resolution
- No escalation path (auto-notify owner if not resolved in 24h)

**Real-world scenario:** An AC is broken in summer. It's marked "urgent." 3 days pass. No one knows it's still open because the list looks the same as a "low" priority "light bulb change" ticket.

**What the UI must do:**
1. Show **urgent complaints at the top** with a pulsing red border
2. Show SLA timer ("Due in 4 hours" / "Overdue by 12 hours")
3. Show assigned staff photo and name
4. Auto-escalate to owner after SLA breach

---

### 2.6 FOOD MANAGEMENT IS A SPREADSHEET

**Current backend behavior:**
```
POST /food/polls
→ Creates a poll with options
→ Residents vote
→ Cook sees numbers
```

**What's missing:**
- No "what's cooking today?" widget for residents
- No meal photo upload ("this is what lunch looks like")
- No ingredient calculator with market prices
- No waste tracking ("we cooked for 50, 35 ate, 15 wasted")
- No dietary restriction flags (allergies, Jain food, etc.)

**Real-world scenario:** The cook prepares 50 meals. Only 30 residents show up. 20 meals go to waste. No one tracks this. The owner keeps paying for 50.

**What the UI must do:**
1. Show **today's menu** prominently on the resident dashboard
2. Allow meal photo uploads
3. Show attendance prediction vs. actual
4. Calculate ingredient costs automatically
5. Track waste per meal

---

## PART 3: THE "AI-GENERATED" LOOK PROBLEM

### 3.1 WHAT MAKES UI LOOK AI-GENERATED

Based on Impeccable's 44 anti-pattern detector rules, these are the tells that scream "an AI made this":

| Anti-Pattern | Why It Looks AI | What To Do Instead |
|-------------|-----------------|-------------------|
| **Inter font everywhere** | Every AI defaults to Inter | Use Inter for UI + Playfair Display for headings |
| **Purple-to-blue gradients** | Default AI color palette | Use warm saffron (#FF9933) + deep green (#138808) for Indian context |
| **Cards nested in cards** | AI loves containers | Use flat surfaces with subtle shadows, not card-ception |
| **Gray text on colored backgrounds** | Poor contrast choice | Use dark charcoal (#2D2D2D) on warm cream (#FFF8F0) |
| **Rounded-square icon tiles** | Default AI component | Use circular avatars with initials, not generic icons |
| **Everything centered** | AI defaults to symmetry | Left-align text, use asymmetric layouts |
| **Bounce/elastic animations** | Feels dated and playful | Use subtle fade + slide, no bounce |
| **Pure black (#000000)** | AI doesn't understand tinting | Use charcoal (#2D2D2D) instead |
| **Identical card grids** | 10 features in identical boxes | Vary card sizes, use featured cards |
| **Side-stripe borders** | Common AI layout pattern | Use full borders or no borders, not accent stripes |
| **Gradient text on headings** | Overused AI effect | Use solid colors with weight variation |
| **Glassmorphism** | Dated trend | Use solid backgrounds with subtle depth |
| **Dark mode with glowing accents** | Cyberpunk AI default | Use warm dark mode, not neon |

### 3.2 HOW TO MAKE OPSORA LOOK HUMAN-DESIGNED

**Principle 1: Contextual Color**
Don't use generic Tailwind colors. Use colors that mean something in the Indian PG context:
- **Saffron (#FF9933)** — warmth, hospitality, Indian identity
- **Deep Green (#138808)** — growth, money, trust
- **Warm Cream (#FFF8F0)** — paper-like, familiar, not sterile white
- **Charcoal (#2D2D2D)** — readable, not harsh black

**Principle 2: Typography With Personality**
- Use **Inter** (300/400/500/700) for UI text
- Use **Playfair Display** for headings (gives editorial, trustworthy feel)
- Use **negative letter-spacing (-0.02em)** on large numbers (revenue, occupancy %)
- Never use the same weight for everything — vary between Light for labels, Medium for data, Bold for actions

**Principle 3: Imperfect Spacing**
AI generates perfect grids. Humans design with rhythm:
- Use 8px base grid but break it intentionally
- Some cards should be taller, some shorter
- Use whitespace generously — Indian UIs are typically cluttered, yours should feel calm
- Don't align everything to a rigid grid

**Principle 4: Domain-Specific Visual Language**
- Resident cards should feel like **ID cards** (photo, name, room number, status badge)
- Payment cards should feel like **receipts** (amount, date, status stamp)
- Complaint cards should feel like **tickets** (ticket number, priority color, assignee)
- Room cards should feel like **floor plans** (bed layout, occupancy dots)

**Principle 5: Micro-Copy That Sounds Human**
| AI-Generated | Human-Written |
|-------------|---------------|
| "No data found" | "Nothing here yet — add your first resident!" |
| "Payment successful" | "₹8,000 received from Amit. Receipt sent to his WhatsApp." |
| "Error occurred" | "Oops — couldn't save. Check your internet and try again." |
| "Delete confirmation" | "This will permanently remove Rahul's record. His payment history stays." |
| "Loading..." | "Crunching the numbers..." |
| "Invalid credentials" | "Email or password doesn't match. Try again?" |
| "Checkout complete" | "Amit has checked out. Refund of ₹4,900 processed. Receipt generated." |

---

## PART 4: HOW TO USE IMPECCABLE IN YOUR PROJECT

### 4.1 WHAT IS IMPECCABLE?

Impeccable is an open-source design skill pack for AI coding agents (Claude Code, Cursor, Codex, etc.) created by Paul Bakaus. It extends Anthropic's original `frontend-design` skill with:

- **23 design commands** (polish, audit, critique, distill, animate, bolder, quieter, etc.)
- **44 deterministic anti-pattern detectors** (runs without LLM, no API key needed)
- **Live browser iteration** (point at any element, generate 3 variants, pick one)
- **Design hook** (auto-runs on file edits to catch AI slop before it ships)

### 4.2 INSTALLATION FOR OPSORA

Run this from your project root:
```bash
npx impeccable install
```

This will:
1. Detect your AI harness (Claude Code, Cursor, Codex)
2. Install the skill into `.claude/skills/impeccable/` or `.cursor/skills/impeccable/`
3. Set up the design hook (auto-runs on file edits)
4. Create `.impeccable/config.local.json` with your dev server URLs

### 4.3 THE WORKFLOW YOU SHOULD FOLLOW

**Step 1: Initialize Design Context**
```
/impeccable init
```
This asks:
- Is this a **brand** (marketing/landing) or **product** (app/dashboard) surface? → Choose **product**
- What's your audience? → "Indian PG/Hostel owners and residents"
- What's your brand voice? → "Trustworthy, warm, efficient"
- Anti-references? → "Don't look like Zomato/Swiggy (too playful), don't look like Tally (too corporate)"

It writes:
- `PRODUCT.md` — audience, voice, anti-references
- `DESIGN.md` — color tokens, typography, component patterns

**Step 2: Shape Before Building**
```
/impeccable shape the owner dashboard
```
This plans the UX/UI before writing code. It outputs:
- Wireframe description
- Component hierarchy
- Interaction flow
- Color/spacing decisions

**Step 3: Build, Then Audit**
After your AI builds a page:
```
/impeccable audit src/app/dashboard
```
This scores your UI out of 20 across 5 dimensions:
- Accessibility (contrast, focus states, ARIA)
- Performance (image sizes, bundle bloat)
- Responsive (breakpoint failures)
- Theming (design token consistency)
- Anti-patterns (AI slop detection)

**Step 4: Polish**
```
/impeccable polish src/app/dashboard
```
This does the final visual pass:
- Fixes typography hierarchy
- Adjusts spacing rhythm
- Removes decorative anti-patterns
- Aligns with design system

**Step 5: Harden**
```
/impeccable harden src/app/residents
```
This adds:
- Error handling for all mutations
- Text overflow protection
- Empty states
- Loading skeletons
- Edge case handling

**Step 6: Onboard**
```
/impeccable onboard
```
This designs:
- First-run flow for new owners
- Empty states for every list
- Tooltips for complex features
- Activation paths ("Complete your profile" → "Add first resident" → "Generate first invoice")

### 4.4 THE 23 COMMANDS & WHEN TO USE THEM

| Command | When to Use | For Opsora Specifically |
|---------|------------|------------------------|
| `/impeccable init` | Start of every project | Already done — defines PG owner audience |
| `/impeccable shape` | Before building any new page | Use before building dashboard, resident list, payment flow |
| `/impeccable craft` | Full build from scratch | Use when building the entire frontend |
| `/impeccable critique` | After first draft | Review dashboard hierarchy, complaint priority visibility |
| `/impeccable audit` | After every page build | Check contrast, responsive, anti-patterns |
| `/impeccable polish` | Before showing to client | Final pass on all pages |
| `/impeccable bolder` | Design looks boring | Amplify the dashboard stats, make revenue numbers pop |
| `/impeccable quieter` | Design is too loud | Tone down if colors are overwhelming |
| `/impeccable distill` | Too complex | Strip unnecessary features from resident form |
| `/impeccable harden` | Before production | Add error handling, empty states, loading |
| `/impeccable onboard` | New user experience | Design first-run flow for PG owners |
| `/impeccable animate` | Add motion | Subtle transitions on payment status changes |
| `/impeccable colorize` | Colors look flat | Add strategic color to status badges |
| `/impeccable typeset` | Typography is wrong | Fix font hierarchy on dashboard |
| `/impeccable layout` | Spacing is off | Fix room grid layout, complaint list spacing |
| `/impeccable delight` | Add joy | Celebrate when owner hits 100% collection rate |
| `/impeccable overdrive` | Technical wow | Real-time chart updates on IoT dashboard |
| `/impeccable clarify` | Copy is unclear | Rewrite error messages, button labels |
| `/impeccable adapt` | Mobile issues | Fix resident portal for phone screens |
| `/impeccable optimize` | Performance issues | Optimize recharts rendering, image loading |
| `/impeccable live` | Visual iteration | Point at dashboard element, generate 3 variants |
| `/impeccable document` | Export design system | Generate DESIGN.md for team sharing |
| `/impeccable extract` | Build component library | Pull reusable cards, buttons into design system |

### 4.5 THE 44 ANTI-PATTERNS IMPECCABLE CATCHES

These are the rules that will save you from looking AI-generated:

**AI Slop Tells (The Big Ones):**
1. `gradient-text` — Gradient text on headings
2. `side-stripe-border` — Left border accent on cards
3. `ai-color-palette` — Purple/violet gradients, cyan-on-dark
4. `dark-glow` — Glowing accents in dark mode
5. `rounded-square-icon-tile` — Generic icon in rounded square above every heading
6. `identical-card-grid` — 10 identical cards in a row
7. `bounce-easing` — Bounce/elastic animations
8. `nested-cards` — Cards inside cards inside cards

**Typography Issues:**
9. `overused-font` — Inter/Roboto/system defaults for everything
10. `flat-type-hierarchy` — Same weight/size for everything
11. `tiny-body-text` — Body text below 14px
12. `long-line-length` — Lines longer than 75 characters

**Color & Contrast:**
13. `wcag-contrast` — Text below 4.5:1 contrast ratio
14. `gray-on-color` — Gray text on colored backgrounds
15. `pure-black` — Using #000000 instead of tinted black
16. `scattered-tokens` — Inline hex values bypassing design tokens

**Layout & Composition:**
17. `everything-centered` — All text centered
18. `monotonous-spacing` — Same padding everywhere
19. `cramped-padding` — Touch targets below 44px
20. `missing-whitespace` — No breathing room between sections

**Motion:**
21. `layout-property-transition` — Animating width/height instead of transform
22. `no-reduced-motion` — No `@media (prefers-reduced-motion)` support

**Quality:**
23. `missing-alt-text` — Images without alt attributes
24. `skipped-headings` — H1 → H3 without H2
25. `small-touch-targets` — Buttons below 48px height on mobile

### 4.6 CI INTEGRATION

Add this to your GitHub Actions to block AI slop before merge:

```yaml
# .github/workflows/design-check.yml
name: Design Quality Check
on: [pull_request]
jobs:
  detect:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - run: npx impeccable detect src/ --json
```

This will fail the build if any of the 44 anti-patterns are detected.

---

## PART 5: DASHBOARD HYPERLINKS & NAVIGATION ARCHITECTURE

### 5.1 OWNER DASHBOARD — THE SINGLE SCREEN THAT SELLS

This is the screen a client sees first. It must answer these questions in 3 seconds:
1. How much money did I collect this month?
2. How full is my property?
3. What's broken that needs fixing?
4. What do I need to do right now?

**Dashboard Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ☰ OPSORA                    👤 Admin ▼  🔔 3   📱 Mobile  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 💰 Revenue   │  │ 🏠 Occupancy │  │ ⚡ Utilities │   │
│  │ ₹1,24,000   │  │ 78% (62/80)  │  │ ₹12,400      │   │
│  │ [View All →] │  │ [View Map →] │  │ [Details →]  │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📊 Monthly Collection Trend                         │  │
│  │ [Recharts Line Chart]                               │  │
│  │ [View Full Analytics →]                             │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐  ┌─────────────────────────────┐ │
│  │ 🔴 Urgent (3)       │  │ 💧 Water Tanks              │ │
│  │ • AC not working    │  │ • Tank 1: 45% ⚠️            │ │
│  │ • Leak in 302       │  │ • Tank 2: 78%               │ │
│  │ [View All →]        │  │ [Order Tanker →]            │ │
│  └─────────────────────┘  └─────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ⚡ Quick Actions                                    │  │
│  │ [+ Resident] [Generate Invoices] [Create Poll]     │  │
│  │ [Staff Check-in] [Visitor Entry] [Tanker Order]    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📋 Recent Activity                                  │  │
│  │ • Amit paid ₹8,000 — 2 min ago                    │  │
│  │ • New complaint: AC not working — 15 min ago      │  │
│  │ • Water tank low alert — 1 hour ago                 │  │
│  │ [View All Activity →]                               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 ALL ROUTES & WHERE THEY LINK

| From Page | Element | Links To | Why |
|-----------|---------|----------|-----|
| **Dashboard** | Revenue card "View All →" | `/payments` | See all payment records |
| **Dashboard** | Occupancy card "View Map →" | `/rooms` | Visual floor plan |
| **Dashboard** | Utilities card "Details →" | `/iot` | Water + electricity charts |
| **Dashboard** | "View Full Analytics →" | `/analytics` | Deep-dive charts |
| **Dashboard** | Urgent complaints list | `/complaints?priority=urgent` | Filtered urgent view |
| **Dashboard** | "Order Tanker →" | `/iot/water` | Tank management page |
| **Dashboard** | "+ Resident" button | `/residents/new` | Add resident form |
| **Dashboard** | "Generate Invoices" button | `/payments/invoices/generate` | Bulk invoice modal |
| **Dashboard** | "Create Poll" button | `/food/polls/new` | Food poll creation |
| **Dashboard** | "Staff Check-in" button | `/staff/checkin` | Staff attendance |
| **Dashboard** | "Visitor Entry" button | `/visitors/new` | Visitor registration |
| **Dashboard** | "Tanker Order" button | `/iot/water/tanker` | Order water tanker |
| **Dashboard** | Activity feed items | Contextual (payment → `/payments`, complaint → `/complaints/:id`) | Deep link to relevant detail |
| **Residents** | Resident row click | `/residents/:id` | Resident detail + checkout |
| **Residents** | "Checkout" button | Opens checkout warning modal | Safety confirmation |
| **Payments** | "Verify" button on proof | Opens payment verify modal | Screenshot + amount check |
| **Payments** | "Generate Invoices" | Opens bulk invoice warning modal | Impact preview |
| **Complaints** | Ticket row click | `/complaints/:id` | Ticket detail + thread |
| **Rooms** | Room card click | `/rooms/:id` | Room detail + bed allocation |
| **IoT** | Water tank card | `/iot/water/:id` | Tank readings history |
| **IoT** | Electricity meter card | `/iot/electricity/:id` | Meter readings history |
| **Food** | Poll card | `/food/polls/:id` | Poll detail + results |
| **Food** | "Today's Menu" | `/food/menus/today` | Cook dashboard |
| **Staff** | Staff row click | `/staff/:id` | Staff profile + attendance |
| **Staff** | "Check In" button | POST /staff/checkin | Instant check-in |
| **Tenant (Resident)** | "Pay Rent" button | `/tenant/payments` | My payments + upload proof |
| **Tenant** | "Raise Complaint" | `/tenant/complaints/new` | New complaint form |
| **Tenant** | "Food Poll" | `/tenant/food` | Vote on today's menu |
| **Tenant** | "Meal Attendance" | `/tenant/attendance` | Mark today's meals |
| **Tenant** | "Notifications" | `/tenant/notifications` | All my notifications |

---

## PART 6: WARNING MODALS — CRITICAL ACTION SAFEGUARDS

### 6.1 CHECKOUT WARNING MODAL

**Triggers:** Clicking "Checkout" on any resident

**What it shows:**
1. Resident name + room number (avatar with initial)
2. **Financial Summary** (collapsible section):
   - Total Rent Due: ₹XX,XXX
   - Deposit Paid: ₹XX,XXX
   - Refund Amount: ₹XX,XXX (green if positive, red if negative)
3. **Open Complaints** (if any):
   - List of unresolved tickets
   - Warning: "These will be auto-closed"
4. **Action Required** banner (if issues exist):
   - "This resident has pending dues. Type CHECKOUT to confirm."
   - Text input field requiring "CHECKOUT"
5. Footer note: "A checkout receipt will be automatically generated"

**Why this matters:** Prevents accidental checkouts with financial loss.

### 6.2 PAYMENT VERIFICATION WARNING MODAL

**Triggers:** Clicking "Verify" on any payment proof

**What it shows:**
1. Resident name + room + invoice number
2. **Amount Comparison** (side-by-side):
   - Invoice Amount: ₹XX,XXX
   - Amount Paid: ₹XX,XXX (highlighted red if mismatch)
3. **Mismatch Warning** (if amounts differ):
   - "Short by ₹X,XXX. Partial payment will be recorded."
   - Or: "Overpaid by ₹X,XXX. Excess will be recorded as advance."
4. **Payment Screenshot** (prominent preview)
5. **Action Selection** (3 buttons):
   - ✅ Approve
   - ❌ Reject (requires reason)
   - 📝 Request Reupload (requires notes)
6. Footer note: "Approving will auto-generate a receipt. This cannot be undone."

**Why this matters:** Prevents approving fraudulent or incorrect payments.

### 6.3 BULK INVOICE GENERATION WARNING MODAL

**Triggers:** Clicking "Generate Invoices"

**What it shows:**
1. Month + Due Date selection
2. **Impact Summary**:
   - Active Residents: XX
   - Already Invoiced: XX (will be skipped)
   - New Invoices: XX
   - Total Invoice Value: ₹XX,XXX
3. **Warning**:
   - "This will create XX invoices. Existing invoices will NOT be overwritten."
   - "Residents will be notified automatically."
   - "This action cannot be undone."
4. Text input requiring "GENERATE"

**Why this matters:** Prevents duplicate invoices and unexpected notifications.

### 6.4 DELETE PROPERTY WARNING MODAL

**Triggers:** Clicking "Delete" on any property

**What it shows:**
1. Property name + warning icon
2. **Impact Analysis**:
   - Active Residents: XX
   - Open Complaints: XX
   - Pending Payments: ₹XX,XXX
   - Staff Assigned: XX
   - Historical Data: X months
3. **Permanent Warning** (red banner):
   - "ALL DATA WILL BE PERMANENTLY DELETED AND CANNOT BE RECOVERED"
4. Text input requiring "DELETE"

**Why this matters:** Prevents catastrophic data loss.

### 6.5 ROOM TYPE CHANGE WARNING MODAL

**Triggers:** Changing room gender/type with existing occupants

**What it shows:**
1. Room number + current type → new type
2. **Affected Occupants**:
   - List of residents who must move
   - "No female residents to swap with" (if applicable)
3. **Options**:
   - Cancel
   - Force Change (triggers resident relocation workflow)

**Why this matters:** Prevents gender mismatch and forced relocations without warning.

---

## PART 7: MOBILE-FIRST DESIGN FOR INDIAN PG OWNERS

### 7.1 WHY MOBILE-FIRST IS NON-NEGOTIABLE

Indian PG owners:
- Manage properties while walking between buildings
- Check payments while having chai
- Respond to complaints at 11 PM from bed
- Don't sit at a desk with a laptop

**Your app must work perfectly on a ₹15,000 Android phone with a 6-inch screen.**

### 7.2 MOBILE NAVIGATION PATTERN

```
┌─────────────────────────────────────────┐
│                                         │
│         [CONTENT AREA]                  │
│                                         │
├─────────────────────────────────────────┤
│  🏠    📋    ➕    💰    👤             │
│ Home  Tasks  Add   Pay   Me             │
└─────────────────────────────────────────┘
```

**Bottom nav items:**
- **Home** — Dashboard (revenue, occupancy, urgent items)
- **Tasks** — Today's tasks (check-ins, complaints, deliveries)
- **Add** — Quick actions (resident, payment, complaint, visitor)
- **Pay** — Payment verification queue (badge with pending count)
- **Me** — Profile, settings, logout

### 7.3 TOUCH TARGET SPECIFICATIONS

| Element | Min Size | Spacing |
|---------|----------|---------|
| Buttons | 48px height | 8px between |
| List items | 64px height | 1px separator |
| Cards | 80px tap area | 12px gap |
| Form inputs | 48px height | 16px between |
| Icons | 24px | 8px padding |
| Bottom nav | 56px height | Equal distribution |

### 7.4 THUMB ZONE OPTIMIZATION

```
┌─────────────────────────────────────────┐
│                                         │
│   [HARD TO REACH — Place rarely used]   │
│         [Search, Filters, Settings]     │
│                                         │
│  [EASY REACH — Primary actions]        │
│       [Add Resident, Verify Payment]    │
│                                         │
│  [EASY REACH — Secondary actions]       │
│       [View Details, Cancel]            │
│                                         │
└─────────────────────────────────────────┘
```

**Rule:** Primary actions ("Verify Payment", "Add Resident") go in the bottom half. Destructive actions ("Delete", "Checkout") require scrolling to reach — prevents accidental taps.

---

## PART 8: USER DASHBOARDS BY ROLE

### 8.1 OWNER DASHBOARD — "THE COMMAND CENTER"

**Purpose:** See everything at a glance. Make decisions fast.

**Top Section (Always Visible):**
- Revenue this month (big number, green if on track, red if behind)
- Occupancy rate (progress bar, 78% = green, <60% = red)
- Pending verifications (badge count, tap to verify)
- Urgent complaints (red pulse if >0)

**Middle Section (Scrollable):**
- Collection trend chart (last 6 months)
- Water tank levels (visual bars, red if <20%)
- Recent activity feed (payments, complaints, checkouts)

**Bottom Section (Quick Actions):**
- "+ Add Resident" (prominent button)
- "Generate Invoices" (monthly ritual)
- "Create Food Poll" (weekly ritual)
- "Staff Check-in" (daily ritual)

### 8.2 STAFF DASHBOARD — "THE WORK BOARD"

**Purpose:** Know what to do today. Check in. Resolve tickets.

**Top Section:**
- Check-in button (large, green if not checked in, gray if checked in)
- Today's task count
- My open tickets count

**Middle Section:**
- Ticket list (urgent first, with SLA timer)
- Task list (scheduled today)

**Bottom Section:**
- Quick ticket creation
- Food attendance count

### 8.3 RESIDENT DASHBOARD — "MY PG"

**Purpose:** Pay rent. Raise complaints. See what's for dinner.

**Top Section:**
- Profile card (name, room, property)
- Current month payment status (green = paid, red = pending, amber = proof submitted)

**Middle Section:**
- "Pay Rent" button (prominent if pending)
- "Raise Complaint" button
- "Today's Menu" card
- "Mark Meal Attendance" toggle

**Bottom Section:**
- Recent payments history
- Notifications (new invoice, payment approved, complaint resolved)

---

## PART 9: THE "NOT AI-GENERATED" CHECKLIST

Before showing to ANY client, verify:

### Typography
- [ ] Not using Inter for everything (use Playfair for headings)
- [ ] Font weights vary (Light 300 for labels, Medium 500 for data, Bold 700 for actions)
- [ ] Large numbers use negative letter-spacing
- [ ] No text smaller than 14px on mobile
- [ ] Line length never exceeds 75 characters

### Color
- [ ] Not using purple-to-blue gradients
- [ ] Not using pure black (#000000)
- [ ] Using warm saffron + deep green palette
- [ ] Contrast ratio ≥ 4.5:1 for all text
- [ ] No gray text on colored backgrounds
- [ ] Status colors are meaningful (green = paid, red = overdue, amber = pending)

### Layout
- [ ] Not everything is centered
- [ ] Cards are not nested inside cards
- [ ] Spacing varies intentionally (not monotonous)
- [ ] Touch targets are ≥ 48px on mobile
- [ ] Whitespace is generous (not cramped)

### Components
- [ ] No rounded-square icon tiles above every heading
- [ ] Avatars use initials, not generic icons
- [ ] Buttons have personality (not just rounded rectangles)
- [ ] Empty states are domain-specific (not "No data found")
- [ ] Loading states are skeletons (not spinners)

### Motion
- [ ] No bounce/elastic easing
- [ ] Animations are subtle (fade + slide, not zoom + spin)
- [ ] Reduced motion is supported
- [ ] Layout properties are not animated (use transform)

### Copy
- [ ] Error messages sound human (not "Error 404")
- [ ] Success messages are specific (not "Success")
- [ ] Button labels are action-oriented (not "Submit")
- [ ] Empty states offer next steps (not just state the obvious)

---

## PART 10: RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: "Make It Exist" (Week 1)
1. Set up Next.js 16 + Tailwind + shadcn/ui
2. Run `/impeccable init` to establish design context
3. Build login page (warm, trustworthy, not generic)
4. Build owner dashboard (the screen that sells)
5. Build residents list + add resident form
6. Add checkout warning modal

### Phase 2: "Make It Work" (Week 2)
7. Build payments page + invoice list
8. Build payment verification modal with screenshot preview
9. Build complaints page + ticket detail
10. Build rooms page with visual floor map
11. Add bulk invoice generation warning modal
12. Add delete property warning modal

### Phase 3: "Make It Impressive" (Week 3)
13. Build IoT dashboard (water + electricity charts)
14. Build food management (polls, attendance, cook view)
15. Build staff portal (check-in, tasks, tickets)
16. Build resident mobile portal (pay rent, complaints, food)
17. Run `/impeccable audit` on all pages
18. Run `/impeccable polish` for final pass

### Phase 4: "Make It Production-Ready" (Week 4)
19. Run `/impeccable harden` for error handling + edge cases
20. Run `/impeccable onboard` for first-run flows
21. Add loading skeletons to all lists
22. Add empty states to all pages
23. Test on actual Android device (not just Chrome DevTools)
24. Run `/impeccable adapt` for mobile optimization
25. Set up `npx impeccable detect` in CI

---

## PART 11: FINAL VERDICT

**Current State:** Backend API with solid architecture but zero frontend.
**Client Readiness:** 5% — There is nothing to demo.
**Biggest Risk:** You have 2-3 weeks of frontend work before this is presentable.

**The #1 thing that will make clients sign:**
A 30-second demo where an owner:
1. Opens the app on their phone
2. Sees "₹1,24,000 collected this month" with a green progress bar
3. Taps "Pending Payments" → sees 8 residents with red badges
4. Taps one → sees their payment screenshot → taps "Verify" → done
5. Gets a toast: "₹8,000 verified. Receipt sent to Amit's WhatsApp."

**That flow doesn't exist yet. Build it first. Everything else is secondary.**

**Use Impeccable to:**
- Prevent AI-generated look (run `/impeccable audit` after every page)
- Add design vocabulary to your AI (run `/impeccable shape` before building)
- Catch anti-patterns in CI (run `npx impeccable detect` on every PR)
- Polish before client demo (run `/impeccable polish` on all pages)

**Don't use Impeccable to:**
- Replace your design judgment (it catches mechanical issues, not brand intent)
- Generate UI from scratch (it improves existing UI, doesn't create it)
- Fix backend logic (it's a frontend design tool)

---

**Bottom line:** Your backend is impressive. Your product is invisible. Fix that first.
