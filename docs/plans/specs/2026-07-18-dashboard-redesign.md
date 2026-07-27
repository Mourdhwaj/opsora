# Dashboard Redesign + Payment Flow + Checkout Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign dashboard with animations, add dedicated payment screens, implement checkout with deposit refund, and update seed data.

**Architecture:** Backend adds 2 new API endpoints for tenant-centric payment views and updates checkout to handle refunds. Mobile adds 3 new screens (PendingTenants, PaidTenants, Checkout), 2 new animated components (NeumorphicTab, AnimatedCard), and redesigns dashboard layout with staggered entrance animations.

**Tech Stack:** React Native (Expo), Fastify, Drizzle ORM, SQLite, Animated API, lucide-react-native

## Global Constraints

- React Native with Expo Router
- Fastify backend on port 3001
- SQLite with Drizzle ORM
- Theme: warm monochrome + olive accent (#5F6B3A)
- Fonts: Inter (regular, semiBold, bold, extraBold)
- All data from API, zero hardcoded dummy data
- Animations use React Native Animated API (no reanimated)

---

## File Structure

```
apps/api/src/
├── lib/seed.ts                    # MODIFY: rent=10500, deposit=5000, refund=3000, 12 months
├── routes/dashboard.ts            # MODIFY: add pending-tenants, paid-tenants endpoints
└── routes/residents.ts            # MODIFY: update checkout for refund/deductions

apps/mobile/app/(owner)/
├── dashboard.tsx                  # REDESIGN: new layout, animations, remove dummy data
├── pending-tenants.tsx            # CREATE: unpaid tenants screen
├── paid-tenants.tsx               # CREATE: paid tenants screen
├── checkout.tsx                   # CREATE: checkout with deposit refund
└── _layout.tsx                    # MODIFY: update tab config

apps/mobile/src/components/
├── NeumorphicTab.tsx              # CREATE: animated pill tab
├── AnimatedCard.tsx               # CREATE: card with entrance animation
├── PaymentReminder.tsx            # MODIFY: use real API data
└── index.ts                       # MODIFY: export new components
```

---

### Task 1: Update Seed Data

**Files:**
- Modify: `apps/api/src/lib/seed.ts`

**Interfaces:**
- Consumes: None (first task)
- Produces: Updated seed with ₹10,500 rent, ₹5,000 deposit, ₹3,000 refund, 12 months data

- [ ] **Step 1: Update rent amounts in seed**

In `apps/api/src/lib/seed.ts`, change the rent calculation from `7000 + f * 1000` to fixed `10500`:

```typescript
// Line 134: Room rent
rentPerBed: 10500,

// Line 151: Bed rent
rentAmount: 10500,
```

- [ ] **Step 2: Update deposit amounts**

```typescript
// Line 136: Room deposit
depositAmount: 5000,

// Line 220: Tenant profile deposit
depositPaid: 5000,
```

- [ ] **Step 3: Update rent amount in tenant profiles**

```typescript
// Line 219: Tenant profile rent
rentAmount: 10500,
```

- [ ] **Step 4: Update payment amounts in rent payments**

```typescript
// Line 269-270: Paid amount calculation
const paidAmount = isPaid ? 10500 : (paymentStatus === 'partial' ? 5250 : 0);

// Line 281-282: Payment amounts
rentAmount: 10500,
totalAmount: 10500,
```

- [ ] **Step 5: Update months array to 12 months**

```typescript
// Line 239: Change from 7 to 12 months
const months = ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
```

- [ ] **Step 6: Run seed to verify**

```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && npm run db:seed
```

Expected: Seed completes with 12 months of payment data

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/lib/seed.ts
git commit -m "feat: update seed data - ₹10500 rent, ₹5000 deposit, 12 months"
```

---

### Task 2: Add Pending-Tenants API Endpoint

**Files:**
- Modify: `apps/api/src/routes/dashboard.ts`

**Interfaces:**
- Consumes: None
- Produces: `GET /dashboard/pending-tenants` returns unpaid tenants for current month

- [ ] **Step 1: Add pending-tenants endpoint**

In `apps/api/src/routes/dashboard.ts`, add after the occupancy-trend endpoint (around line 192):

```typescript
// Pending tenants for current month (owner/admin only)
app.get('/dashboard/pending-tenants', { preHandler: [authenticate] }, async (request, reply) => {
  if (!requireOwner(request, reply)) return;
  const user = request.user as { userId: string; tenantId: string; email: string; role: string };
  const tenantId = user.tenantId;
  const { propertyId } = request.query as { propertyId?: string };

  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const payConditions = [
    eq(rentPayments.tenantId, tenantId),
    eq(rentPayments.monthYear, currentMonth),
    sql`${rentPayments.paymentStatus} IN ('pending', 'overdue', 'partial')`,
  ];
  if (propertyId) payConditions.push(eq(rentPayments.propertyId, propertyId));
  
  const pendingPayments = db.select({
    id: rentPayments.id,
    tenantProfileId: rentPayments.tenantProfileId,
    monthYear: rentPayments.monthYear,
    rentAmount: rentPayments.rentAmount,
    totalAmount: rentPayments.totalAmount,
    paidAmount: rentPayments.paidAmount,
    balanceAmount: rentPayments.balanceAmount,
    paymentStatus: rentPayments.paymentStatus,
    dueDate: rentPayments.dueDate,
  }).from(rentPayments)
    .where(and(...payConditions))
    .all();

  // Get tenant details for each payment
  const tenantsWithDetails = pendingPayments.map(payment => {
    const profile = db.select().from(tenantProfiles)
      .where(eq(tenantProfiles.id, payment.tenantProfileId))
      .get();
    const room = profile?.roomId ? db.select().from(rooms)
      .where(eq(rooms.id, profile.roomId))
      .get() : null;
    return {
      id: payment.tenantProfileId,
      name: profile?.fullName || 'Unknown',
      phone: profile?.phone || '',
      roomNumber: room?.roomNumber || 'N/A',
      rentAmount: payment.rentAmount,
      paidAmount: payment.paidAmount,
      balanceAmount: payment.balanceAmount,
      status: payment.paymentStatus,
      dueDate: payment.dueDate,
    };
  });

  const summary = {
    total: tenantsWithDetails.length,
    overdue: tenantsWithDetails.filter(t => t.status === 'overdue').length,
    pending: tenantsWithDetails.filter(t => t.status === 'pending').length,
    partial: tenantsWithDetails.filter(t => t.status === 'partial').length,
  };

  return reply.send({ tenants: tenantsWithDetails, summary });
});
```

- [ ] **Step 2: Test the endpoint**

Start the API server and test:
```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora/apps/api && npm run dev
```

Test with curl:
```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/dashboard/pending-tenants
```

Expected: Returns list of tenants with pending/overdue/partial payments for current month

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/dashboard.ts
git commit -m "feat: add pending-tenants API endpoint"
```

---

### Task 3: Add Paid-Tenants API Endpoint

**Files:**
- Modify: `apps/api/src/routes/dashboard.ts`

**Interfaces:**
- Consumes: None
- Produces: `GET /dashboard/paid-tenants` returns paid tenants for current month

- [ ] **Step 1: Add paid-tenants endpoint**

In `apps/api/src/routes/dashboard.ts`, add after the pending-tenants endpoint:

```typescript
// Paid tenants for current month (owner/admin only)
app.get('/dashboard/paid-tenants', { preHandler: [authenticate] }, async (request, reply) => {
  if (!requireOwner(request, reply)) return;
  const user = request.user as { userId: string; tenantId: string; email: string; role: string };
  const tenantId = user.tenantId;
  const { propertyId } = request.query as { propertyId?: string };

  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const payConditions = [
    eq(rentPayments.tenantId, tenantId),
    eq(rentPayments.monthYear, currentMonth),
    eq(rentPayments.paymentStatus, 'paid'),
  ];
  if (propertyId) payConditions.push(eq(rentPayments.propertyId, propertyId));
  
  const paidPayments = db.select({
    id: rentPayments.id,
    tenantProfileId: rentPayments.tenantProfileId,
    monthYear: rentPayments.monthYear,
    rentAmount: rentPayments.rentAmount,
    paidAmount: rentPayments.paidAmount,
    paidDate: rentPayments.paidDate,
    paymentMethod: rentPayments.paymentMethod,
  }).from(rentPayments)
    .where(and(...payConditions))
    .all();

  // Get tenant details for each payment
  const tenantsWithDetails = paidPayments.map(payment => {
    const profile = db.select().from(tenantProfiles)
      .where(eq(tenantProfiles.id, payment.tenantProfileId))
      .get();
    const room = profile?.roomId ? db.select().from(rooms)
      .where(eq(rooms.id, profile.roomId))
      .get() : null;
    return {
      id: payment.tenantProfileId,
      name: profile?.fullName || 'Unknown',
      phone: profile?.phone || '',
      roomNumber: room?.roomNumber || 'N/A',
      rentAmount: payment.rentAmount,
      paidAmount: payment.paidAmount,
      paidDate: payment.paidDate,
      paymentMethod: payment.paymentMethod || 'N/A',
    };
  });

  const totalCollected = tenantsWithDetails.reduce((sum, t) => sum + t.paidAmount, 0);

  return reply.send({ 
    tenants: tenantsWithDetails, 
    summary: { total: tenantsWithDetails.length, totalCollected } 
  });
});
```

- [ ] **Step 2: Test the endpoint**

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3001/dashboard/paid-tenants
```

Expected: Returns list of paid tenants for current month

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/dashboard.ts
git commit -m "feat: add paid-tenants API endpoint"
```

---

### Task 4: Update Checkout Endpoint for Refund

**Files:**
- Modify: `apps/api/src/routes/residents.ts`

**Interfaces:**
- Consumes: None
- Produces: Updated `POST /residents/:id/checkout` accepts refundAmount + deductions

- [ ] **Step 1: Update checkout endpoint**

In `apps/api/src/routes/residents.ts`, replace the checkout endpoint (lines 296-353) with:

```typescript
// Check-out resident with deposit refund
app.post('/residents/:id/checkout', { preHandler: [authenticate] }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const tenantId = request.user!.tenantId;
  const body = request.body as {
    moveOutDate?: string;
    refundAmount?: number;
    deductions?: Array<{ reason: string; amount: number }>;
    notes?: string;
  };
  
  const profile = db.select().from(tenantProfiles)
    .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
    .get();
  if (!profile) return reply.status(404).send({ error: 'Resident not found' });

  // Check for pending payments
  const pendingPayments = db.select().from(rentPayments)
    .where(and(
      eq(rentPayments.tenantProfileId, id),
      sql`${rentPayments.paymentStatus} IN ('pending', 'overdue', 'partial')`,
    ))
    .all();
  if (pendingPayments.length > 0) {
    return reply.status(400).send({ 
      error: 'Cannot checkout: pending payments exist', 
      pendingAmount: pendingPayments.reduce((s, p) => s + (p.balanceAmount || 0), 0) 
    });
  }

  // Check for pending complaints
  const pendingComplaints = db.select().from(complaints)
    .where(and(eq(complaints.tenantProfileId, id), sql`${complaints.status} IN ('open', 'in_progress')`))
    .all();
  if (pendingComplaints.length > 0) {
    return reply.status(400).send({ error: 'Cannot checkout: pending complaints exist' });
  }

  const today = body.moveOutDate || new Date().toISOString().split('T')[0];
  const userId = request.user!.userId;
  const depositPaid = profile.depositPaid || 0;
  const totalDeductions = body.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
  const refundAmount = body.refundAmount ?? Math.max(0, depositPaid - totalDeductions);

  // Archive the resident data before checkout
  db.insert(archivedResidents).values({
    id: uuidv4(),
    originalId: id,
    tenantId,
    propertyId: profile.propertyId,
    roomId: profile.roomId,
    bedId: profile.bedId,
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    gender: profile.gender,
    occupation: profile.occupation,
    moveInDate: profile.moveInDate,
    moveOutDate: today,
    rentAmount: profile.rentAmount,
    depositPaid,
    archivedAt: new Date().toISOString(),
    archivedBy: userId,
    reason: body.notes || 'Checked out',
    originalData: JSON.stringify(profile),
  }).run();

  // Update resident status
  db.update(tenantProfiles).set({ 
    status: 'checked_out', 
    moveOutDate: today, 
    updatedAt: new Date().toISOString() 
  }).where(eq(tenantProfiles.id, id)).run();

  // Free up the bed
  if (profile.bedId) {
    db.update(beds).set({ status: 'vacant', updatedAt: new Date().toISOString() })
      .where(eq(beds.id, profile.bedId)).run();
  }

  // Log activity
  db.insert(activityLogs).values({
    id: uuidv4(),
    tenantId,
    actorType: 'user',
    actorId: userId,
    actorName: profile.fullName,
    action: 'resident_checked_out',
    entityType: 'resident',
    entityId: id,
    oldValues: JSON.stringify({ depositPaid, status: 'active' }),
    newValues: JSON.stringify({
      moveOutDate: today,
      depositPaid,
      refundAmount,
      deductions: body.deductions,
    }),
    createdAt: new Date().toISOString(),
  }).run();

  return reply.send({ 
    message: 'Resident checked out successfully',
    resident: profile.fullName,
    depositPaid,
    totalDeductions,
    deductions: body.deductions || [],
    refundAmount,
    moveOutDate: today,
  });
});
```

- [ ] **Step 2: Test the endpoint**

```bash
curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"moveOutDate":"2026-07-18","deductions":[{"reason":"Damage","amount":2000}]}' \
  http://localhost:3001/residents/<id>/checkout
```

Expected: Returns checkout summary with refund calculation

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/routes/residents.ts
git commit -m "feat: update checkout endpoint with deposit refund"
```

---

### Task 5: Create NeumorphicTab Component

**Files:**
- Create: `apps/mobile/src/components/NeumorphicTab.tsx`
- Modify: `apps/mobile/src/components/index.ts`

**Interfaces:**
- Consumes: None
- Produces: `<NeumorphicTab options={TabOption[]} selected={string} onSelect={(value) => void} />`

- [ ] **Step 1: Create NeumorphicTab component**

```tsx
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useRef, useEffect } from 'react';
import { theme } from '../lib/theme';

