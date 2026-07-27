# Mobile Theme Migration & Bug Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all hardcoded colors/fonts to theme tokens, fix critical bugs, add error states to all screens, and add pagination to staff/tenant lists.

**Architecture:** Each task migrates one file or group of related files. Tasks are ordered by dependency: theme tokens first, then bug fixes, then theme migration per role, then error states, then pagination.

**Tech Stack:** React Native, Expo Router, TanStack Query, theme tokens from `src/lib/theme.ts`.

## Global Constraints

- All colors from `theme.colors.*`, all fonts from `theme.font.*`
- No emojis in UI — use lucide-react-native icons only
- No new dependencies
- TypeScript strict — zero `any` in new code
- Each task must compile with `npx tsc --noEmit` after completion

## Color → Token Mapping Reference

| Hardcoded | Token | Hardcoded | Token |
|-----------|-------|-----------|-------|
| `#111827` | `theme.colors.text` | `#22c55e` | `theme.colors.success` |
| `#1A1A2E` | `theme.colors.text` | `#16a34a` | `theme.colors.success` |
| `#374151` | `theme.colors.text` | `#ef4444` | `theme.colors.danger` |
| `#6b7280` | `theme.colors.textSecondary` | `#dc2626` | `theme.colors.danger` |
| `#9ca3af` | `theme.colors.textMuted` | `#f59e0b` | `theme.colors.warning` |
| `#fff` / `#ffffff` | `theme.colors.surface` | `#f97316` | `theme.colors.warning` |
| `#f9fafb` | `theme.colors.background` | `#3b82f6` | `theme.colors.info` |
| `#f3f4f6` | `theme.colors.borderLight` | `#0369a1` | `theme.colors.info` |
| `#e5e7eb` | `theme.colors.border` | `#fef2f2` | `theme.colors.dangerSurface` |
| `#d1d5db` | `theme.colors.border` | `#f0fdf4` | `theme.colors.successSurface` |
| `rgba(0,0,0,0.3)` | `theme.colors.overlay` (new) | `#fef3c7` | `theme.colors.warningSurface` |

## FontWeight → Token Mapping

| Hardcoded | Token |
|-----------|-------|
| `'400'` | `theme.font.regular` |
| `'500'` | `theme.font.medium` |
| `'600'` | `theme.font.semiBold` |
| `'700'` | `theme.font.bold` |
| `'800'` | `theme.font.extraBold` |

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/theme.ts` | Modify | Add missing tokens (overlay, textDark, etc.) |
| `app/(staff)/_layout.tsx` | Modify | Theme migration |
| `app/(staff)/dashboard.tsx` | Modify | Bug fix (myTasks array) + theme migration |
| `app/(staff)/checklist.tsx` | Modify | Theme migration |
| `app/(staff)/tasks.tsx` | Modify | Theme migration + RefreshControl fix |
| `app/(staff)/residents.tsx` | Modify | Add theme import + theme migration |
| `app/(staff)/complaints.tsx` | Modify | Theme migration + RefreshControl fix |
| `app/(staff)/complaints/[id].tsx` | Modify | Theme migration |
| `app/(tenant)/_layout.tsx` | Modify | Theme migration |
| `app/(tenant)/dashboard.tsx` | Modify | Add theme import + theme migration |
| `app/(tenant)/complaints.tsx` | Modify | Theme migration + RefreshControl fix + ErrorState |
| `app/(tenant)/payments.tsx` | Modify | Add theme import + theme migration + ErrorState |
| `app/(tenant)/food.tsx` | Modify | Theme migration + ErrorState |
| `app/(tenant)/profile.tsx` | Modify | Theme migration + ErrorState |
| `app/(tenant)/complaints/[id].tsx` | Modify | Theme migration |
| `app/(details)/properties/[id].tsx` | Modify | Theme migration |
| `app/(details)/payments-[id].tsx` | Modify | Theme migration |
| `app/(details)/residents-[id].tsx` | Modify | Theme migration |
| `app/login.tsx` | Modify | Add theme import + theme migration |
| `app/(owner)/residents.tsx` | Modify | Add ErrorState |
| `app/(owner)/payments.tsx` | Modify | Add ErrorState |

---

### Task 1: Add Missing Theme Tokens

**Files:**
- Modify: `apps/mobile/src/lib/theme.ts`

**Interfaces:**
- Produces: Extended theme with `overlay`, `textDark`, `borderMedium` tokens

- [ ] **Step 1: Read current theme.ts**

Read `apps/mobile/src/lib/theme.ts` to understand the current structure.

- [ ] **Step 2: Add missing color tokens**

Add these to the `colors` object in theme.ts:

```typescript
overlay: 'rgba(0,0,0,0.3)',
textDark: '#374151',
borderMedium: '#d1d5db',
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/lib/theme.ts
git commit -m "theme(mobile): add overlay, textDark, borderMedium tokens"
```

---

### Task 2: Fix Staff Dashboard Bug

**Files:**
- Modify: `apps/mobile/app/(staff)/dashboard.tsx`

**Interfaces:**
- Consumes: `theme` from `src/lib/theme`
- Produces: Fixed MetricBox values + field name corrections

- [ ] **Step 1: Read the file**

Read `apps/mobile/app/(staff)/dashboard.tsx` fully.

- [ ] **Step 2: Fix myTasks array bug (line ~40)**

Change: `value={data?.myTasks || 0}` → `value={data?.myTasks?.length || 0}`

- [ ] **Step 3: Fix field name mismatches (lines ~41-46)**

Change the MetricBox values to use correct API field paths:
- `data?.openTickets` → `data?.counts?.allOpen || 0`
- `data?.inProgressTickets` → `data?.counts?.inProgress || 0`
- `data?.resolvedToday` → `data?.counts?.resolvedToday || 0`
- `data?.slaBreaches` → `data?.counts?.slaBreached || 0`

- [ ] **Step 4: Fix literal string color bug (line ~40)**

Change: `color="theme.colors.primary"` → `color={theme.colors.primary}`

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/app/(staff)/dashboard.tsx
git commit -m "fix(mobile): fix staff dashboard myTasks array bug and field name mismatches"
```

