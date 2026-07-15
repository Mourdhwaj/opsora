# Room Layout Display + Group Check-in Wizard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual room layout screen showing bed status per room, and a multi-step group check-in wizard for bulk tenant allocation on mobile.

**Architecture:** Two new screens — `rooms.tsx` (visual bed grid per property) and `check-in.tsx` (multi-step wizard). Both consume existing API endpoints (`GET /allocation/rooms`, `POST /allocation/suggest-group`, `POST /residents/checkin-group`). No backend changes needed. Follows existing mobile patterns: animated sidebar drawer, FlatList, BottomSheet, React Query.

**Tech Stack:** React Native (Expo), expo-router, @tanstack/react-query, AsyncStorage (not needed for this), existing api client, existing BottomSheet/SearchBar/FilterBar/Card components.

## Global Constraints

- Expo SDK 54, React Native, Expo Go compatible (no native modules beyond what's installed)
- Dev server: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://192.168.1.13:3001 EXPO_NO_METRO_WORKSPACE_ROOT=1 npx expo start --clear`
- API base: `http://192.168.1.13:3001` (Mac LAN IP for physical device)
- No `react-native-chart-kit` for new screens (use CSS-based visualizations)
- All screens use existing components from `src/components/` (Card, BottomSheet, SearchBar, FilterBar, StatusBadge, EmptyState, LoadingSkeleton, ErrorState)
- TypeScript strict — zero `any` in new code where possible
- `href: false as any` for hidden nested routes in layouts
- `activeOpacity={0.6-0.7}` on all TouchableOpacity buttons
- Consistent border-radius: 14px cards, 10px buttons, 20px chips
- Shadow tint: `#1a1a2e` not `#000`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/(owner)/rooms.tsx` | Room layout grid — visual bed status per room grouped by floor |
| Create | `app/(owner)/check-in.tsx` | Group check-in wizard — 5-step flow for bulk tenant allocation |
| Modify | `app/(owner)/_layout.tsx` | Add `rooms` and `check-in` Tabs.Screen entries + drawer items |
| Modify | `app/(owner)/properties/[id].tsx` | Add "View Room Layout" button linking to rooms screen |
| Modify | `src/types/index.ts` | Add `AllocationRoom`, `RoomCombination`, `RoomAssignment`, `GroupCheckinResident` types |
| Modify | `src/components/BottomSheet.tsx` | Add optional `scrollable` prop for tall content |

---

## Task 1: Add Types for Allocation & Group Check-in

**Files:**
- Modify: `apps/mobile/src/types/index.ts`

**Interfaces:**
- Produces: `AllocationRoom`, `AllocationBed`, `RoomCombination`, `RoomAssignment`, `GroupCheckinResident`

- [ ] **Step 1: Add allocation types to end of `src/types/index.ts`**

```typescript
// ── Allocation & Room Layout ────────────────────────────────────────────────────
export interface AllocationBed {
  id: string;
  bedNumber: string;
  roomId: string;
  propertyId: string;
  status: 'vacant' | 'occupied' | 'maintenance';
  occupant: {
    id: string;
    fullName: string;
    gender: string;
    phone: string;
  } | null;
}

export interface AllocationRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  sharingType: string;
  rentPerBed: number;
  depositAmount: number;
  floorId: string;
  floorNumber: number;
  floorName: string;
  gender: string;
  status: string;
  totalBeds: number;
  vacantBeds: number;
  beds: AllocationBed[];
  genderBreakdown: { male: number; female: number; other: number };
}

export interface RoomAssignment {
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  floorName: string;
  roomType: string;
  totalBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  depositAmount: number;
  currentGenders: string[];
  occupants: { name: string; gender: string }[];
  vacantBedIds: { bedId: string; bedNumber: string }[];
  assignedBeds: number;
}

export interface RoomCombination {
  maleRooms: RoomAssignment[];
  femaleRooms: RoomAssignment[];
  coupleRooms: RoomAssignment[];
  totalRooms: number;
  totalBeds: number;
  avgRent: number;
  score: number;
  partialAllocation?: {
    type: 'male-only' | 'female-only';
    message: string;
    malesAllocated: boolean;
    femalesAllocated: boolean;
  };
}