interface TabOption {
  label: string;
  value: string;
}

interface NeumorphicTabProps {
  options: TabOption[];
  selected: string;
  onSelect: (value: string) => void;
}

export function NeumorphicTab({ options, selected, onSelect }: NeumorphicTabProps) {
  const animations = useRef(options.map(() => new Animated.Value(0))).current;
  const particleAnims = useRef(options.map(() => ({
    scale: new Animated.Value(0),
    opacity: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    options.forEach((opt, index) => {
      const isSelected = opt.value === selected;
      Animated.parallel([
        Animated.timing(animations[index], {
          toValue: isSelected ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
        isSelected ? Animated.sequence([
          Animated.delay(50),
          Animated.parallel([
            Animated.spring(particleAnims[index].scale, {
              toValue: 1,
              friction: 4,
              useNativeDriver: true,
            }),
            Animated.timing(particleAnims[index].opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(particleAnims[index].scale, {
              toValue: 0,
              duration: 400,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(particleAnims[index].opacity, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
        ]) : null,
      ].filter(Boolean)).start();
    });
  }, [selected]);

  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = option.value === selected;
        const bg = animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.surface, theme.colors.primary],
        });
        const textColor = animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [theme.colors.text, '#FFFFFF'],
        });
        const shadowIntensity = animations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0],
        });

        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <Animated.View
              style={[
                styles.tab,
                {
                  backgroundColor: bg,
                  shadowOpacity: shadowIntensity,
                },
                isSelected && styles.tabSelected,
              ]}
            >
              <Animated.Text
                style={[
                  styles.tabText,
                  { color: textColor },
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {option.label}
              </Animated.Text>
              
              {/* Particle effect */}
              <Animated.View
                style={[
                  styles.particle,
                  styles.particleTop,
                  {
                    transform: [{ scale: particleAnims[index].scale }],
                    opacity: particleAnims[index].opacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.particle,
                  styles.particleBottom,
                  {
                    transform: [{ scale: particleAnims[index].scale }],
                    opacity: particleAnims[index].opacity,
                  },
                ]}
              />
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowRadius: 6,
    position: 'relative',
    overflow: 'visible',
  },
  tabSelected: {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: -2, height: -2 },
    shadowRadius: 4,
  },
  tabText: {
    fontSize: 13,
    fontFamily: theme.font.semiBold,
    color: theme.colors.text,
  },
  tabTextSelected: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
  particleTop: {
    top: -8,
    left: '50%',
    marginLeft: -3,
  },
  particleBottom: {
    bottom: -8,
    left: '50%',
    marginLeft: -3,
  },
});
```

- [ ] **Step 2: Export component**

Add to `apps/mobile/src/components/index.ts`:
```typescript
export { NeumorphicTab } from './NeumorphicTab';
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/NeumorphicTab.tsx apps/mobile/src/components/index.ts
git commit -m "feat: add NeumorphicTab component with particle effects"
```

---

### Task 6: Create AnimatedCard Component

**Files:**
- Create: `apps/mobile/src/components/AnimatedCard.tsx`
- Modify: `apps/mobile/src/components/index.ts`

**Interfaces:**
- Consumes: None
- Produces: `<AnimatedCard delay={number}>{children}</AnimatedCard>`

- [ ] **Step 1: Create AnimatedCard component**

```tsx
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useRef, useEffect } from 'react';
import { theme } from '../lib/theme';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function AnimatedCard({ children, delay = 0, style }: AnimatedCardProps) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
});
```

- [ ] **Step 2: Export component**

Add to `apps/mobile/src/components/index.ts`:
```typescript
export { AnimatedCard } from './AnimatedCard';
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/AnimatedCard.tsx apps/mobile/src/components/index.ts
git commit -m "feat: add AnimatedCard component with staggered entrance"
```

---

### Task 7: Create PendingTenants Screen

**Files:**
- Create: `apps/mobile/app/(owner)/pending-tenants.tsx`

**Interfaces:**
- Consumes: `GET /dashboard/pending-tenants` API
- Produces: Pending tenants list with WhatsApp action buttons

- [ ] **Step 1: Create PendingTenants screen**

```tsx
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Clock, AlertCircle } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';