---

### Task 3: Fix RefreshControl Bugs

**Files:**
- Modify: `apps/mobile/app/(tenant)/complaints.tsx`
- Modify: `apps/mobile/app/(staff)/complaints.tsx`
- Modify: `apps/mobile/app/(staff)/tasks.tsx`

**Interfaces:**
- Consumes: `RefreshControl` already imported in each file
- Produces: Attached RefreshControl on ScrollView/FlatList

- [ ] **Step 1: Fix tenant complaints RefreshControl**

Read `apps/mobile/app/(tenant)/complaints.tsx`. Find the ScrollView (around line 136). Add `refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}` prop.

- [ ] **Step 2: Fix staff complaints RefreshControl**

Read `apps/mobile/app/(staff)/complaints.tsx`. Find the FlatList (around line 75). Add `refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}` prop.

- [ ] **Step 3: Fix staff tasks RefreshControl**

Read `apps/mobile/app/(staff)/tasks.tsx`. Find the FlatList (around line 79). Add `refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}` prop.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/(tenant)/complaints.tsx apps/mobile/app/(staff)/complaints.tsx apps/mobile/app/(staff)/tasks.tsx
git commit -m "fix(mobile): attach RefreshControl to tenant complaints, staff complaints, staff tasks"
```

---

### Task 4: Migrate Staff Layout + Dashboard to Theme

**Files:**
- Modify: `apps/mobile/app/(staff)/_layout.tsx`
- Modify: `apps/mobile/app/(staff)/dashboard.tsx`

**Interfaces:**
- Consumes: theme tokens from Task 1
- Produces: Fully themed staff layout and dashboard

- [ ] **Step 1: Migrate staff _layout.tsx**

Read the file. Replace all hardcoded colors with theme tokens:
- `#fff` → `theme.colors.surface`
- `#111827` → `theme.colors.text`
- `#6b7280` → `theme.colors.textSecondary`
- `#9ca3af` → `theme.colors.textMuted`
- `#f3f4f6` → `theme.colors.borderLight`
- `rgba(0,0,0,0.3)` → `theme.colors.overlay`

Replace all fontWeight strings:
- `fontWeight: '600'` → `fontFamily: theme.font.semiBold`
- `fontWeight: '700'` → `fontFamily: theme.font.bold`
- `fontWeight: '800'` → `fontFamily: theme.font.extraBold`

- [ ] **Step 2: Migrate staff dashboard.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens. Use the mapping reference above.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/(staff)/_layout.tsx apps/mobile/app/(staff)/dashboard.tsx
git commit -m "theme(mobile): migrate staff layout and dashboard to theme tokens"
```

---

### Task 5: Migrate Staff Screens to Theme

**Files:**
- Modify: `apps/mobile/app/(staff)/checklist.tsx`
- Modify: `apps/mobile/app/(staff)/tasks.tsx`
- Modify: `apps/mobile/app/(staff)/residents.tsx`
- Modify: `apps/mobile/app/(staff)/complaints.tsx`
- Modify: `apps/mobile/app/(staff)/complaints/[id].tsx`

**Interfaces:**
- Consumes: theme tokens
- Produces: Fully themed staff screens

- [ ] **Step 1: Migrate staff/checklist.tsx**

Read the file. Add `import { theme } from '../../src/lib/theme';` if missing. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 2: Migrate staff/tasks.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 3: Migrate staff/residents.tsx**

Read the file. Add `import { theme } from '../../src/lib/theme';` (currently missing). Replace all hardcoded colors and fontWeight strings.

- [ ] **Step 4: Migrate staff/complaints.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 5: Migrate staff/complaints/[id].tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/(staff)/checklist.tsx apps/mobile/app/(staff)/tasks.tsx apps/mobile/app/(staff)/residents.tsx apps/mobile/app/(staff)/complaints.tsx "apps/mobile/app/(staff)/complaints/[id].tsx"
git commit -m "theme(mobile): migrate all staff screens to theme tokens"
```

