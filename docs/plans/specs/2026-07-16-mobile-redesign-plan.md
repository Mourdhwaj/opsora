# Mobile App UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Opsora mobile app with a purple gradient theme, bottom tab navigation, professional icons, pagination, and a modern dashboard layout matching the Rocket app reference.

**Architecture:** Build reusable shared components first (theme, layout primitives, chart, icons), then rewrite the navigation and dashboard, then migrate list pages (residents, payments, issues) and the issue detail page to use the new components.

**Tech Stack:** Expo 54, React Native 0.81.5, expo-router 6, @tanstack/react-query, lucide-react-native, react-native-chart-kit, react-native-svg, StyleSheet.create

## Global Constraints

- React Native 0.81.5, Expo 54, expo-router 6
- All styling via StyleSheet.create (no Tailwind/NativeWind)
- Theme tokens in `src/lib/theme.ts` — all colors/spacing/radius come from here
- Icons: `lucide-react-native` exclusively — no emojis in UI
- Charts: `react-native-chart-kit` with `react-native-svg`
- State: @tanstack/react-query for server state
- Navigation: expo-router file-based routing with `Tabs` from expo-router

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/package.json` | Modify | Add lucide-react-native, expo-linear-gradient |
| `apps/mobile/src/lib/theme.ts` | Modify | New purple palette, typography, spacing |
| `apps/mobile/src/components/GradientHeader.tsx` | Create | Purple gradient header |
| `apps/mobile/src/components/HeroStatCard.tsx` | Create | Large stat card with trend |
| `apps/mobile/src/components/IconActionButton.tsx` | Create | Circular icon button |
| `apps/mobile/src/components/RevenueChart.tsx` | Create | Line chart wrapper |
| `apps/mobile/src/components/ProgressRing.tsx` | Create | Circular progress |
| `apps/mobile/src/components/TimeFilter.tsx` | Create | Time window pills |
| `apps/mobile/src/components/LoadMoreButton.tsx` | Create | Pagination button |
| `apps/mobile/src/components/PageHeader.tsx` | Create | Title + action header |
| `apps/mobile/src/components/FilterChips.tsx` | Create | Horizontal filter chips |
| `apps/mobile/src/components/MoreGrid.tsx` | Create | 2-column grid |
| `apps/mobile/src/components/index.ts` | Modify | Export new components |
| `apps/mobile/app/(owner)/_layout.tsx` | Modify | Bottom tabs (5 items) |
| `apps/mobile/app/(owner)/dashboard.tsx` | Modify | Complete rewrite |
| `apps/mobile/app/(owner)/residents.tsx` | Modify | Pagination + time filter |
| `apps/mobile/app/(owner)/payments.tsx` | Modify | Pagination + time filter |
| `apps/mobile/app/(owner)/complaints.tsx` | Modify | Pagination + time filter |
| `apps/mobile/app/(owner)/complaints/[id].tsx` | Modify | Redesign with icons |
| `apps/mobile/app/(owner)/more.tsx` | Modify | Grid layout |

---

### Task 1: Install Dependencies

**Files:** Modify `apps/mobile/package.json`

- [ ] **Step 1: Install lucide-react-native and expo-linear-gradient**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora/apps/mobile && npx expo install lucide-react-native expo-linear-gradient
```

- [ ] **Step 2: Verify installation**
```bash
grep -E "lucide-react-native|expo-linear-gradient" /Users/yudhistherkumar/Downloads/mk/opsora/apps/mobile/package.json
```

