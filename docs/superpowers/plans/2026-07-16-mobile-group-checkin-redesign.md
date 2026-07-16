# Mobile Group Check-in Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-step group check-in wizard with a 4-step card-based flow featuring a visual bed grid and swipeable resident cards with all web-parity fields.

**Architecture:** Extract bed grid and resident card components into `src/components/checkin/`. The main `check-in.tsx` orchestrates 4 steps (Group → Bed Grid → Resident Cards → Review) managing shared state. No new API endpoints — uses existing `suggest-group` and `checkin-group`.

**Tech Stack:** React Native, Expo Router, TanStack Query, lucide-react-native, theme tokens from `src/lib/theme.ts`.

## Global Constraints

- All colors from `theme.colors.*`, all fonts from `theme.font.*`
- No emojis in UI — use lucide-react-native icons only
- No new dependencies — use only what's already installed
- All components are React Native (no web-specific APIs)
- TypeScript strict — zero `any` in new code

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/types/index.ts:408-430` | Modify | Extend `GroupCheckinResident` with missing fields |
| `src/components/checkin/BedSquare.tsx` | Create | Single bed square with 4 states |
| `src/components/checkin/BedGrid.tsx` | Create | Floor → room → bed grid layout |
| `src/components/checkin/CollapsibleSection.tsx` | Create | Expandable section wrapper |
| `src/components/checkin/ResidentChipBar.tsx` | Create | Horizontal resident selector with completion indicators |
| `src/components/checkin/ResidentCard.tsx` | Create | Full resident form with 6 collapsible sections |
| `src/components/checkin/ReviewCard.tsx` | Create | Summary card for review step |
| `src/components/index.ts` | Modify | Export new checkin components |
| `app/(details)/check-in.tsx` | Rewrite | 4-step orchestrator with all new components |

---

### Task 1: Extend GroupCheckinResident Type

**Files:**
- Modify: `apps/mobile/src/types/index.ts:408-430`

**Interfaces:**
- Produces: Extended `GroupCheckinResident` with `passportNumber`, `collegeName`, `workAddress`, `specialDietary`, `moveInDate` fields

- [ ] **Step 1: Add missing fields to GroupCheckinResident**

```typescript
export interface GroupCheckinResident {
  fullName: string;
  phone: string;
  email?: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  bloodGroup?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  occupation?: string;
  companyName?: string;
  collegeName?: string;
  workAddress?: string;
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
  specialDietary?: string;
  moveInDate?: string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS (no new errors)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/types/index.ts
git commit -m "types(mobile): extend GroupCheckinResident with web-parity fields"
```

---

### Task 2: BedSquare Component

**Files:**
- Create: `apps/mobile/src/components/checkin/BedSquare.tsx`

**Interfaces:**
- Props: `{ bedId: string; bedNumber: string; status: 'vacant' | 'occupied' | 'gender-locked' | 'selected'; onPress: (bedId: string) => void }`
- Consumes: nothing from other tasks
- Produces: `BedSquare` component used by `BedGrid`

- [ ] **Step 1: Create BedSquare component**

```tsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Lock } from 'lucide-react-native';
import { theme } from '../../lib/theme';

interface BedSquareProps {
  bedId: string;
  bedNumber: string;
  status: 'vacant' | 'occupied' | 'gender-locked' | 'selected';
  onPress: (bedId: string) => void;
}