---

### Task 6: Migrate Tenant Layout + Screens to Theme

**Files:**
- Modify: `apps/mobile/app/(tenant)/_layout.tsx`
- Modify: `apps/mobile/app/(tenant)/dashboard.tsx`
- Modify: `apps/mobile/app/(tenant)/complaints.tsx`
- Modify: `apps/mobile/app/(tenant)/payments.tsx`
- Modify: `apps/mobile/app/(tenant)/food.tsx`
- Modify: `apps/mobile/app/(tenant)/profile.tsx`
- Modify: `apps/mobile/app/(tenant)/complaints/[id].tsx`

**Interfaces:**
- Consumes: theme tokens
- Produces: Fully themed tenant screens

- [ ] **Step 1: Migrate tenant/_layout.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 2: Migrate tenant/dashboard.tsx**

Read the file. Add `import { theme } from '../../src/lib/theme';` (currently missing). Replace all hardcoded colors and fontWeight strings.

- [ ] **Step 3: Migrate tenant/complaints.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 4: Migrate tenant/payments.tsx**

Read the file. Add `import { theme } from '../../src/lib/theme';` (currently missing). Replace all hardcoded colors and fontWeight strings.

- [ ] **Step 5: Migrate tenant/food.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 6: Migrate tenant/profile.tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 7: Migrate tenant/complaints/[id].tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/app/(tenant)/_layout.tsx apps/mobile/app/(tenant)/dashboard.tsx apps/mobile/app/(tenant)/complaints.tsx apps/mobile/app/(tenant)/payments.tsx apps/mobile/app/(tenant)/food.tsx apps/mobile/app/(tenant)/profile.tsx "apps/mobile/app/(tenant)/complaints/[id].tsx"
git commit -m "theme(mobile): migrate all tenant screens to theme tokens"
```

---

### Task 7: Migrate Detail Screens + Login to Theme

**Files:**
- Modify: `apps/mobile/app/(details)/properties/[id].tsx`
- Modify: `apps/mobile/app/(details)/payments-[id].tsx`
- Modify: `apps/mobile/app/(details)/residents-[id].tsx`
- Modify: `apps/mobile/app/login.tsx`

**Interfaces:**
- Consumes: theme tokens
- Produces: Fully themed detail screens and login

- [ ] **Step 1: Migrate properties/[id].tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 2: Migrate payments-[id].tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 3: Migrate residents-[id].tsx**

Read the file. Replace all hardcoded colors and fontWeight strings with theme tokens.

- [ ] **Step 4: Migrate login.tsx**

Read the file. Add `import { theme } from '../src/lib/theme';` (currently missing). Replace all hardcoded colors and fontWeight strings.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "apps/mobile/app/(details)/properties/[id].tsx" "apps/mobile/app/(details)/payments-[id].tsx" "apps/mobile/app/(details)/residents-[id].tsx" apps/mobile/app/login.tsx
git commit -m "theme(mobile): migrate detail screens and login to theme tokens"
```

---

### Task 8: Add ErrorState to All Missing Screens

**Files:**
- Modify: `apps/mobile/app/(tenant)/complaints.tsx`
- Modify: `apps/mobile/app/(tenant)/payments.tsx`
- Modify: `apps/mobile/app/(tenant)/food.tsx`
- Modify: `apps/mobile/app/(tenant)/profile.tsx`
- Modify: `apps/mobile/app/(staff)/complaints.tsx`
- Modify: `apps/mobile/app/(staff)/tasks.tsx`
- Modify: `apps/mobile/app/(staff)/residents.tsx`
- Modify: `apps/mobile/app/(owner)/residents.tsx`
- Modify: `apps/mobile/app/(owner)/payments.tsx`

**Interfaces:**
- Consumes: `ErrorState` from `../../src/components`
- Produces: Error handling on all screens

**Pattern to apply in each file:**
```tsx
// 1. Add ErrorState to import
import { Card, LoadingSkeleton, ErrorState, ... } from '../../src/components';

// 2. Add error to useQuery destructure
const { data, isLoading, error, refetch } = useQuery({ ... });

// 3. Add error guard after loading guard
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorState message="Failed to load data" onRetry={refetch} />;
```