- [ ] **Step 3: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/package.json apps/mobile/package-lock.json && git commit -m "feat(mobile): add lucide-react-native and expo-linear-gradient"
```

---

### Task 2: Update Theme

**Files:** Modify `apps/mobile/src/lib/theme.ts`

- [ ] **Step 1: Replace theme.ts with new purple palette**

```typescript
export const theme = {
  colors: {
    primary: '#6C3CE1',
    primaryLight: '#8B5CF6',
    primaryDark: '#5528C8',
    primaryGradientStart: '#6C3CE1',
    primaryGradientEnd: '#8B5CF6',
    primarySurface: '#F0EBFF',
    background: '#F8F7FC',
    surface: '#FFFFFF',
    text: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    success: '#22C55E',
    successSurface: '#F0FDF4',
    warning: '#F59E0B',
    warningSurface: '#FFFBEB',
    danger: '#EF4444',
    dangerSurface: '#FEF2F2',
    info: '#3B82F6',
    infoSurface: '#EFF6FF',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  borderRadius: { sm: 6, md: 10, lg: 12, xl: 16, full: 9999 },
  shadow: {
    sm: { shadowColor: '#6C3CE1', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    md: { shadowColor: '#6C3CE1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    lg: { shadowColor: '#6C3CE1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
    fab: { shadowColor: '#6C3CE1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  },
  typography: {
    pageTitle: { fontSize: 28, fontWeight: '800' as const, color: '#1A1A2E' },
    sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: '#1A1A2E' },
    body: { fontSize: 14, fontWeight: '400' as const, color: '#1A1A2E' },
    label: { fontSize: 12, fontWeight: '500' as const, color: '#6B7280' },
    statLarge: { fontSize: 28, fontWeight: '800' as const, color: '#1A1A2E' },
    badge: { fontSize: 11, fontWeight: '600' as const },
  },
};
```

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/src/lib/theme.ts && git commit -m "feat(mobile): update theme with purple gradient palette"
```

---

### Task 3: Create GradientHeader Component

**Files:** Create `apps/mobile/src/components/GradientHeader.tsx`

- [ ] **Step 1: Create GradientHeader.tsx**
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../lib/theme';

interface GradientHeaderProps {
  greeting: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function GradientHeader({ greeting, subtitle, rightAction }: GradientHeaderProps) {
  return (
    <LinearGradient
      colors={[theme.colors.primaryGradientStart, theme.colors.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.topRow}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>{greeting}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl + 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  textContainer: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '400', color: 'rgba(255, 255, 255, 0.8)' },
  rightAction: { marginLeft: theme.spacing.md },
});
```

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/src/components/GradientHeader.tsx && git commit -m "feat(mobile): add GradientHeader component"
```

---

### Task 4: Create HeroStatCard Component

**Files:** Create `apps/mobile/src/components/HeroStatCard.tsx`

- [ ] **Step 1: Create HeroStatCard.tsx**
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface HeroStatCardProps {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}

export function HeroStatCard({ label, value, trend, trendLabel, subtitle }: HeroStatCardProps) {
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {trend !== undefined && (
          <View style={[styles.trendBadge, isPositive && styles.trendPositive, isNegative && styles.trendNegative]}>
            {isPositive ? <TrendingUp size={12} color={theme.colors.success} /> : <TrendingDown size={12} color={theme.colors.danger} />}
            <Text style={[styles.trendText, isPositive && styles.trendTextPositive, isNegative && styles.trendTextNegative]}>
              {isPositive ? '+' : ''}{trend}%
            </Text>
          </View>
        )}
      </View>
      {trendLabel && <Text style={styles.trendLabel}>{trendLabel}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginTop: -20, ...theme.shadow.md },
  label: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  value: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: theme.borderRadius.sm },
  trendPositive: { backgroundColor: theme.colors.successSurface },
  trendNegative: { backgroundColor: theme.colors.dangerSurface },
  trendText: { fontSize: 11, fontWeight: '600' },
  trendTextPositive: { color: theme.colors.success },
  trendTextNegative: { color: theme.colors.danger },
  trendLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
});
```

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/src/components/HeroStatCard.tsx && git commit -m "feat(mobile): add HeroStatCard component"
```

---

### Task 5: Create IconActionButton, RevenueChart, ProgressRing

**Files:** Create 3 component files

- [ ] **Step 1: Create IconActionButton.tsx**
```tsx
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface IconActionButtonProps { icon: React.ReactNode; label: string; onPress: () => void; }

export function IconActionButton({ icon, label, onPress }: IconActionButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
  iconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
});
```

- [ ] **Step 2: Create RevenueChart.tsx**
```tsx
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RANGES = ['1M', '3M', '6M'];

interface RevenueChartProps { data: Array<{ month: string; collected: number; expected: number }>; range: string; onRangeChange: (r: string) => void; }

export function RevenueChart({ data, range, onRangeChange }: RevenueChartProps) {
  const chartData = data.slice(-6);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels = chartData.map(d => { const p = d.month.split('-'); return months[parseInt(p[1],10)-1] || p[1]; });
  const collected = chartData.map(d => d.collected);
  const expected = chartData.map(d => d.expected);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Revenue Trend</Text>
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity key={r} style={[styles.pill, range === r && styles.pillActive]} onPress={() => onRangeChange(r)}>
              <Text style={[styles.pillText, range === r && styles.pillTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {chartData.length > 0 ? (
        <LineChart
          data={{
            labels,
            datasets: [
              { data: collected.length > 0 ? collected : [0], color: () => theme.colors.primary, strokeWidth: 2 },
              { data: expected.length > 0 ? expected : [0], color: () => theme.colors.textMuted, strokeWidth: 2, withDots: false },
            ],
            legend: ['Collected', 'Expected'],
          }}
          width={SCREEN_WIDTH - 64}
          height={200}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(108, 60, 225, ${opacity})`,
            labelColor: () => theme.colors.textMuted,
            propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
            propsForBackgroundLines: { strokeDasharray: '5,5', stroke: theme.colors.borderLight },
          }}
          bezier
          style={styles.chart}
          formatYLabel={(v) => { const n = parseInt(v,10); return n >= 100000 ? `${(n/100000).toFixed(1)}L` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : v; }}
        />
      ) : (
        <View style={styles.empty}><Text style={styles.emptyText}>No revenue data yet</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadow.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  rangeRow: { flexDirection: 'row', gap: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  pillTextActive: { color: '#FFFFFF' },
  chart: { marginLeft: -theme.spacing.md, marginTop: theme.spacing.sm },
  empty: { height: 200, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
```

- [ ] **Step 3: Create ProgressRing.tsx**
```tsx
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../lib/theme';

interface ProgressRingProps { percentage: number; size?: number; strokeWidth?: number; label?: string; sublabel?: string; }

export function ProgressRing({ percentage, size = 80, strokeWidth = 8, label, sublabel }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const color = progress >= 70 ? theme.colors.success : progress >= 50 ? theme.colors.warning : theme.colors.danger;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.colors.borderLight} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90, ${size/2}, ${size/2})`} />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text style={[styles.percentage, { color }]}>{Math.round(progress)}%</Text>
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  textContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  percentage: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.xs },
  sublabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
```

- [ ] **Step 4: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/src/components/IconActionButton.tsx apps/mobile/src/components/RevenueChart.tsx apps/mobile/src/components/ProgressRing.tsx && git commit -m "feat(mobile): add IconActionButton, RevenueChart, ProgressRing"
```

---

### Task 6: Create List Page Components

**Files:** Create TimeFilter, LoadMoreButton, PageHeader, FilterChips, MoreGrid

- [ ] **Step 1: Create TimeFilter.tsx**
```tsx
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface TimeFilterProps { options: Array<{ label: string; value: string }>; selected: string; onSelect: (v: string) => void; }

export function TimeFilter({ options, selected, onSelect }: TimeFilterProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {options.map(o => (
        <TouchableOpacity key={o.value} style={[styles.pill, selected === o.value && styles.pillActive]} onPress={() => onSelect(o.value)}>
          <Text style={[styles.pillText, selected === o.value && styles.pillTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, marginRight: 6 },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  pillTextActive: { color: '#FFFFFF' },
});
```

- [ ] **Step 2: Create LoadMoreButton.tsx**
```tsx
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface LoadMoreButtonProps { onPress: () => void; loading?: boolean; remaining: number; }

export function LoadMoreButton({ onPress, loading, remaining }: LoadMoreButtonProps) {
  if (remaining <= 0) return null;
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading} activeOpacity={0.7}>
      {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.text}>Load More ({remaining} remaining)</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl, paddingVertical: 12, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.primary, alignItems: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
});
```

- [ ] **Step 3: Create PageHeader.tsx**
```tsx
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface PageHeaderProps { title: string; action?: React.ReactNode; }

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action && <View>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.md },
  title: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
});
```

- [ ] **Step 4: Create FilterChips.tsx**
```tsx
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface FilterChipsProps { options: Array<{ label: string; value: string }>; selected: string; onSelect: (v: string) => void; }