export interface GroupCheckinResident {
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  bloodGroup?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  occupation?: string;
  companyName?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  bedId: string;
  roomId: string;
  roomNumber: string;
  bedNumber: string;
  rentAmount: number;
  depositPaid: number;
  foodPreference: string;
  mealPlan: string;
}
```

- [ ] **Step 2: Verify types compile**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 2: Room Layout Screen — Visual Bed Grid

**Files:**
- Create: `apps/mobile/app/(owner)/rooms.tsx`

**Interfaces:**
- Consumes: `AllocationRoom` from Task 1
- Consumes: `api` client from `src/services/api`
- Consumes: `Card`, `LoadingSkeleton`, `EmptyState`, `ErrorState`, `SearchBar`, `FilterBar` from `src/components`
- Produces: Renders at `/(owner)/rooms`

- [ ] **Step 1: Create `app/(owner)/rooms.tsx` with property selector + floor-grouped room grid**

The screen structure:
1. Property picker (horizontal ScrollView of pills — fetches `GET /properties`)
2. Floor-grouped sections — each floor has a header ("Floor 1") and a grid of room cards
3. Each room card shows:
   - Room number + type badge (e.g. "1BHK", "Double")
   - Bed grid: colored dots in a row (green=vacant, blue=occupied, gray=maintenance)
   - Occupancy text ("2/4 beds")
   - Rent per bed
4. Tap a room card → BottomSheet with full bed details (bed number, tenant name if occupied, gender)
5. SearchBar to filter rooms by number
6. FilterBar for status (All, Vacant, Partial, Full)

```typescript
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, ErrorState, SearchBar, FilterBar, BottomSheet } from '../../src/components';
import { api } from '../../src/services/api';
import type { AllocationRoom } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Vacant', value: 'vacant' },
  { label: 'Partial', value: 'partial' },
  { label: 'Full', value: 'full' },
];