- [ ] **Step 1: Add ErrorState to tenant complaints**

Read `apps/mobile/app/(tenant)/complaints.tsx`. Add `ErrorState` to import, add `error` to useQuery destructure, add error guard after loading guard.

- [ ] **Step 2: Add ErrorState to tenant payments**

Read `apps/mobile/app/(tenant)/payments.tsx`. Same pattern.

- [ ] **Step 3: Add ErrorState to tenant food**

Read `apps/mobile/app/(tenant)/food.tsx`. Add error handling for the two main queries (menus + polls).

- [ ] **Step 4: Add ErrorState to tenant profile**

Read `apps/mobile/app/(tenant)/profile.tsx`. Same pattern.

- [ ] **Step 5: Add ErrorState to staff complaints**

Read `apps/mobile/app/(staff)/complaints.tsx`. Same pattern.

- [ ] **Step 6: Add ErrorState to staff tasks**

Read `apps/mobile/app/(staff)/tasks.tsx`. Same pattern.

- [ ] **Step 7: Add ErrorState to staff residents**

Read `apps/mobile/app/(staff)/residents.tsx`. Same pattern.

- [ ] **Step 8: Add ErrorState to owner residents**

Read `apps/mobile/app/(owner)/residents.tsx`. Add error guard (already has pagination).

- [ ] **Step 9: Add ErrorState to owner payments**

Read `apps/mobile/app/(owner)/payments.tsx`. Add error guard (already has pagination).

- [ ] **Step 10: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add apps/mobile/app/(tenant)/complaints.tsx apps/mobile/app/(tenant)/payments.tsx apps/mobile/app/(tenant)/food.tsx apps/mobile/app/(tenant)/profile.tsx apps/mobile/app/(staff)/complaints.tsx apps/mobile/app/(staff)/tasks.tsx apps/mobile/app/(staff)/residents.tsx apps/mobile/app/(owner)/residents.tsx apps/mobile/app/(owner)/payments.tsx
git commit -m "feat(mobile): add ErrorState to all screens missing error handling"
```

---

### Task 9: Add Pagination to Staff/Tenant Screens

**Files:**
- Modify: `apps/mobile/app/(staff)/residents.tsx`
- Modify: `apps/mobile/app/(staff)/tasks.tsx`
- Modify: `apps/mobile/app/(staff)/complaints.tsx`
- Modify: `apps/mobile/app/(tenant)/complaints.tsx`
- Modify: `apps/mobile/app/(tenant)/payments.tsx`

**Interfaces:**
- Consumes: `LoadMoreButton` from `../../src/components`
- Produces: Paginated staff/tenant lists matching owner pattern

**Pattern to apply (from owner screens):**
```tsx
const PAGE_SIZE = 20;
const [page, setPage] = useState(1);

const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['key', page],
  queryFn: () => api.get('/endpoint', { params: { page, limit: PAGE_SIZE } }).then(r => r.data),
});

const items = data?.data || [];
const total = data?.pagination?.total ?? items.length;

// In JSX, after the list:
<LoadMoreButton hasMore={items.length < total} isLoading={isLoading} onPress={() => setPage(p => p + 1)} />
```

- [ ] **Step 1: Add pagination to staff residents**

Read `apps/mobile/app/(staff)/residents.tsx`. Add page state, update queryKey and queryFn to include page param, extract total from pagination, add LoadMoreButton.

- [ ] **Step 2: Add pagination to staff tasks**

Read `apps/mobile/app/(staff)/tasks.tsx`. Same pattern.

- [ ] **Step 3: Add pagination to staff complaints**

Read `apps/mobile/app/(staff)/complaints.tsx`. Same pattern.

- [ ] **Step 4: Add pagination to tenant complaints**

Read `apps/mobile/app/(tenant)/complaints.tsx`. Same pattern.

- [ ] **Step 5: Add pagination to tenant payments**

Read `apps/mobile/app/(tenant)/payments.tsx`. Same pattern.

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/app/(staff)/residents.tsx apps/mobile/app/(staff)/tasks.tsx apps/mobile/app/(staff)/complaints.tsx apps/mobile/app/(tenant)/complaints.tsx apps/mobile/app/(tenant)/payments.tsx
git commit -m "feat(mobile): add pagination to staff and tenant list screens"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Verify zero hardcoded theme colors remain**

Run: `grep -rn "'#" apps/mobile/app --include="*.tsx" | grep -v node_modules | head -30`
Expected: Minimal or no matches (some like shadow colors may remain)

- [ ] **Step 3: Verify zero fontWeight strings remain**

Run: `grep -rn "fontWeight:" apps/mobile/app --include="*.tsx" | head -20`
Expected: No matches

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "chore(mobile): final verification fixes"
```