export function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {options.map(o => (
        <TouchableOpacity key={o.value} style={[styles.chip, selected === o.value && styles.chipActive]} onPress={() => onSelect(o.value)}>
          <Text style={[styles.chipText, selected === o.value && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, marginRight: 6 },
  chipActive: { backgroundColor: theme.colors.primarySurface, borderWidth: 1, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.primary },
});
```

- [ ] **Step 5: Create MoreGrid.tsx**
```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface MoreGridItem { icon: React.ReactNode; label: string; route: string; }
interface MoreGridProps { items: MoreGridItem[]; onNavigate: (route: string) => void; }

export function MoreGrid({ items, onNavigate }: MoreGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, i) => (
        <TouchableOpacity key={i} style={styles.cell} onPress={() => onNavigate(item.route)} activeOpacity={0.7}>
          <View style={styles.iconCircle}>{item.icon}</View>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  cell: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.sm, ...theme.shadow.sm },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
});
```

- [ ] **Step 6: Update components/index.ts** — Add exports for all new components

- [ ] **Step 7: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/src/components/ && git commit -m "feat(mobile): add list page components (TimeFilter, LoadMoreButton, PageHeader, FilterChips, MoreGrid)"
```

---

### Task 7: Rewrite Navigation — Bottom Tabs