export function BedSquare({ bedId, bedNumber, status, onPress }: BedSquareProps) {
  const isTappable = status === 'vacant' || status === 'selected';

  return (
    <TouchableOpacity
      style={[
        styles.bed,
        status === 'selected' && styles.bedSelected,
        status === 'occupied' && styles.bedOccupied,
        status === 'gender-locked' && styles.bedLocked,
      ]}
      onPress={() => isTappable && onPress(bedId)}
      disabled={!isTappable}
      activeOpacity={0.6}
    >
      {status === 'occupied' || status === 'gender-locked' ? (
        <Lock size={14} color={theme.colors.textMuted} />
      ) : (
        <Text style={[styles.bedText, status === 'selected' && styles.bedTextSelected]}>
          {bedNumber}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bed: {
    width: 48, height: 48, borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center',
  },
  bedSelected: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, borderStyle: 'solid' },
  bedOccupied: { backgroundColor: theme.colors.borderLight, borderColor: theme.colors.borderLight, borderStyle: 'solid' },
  bedLocked: { backgroundColor: theme.colors.borderLight, borderColor: theme.colors.borderLight, borderStyle: 'solid', opacity: 0.5 },
  bedText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  bedTextSelected: { color: '#fff' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/checkin/BedSquare.tsx
git commit -m "feat(mobile): add BedSquare component with 4 visual states"
```

---

### Task 3: BedGrid Component

**Files:**
- Create: `apps/mobile/src/components/checkin/BedGrid.tsx`

**Interfaces:**
- Props: `{ combinations, selectedComboIndex, assignedResidents, totalNeeded, onAssignBed, onUnassignBed, partialAllocation }`
- Consumes: `BedSquare` from Task 2, `RoomCombination`/`RoomAssignment` types
- Produces: `BedGrid` component used by main check-in page

- [ ] **Step 1: Create BedGrid component**

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '../../lib/theme';
import { BedSquare } from './BedSquare';
import type { RoomCombination, RoomAssignment, GroupCheckinResident } from '../../types';

interface BedGridProps {
  combinations: RoomCombination[];
  selectedComboIndex: number;
  assignedResidents: GroupCheckinResident[];
  totalNeeded: number;
  onAssignBed: (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassignBed: (bedId: string) => void;
  partialAllocation?: RoomCombination['partialAllocation'];
}

function getBedStatus(bedId: string, assignedResidents: GroupCheckinResident[], room: RoomAssignment, currentGroup: 'males' | 'females' | 'couples'): 'vacant' | 'occupied' | 'gender-locked' | 'selected' {
  if (assignedResidents.some(r => r.bedId === bedId)) return 'selected';
  if (!room.vacantBedIds.some(b => b.bedId === bedId)) return 'occupied';
  const assignedInRoom = assignedResidents.filter(r => r.roomId === room.roomId);
  if (assignedInRoom.length > 0) {
    const assignedGender = assignedInRoom[0].gender;
    const groupGender = currentGroup === 'females' ? 'female' : 'male';
    if (assignedGender !== groupGender) return 'gender-locked';
  }
  return 'vacant';
}

function RoomCard({ room, group, assignedResidents, onAssignBed, onUnassignBed }: {
  room: RoomAssignment; group: 'males' | 'females' | 'couples';
  assignedResidents: GroupCheckinResident[];
  onAssignBed: (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassignBed: (bedId: string) => void;
}) {
  return (
    <View style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
        <Text style={styles.roomMeta}>{room.roomType} · {room.floorName} · Rs.{room.rentPerBed}/mo</Text>
      </View>
      <View style={styles.bedGrid}>
        {room.vacantBedIds.map(bed => {
          const status = getBedStatus(bed.bedId, assignedResidents, room, group);
          return (
            <BedSquare key={bed.bedId} bedId={bed.bedId} bedNumber={bed.bedNumber} status={status}
              onPress={(id) => status === 'selected' ? onUnassignBed(id) : onAssignBed(group, room, { bedId: id, bedNumber: bed.bedNumber })} />
          );
        })}
      </View>
    </View>
  );
}

export function BedGrid({ combinations, selectedComboIndex, assignedResidents, totalNeeded, onAssignBed, onUnassignBed, partialAllocation }: BedGridProps) {
  const combo = combinations[selectedComboIndex];
  if (!combo) return null;
  const sections: { title: string; group: 'males' | 'females' | 'couples'; rooms: RoomAssignment[] }[] = [];
  if (combo.maleRooms.length > 0) sections.push({ title: 'Male Residents', group: 'males', rooms: combo.maleRooms });
  if (combo.femaleRooms.length > 0) sections.push({ title: 'Female Residents', group: 'females', rooms: combo.femaleRooms });
  if (combo.coupleRooms.length > 0) sections.push({ title: 'Couples', group: 'couples', rooms: combo.coupleRooms });

  return (
    <View style={styles.container}>
      {partialAllocation && (
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color={theme.colors.warning} />
          <Text style={styles.warningText}>{partialAllocation.message}</Text>
        </View>
      )}
      {sections.map(section => (
        <View key={section.group} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.rooms.map(room => (
            <RoomCard key={room.roomId} room={room} group={section.group} assignedResidents={assignedResidents} onAssignBed={onAssignBed} onUnassignBed={onUnassignBed} />
          ))}
        </View>
      ))}
      <View style={styles.progressBadge}>
        <Text style={styles.progressText}>{assignedResidents.length}/{totalNeeded} beds assigned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.warningSurface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 16 },
  warningText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.warning, flex: 1 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 8 },
  roomCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8 },
  roomHeader: { marginBottom: 8 },
  roomNumber: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomMeta: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginTop: 2 },
  bedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progressBadge: { position: 'absolute', bottom: 0, alignSelf: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.full, paddingHorizontal: 16, paddingVertical: 8 },
  progressText: { fontSize: 13, fontFamily: theme.font.semiBold, color: '#fff' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/checkin/BedGrid.tsx
git commit -m "feat(mobile): add BedGrid component with floor/room/bed layout"
```

---

### Task 4: CollapsibleSection Component

**Files:**
- Create: `apps/mobile/src/components/checkin/CollapsibleSection.tsx`

**Interfaces:**
- Props: `{ title: string; icon: React.ReactNode; isExpanded: boolean; onToggle: () => void; isComplete?: boolean; children: React.ReactNode }`
- Consumes: nothing
- Produces: `CollapsibleSection` used by `ResidentCard`

- [ ] **Step 1: Create CollapsibleSection component**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../../lib/theme';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  isComplete?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, isExpanded, onToggle, isComplete, children }: CollapsibleSectionProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.6}>
        <View style={styles.headerLeft}>{icon}<Text style={styles.title}>{title}</Text></View>
        <View style={styles.headerRight}>
          {isComplete && <CheckCircle2 size={18} color={theme.colors.success} />}
          <ChevronDown size={18} color={theme.colors.textMuted} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
        </View>
      </TouchableOpacity>
      {isExpanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.text },
  content: { paddingBottom: 14 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/checkin/CollapsibleSection.tsx
git commit -m "feat(mobile): add CollapsibleSection component"
```

---

### Task 5: ResidentChipBar Component

**Files:**
- Create: `apps/mobile/src/components/checkin/ResidentChipBar.tsx`

**Interfaces:**
- Props: `{ residents: GroupCheckinResident[]; selectedIndex: number; onSelect: (index: number) => void }`
- Consumes: `GroupCheckinResident` type
- Produces: `ResidentChipBar` used by main check-in page

- [ ] **Step 1: Create ResidentChipBar component**

```tsx
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { theme } from '../../lib/theme';
import type { GroupCheckinResident } from '../../types';

function isResidentComplete(r: GroupCheckinResident): boolean {
  return !!(r.fullName?.trim() && r.phone?.trim());
}

interface ResidentChipBarProps {
  residents: GroupCheckinResident[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function ResidentChipBar({ residents, selectedIndex, onSelect }: ResidentChipBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {residents.map((r, i) => {
        const complete = isResidentComplete(r);
        const isActive = i === selectedIndex;
        return (
          <TouchableOpacity key={i} style={[styles.chip, isActive && styles.chipActive]} onPress={() => onSelect(i)} activeOpacity={0.6}>
            {complete ? <CheckCircle2 size={14} color={isActive ? '#fff' : theme.colors.success} /> : <Circle size={14} color={isActive ? '#fff' : theme.colors.textMuted} />}
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{r.bedNumber || `#${i + 1}`}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { maxHeight: 48 },
  content: { gap: 8, paddingVertical: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.borderLight },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/checkin/ResidentChipBar.tsx
git commit -m "feat(mobile): add ResidentChipBar component"
```

---

### Task 6: ResidentCard Component

**Files:**
- Create: `apps/mobile/src/components/checkin/ResidentCard.tsx`

**Interfaces:**
- Props: `{ resident: GroupCheckinResident; index: number; total: number; onUpdate: (field: string, value: any) => void; onPrev: () => void; onNext: () => void }`
- Consumes: `CollapsibleSection` from Task 4, `GroupCheckinResident` type
- Produces: `ResidentCard` used by main check-in page

- [ ] **Step 1: Create ResidentCard component**

```tsx
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { User, CreditCard, Briefcase, AlertCircle, DollarSign, UtensilsCrossed, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { theme } from '../../lib/theme';
import { CollapsibleSection } from './CollapsibleSection';
import type { GroupCheckinResident } from '../../types';

interface ResidentCardProps {
  resident: GroupCheckinResident;
  index: number;
  total: number;
  onUpdate: (field: string, value: string | number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function ResidentCard({ resident, index, total, onUpdate, onPrev, onNext }: ResidentCardProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({ personal: true });

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const personalComplete = !!(resident.fullName?.trim() && resident.phone?.trim());

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>Resident {index + 1} of {total}</Text>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 80 }}>
        <CollapsibleSection title="Personal" icon={<User size={18} color={theme.colors.primary} />} isExpanded={!!expandedSections.personal} onToggle={() => toggleSection('personal')} isComplete={personalComplete}>
          <Field label="Full Name *" value={resident.fullName} onChangeText={(t) => onUpdate('fullName', t)} placeholder="Enter full name" error={!resident.fullName?.trim() && personalComplete === false} />
          <Field label="Phone *" value={resident.phone} onChangeText={(t) => onUpdate('phone', t)} placeholder="Phone number" keyboardType="phone-pad" />
          <Field label="Email" value={resident.email || ''} onChangeText={(t) => onUpdate('email', t)} placeholder="Email (optional)" keyboardType="email-address" />
          <Field label="Gender" value={resident.gender} onChangeText={() => {}} placeholder="" editable={false} />
          <Field label="Date of Birth" value={resident.dateOfBirth || ''} onChangeText={(t) => onUpdate('dateOfBirth', t)} placeholder="YYYY-MM-DD" />
          <Field label="Blood Group" value={resident.bloodGroup || ''} onChangeText={(t) => onUpdate('bloodGroup', t)} placeholder="e.g. O+" />
        </CollapsibleSection>

        <CollapsibleSection title="Identity" icon={<CreditCard size={18} color={theme.colors.primary} />} isExpanded={!!expandedSections.identity} onToggle={() => toggleSection('identity')}>
          <Field label="Aadhaar Number" value={resident.aadhaarNumber || ''} onChangeText={(t) => onUpdate('aadhaarNumber', t)} placeholder="12-digit Aadhaar" keyboardType="numeric" />
          <Field label="PAN Number" value={resident.panNumber || ''} onChangeText={(t) => onUpdate('panNumber', t)} placeholder="PAN number" />
          <Field label="Passport Number" value={resident.passportNumber || ''} onChangeText={(t) => onUpdate('passportNumber', t)} placeholder="Passport (optional)" />
        </CollapsibleSection>

        <CollapsibleSection title="Employment" icon={<Briefcase size={18} color={theme.colors.primary} />} isExpanded={!!expandedSections.employment} onToggle={() => toggleSection('employment')}>
          <Field label="Occupation" value={resident.occupation || ''} onChangeText={(t) => onUpdate('occupation', t)} placeholder="Occupation" />
          <Field label="Company Name" value={resident.companyName || ''} onChangeText={(t) => onUpdate('companyName', t)} placeholder="Company" />
          <Field label="College Name" value={resident.collegeName || ''} onChangeText={(t) => onUpdate('collegeName', t)} placeholder="College (if student)" />
          <Field label="Work Address" value={resident.workAddress || ''} onChangeText={(t) => onUpdate('workAddress', t)} placeholder="Work address" />
        </CollapsibleSection>

        <CollapsibleSection title="Emergency" icon={<AlertCircle size={18} color={theme.colors.danger} />} isExpanded={!!expandedSections.emergency} onToggle={() => toggleSection('emergency')}>
          <Field label="Contact Name" value={resident.emergencyName || ''} onChangeText={(t) => onUpdate('emergencyName', t)} placeholder="Emergency contact name" />
          <Field label="Contact Phone" value={resident.emergencyPhone || ''} onChangeText={(t) => onUpdate('emergencyPhone', t)} placeholder="Phone" keyboardType="phone-pad" />
          <Field label="Relation" value={resident.emergencyRelation || ''} onChangeText={(t) => onUpdate('emergencyRelation', t)} placeholder="e.g. Father, Mother" />
        </CollapsibleSection>

        <CollapsibleSection title="Financial" icon={<DollarSign size={18} color={theme.colors.primary} />} isExpanded={!!expandedSections.financial} onToggle={() => toggleSection('financial')}>
          <Field label="Move-in Date" value={resident.moveInDate || new Date().toISOString().split('T')[0]} onChangeText={(t) => onUpdate('moveInDate', t)} placeholder="YYYY-MM-DD" />
          <Field label="Rent Amount (Rs.)" value={String(resident.rentAmount)} onChangeText={(t) => onUpdate('rentAmount', Number(t) || 0)} keyboardType="numeric" />
          <Field label="Deposit Paid (Rs.)" value={String(resident.depositPaid)} onChangeText={(t) => onUpdate('depositPaid', Number(t) || 0)} keyboardType="numeric" />
        </CollapsibleSection>

        <CollapsibleSection title="Food" icon={<UtensilsCrossed size={18} color={theme.colors.primary} />} isExpanded={!!expandedSections.food} onToggle={() => toggleSection('food')}>
          <Text style={styles.fieldLabel}>Food Preference</Text>
          <View style={styles.chipRow}>
            {['vegetarian', 'non-vegetarian', 'vegan'].map(pref => (
              <TouchableOpacity key={pref} style={[styles.chip, resident.foodPreference === pref && styles.chipActive]} onPress={() => onUpdate('foodPreference', pref)}>
                <Text style={[styles.chipText, resident.foodPreference === pref && styles.chipTextActive]}>{pref}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.fieldLabel}>Meal Plan</Text>
          <View style={styles.chipRow}>
            {['lunch', 'dinner', 'both'].map(plan => (
              <TouchableOpacity key={plan} style={[styles.chip, resident.mealPlan === plan && styles.chipActive]} onPress={() => onUpdate('mealPlan', plan)}>
                <Text style={[styles.chipText, resident.mealPlan === plan && styles.chipTextActive]}>{plan}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Field label="Special Dietary" value={resident.specialDietary || ''} onChangeText={(t) => onUpdate('specialDietary', t)} placeholder="Allergies, restrictions..." />
        </CollapsibleSection>
      </ScrollView>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={onPrev} disabled={index === 0}>
          <ChevronLeft size={20} color={index === 0 ? theme.colors.textMuted : theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navBtn} onPress={onNext} disabled={index === total - 1}>
          <ChevronRight size={20} color={index === total - 1 ? theme.colors.textMuted : theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, editable, error }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder: string; keyboardType?: string; editable?: boolean; error?: boolean;
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput style={[fieldStyles.input, error && fieldStyles.inputError, editable === false && fieldStyles.inputDisabled]}
        value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType as any} editable={editable} />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, fontSize: 15, fontFamily: theme.font.regular, color: theme.colors.text, backgroundColor: theme.colors.surface },
  inputError: { borderColor: theme.colors.danger },
  inputDisabled: { backgroundColor: theme.colors.borderLight, color: theme.colors.textMuted },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  progress: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: 8 },
  scroll: { flex: 1 },
  fieldLabel: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/checkin/ResidentCard.tsx
git commit -m "feat(mobile): add ResidentCard component with 6 collapsible sections"
```

---

### Task 7: ReviewCard Component

**Files:**
- Create: `apps/mobile/src/components/checkin/ReviewCard.tsx`

**Interfaces:**
- Props: `{ resident: GroupCheckinResident; index: number; onPress: () => void }`
- Consumes: `GroupCheckinResident` type
- Produces: `ReviewCard` used by main check-in page

- [ ] **Step 1: Create ReviewCard component**

```tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User, Phone, Home, Briefcase, UtensilsCrossed, CheckCircle2, AlertTriangle } from 'lucide-react-native';
import { theme } from '../../lib/theme';
import type { GroupCheckinResident } from '../../types';

interface ReviewCardProps {
  resident: GroupCheckinResident;
  index: number;
  onPress: () => void;
}

export function ReviewCard({ resident, index, onPress }: ReviewCardProps) {
  const missing: string[] = [];
  if (!resident.fullName?.trim()) missing.push('Name');
  if (!resident.phone?.trim()) missing.push('Phone');
  const isComplete = missing.length === 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatar}><User size={18} color="#fff" /></View>
          <View>
            <Text style={styles.name}>{resident.fullName || 'Unnamed'}</Text>
            <Text style={styles.phone}>{resident.phone || 'No phone'}</Text>
          </View>
        </View>
        {isComplete ? <CheckCircle2 size={20} color={theme.colors.success} /> : <AlertTriangle size={20} color={theme.colors.warning} />}
      </View>
      <View style={styles.details}>
        <View style={styles.detailRow}><Home size={14} color={theme.colors.textMuted} /><Text style={styles.detailText}>Room {resident.roomNumber} · Bed {resident.bedNumber} · Rs.{resident.rentAmount}/mo</Text></View>
        {resident.occupation && <View style={styles.detailRow}><Briefcase size={14} color={theme.colors.textMuted} /><Text style={styles.detailText}>{resident.occupation}</Text></View>}
        {resident.foodPreference && <View style={styles.detailRow}><UtensilsCrossed size={14} color={theme.colors.textMuted} /><Text style={styles.detailText}>{resident.foodPreference} · {resident.mealPlan}</Text></View>}
      </View>
      {!isComplete && <Text style={styles.missing}>Missing: {missing.join(', ')}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  name: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text },
  phone: { fontSize: 13, fontFamily: theme.font.regular, color: theme.colors.textSecondary },
  details: { gap: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.textSecondary },
  missing: { fontSize: 12, fontFamily: theme.font.medium, color: theme.colors.warning, marginTop: 8 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/checkin/ReviewCard.tsx
git commit -m "feat(mobile): add ReviewCard component"
```

---

### Task 8: Update Barrel Exports

**Files:**
- Modify: `apps/mobile/src/components/index.ts`

- [ ] **Step 1: Add checkin component exports**

Add these lines at the end of the file:

```typescript
export { BedSquare } from './checkin/BedSquare';
export { BedGrid } from './checkin/BedGrid';
export { CollapsibleSection } from './checkin/CollapsibleSection';
export { ResidentChipBar } from './checkin/ResidentChipBar';
export { ResidentCard } from './checkin/ResidentCard';
export { ReviewCard } from './checkin/ReviewCard';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/index.ts
git commit -m "feat(mobile): export new checkin components"
```

---

### Task 9: Rewrite check-in.tsx — Group Composition Step

**Files:**
- Rewrite: `apps/mobile/app/(details)/check-in.tsx`

**Interfaces:**
- Consumes: All components from Tasks 2-7
- Produces: Complete 4-step group check-in flow

- [ ] **Step 1: Write the new check-in.tsx with Step 1 (Group Composition)**

```tsx
import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { User, Heart, Building, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react-native';
import { Card, ErrorState } from '../../src/components';
import { BedGrid } from '../../src/components/checkin/BedGrid';
import { ResidentChipBar } from '../../src/components/checkin/ResidentChipBar';
import { ResidentCard } from '../../src/components/checkin/ResidentCard';
import { ReviewCard } from '../../src/components/checkin/ReviewCard';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import type { RoomCombination, RoomAssignment, GroupCheckinResident } from '../../src/types';

interface GroupComposition { males: number; females: number; couples: number }
const STEPS = ['Group', 'Beds', 'Details', 'Review'];

function emptyResident(gender: 'male' | 'female'): GroupCheckinResident {
  return { fullName: '', phone: '', email: '', gender, bedId: '', roomId: '', roomNumber: '', bedNumber: '', rentAmount: 0, depositPaid: 0, foodPreference: 'vegetarian', mealPlan: 'both' };
}

function CounterRow({ label, icon, count, onIncrement, onDecrement }: {
  label: string; icon: React.ReactNode; count: number; onIncrement: () => void; onDecrement: () => void;
}) {
  return (
    <View style={s.counterRow}>
      {icon}
      <Text style={s.counterLabel}>{label}</Text>
      <View style={s.counterControls}>
        <TouchableOpacity style={s.counterBtn} onPress={onDecrement} activeOpacity={0.6}><Text style={s.counterBtnText}>-</Text></TouchableOpacity>
        <Text style={s.counterValue}>{count}</Text>
        <TouchableOpacity style={s.counterBtn} onPress={onIncrement} activeOpacity={0.6}><Text style={s.counterBtnText}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
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
  const [currentResidentIndex, setCurrentResidentIndex] = useState(0);

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: () => api.get('/properties', { params: { limit: 50 } }).then((r: any) => r.data?.data || []),
  });

  const totalPeople = composition.males + composition.females + composition.couples * 2;

  const updateComposition = (field: keyof GroupComposition, delta: number) => {
    setComposition(prev => ({ ...prev, [field]: Math.max(0, prev[field] + delta) }));
  };

  const fetchSuggestions = useCallback(async () => {
    setSuggesting(true);
    try {
      const result: any = await api.post('/allocation/suggest-group', { males: composition.males, females: composition.females, couples: composition.couples, propertyId: selectedProperty });
      const data = result.data || result;
      if (data.message && (!data.combinations || data.combinations.length === 0)) { Alert.alert('No Rooms', data.message); return; }
      setCombinations((data.combinations || []).slice(0, 5));
      setSelectedComboIndex(data.bestFitIndex || 0);
      setStep(1);
    } catch (err: any) { Alert.alert('Error', err.response?.data?.message || 'Failed to get suggestions'); }
    finally { setSuggesting(false); }
  }, [composition, selectedProperty]);

  const assignBed = (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => {
    if (residents.some(r => r.bedId === bed.bedId)) return;
    const newResident = emptyResident(group === 'females' ? 'female' : 'male');
    newResident.bedId = bed.bedId; newResident.roomId = room.roomId; newResident.roomNumber = room.roomNumber;
    newResident.bedNumber = bed.bedNumber; newResident.rentAmount = room.rentPerBed;
    setResidents(prev => [...prev, newResident]);
  };

  const unassignBed = (bedId: string) => setResidents(prev => prev.filter(r => r.bedId !== bedId));

  const updateResident = (field: string, value: any) => {
    setResidents(prev => prev.map((r, i) => i === currentResidentIndex ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async () => {
    for (let i = 0; i < residents.length; i++) {
      const r = residents[i];
      if (!r.fullName?.trim()) { Alert.alert('Error', `Resident ${i + 1}: name required`); setStep(2); setCurrentResidentIndex(i); return; }
      if (!r.phone?.trim()) { Alert.alert('Error', `Resident ${i + 1}: phone required`); setStep(2); setCurrentResidentIndex(i); return; }
    }
    setSubmitting(true);
    try {
      await api.post('/residents/checkin-group', {
        propertyId: selectedProperty, moveInDate: new Date().toISOString().split('T')[0],
        residents: residents.map(r => ({ fullName: r.fullName, phone: r.phone, email: r.email || undefined, gender: r.gender, dateOfBirth: r.dateOfBirth || undefined, bloodGroup: r.bloodGroup || undefined, aadhaarNumber: r.aadhaarNumber || undefined, panNumber: r.panNumber || undefined, passportNumber: r.passportNumber || undefined, occupation: r.occupation || undefined, companyName: r.companyName || undefined, collegeName: r.collegeName || undefined, workAddress: r.workAddress || undefined, emergencyName: r.emergencyName || undefined, emergencyPhone: r.emergencyPhone || undefined, emergencyRelation: r.emergencyRelation || undefined, bedId: r.bedId, rentAmount: r.rentAmount, depositPaid: r.depositPaid, foodPreference: r.foodPreference, mealPlan: r.mealPlan, specialDietary: r.specialDietary || undefined })),
      });
      Alert.alert('Success', `${residents.length} resident(s) checked in!`, [{ text: 'OK', onPress: () => router.push('/(owner)/residents') }]);
    } catch (err: any) { Alert.alert('Error', err.response?.data?.error || 'Failed to check in'); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={s.wrapper}>
      <View style={s.stepsRow}>
        {STEPS.map((name, i) => (
          <View key={name} style={s.stepIndicator}>
            <View style={[s.stepDot, i <= step && s.stepDotActive, i === step && s.stepDotCurrent]}>
              {i < step ? <CheckCircle size={14} color="#fff" /> : <Text style={[s.stepDotText, i <= step && s.stepDotTextActive]}>{i + 1}</Text>}
            </View>
            <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>{name}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={s.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
        {step === 0 && (
          <Card style={s.stepCard}>
            <Text style={s.stepTitle}>New Group Check-in</Text>
            <Text style={s.stepSubtitle}>How many residents are checking in together?</Text>
            <Text style={s.fieldLabel}>Property</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {(properties || []).map((p: any) => (
                <TouchableOpacity key={p.id} style={[s.pill, selectedProperty === p.id && s.pillActive]} onPress={() => setSelectedProperty(p.id)} activeOpacity={0.6}>
                  <Text style={[s.pillText, selectedProperty === p.id && s.pillTextActive]}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <CounterRow label="Male Residents" icon={<User size={22} color="#3b82f6" />} count={composition.males} onIncrement={() => updateComposition('males', 1)} onDecrement={() => updateComposition('males', -1)} />
            <CounterRow label="Female Residents" icon={<User size={22} color={theme.colors.primary} />} count={composition.females} onIncrement={() => updateComposition('females', 1)} onDecrement={() => updateComposition('females', -1)} />
            <CounterRow label="Couples" icon={<Heart size={22} color={theme.colors.danger} />} count={composition.couples} onIncrement={() => updateComposition('couples', 1)} onDecrement={() => updateComposition('couples', -1)} />
            <View style={s.totalRow}><Text style={s.totalLabel}>Total Residents</Text><Text style={s.totalValue}>{totalPeople}</Text></View>
          </Card>
        )}

        {step === 1 && (
          <Card style={s.stepCard}>
            <View style={s.stepHeader}>
              <Text style={s.stepTitle}>Select Beds</Text>
              {combinations.length > 1 && (
                <View style={s.comboNav}>
                  <TouchableOpacity onPress={() => setSelectedComboIndex(Math.max(0, selectedComboIndex - 1))} disabled={selectedComboIndex === 0}><ChevronLeft size={20} color={selectedComboIndex === 0 ? theme.colors.textMuted : theme.colors.primary} /></TouchableOpacity>
                  <Text style={s.comboCount}>{selectedComboIndex + 1}/{combinations.length}</Text>
                  <TouchableOpacity onPress={() => setSelectedComboIndex(Math.min(combinations.length - 1, selectedComboIndex + 1))} disabled={selectedComboIndex === combinations.length - 1}><ChevronRight size={20} color={selectedComboIndex === combinations.length - 1 ? theme.colors.textMuted : theme.colors.primary} /></TouchableOpacity>
                </View>
              )}
            </View>
            <BedGrid combinations={combinations} selectedComboIndex={selectedComboIndex} assignedResidents={residents} totalNeeded={totalPeople} onAssignBed={assignBed} onUnassignBed={unassignBed} partialAllocation={combinations[selectedComboIndex]?.partialAllocation} />
          </Card>
        )}

        {step === 2 && residents.length > 0 && (
          <Card style={s.stepCard}>
            <ResidentChipBar residents={residents} selectedIndex={currentResidentIndex} onSelect={setCurrentResidentIndex} />
            <ResidentCard resident={residents[currentResidentIndex]} index={currentResidentIndex} total={residents.length} onUpdate={updateResident}
              onPrev={() => setCurrentResidentIndex(Math.max(0, currentResidentIndex - 1))}
              onNext={() => setCurrentResidentIndex(Math.min(residents.length - 1, currentResidentIndex + 1))} />
          </Card>
        )}

        {step === 3 && (
          <Card style={s.stepCard}>
            <Text style={s.stepTitle}>Review & Confirm</Text>
            <Text style={s.stepSubtitle}>{residents.length} resident{residents.length > 1 ? 's' : ''} ready</Text>
            <View style={s.summaryBar}>
              <Text style={s.summaryText}>{residents.length} residents · Rs.{residents.reduce((sum, r) => sum + r.rentAmount, 0).toLocaleString('en-IN')}/mo · Rs.{residents.reduce((sum, r) => sum + r.depositPaid, 0).toLocaleString('en-IN')} deposits</Text>
            </View>
            {residents.map((r, i) => <ReviewCard key={i} resident={r} index={i} onPress={() => { setStep(2); setCurrentResidentIndex(i); }} />)}
          </Card>
        )}
      </ScrollView>

      <View style={s.navBar}>
        {step > 0 && <TouchableOpacity style={s.backBtn} onPress={() => setStep(step - 1)} activeOpacity={0.6}><Text style={s.backBtnText}>Back</Text></TouchableOpacity>}
        <TouchableOpacity style={[s.nextBtn, step === STEPS.length - 1 && s.submitBtn]}
          onPress={() => {
            if (step === 0) { if (totalPeople === 0) { Alert.alert('Error', 'Add at least one resident'); return; } if (!selectedProperty) { Alert.alert('Error', 'Select a property'); return; } fetchSuggestions(); }
            else if (step === 1) { if (residents.length < totalPeople) { Alert.alert('Error', `Assign beds for all ${totalPeople} residents`); return; } setCurrentResidentIndex(0); setStep(2); }
            else if (step < STEPS.length - 1) setStep(step + 1);
            else handleSubmit();
          }}
          activeOpacity={0.6} disabled={suggesting || submitting}>
          {suggesting || submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.nextBtnText}>{step === 0 ? 'Find Rooms' : step === STEPS.length - 1 ? `Check In ${residents.length}` : 'Next'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  stepIndicator: { alignItems: 'center', gap: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: theme.colors.primarySurface },
  stepDotCurrent: { backgroundColor: theme.colors.primary },
  stepDotText: { fontSize: 12, fontFamily: theme.font.semiBold, color: theme.colors.textMuted },
  stepDotTextActive: { color: '#fff' },
  stepLabel: { fontSize: 10, fontFamily: theme.font.medium, color: theme.colors.textMuted },
  stepLabelActive: { color: theme.colors.primary, fontFamily: theme.font.bold },
  scrollArea: { flex: 1, paddingHorizontal: theme.spacing.lg, paddingTop: 16 },
  stepCard: { marginBottom: 16 },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stepTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 4 },
  stepSubtitle: { fontSize: 14, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 6 },
  counterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  counterLabel: { flex: 1, fontSize: 15, fontFamily: theme.font.medium, color: theme.colors.text },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 20, fontFamily: theme.font.semiBold, color: theme.colors.text },
  counterValue: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, minWidth: 24, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 2, borderTopColor: theme.colors.border, marginTop: 8 },
  totalLabel: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.text },
  totalValue: { fontSize: 18, fontFamily: theme.font.extraBold, color: theme.colors.primary },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 },
  pillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  pillTextActive: { color: '#fff' },
  comboNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboCount: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  summaryBar: { backgroundColor: theme.colors.primarySurface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 16 },
  summaryText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.primary, textAlign: 'center' },
  navBar: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: theme.colors.borderLight, alignItems: 'center' },
  backBtnText: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: theme.colors.primary, alignItems: 'center' },
  submitBtn: { backgroundColor: theme.colors.success },
  nextBtnText: { fontSize: 15, fontFamily: theme.font.semiBold, color: '#fff' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(details)/check-in.tsx
git commit -m "feat(mobile): rewrite group check-in with 4-step card-based flow

- Step 1: Property + gender composition counters
- Step 2: Visual bed grid with floor/room/bed layout
- Step 3: Resident cards with 6 collapsible sections (all web-parity fields)
- Step 4: Review summary cards + submit
- Uses BedGrid, BedSquare, CollapsibleSection, ResidentChipBar, ResidentCard, ReviewCard components"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Run TypeScript check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Verify all literal string colors are fixed**

Run: `grep -r "'theme\." apps/mobile/src apps/mobile/app --include="*.tsx" | head -20`
Expected: No matches

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A && git commit -m "chore(mobile): final verification fixes"
```
