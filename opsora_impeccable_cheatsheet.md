
# OPSORA — QUICK REFERENCE: IMPECCABLE COMMANDS FOR YOUR PROJECT

## Installation (One-Time)
```bash
npx impeccable install
```

## Daily Workflow

### Before Building Any Page
```
/impeccable shape the [page name]
```
Example: `/impeccable shape the owner dashboard`

### After Building Any Page
```
/impeccable audit src/app/[page]
```
Example: `/impeccable audit src/app/dashboard`

### Before Client Demo
```
/impeccable polish src/app/
```

### When Design Looks Boring
```
/impeccable bolder src/app/dashboard
```

### When Design Is Too Loud
```
/impeccable quieter src/app/dashboard
```

### For Error Handling & Edge Cases
```
/impeccable harden src/app/residents
```

### For First-Run User Experience
```
/impeccable onboard
```

### For Mobile Optimization
```
/impeccable adapt src/app/
```

### For Animation
```
/impeccable animate src/app/dashboard
```

### For Typography Fixes
```
/impeccable typeset src/app/
```

### For Color Fixes
```
/impeccable colorize src/app/
```

### For Layout Fixes
```
/impeccable layout src/app/
```

### For Copy/Content Fixes
```
/impeccable clarify src/app/
```

### For Performance
```
/impeccable optimize src/app/
```

### For Live Visual Iteration (Beta)
```
/impeccable live
# Then point at any element in your browser
```

### For Design System Export
```
/impeccable document
```

### For Component Library Extraction
```
/impeccable extract src/components/
```

## CI Integration (Block AI Slop on PR)
```bash
npx impeccable detect src/ --json
```
Exit codes: 0 = clean, 2 = anti-patterns found

## The 44 Anti-Patterns It Catches

**AI Slop Tells:**
- gradient-text, side-stripe-border, ai-color-palette, dark-glow
- rounded-square-icon-tile, identical-card-grid, bounce-easing, nested-cards

**Typography:**
- overused-font, flat-type-hierarchy, tiny-body-text, long-line-length

**Color & Contrast:**
- wcag-contrast, gray-on-color, pure-black, scattered-tokens

**Layout:**
- everything-centered, monotonous-spacing, cramped-padding, missing-whitespace

**Motion:**
- layout-property-transition, no-reduced-motion

**Quality:**
- missing-alt-text, skipped-headings, small-touch-targets

## Your Design Context (For PRODUCT.md)

```yaml
product: Opsora
audience: Indian PG/Hostel owners and residents
brand_lane: product (not brand/marketing)
voice: trustworthy, warm, efficient
anti_references: 
  - "Don't look like Zomato/Swiggy (too playful)"
  - "Don't look like Tally (too corporate)"
  - "Don't look like generic SaaS dashboard"
colors:
  primary: "#FF9933" (saffron — Indian warmth)
  secondary: "#138808" (deep green — growth, money)
  background: "#FFF8F0" (warm cream — not sterile white)
  text: "#2D2D2D" (charcoal — not pure black)
fonts:
  ui: "Inter (300/400/500/700)"
  headings: "Playfair Display"
  numbers: "Inter with -0.02em letter-spacing"
```

## Pages to Build (In Order)

1. `/login` — Warm, trustworthy, not generic
2. `/dashboard` (owner) — Revenue, occupancy, quick actions
3. `/residents` — List, add, detail, checkout (with warning modal)
4. `/payments` — Invoice list, verification queue (with warning modal)
5. `/complaints` — Ticket list, detail, assign
6. `/rooms` — Visual floor map, allocation
7. `/iot` — Water + electricity charts
8. `/food` — Polls, attendance, cook view
9. `/staff` — Check-in, tasks, tickets
10. `/tenant` (resident) — Mobile-first, pay rent, complaints, food

## Warning Modals Required

1. **Checkout** — Shows financial summary, open complaints, requires "CHECKOUT" text
2. **Payment Verify** — Shows screenshot, amount comparison, 3 actions (approve/reject/reupload)
3. **Bulk Invoice** — Shows affected count, total value, requires "GENERATE" text
4. **Delete Property** — Shows impact analysis, requires "DELETE" text
5. **Room Type Change** — Shows affected occupants, offers force change option

## Mobile-First Rules

- Bottom nav: Home, Tasks, Add, Pay, Me
- Touch targets: min 48px height
- Primary actions in bottom half (thumb zone)
- Destructive actions require scroll (prevent accidental taps)
- Test on actual Android device, not just Chrome DevTools