interface PendingTenant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  rentAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'pending' | 'overdue' | 'partial';
  dueDate: string;
}

export default function PendingTenants() {
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-tenants'],
    queryFn: () => api.get('/dashboard/pending-tenants').then(r => r.data || r),
  });

  const handleWhatsAppReminder = (phone: string, name: string, amount: number) => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const message = `Dear ${name},\n\nThis is a reminder that your rent payment of ₹${amount.toLocaleString('en-IN')} for ${currentMonth} is pending.\n\nPlease make the payment at your earliest convenience.\n\nRegards,\nOpsora Team`;
    const encodedMessage = encodeURIComponent(message);
    const phoneUrl = `whatsapp://send?phone=${phone.replace(/[^0-9]/g, '')}&text=${encodedMessage}`;
    Linking.openURL(phoneUrl).catch(() => {
      Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`);
    });
  };

  const handleRemindAll = () => {
    const tenants = data?.tenants || [];
    tenants.forEach((t: PendingTenant) => {
      if (t.phone) {
        handleWhatsAppReminder(t.phone, t.name, t.balanceAmount);
      }
    });
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load pending tenants" onRetry={refetch} />;

  const tenants = data?.tenants || [];
  const summary = data?.summary || {};

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Tenants ({tenants.length})</Text>
        {tenants.length > 0 && (
          <TouchableOpacity style={styles.remindAllButton} onPress={handleRemindAll}>
            <MessageCircle size={16} color="#FFFFFF" />
            <Text style={styles.remindAllText}>Remind All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {tenants.length === 0 ? (
          <EmptyState title="No pending tenants" message="All tenants have paid for this month" />
        ) : (
          tenants.map((tenant: PendingTenant) => (
            <Card key={tenant.id} style={styles.tenantCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  {tenant.status === 'overdue' ? (
                    <AlertCircle size={20} color={theme.colors.danger} />
                  ) : (
                    <Clock size={20} color={theme.colors.warning} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.tenantName}>{tenant.name}</Text>
                  <Text style={styles.roomNumber}>Room {tenant.roomNumber}</Text>
                </View>
                <StatusBadge status={tenant.status} />
              </View>
              
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Rent</Text>
                  <Text style={styles.amount}>{formatCurrency(tenant.rentAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Paid</Text>
                  <Text style={[styles.amount, { color: theme.colors.success }]}>
                    {formatCurrency(tenant.paidAmount)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Balance</Text>
                  <Text style={[styles.amount, { color: theme.colors.danger }]}>
                    {formatCurrency(tenant.balanceAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dueDate}>Due: {formatDate(tenant.dueDate)}</Text>
                {tenant.phone && (
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => handleWhatsAppReminder(tenant.phone, tenant.name, tenant.balanceAmount)}
                  >
                    <MessageCircle size={14} color="#FFFFFF" />
                    <Text style={styles.whatsappButtonText}>Remind</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, marginLeft: 8 },
  remindAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  remindAllText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  container: { flex: 1 },
  tenantCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.dangerSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  tenantName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomNumber: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  dueDate: { fontSize: 12, color: theme.colors.textMuted },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
  },
  whatsappButtonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});
```

- [ ] **Step 2: Test the screen**

Navigate to the screen from dashboard and verify:
- List shows only unpaid tenants
- WhatsApp buttons work correctly
- "Remind All" sends to all tenants

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(owner\)/pending-tenants.tsx
git commit -m "feat: add PendingTenants screen with WhatsApp reminders"
```

---

### Task 8: Create PaidTenants Screen

**Files:**
- Create: `apps/mobile/app/(owner)/paid-tenants.tsx`

**Interfaces:**
- Consumes: `GET /dashboard/paid-tenants` API
- Produces: Paid tenants list

- [ ] **Step 1: Create PaidTenants screen**

```tsx
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle, CreditCard } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';

interface PaidTenant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  rentAmount: number;
  paidAmount: number;
  paidDate: string;
  paymentMethod: string;
}