**Files:** Modify `apps/mobile/app/(owner)/_layout.tsx`

- [ ] **Step 1: Replace _layout.tsx** — Remove hamburger drawer, use 5 bottom tabs with lucide icons (LayoutDashboard, Users, CreditCard, AlertCircle, Grid2x2). Hide all non-tab screens with `href: false`. Set `headerShown: false` for all screens (each screen manages its own header).

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/_layout.tsx && git commit -m "feat(mobile): replace hamburger with bottom tab navigation"
```

---

### Task 8: Rewrite Dashboard

**Files:** Modify `apps/mobile/app/(owner)/dashboard.tsx`

- [ ] **Step 1: Complete rewrite** — Replace entire file with new layout:
  - GradientHeader with time-based greeting + notification bell
  - HeroStatCard (total revenue + trend)
  - Quick actions row (Properties, Residents, Payments, Issues) using IconActionButton
  - RevenueChart with time range selector
  - Occupancy Overview with ProgressRing
  - Recent Activity list with lucide icons (UserPlus, CreditCard, AlertCircle, BedDouble, CheckCircle)
  - Remove: old metric cards, old bar charts, Quick Stats, Water Tanks, Property Occupancy sections

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/dashboard.tsx && git commit -m "feat(mobile): rewrite dashboard with purple gradient theme"
```

---

### Task 9: Update Residents Page

**Files:** Modify `apps/mobile/app/(owner)/residents.tsx`

- [ ] **Step 1: Add pagination + time filter** — Add `page` state, `LoadMoreButton`, `TimeFilter`, `PageHeader`. Change query to use `limit: 20` with page param. Add "This Month" / "3 Months" / "All" time filter. Update card layout with proper spacing and lucide icons.

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/residents.tsx && git commit -m "feat(mobile): add pagination and time filter to residents"
```

---

### Task 10: Update Payments Page

**Files:** Modify `apps/mobile/app/(owner)/payments.tsx`

- [ ] **Step 1: Add pagination + time filter** — Same pattern as residents: `LoadMoreButton`, `TimeFilter`, `PageHeader`, limit 20, time-based filtering. Update card layout.

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/payments.tsx && git commit -m "feat(mobile): add pagination and time filter to payments"
```

---

### Task 11: Update Issues Page

**Files:** Modify `apps/mobile/app/(owner)/complaints.tsx`

- [ ] **Step 1: Add pagination + time filter** — Same pattern: `LoadMoreButton`, `TimeFilter`, `PageHeader`, limit 20. Update card layout with lucide icons. Ensure navigation to `[id]` detail page works.

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/complaints.tsx && git commit -m "feat(mobile): add pagination and time filter to issues"
```

---

### Task 12: Redesign Issue Detail Page

**Files:** Modify `apps/mobile/app/(owner)/complaints/[id].tsx`

- [ ] **Step 1: Redesign with icons** — Replace emojis with lucide icons (Tag, AlertTriangle, Clock, CheckCircle, User, UserCog). Add proper spacing, card layout, professional styling. Ensure status change and staff assignment work.

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/complaints/\[id\].tsx && git commit -m "feat(mobile): redesign issue detail with lucide icons"
```

---

### Task 13: Create More Screen

**Files:** Modify `apps/mobile/app/(owner)/more.tsx`

- [ ] **Step 1: Grid layout** — Use MoreGrid component with lucide icons (Building, LayoutGrid, UtensilsCrossed, Droplets, Zap, UserPlus, Archive, Settings). Each cell navigates to the corresponding screen.

- [ ] **Step 2: Commit**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add apps/mobile/app/\(owner\)/more.tsx && git commit -m "feat(mobile): create More screen with grid layout"
```

---

### Task 14: Final Verification

- [ ] **Step 1: Run TypeScript check**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora/apps/mobile && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 2: Verify no emojis in UI** — grep for emoji patterns in modified files

- [ ] **Step 3: Final commit if needed**
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && git add -A && git commit -m "chore(mobile): final verification and cleanup"
```