export default function RoomsScreen() {
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<AllocationRoom | null>(null);

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: () => api.get('/properties', { params: { limit: 50 } }).then((r: any) => r.data?.data || []),
  });

  const { data: rooms, isLoading, error, refetch } = useQuery<AllocationRoom[]>({
    queryKey: ['allocation-rooms', selectedProperty],
    queryFn: () => {
      const params: any = {};
      if (selectedProperty) params.propertyId = selectedProperty;
      return api.get('/allocation/rooms', { params }).then((r: any) => r.data || []);
    },
    enabled: !!selectedProperty || (!selectedProperty && properties?.length > 0),
  });

  // Auto-select first property
  if (properties?.length > 0 && !selectedProperty) {
    setSelectedProperty(properties[0].id);
  }

  const filtered = (rooms || []).filter(r => {
    const matchSearch = r.roomNumber?.toLowerCase().includes(search.toLowerCase());
    let matchStatus = true;
    if (statusFilter === 'vacant') matchStatus = r.vacantBeds === r.totalBeds;
    else if (statusFilter === 'full') matchStatus = r.vacantBeds === 0;
    else if (statusFilter === 'partial') matchStatus = r.vacantBeds > 0 && r.vacantBeds < r.totalBeds;
    return matchSearch && matchStatus;
  });

  // Group by floor
  const floors = filtered.reduce((acc: Record<number, AllocationRoom[]>, room) => {
    const fn = room.floorNumber || 0;
    if (!acc[fn]) acc[fn] = [];
    acc[fn].push(room);
    return acc;
  }, {});

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load rooms" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      {/* Property pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
        {(properties || []).map((p: any) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.propertyPill, selectedProperty === p.id && styles.propertyPillActive]}
            onPress={() => setSelectedProperty(p.id)}
            activeOpacity={0.6}
          >
            <Text style={[styles.propertyPillText, selectedProperty === p.id && styles.propertyPillTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search rooms..." />
      <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No rooms found" message="Add rooms to your property first" icon="🏠" />
      ) : (
        <FlatList
          data={Object.keys(floors).sort((a, b) => Number(a) - Number(b))}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(fn) => `floor-${fn}`}
          renderItem={({ item: fn }) => (
            <View style={styles.floorSection}>
              <Text style={styles.floorHeader}>Floor {fn}</Text>
              <View style={styles.roomGrid}>
                {floors[Number(fn)].map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.roomCard}
                    onPress={() => setSelectedRoom(room)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomCardHeader}>
                      <Text style={styles.roomNumber}>{room.roomNumber}</Text>
                      <View style={[styles.occupancyBadge, {
                        backgroundColor: room.vacantBeds === room.totalBeds ? '#dcfce7'
                          : room.vacantBeds === 0 ? '#fee2e2' : '#fef3c7'
                      }]}>
                        <Text style={[styles.occupancyText, {
                          color: room.vacantBeds === room.totalBeds ? '#16a34a'
                            : room.vacantBeds === 0 ? '#dc2626' : '#d97706'
                        }]}>{room.totalBeds - room.vacantBeds}/{room.totalBeds}</Text>
                      </View>
                    </View>
                    <Text style={styles.roomType}>{room.roomType} · {room.sharingType}-share</Text>
                    <Text style={styles.roomRent}>₹{room.rentPerBed}/mo</Text>
                    {/* Bed dots */}
                    <View style={styles.bedDots}>
                      {room.beds.map((bed) => (
                        <View
                          key={bed.id}
                          style={[styles.bedDot, {
                            backgroundColor: bed.status === 'occupied' ? '#3b82f6'
                              : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                          }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}

      {/* Room detail bottom sheet */}
      <BottomSheet visible={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={`Room ${selectedRoom?.roomNumber}`}>
        {selectedRoom && (
          <View style={styles.sheetContent}>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetLabel}>Type</Text>
              <Text style={styles.sheetValue}>{selectedRoom.roomType} · {selectedRoom.sharingType}-share</Text>
            </View>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetLabel}>Rent</Text>
              <Text style={styles.sheetValue}>₹{selectedRoom.rentPerBed}/month</Text>
            </View>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetLabel}>Gender</Text>
              <Text style={styles.sheetValue}>{selectedRoom.gender || 'Mixed'}</Text>
            </View>
            <Text style={styles.sheetSectionTitle}>Beds</Text>
            {selectedRoom.beds.map((bed) => (
              <View key={bed.id} style={styles.bedRow}>
                <View style={[styles.bedDotLarge, {
                  backgroundColor: bed.status === 'occupied' ? '#3b82f6'
                    : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bedNumber}>Bed {bed.bedNumber}</Text>
                  {bed.occupant ? (
                    <Text style={styles.bedOccupant}>{bed.occupant.fullName} · {bed.occupant.gender}</Text>
                  ) : (
                    <Text style={styles.bedVacant}>Vacant</Text>
                  )}
                </View>
                <Text style={[styles.bedStatus, {
                  color: bed.status === 'occupied' ? '#3b82f6'
                    : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                }]}>{bed.status}</Text>
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  propertyRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  propertyPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  propertyPillActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  propertyPillText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  propertyPillTextActive: { color: '#fff' },
  floorSection: { marginBottom: 20 },
  floorHeader: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 10, paddingHorizontal: 4 },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, width: '47%', shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomNumber: { fontSize: 16, fontWeight: '700', color: '#111827' },
  occupancyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  occupancyText: { fontSize: 12, fontWeight: '600' },
  roomType: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  roomRent: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  bedDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  bedDot: { width: 10, height: 10, borderRadius: 5 },
  sheetContent: { paddingTop: 8 },
  sheetInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sheetLabel: { fontSize: 14, color: '#6b7280' },
  sheetValue: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  sheetSectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 10 },
  bedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  bedDotLarge: { width: 12, height: 12, borderRadius: 6 },
  bedNumber: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bedOccupant: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  bedVacant: { fontSize: 12, color: '#22c55e', marginTop: 2 },
  bedStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 3: Register Room Layout in Owner Layout + Drawer

**Files:**
- Modify: `apps/mobile/app/(owner)/_layout.tsx`

**Interfaces:**
- Consumes: `rooms` screen from Task 2

- [ ] **Step 1: Add `rooms` Tabs.Screen entry (visible) in owner layout**

After the `iot/electricity` screen and before `more`, add:

```tsx
<Tabs.Screen name="rooms" options={{ title: 'Rooms', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🛏️</Text> }} />
```

- [ ] **Step 2: Add "Room Layout" to drawer items**

In the `ownerItems` array, add after the existing items (before the `more` entry):

```typescript
{ icon: '🛏️', label: 'Room Layout', route: '/(owner)/rooms' },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 4: Add "View Room Layout" Link to Property Detail

**Files:**
- Modify: `apps/mobile/app/(owner)/properties/[id].tsx`

**Interfaces:**
- Consumes: `rooms` route from Task 3

- [ ] **Step 1: Add a "View Room Layout" button in the property detail screen**

After the rooms list section and before the floors section, add a navigation button:

```tsx
<TouchableOpacity
  style={styles.viewRoomsBtn}
  onPress={() => router.push('/(owner)/rooms')}
  activeOpacity={0.6}
>
  <Text style={styles.viewRoomsBtnText}>🛏️ View Room Layout</Text>
  <Text style={styles.viewRoomsArrow}>›</Text>
</TouchableOpacity>
```

Add corresponding styles:

```typescript
viewRoomsBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, marginBottom: 16 },
viewRoomsBtnText: { fontSize: 15, fontWeight: '600', color: '#3b82f6' },
viewRoomsArrow: { fontSize: 20, color: '#3b82f6' },
```

Also add the `router` import if not already present:

```typescript
import { useRouter } from 'expo-router';
```

And inside the component:

```typescript
const router = useRouter();
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 5: Group Check-in Wizard — Step 1: Group Composition

**Files:**
- Create: `apps/mobile/app/(owner)/check-in.tsx`

**Interfaces:**
- Consumes: `AllocationRoom`, `RoomCombination`, `RoomAssignment`, `GroupCheckinResident` from Task 1
- Consumes: `api` client from `src/services/api`
- Consumes: `Card`, `LoadingSkeleton`, `ErrorState`, `BottomSheet` from `src/components`
- Produces: Renders at `/(owner)/check-in`

- [ ] **Step 1: Create `app/(owner)/check-in.tsx` with wizard shell and Step 0 (Group Composition)**

The wizard has 5 steps:
0. **Group** — Male/Female/Couple counters + property picker
1. **Rooms** — Algorithm suggestions, bed assignment per gender group
2. **Details** — Per-person form (name, phone, gender, DOB, occupation)
3. **Financial** — Rent, deposit, food preference per person
4. **Review** — Summary of all residents before submit

```typescript
import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, ErrorState, BottomSheet } from '../../src/components';
import { api } from '../../src/services/api';
import type { AllocationRoom, RoomCombination, RoomAssignment, GroupCheckinResident } from '../../src/types';

interface GroupComposition { males: number; females: number; couples: number; }

const STEPS = ['Group', 'Rooms', 'Details', 'Financial', 'Review'];

function emptyResident(gender: 'male' | 'female'): GroupCheckinResident {
  return {
    fullName: '', phone: '', email: '', gender,
    bedId: '', roomId: '', roomNumber: '', bedNumber: '',
    rentAmount: 0, depositPaid: 0,
    foodPreference: 'vegetarian', mealPlan: 'both',
  };
}

export default function GroupCheckinScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [composition, setComposition] = useState<GroupComposition>({ males: 0, females: 0, couples: 0 });
  const [selectedProperty, setSelectedProperty] = useState('');
  const [combinations, setCombinations] = useState<RoomCombination[]>([]);
  const [selectedComboIndex, setSelectedComboIndex] = useState(0);
  const [residents, setResidents] = useState<GroupCheckinResident[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: () => api.get('/properties', { params: { limit: 50 } }).then((r: any) => r.data?.data || []),
  });

  const totalPeople = composition.males + composition.females + composition.couples * 2;
  const combo = combinations[selectedComboIndex];
  const totalAssigned = residents.filter(r => r.bedId).length;

  // ... (remaining implementation in Steps 2-5 below)
}
```

- [ ] **Step 2: Implement Step 0 — Group Composition UI**

Add to the component, rendered when `step === 0`:

```tsx
// Inside the component, before the return:
const updateComposition = (field: keyof GroupComposition, delta: number) => {
  setComposition(prev => ({
    ...prev,
    [field]: Math.max(0, prev[field] + delta),
  }));
};

// Step 0 render:
{step === 0 && (
  <Card style={styles.stepCard}>
    <Text style={styles.stepTitle}>Group Composition</Text>
    <Text style={styles.stepSubtitle}>How many residents are checking in together?</Text>

    {/* Property picker */}
    <Text style={styles.fieldLabel}>Property</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
      {(properties || []).map((p: any) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.propertyPill, selectedProperty === p.id && styles.propertyPillActive]}
          onPress={() => setSelectedProperty(p.id)}
          activeOpacity={0.6}
        >
          <Text style={[styles.pillText, selectedProperty === p.id && styles.pillTextActive]}>{p.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    {/* Gender counters */}
    <CounterRow label="Male Residents" icon="👨" count={composition.males} onIncrement={() => updateComposition('males', 1)} onDecrement={() => updateComposition('males', -1)} />
    <CounterRow label="Female Residents" icon="👩" count={composition.females} onIncrement={() => updateComposition('females', 1)} onDecrement={() => updateComposition('females', -1)} />
    <CounterRow label="Couples" icon="👫" count={composition.couples} onIncrement={() => updateComposition('couples', 1)} onDecrement={() => updateComposition('couples', -1)} />

    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total Residents</Text>
      <Text style={styles.totalValue}>{totalPeople}</Text>
    </View>
  </Card>
)}
```

Add the CounterRow helper component:

```tsx
function CounterRow({ label, icon, count, onIncrement, onDecrement }: {
  label: string; icon: string; count: number; onIncrement: () => void; onDecrement: () => void;
}) {
  return (
    <View style={styles.counterRow}>
      <Text style={styles.counterIcon}>{icon}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
      <View style={styles.counterControls}>
        <TouchableOpacity style={styles.counterBtn} onPress={onDecrement} activeOpacity={0.6}>
          <Text style={styles.counterBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.counterValue}>{count}</Text>
        <TouchableOpacity style={styles.counterBtn} onPress={onIncrement} activeOpacity={0.6}>
          <Text style={styles.counterBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 6: Group Check-in Wizard — Step 2: Room Suggestions

**Files:**
- Modify: `apps/mobile/app/(owner)/check-in.tsx` (continuing)

**Interfaces:**
- Consumes: `POST /allocation/suggest-group` API
- Produces: `combinations` state, bed assignment UI

- [ ] **Step 1: Implement `fetchSuggestions` and Step 1 — Room Selection**

Add the suggestion fetch function and room selection UI:

```tsx
// Add inside the component:
const fetchSuggestions = useCallback(async () => {
  setSuggesting(true);
  try {
    const result: any = await api.post('/allocation/suggest-group', {
      males: composition.males,
      females: composition.females,
      couples: composition.couples,
      propertyId: selectedProperty,
    });
    const data = result.data || result;
    if (data.message && (!data.combinations || data.combinations.length === 0)) {
      Alert.alert('No Rooms', data.message);
      return;
    }
    setCombinations((data.combinations || []).slice(0, 5));
    setSelectedComboIndex(data.bestFitIndex || 0);
    setStep(1);
  } catch (err: any) {
    Alert.alert('Error', err.response?.data?.message || 'Failed to get suggestions');
  } finally {
    setSuggesting(false);
  }
}, [composition, selectedProperty]);

const assignBed = (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => {
  const alreadyAssigned = residents.some(r => r.bedId === bed.bedId);
  if (alreadyAssigned) return;

  const needed = group === 'couples' ? composition.couples * 2 : composition[group === 'males' ? 'males' : 'females'];
  const currentCount = residents.filter(r =>
    group === 'males' ? r.gender === 'male' : group === 'females' ? r.gender === 'female' : r.gender === 'male' // couples placeholder
  ).length;
  if (currentCount >= needed) return;

  const newResident = emptyResident(group === 'females' ? 'female' : 'male');
  newResident.bedId = bed.bedId;
  newResident.roomId = room.roomId;
  newResident.roomNumber = room.roomNumber;
  newResident.bedNumber = bed.bedNumber;
  newResident.rentAmount = room.rentPerBed;
  setResidents(prev => [...prev, newResident]);
};

const unassignBed = (bedId: string) => {
  setResidents(prev => prev.filter(r => r.bedId !== bedId));
};
```

Step 1 render (shown when `step === 1`):

```tsx
{step === 1 && (
  <Card style={styles.stepCard}>
    <View style={styles.stepHeader}>
      <Text style={styles.stepTitle}>Room Selection</Text>
      {combinations.length > 1 && (
        <View style={styles.comboNav}>
          <TouchableOpacity onPress={() => setSelectedComboIndex(Math.max(0, selectedComboIndex - 1))} disabled={selectedComboIndex === 0} activeOpacity={0.6}>
            <Text style={[styles.comboNavBtn, selectedComboIndex === 0 && styles.disabled]}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.comboCount}>{selectedComboIndex + 1}/{combinations.length}</Text>
          <TouchableOpacity onPress={() => setSelectedComboIndex(Math.min(combinations.length - 1, selectedComboIndex + 1))} disabled={selectedComboIndex === combinations.length - 1} activeOpacity={0.6}>
            <Text style={[styles.comboNavBtn, selectedComboIndex === combinations.length - 1 && styles.disabled]}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>

    {combo?.partialAllocation && (
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>⚠️ {combo.partialAllocation.message}</Text>
      </View>
    )}

    {combo?.maleRooms.length > 0 && (
      <RoomGroupSection title="Male Residents" icon="👨" rooms={combo.maleRooms} group="males"
        assigned={residents} needed={composition.males} onAssign={assignBed} onUnassign={unassignBed} />
    )}
    {combo?.femaleRooms.length > 0 && (
      <RoomGroupSection title="Female Residents" icon="👩" rooms={combo.femaleRooms} group="females"
        assigned={residents} needed={composition.females} onAssign={assignBed} onUnassign={unassignBed} />
    )}
    {combo?.coupleRooms.length > 0 && (
      <RoomGroupSection title="Couples" icon="👫" rooms={combo.coupleRooms} group="couples"
        assigned={residents} needed={composition.couples * 2} onAssign={assignBed} onUnassign={unassignBed} />
    )}

    <Text style={styles.assignmentStatus}>{totalAssigned}/{totalPeople} beds assigned</Text>
  </Card>
)}
```

Add the RoomGroupSection component:

```tsx
function RoomGroupSection({ title, icon, rooms, group, assigned, needed, onAssign, onUnassign }: {
  title: string; icon: string; rooms: RoomAssignment[]; group: 'males' | 'females' | 'couples';
  assigned: GroupCheckinResident[]; needed: number;
  onAssign: (group: any, room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassign: (bedId: string) => void;
}) {
  return (
    <View style={styles.roomGroup}>
      <Text style={styles.roomGroupTitle}>{icon} {title} ({assigned.filter(r =>
        group === 'males' ? r.gender === 'male' : group === 'females' ? r.gender === 'female' : true
      ).length}/{needed})</Text>
      {rooms.map((room) => (
        <View key={room.roomId} style={styles.suggestedRoom}>
          <Text style={styles.suggestedRoomTitle}>Room {room.roomNumber} · Floor {room.floorNumber}</Text>
          <Text style={styles.suggestedRoomMeta}>{room.roomType} · ₹{room.rentPerBed}/mo · {room.vacantBeds} vacant</Text>
          <View style={styles.bedButtons}>
            {room.vacantBedIds.map((bed) => {
              const isAssigned = assigned.some(r => r.bedId === bed.bedId);
              return (
                <TouchableOpacity
                  key={bed.bedId}
                  style={[styles.bedBtn, isAssigned && styles.bedBtnAssigned]}
                  onPress={() => isAssigned ? onUnassign(bed.bedId) : onAssign(group, room, bed)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.bedBtnText, isAssigned && styles.bedBtnTextAssigned]}>
                    {isAssigned ? '✓ ' : ''}{bed.bedNumber}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 7: Group Check-in Wizard — Step 3: Per-Person Details

**Files:**
- Modify: `apps/mobile/app/(owner)/check-in.tsx` (continuing)

**Interfaces:**
- Consumes: `residents` state from Task 6
- Produces: Updated `residents` with personal details

- [ ] **Step 1: Implement Step 2 — Details Form (one resident at a time)**

The details step shows one resident at a time with a mini-stepper (Resident 1 of N). Each resident gets: fullName, phone, gender, DOB, occupation.

```tsx
{step === 2 && residents.length > 0 && (
  <Card style={styles.stepCard}>
    <Text style={styles.stepTitle}>Resident Details</Text>
    <Text style={styles.stepSubtitle}>Resident {(currentResidentIndex || 0) + 1} of {residents.length}</Text>

    {/* Resident selector pills */}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {residents.map((r, i) => (
        <TouchableOpacity
          key={i}
          style={[styles.residentPill, i === currentResidentIndex && styles.residentPillActive]}
          onPress={() => setCurrentResidentIndex(i)}
          activeOpacity={0.6}
        >
          <Text style={[styles.residentPillText, i === currentResidentIndex && styles.residentPillTextActive]}>
            {r.bedNumber || `#${i + 1}`}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    <Text style={styles.fieldLabel}>Full Name *</Text>
    <TextInput style={styles.input} value={residents[currentResidentIndex]?.fullName}
      onChangeText={(t) => updateResident('fullName', t)} placeholder="Enter full name" />

    <Text style={styles.fieldLabel}>Phone *</Text>
    <TextInput style={styles.input} value={residents[currentResidentIndex]?.phone}
      onChangeText={(t) => updateResident('phone', t)} placeholder="Phone number" keyboardType="phone-pad" />

    <Text style={styles.fieldLabel}>Gender</Text>
    <View style={styles.genderRow}>
      {(['male', 'female'] as const).map(g => (
        <TouchableOpacity key={g} style={[styles.genderBtn, residents[currentResidentIndex]?.gender === g && styles.genderBtnActive]}
          onPress={() => updateResident('gender', g)} activeOpacity={0.6}>
          <Text style={[styles.genderBtnText, residents[currentResidentIndex]?.gender === g && styles.genderBtnTextActive]}>
            {g === 'male' ? '👨 Male' : '👩 Female'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>

    <Text style={styles.fieldLabel}>Occupation</Text>
    <TextInput style={styles.input} value={residents[currentResidentIndex]?.occupation}
      onChangeText={(t) => updateResident('occupation', t)} placeholder="Occupation (optional)" />
  </Card>
)}
```

Add the helper functions:

```tsx
const [currentResidentIndex, setCurrentResidentIndex] = useState(0);

const updateResident = (field: string, value: any) => {
  setResidents(prev => prev.map((r, i) =>
    i === currentResidentIndex ? { ...r, [field]: value } : r
  ));
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 8: Group Check-in Wizard — Step 4: Financial + Step 5: Review + Submit

**Files:**
- Modify: `apps/mobile/app/(owner)/check-in.tsx` (continuing)

**Interfaces:**
- Consumes: `residents` state from Task 7
- Produces: Calls `POST /residents/checkin-group` on submit

- [ ] **Step 1: Implement Step 3 — Financial (rent, deposit, food per resident)**

```tsx
{step === 3 && residents.length > 0 && (
  <Card style={styles.stepCard}>
    <Text style={styles.stepTitle}>Financial Details</Text>
    <Text style={styles.stepSubtitle}>Resident {(currentResidentIndex || 0) + 1} of {residents.length}</Text>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
      {residents.map((r, i) => (
        <TouchableOpacity key={i} style={[styles.residentPill, i === currentResidentIndex && styles.residentPillActive]}
          onPress={() => setCurrentResidentIndex(i)} activeOpacity={0.6}>
          <Text style={[styles.residentPillText, i === currentResidentIndex && styles.residentPillTextActive]}>{r.bedNumber}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    <Text style={styles.fieldLabel}>Room</Text>
    <Text style={styles.fieldValue}>Room {residents[currentResidentIndex]?.roomNumber} · Bed {residents[currentResidentIndex]?.bedNumber}</Text>

    <Text style={styles.fieldLabel}>Rent Amount (₹)</Text>
    <TextInput style={styles.input} value={String(residents[currentResidentIndex]?.rentAmount || 0)}
      onChangeText={(t) => updateResident('rentAmount', Number(t) || 0)} keyboardType="numeric" />

    <Text style={styles.fieldLabel}>Deposit Paid (₹)</Text>
    <TextInput style={styles.input} value={String(residents[currentResidentIndex]?.depositPaid || 0)}
      onChangeText={(t) => updateResident('depositPaid', Number(t) || 0)} keyboardType="numeric" />

    <Text style={styles.fieldLabel}>Food Preference</Text>
    <View style={styles.genderRow}>
      {['vegetarian', 'non-vegetarian', 'vegan'].map(pref => (
        <TouchableOpacity key={pref} style={[styles.genderBtn, residents[currentResidentIndex]?.foodPreference === pref && styles.genderBtnActive]}
          onPress={() => updateResident('foodPreference', pref)} activeOpacity={0.6}>
          <Text style={[styles.genderBtnText, residents[currentResidentIndex]?.foodPreference === pref && styles.genderBtnTextActive]}>
            {pref === 'vegetarian' ? '🥬 Veg' : pref === 'non-vegetarian' ? '🍗 Non-Veg' : '🌱 Vegan'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </Card>
)}
```

- [ ] **Step 2: Implement Step 4 — Review All Residents**

```tsx
{step === 4 && (
  <Card style={styles.stepCard}>
    <Text style={styles.stepTitle}>Review & Confirm</Text>
    <Text style={styles.stepSubtitle}>{residents.length} resident{residents.length > 1 ? 's' : ''} ready to check in</Text>

    {residents.map((r, i) => (
      <View key={i} style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Text style={styles.reviewName}>{r.fullName || 'Unnamed'}</Text>
          <Text style={styles.reviewBed}>Bed {r.bedNumber}</Text>
        </View>
        <Text style={styles.reviewMeta}>📱 {r.phone} · {r.gender === 'male' ? '👨' : '👩'} {r.gender}</Text>
        <Text style={styles.reviewMeta}>🏠 Room {r.roomNumber} · ₹{r.rentAmount}/mo</Text>
        {r.occupation && <Text style={styles.reviewMeta}>💼 {r.occupation}</Text>}
      </View>
    ))}
  </Card>
)}
```

- [ ] **Step 3: Implement navigation buttons and submit handler**

```tsx
// Navigation bar at bottom of screen (always visible):
<View style={styles.navBar}>
  {step > 0 && (
    <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)} activeOpacity={0.6}>
      <Text style={styles.backBtnText}>← Back</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity
    style={[styles.nextBtn, step === STEPS.length - 1 && styles.submitBtn]}
    onPress={() => {
      if (step === 0) {
        if (totalPeople === 0) { Alert.alert('Error', 'Add at least one resident'); return; }
        if (!selectedProperty) { Alert.alert('Error', 'Select a property'); return; }
        fetchSuggestions();
      } else if (step === 1) {
        if (totalAssigned < totalPeople) { Alert.alert('Error', `Assign beds for all ${totalPeople} residents`); return; }
        // Initialize residents if not done
        setStep(2);
      } else if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }}
    activeOpacity={0.6}
    disabled={suggesting || submitting}
  >
    {suggesting || submitting ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.nextBtnText}>
        {step === 0 ? 'Find Rooms' : step === STEPS.length - 1 ? 'Check In All' : 'Next →'}
      </Text>
    )}
  </TouchableOpacity>
</View>

// Submit handler:
const handleSubmit = async () => {
  // Validate
  for (let i = 0; i < residents.length; i++) {
    const r = residents[i];
    if (!r.fullName?.trim()) { Alert.alert('Error', `Resident ${i + 1}: name is required`); setStep(2); setCurrentResidentIndex(i); return; }
    if (!r.phone?.trim()) { Alert.alert('Error', `Resident ${i + 1}: phone is required`); setStep(2); setCurrentResidentIndex(i); return; }
    if (!r.bedId) { Alert.alert('Error', `Resident ${i + 1}: no bed assigned`); setStep(1); return; }
  }

  setSubmitting(true);
  try {
    await api.post('/residents/checkin-group', {
      propertyId: selectedProperty,
      moveInDate: new Date().toISOString().split('T')[0],
      residents: residents.map(r => ({
        fullName: r.fullName,
        phone: r.phone,
        email: r.email || undefined,
        gender: r.gender,
        dateOfBirth: r.dateOfBirth || undefined,
        occupation: r.occupation || undefined,
        companyName: r.companyName || undefined,
        emergencyName: r.emergencyName || undefined,
        emergencyPhone: r.emergencyPhone || undefined,
        emergencyRelation: r.emergencyRelation || undefined,
        bedId: r.bedId,
        rentAmount: r.rentAmount,
        depositPaid: r.depositPaid,
        foodPreference: r.foodPreference,
        mealPlan: r.mealPlan,
      })),
    });
    Alert.alert('Success', `${residents.length} resident(s) checked in!`, [
      { text: 'OK', onPress: () => router.push('/(owner)/residents') },
    ]);
  } catch (err: any) {
    Alert.alert('Error', err.response?.data?.error || 'Failed to check in residents');
  } finally {
    setSubmitting(false);
  }
};
```

- [ ] **Step 4: Add all remaining styles**

```typescript
// Add to StyleSheet.create:
stepCard: { marginBottom: 16 },
stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
stepTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 },
stepSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
fieldValue: { fontSize: 14, color: '#111827', marginBottom: 12, fontWeight: '500' },
input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16, color: '#111827', backgroundColor: '#fff', marginBottom: 12 },
counterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
counterIcon: { fontSize: 22, marginRight: 12 },
counterLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#374151' },
counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
counterBtnText: { fontSize: 20, fontWeight: '600', color: '#374151' },
counterValue: { fontSize: 18, fontWeight: '700', color: '#111827', minWidth: 24, textAlign: 'center' },
totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 2, borderTopColor: '#e5e7eb', marginTop: 8 },
totalLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
totalValue: { fontSize: 18, fontWeight: '800', color: '#3b82f6' },
propertyPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', marginRight: 8 },
propertyPillActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
pillText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
pillTextActive: { color: '#fff' },
comboNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
comboNavBtn: { fontSize: 16, color: '#3b82f6', padding: 4 },
comboCount: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
disabled: { opacity: 0.3 },
warningBox: { backgroundColor: '#fef3c7', borderRadius: 10, padding: 12, marginBottom: 12 },
warningText: { fontSize: 13, color: '#92400e', fontWeight: '500' },
roomGroup: { marginBottom: 16 },
roomGroupTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
suggestedRoom: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 8 },
suggestedRoomTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
suggestedRoomMeta: { fontSize: 12, color: '#6b7280', marginTop: 2, marginBottom: 8 },
bedButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
bedBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' },
bedBtnAssigned: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
bedBtnText: { fontSize: 13, fontWeight: '600', color: '#0369a1' },
bedBtnTextAssigned: { color: '#fff' },
assignmentStatus: { fontSize: 14, fontWeight: '600', color: '#6b7280', textAlign: 'center', marginTop: 8 },
residentPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', marginRight: 6 },
residentPillActive: { backgroundColor: '#3b82f6' },
residentPillText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
residentPillTextActive: { color: '#fff' },
genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
genderBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
genderBtnActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#3b82f6' },
genderBtnText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
genderBtnTextActive: { color: '#3b82f6' },
reviewCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 8 },
reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
reviewName: { fontSize: 15, fontWeight: '600', color: '#111827' },
reviewBed: { fontSize: 12, fontWeight: '600', color: '#3b82f6' },
reviewMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
navBar: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
backBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
backBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: '#3b82f6', alignItems: 'center' },
submitBtn: { backgroundColor: '#22c55e' },
nextBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
```

- [ ] **Step 5: Verify full file compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 9: Register Check-in in Owner Layout + Drawer

**Files:**
- Modify: `apps/mobile/app/(owner)/_layout.tsx`

**Interfaces:**
- Consumes: `check-in` screen from Task 8

- [ ] **Step 1: Add `check-in` Tabs.Screen entry (hidden — no tab, only drawer nav)**

After the `rooms` screen entry, add:

```tsx
<Tabs.Screen name="check-in" options={{ title: 'Group Check-in', href: false as any }} />
```

- [ ] **Step 2: Add "Group Check-in" to drawer items**

In the `ownerItems` array, add:

```typescript
{ icon: '👥', label: 'Group Check-in', route: '/(owner)/check-in' },
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Start dev server and verify no Metro errors**

Run: `cd apps/mobile && EXPO_PUBLIC_API_URL=http://192.168.1.13:3001 EXPO_NO_METRO_WORKSPACE_ROOT=1 npx expo start --clear`

Expected: Metro starts without errors, bundles successfully.

- [ ] **Step 2: Verify Room Layout screen loads on device**

Open Expo Go → Owner login → Drawer → Room Layout
Expected: Shows property pills, floor-grouped room cards with colored bed dots, tap to see bed details in bottom sheet.

- [ ] **Step 3: Verify Group Check-in wizard flows**

Open Expo Go → Owner login → Drawer → Group Check-in
Expected: Step 0 shows gender counters → "Find Rooms" calls API → Step 1 shows room suggestions with bed assignment → Steps 2-3 show per-resident forms → Step 4 shows review → "Check In All" submits.

- [ ] **Step 4: Run TypeScript check one final time**

Run: `cd apps/mobile && npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: `0`