export default function PaidTenants() {
  const router = useRouter();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['paid-tenants'],
    queryFn: () => api.get('/dashboard/paid-tenants').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load paid tenants" onRetry={refetch} />;

  const tenants = data?.tenants || [];
  const summary = data?.summary || {};

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paid Tenants ({tenants.length})</Text>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {tenants.length === 0 ? (
          <EmptyState title="No paid tenants" message="No tenants have paid for this month yet" />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Collected</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalCollected || 0)}</Text>
            </View>

            {tenants.map((tenant: PaidTenant) => (
              <Card key={tenant.id} style={styles.tenantCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <CheckCircle size={20} color={theme.colors.success} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.tenantName}>{tenant.name}</Text>
                    <Text style={styles.roomNumber}>Room {tenant.roomNumber}</Text>
                  </View>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Paid</Text>
                  </View>
                </View>
                
                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amount}>{formatCurrency(tenant.paidAmount)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Paid On</Text>
                    <Text style={styles.amount}>{formatDate(tenant.paidDate)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Method</Text>
                    <Text style={styles.methodText}>{tenant.paymentMethod}</Text>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, marginLeft: 8 },
  container: { flex: 1 },
  summaryCard: {
    backgroundColor: theme.colors.successSurface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 24, fontFamily: theme.font.extraBold, color: theme.colors.success, marginTop: 4 },
  tenantCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.successSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  tenantName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomNumber: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  paidBadge: { backgroundColor: theme.colors.successSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  paidBadgeText: { fontSize: 12, fontFamily: theme.font.semiBold, color: theme.colors.success },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, marginTop: 2 },
  methodText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
});
```

- [ ] **Step 2: Test the screen**

Navigate to the screen from dashboard and verify:
- List shows only paid tenants
- Summary shows total collected amount
- Payment method is displayed correctly

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(owner\)/paid-tenants.tsx
git commit -m "feat: add PaidTenants screen"
```

---

### Task 9: Create Checkout Screen

**Files:**
- Create: `apps/mobile/app/(owner)/checkout.tsx`

**Interfaces:**
- Consumes: `POST /residents/:id/checkout` API
- Produces: Checkout flow with deposit refund calculation

- [ ] **Step 1: Create Checkout screen**

```tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, CreditCard, Plus, X } from 'lucide-react-native';
import { Card, LoadingSkeleton, ErrorState, Button } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';

interface Deduction {
  reason: string;
  amount: number;
}

export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => api.get(`/residents/${id}/details`).then(r => r.data || r),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.post(`/residents/${id}/checkout`, {
      moveOutDate: new Date().toISOString().split('T')[0],
      deductions,
      notes: 'Checked out via app',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tenants'] });
      Alert.alert('Success', 'Resident checked out successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to checkout resident');
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load resident details" />;

  const resident = data?.profile || data;
  const depositPaid = resident?.depositPaid || 5000;
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = Math.max(0, depositPaid - totalDeductions);

  const handleAddDeduction = () => {
    if (!newReason || !newAmount) {
      Alert.alert('Error', 'Please enter both reason and amount');
      return;
    }
    const amount = parseInt(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setDeductions([...deductions, { reason: newReason, amount }]);
    setNewReason('');
    setNewAmount('');
    setShowAddDeduction(false);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    Alert.alert(
      'Confirm Checkout',
      `Refund amount: ${formatCurrency(refundAmount)}\n\nProceed with checkout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => checkoutMutation.mutate() },
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Resident</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{resident?.fullName?.charAt(0) || '?'}</Text>
          </View>
          <Text style={styles.name}>{resident?.fullName}</Text>
          <Text style={styles.roomInfo}>Room {data?.room?.roomNumber} · Bed {data?.bed?.bedNumber}</Text>
          <Text style={styles.stayInfo}>
            Stayed: {resident?.moveInDate} - {new Date().toLocaleDateString()}
          </Text>
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Deposit Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit Paid</Text>
            <Text style={styles.summaryValue}>{formatCurrency(depositPaid)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryRowBorder]}>
            <Text style={styles.summaryLabel}>Total Deductions</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>
              -{formatCurrency(totalDeductions)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontFamily: theme.font.bold }]}>Refund Amount</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success, fontSize: 20 }]}>
              {formatCurrency(refundAmount)}
            </Text>
          </View>
        </Card>

        <Card style={styles.deductionsCard}>
          <View style={styles.deductionsHeader}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddDeduction(true)}
            >
              <Plus size={16} color={theme.colors.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {deductions.length === 0 ? (
            <Text style={styles.noDeductions}>No deductions added</Text>
          ) : (
            deductions.map((deduction, index) => (
              <View key={index} style={styles.deductionItem}>
                <View style={styles.deductionInfo}>
                  <Text style={styles.deductionReason}>{deduction.reason}</Text>
                  <Text style={styles.deductionAmount}>{formatCurrency(deduction.amount)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDeduction(index)}>
                  <X size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {showAddDeduction && (
            <View style={styles.addDeductionForm}>
              <TextInput
                style={styles.input}
                placeholder="Reason (e.g., Damage)"
                value={newReason}
                onChangeText={setNewReason}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount (₹)"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
              />
              <View style={styles.formButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowAddDeduction(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleAddDeduction}
                >
                  <Text style={styles.saveButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelCheckoutButton} onPress={() => router.back()}>
            <Text style={styles.cancelCheckoutText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleCheckout}
            disabled={checkoutMutation.isPending}
          >
            <Text style={styles.confirmButtonText}>
              {checkoutMutation.isPending ? 'Processing...' : `Confirm ${formatCurrency(refundAmount)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, marginLeft: 8 },
  container: { flex: 1 },
  profileCard: { alignItems: 'center', marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontFamily: theme.font.bold },
  name: { fontSize: 22, fontFamily: theme.font.extraBold, color: theme.colors.text },
  roomInfo: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  stayInfo: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  summaryCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text },
  deductionsCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md },
  deductionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.primary },
  noDeductions: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  deductionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  deductionInfo: { flex: 1 },
  deductionReason: { fontSize: 14, color: theme.colors.text },
  deductionAmount: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  addDeductionForm: { marginTop: 12, padding: 12, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md },
  input: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8, fontSize: 14 },
  formButtons: { flexDirection: 'row', gap: 8 },
  cancelButton: { flex: 1, padding: 12, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, color: theme.colors.textSecondary },
  saveButton: { flex: 1, padding: 12, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 14, color: '#FFFFFF', fontFamily: theme.font.semiBold },
  buttonRow: { flexDirection: 'row', gap: 12, marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md },
  cancelCheckoutButton: { flex: 1, padding: 16, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, alignItems: 'center' },
  cancelCheckoutText: { fontSize: 16, color: theme.colors.textSecondary, fontFamily: theme.font.semiBold },
  confirmButton: { flex: 2, padding: 16, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.danger, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, color: '#FFFFFF', fontFamily: theme.font.bold },
});
```

- [ ] **Step 2: Test the screen**

Navigate to checkout from resident detail and verify:
- Deposit summary calculates correctly
- Adding/removing deductions updates refund amount
- Checkout mutation calls API with correct data

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(owner\)/checkout.tsx
git commit -m "feat: add Checkout screen with deposit refund"
```

---

### Task 10: Redesign Dashboard with Animations

**Files:**
- Modify: `apps/mobile/app/(owner)/dashboard.tsx`

**Interfaces:**
- Consumes: All existing API endpoints + new pending-tenants, paid-tenants
- Produces: Redesigned dashboard with staggered animations

- [ ] **Step 1: Update dashboard imports and data fetching**

Replace the imports and data fetching section:

```tsx
import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Bell, Building, Users, CreditCard, AlertCircle, UserPlus, BedDouble, CheckCircle } from 'lucide-react-native';
import { GradientHeader, RevenueChart, ProgressRing, ErrorState, DashboardSkeleton, AnimatedCard, NeumorphicTab } from '../../src/components';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

- [ ] **Step 2: Update payment status tabs**

Replace the payment status section with NeumorphicTab:

```tsx
const PAYMENT_TABS = [
  { label: 'Total', value: 'total' },
  { label: 'Paid', value: 'paid' },
  { label: 'Not Paid', value: 'not_paid' },
];

// In the component:
const [selectedTab, setSelectedTab] = useState('total');

const handleTabPress = (value: string) => {
  setSelectedTab(value);
  if (value === 'paid') {
    router.push('/(owner)/paid-tenants');
  } else if (value === 'not_paid') {
    router.push('/(owner)/pending-tenants');
  } else {
    router.push({ pathname: '/(owner)/payments', params: { filter: 'all', month: currentMonth } });
  }
};
```

- [ ] **Step 3: Update occupancy display**

Replace the occupancy section with unified display:

```tsx
<AnimatedCard delay={0}>
  <View style={styles.occupancyCard}>
    <Text style={styles.sectionTitle}>Occupancy Overview</Text>
    <View style={styles.occupancyRow}>
      <ProgressRing percentage={occupancyRate} size={100} strokeWidth={10} label={`${occupiedBeds}/${totalBeds}`} sublabel="beds occupied" />
      <View style={styles.occupancyDetails}>
        <Text style={styles.occupancyRate}>{occupancyRate}% occupancy rate</Text>
        <Text style={styles.occupancySub}>{occupiedBeds} tenants in {totalBeds} beds</Text>
        <Text style={styles.occupancyVacant}>{occupancy.vacantBeds || 0} beds vacant</Text>
      </View>
    </View>
  </View>
</AnimatedCard>
```

- [ ] **Step 4: Update payment reminder card**

Replace the PaymentReminder with NeumorphicTab and real data:

```tsx
<AnimatedCard delay={100}>
  <View style={styles.paymentCard}>
    <View style={styles.paymentHeader}>
      <Text style={styles.sectionTitle}>Payment Status</Text>
      <Text style={styles.monthText}>{currentMonth}</Text>
    </View>
    
    <NeumorphicTab
      options={PAYMENT_TABS}
      selected={selectedTab}
      onSelect={handleTabPress}
    />
    
    <View style={styles.paymentStats}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{totalCount}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.colors.success }]}>{paidCount}</Text>
        <Text style={styles.statLabel}>Paid</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={[styles.statValue, { color: theme.colors.danger }]}>{pendingCount + overdueCount}</Text>
        <Text style={styles.statLabel}>Not Paid</Text>
      </View>
    </View>
    
    <View style={styles.collectionRow}>
      <Text style={styles.collectionLabel}>Collection Rate</Text>
      <Text style={[styles.collectionValue, { 
        color: collectionRate >= 80 ? theme.colors.success : 
          collectionRate >= 50 ? theme.colors.warning : theme.colors.danger 
      }]}>
        {collectionRate}%
      </Text>
    </View>
  </View>
</AnimatedCard>
```

- [ ] **Step 5: Update remaining cards with AnimatedCard**

Wrap remaining sections:

```tsx
<AnimatedCard delay={200}>
  <RevenueChart data={trend} range={chartRange} onRangeChange={setChartRange} />
</AnimatedCard>

<AnimatedCard delay={300}>
  {data?.recentActivity?.length ? (
    <View style={styles.activityCard}>
      {/* ... existing activity content ... */}
    </View>
  ) : null}
</AnimatedCard>
```

- [ ] **Step 6: Update styles**

Add new styles for the redesigned layout:

```tsx
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  occupancyCard: { /* ... */ },
  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.md },
  occupancyDetails: { flex: 1 },
  occupancyRate: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text },
  occupancySub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  occupancyVacant: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  paymentCard: { /* ... */ },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  monthText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.primary },
  paymentStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: theme.spacing.md },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontFamily: theme.font.extraBold, color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  collectionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  collectionLabel: { fontSize: 13, color: theme.colors.textSecondary },
  collectionValue: { fontSize: 16, fontFamily: theme.font.bold },
  activityCard: { /* ... existing styles ... */ },
});
```

- [ ] **Step 7: Remove dummy data**

Delete the hardcoded `pendingResidents` array (lines 115-120).

- [ ] **Step 8: Test the dashboard**

Verify:
- Cards animate in with staggered timing
- NeumorphicTab has particle effects on selection
- Tapping "Paid" navigates to PaidTenants screen
- Tapping "Not Paid" navigates to PendingTenants screen
- Occupancy shows "X tenants in Y beds (Z%)"

- [ ] **Step 9: Commit**

```bash
git add apps/mobile/app/\(owner\)/dashboard.tsx
git commit -m "feat: redesign dashboard with animations and real data"
```

---

### Task 11: Update Tab Layout

**Files:**
- Modify: `apps/mobile/app/(owner)/_layout.tsx`

**Interfaces:**
- Consumes: New screens
- Produces: Updated tab configuration

- [ ] **Step 1: Update tab layout**

Ensure new screens are accessible but not shown in tab bar:

```tsx
// Add to the tabs array if not already present:
{
  name: 'pending-tenants',
  href: null, // Hide from tab bar
},
{
  name: 'paid-tenants',
  href: null, // Hide from tab bar
},
{
  name: 'checkout',
  href: null, // Hide from tab bar
},
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/\(owner\)/_layout.tsx
git commit -m "feat: update tab layout for new screens"
```

---

### Task 12: Final Testing and Cleanup

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified working implementation

- [ ] **Step 1: Run API seed**

```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora && npm run db:seed
```

Expected: Seed completes with 12 months of data at ₹10,500 rent

- [ ] **Step 2: Start API server**

```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora/apps/api && npm run dev
```

Expected: API server starts on port 3001

- [ ] **Step 3: Test API endpoints**

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sunshinepg.com","password":"password123"}' | jq -r '.token')

# Test pending-tenants
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/dashboard/pending-tenants

# Test paid-tenants
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/dashboard/paid-tenants
```

Expected: Both endpoints return tenant data

- [ ] **Step 4: Start mobile app**

```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora/apps/mobile && npx expo start
```

Expected: Mobile app starts without errors

- [ ] **Step 5: Test full flow**

1. Login as owner
2. Verify dashboard loads with animated cards
3. Tap "Paid" tab → navigates to PaidTenants screen
4. Tap "Not Paid" tab → navigates to PendingTenants screen
5. Test WhatsApp reminder on pending tenant
6. Navigate to resident detail → tap Checkout
7. Add deductions → verify refund calculation
8. Complete checkout → verify bed status updates

- [ ] **Step 6: Run lint**

```bash
cd /Users/yudhistherkumar/Downloads/mk/opsora/apps/mobile && npm run lint
```

Expected: No lint errors

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete dashboard redesign with animations, payment flow, and checkout"
```
