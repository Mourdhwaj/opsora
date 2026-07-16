import { useState, useCallback } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { User, Users, Heart, ChevronLeft, ChevronRight, Phone, Home, Briefcase, Leaf, Drumstick, Sprout } from 'lucide-react-native';
import { Card, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import type { AllocationRoom, RoomCombination, RoomAssignment, GroupCheckinResident } from '../../src/types';

interface GroupComposition { males: number; females: number; couples: number }

const STEPS = ['Group', 'Rooms', 'Details', 'Financial', 'Review'];

function emptyResident(gender: 'male' | 'female'): GroupCheckinResident {
  return {
    fullName: '', phone: '', email: '', gender,
    bedId: '', roomId: '', roomNumber: '', bedNumber: '',
    rentAmount: 0, depositPaid: 0,
    foodPreference: 'vegetarian', mealPlan: 'both',
  };
}

function CounterRow({ label, icon, count, onIncrement, onDecrement }: {
  label: string; icon: React.ReactNode; count: number; onIncrement: () => void; onDecrement: () => void;
}) {
  return (
    <View style={styles.counterRow}>
      {icon}
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

function RoomGroupSection({ title, icon, rooms, group, assigned, needed, onAssign, onUnassign }: {
  title: string; icon: React.ReactNode; rooms: RoomAssignment[]; group: 'males' | 'females' | 'couples';
  assigned: GroupCheckinResident[]; needed: number;
  onAssign: (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassign: (bedId: string) => void;
}) {
  return (
    <View style={styles.roomGroup}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <Text style={styles.roomGroupTitle}>{title} ({assigned.filter(r =>
          group === 'males' ? r.gender === 'male' : group === 'females' ? r.gender === 'female' : true
        ).length}/{needed})</Text>
      </View>
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
  const combo = combinations[selectedComboIndex];
  const totalAssigned = residents.filter(r => r.bedId).length;

  const updateComposition = (field: keyof GroupComposition, delta: number) => {
    setComposition(prev => ({
      ...prev,
      [field]: Math.max(0, prev[field] + delta),
    }));
  };

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

  const updateResident = (field: string, value: any) => {
    setResidents(prev => prev.map((r, i) =>
      i === currentResidentIndex ? { ...r, [field]: value } : r
    ));
  };

  const handleSubmit = async () => {
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

  return (
    <View style={styles.wrapper}>
      {/* Step indicators */}
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <View key={s} style={styles.stepIndicator}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive, i === step && styles.stepDotCurrent]}>
              <Text style={[styles.stepDotText, i <= step && styles.stepDotTextActive]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Step 0: Group Composition */}
        {step === 0 && (
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>Group Composition</Text>
            <Text style={styles.stepSubtitle}>How many residents are checking in together?</Text>

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

            <CounterRow label="Male Residents" icon={<User size={22} color={theme.colors.info} />} count={composition.males} onIncrement={() => updateComposition('males', 1)} onDecrement={() => updateComposition('males', -1)} />
            <CounterRow label="Female Residents" icon={<User size={22} color={theme.colors.primary} />} count={composition.females} onIncrement={() => updateComposition('females', 1)} onDecrement={() => updateComposition('females', -1)} />
            <CounterRow label="Couples" icon={<Heart size={22} color={theme.colors.danger} />} count={composition.couples} onIncrement={() => updateComposition('couples', 1)} onDecrement={() => updateComposition('couples', -1)} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Residents</Text>
              <Text style={styles.totalValue}>{totalPeople}</Text>
            </View>
          </Card>
        )}

        {/* Step 1: Room Selection */}
        {step === 1 && (
          <Card style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>Room Selection</Text>
              {combinations.length > 1 && (
                <View style={styles.comboNav}>
                  <TouchableOpacity onPress={() => setSelectedComboIndex(Math.max(0, selectedComboIndex - 1))} disabled={selectedComboIndex === 0} activeOpacity={0.6}>
                    <ChevronLeft size={20} color={selectedComboIndex === 0 ? theme.colors.textMuted : theme.colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.comboCount}>{selectedComboIndex + 1}/{combinations.length}</Text>
                  <TouchableOpacity onPress={() => setSelectedComboIndex(Math.min(combinations.length - 1, selectedComboIndex + 1))} disabled={selectedComboIndex === combinations.length - 1} activeOpacity={0.6}>
                    <ChevronRight size={20} color={selectedComboIndex === combinations.length - 1 ? theme.colors.textMuted : theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {combo?.partialAllocation && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>{combo.partialAllocation.message}</Text>
              </View>
            )}

            {combo?.maleRooms.length > 0 && (
              <RoomGroupSection title="Male Residents" icon={<User size={16} color={theme.colors.info} />} rooms={combo.maleRooms} group="males"
                assigned={residents} needed={composition.males} onAssign={assignBed} onUnassign={unassignBed} />
            )}
            {combo?.femaleRooms.length > 0 && (
              <RoomGroupSection title="Female Residents" icon={<User size={16} color={theme.colors.primary} />} rooms={combo.femaleRooms} group="females"
                assigned={residents} needed={composition.females} onAssign={assignBed} onUnassign={unassignBed} />
            )}
            {combo?.coupleRooms.length > 0 && (
              <RoomGroupSection title="Couples" icon={<Heart size={16} color={theme.colors.danger} />} rooms={combo.coupleRooms} group="couples"
                assigned={residents} needed={composition.couples * 2} onAssign={assignBed} onUnassign={unassignBed} />
            )}

            <Text style={styles.assignmentStatus}>{totalAssigned}/{totalPeople} beds assigned</Text>
          </Card>
        )}

        {/* Step 2: Per-Person Details */}
        {step === 2 && residents.length > 0 && (
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>Resident Details</Text>
            <Text style={styles.stepSubtitle}>Resident {currentResidentIndex + 1} of {residents.length}</Text>

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

        {/* Step 3: Financial */}
        {step === 3 && residents.length > 0 && (
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>Financial Details</Text>
            <Text style={styles.stepSubtitle}>Resident {currentResidentIndex + 1} of {residents.length}</Text>

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

        {/* Step 4: Review */}
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
      </ScrollView>

      {/* Navigation bar */}
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
              setCurrentResidentIndex(0);
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
    </View>
  );
}

const styles = StyleSheet.create({
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
  fieldValue: { fontSize: 14, fontFamily: theme.font.medium, color: theme.colors.text, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.md, padding: 12, fontSize: 16, fontFamily: theme.font.regular, color: theme.colors.text, backgroundColor: theme.colors.surface, marginBottom: 12 },
  counterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  counterLabel: { flex: 1, fontSize: 15, fontFamily: theme.font.medium, color: theme.colors.text },
  counterControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.borderLight, justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { fontSize: 20, fontFamily: theme.font.semiBold, color: theme.colors.text },
  counterValue: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, minWidth: 24, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 2, borderTopColor: theme.colors.border, marginTop: 8 },
  totalLabel: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.text },
  totalValue: { fontSize: 18, fontFamily: theme.font.extraBold, color: theme.colors.primary },
  propertyPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 },
  propertyPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pillText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  pillTextActive: { color: '#fff' },
  comboNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comboCount: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  warningBox: { backgroundColor: theme.colors.warningSurface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 12 },
  warningText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.warning },
  roomGroup: { marginBottom: 16 },
  roomGroupTitle: { fontSize: 15, fontFamily: theme.font.bold, color: theme.colors.text },
  suggestedRoom: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8 },
  suggestedRoomTitle: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text },
  suggestedRoomMeta: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginTop: 2, marginBottom: 8 },
  bedButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bedBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.colors.primarySurface, borderWidth: 1, borderColor: theme.colors.primaryLight },
  bedBtnAssigned: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  bedBtnText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.primary },
  bedBtnTextAssigned: { color: '#fff' },
  assignmentStatus: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 },
  residentPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.borderLight, marginRight: 6 },
  residentPillActive: { backgroundColor: theme.colors.primary },
  residentPillText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  residentPillTextActive: { color: '#fff' },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.borderLight, alignItems: 'center' },
  genderBtnActive: { backgroundColor: theme.colors.primarySurface, borderWidth: 1, borderColor: theme.colors.primary },
  genderBtnText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  genderBtnTextActive: { color: theme.colors.primary },
  reviewCard: { backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  reviewBed: { fontSize: 12, fontWeight: '600', color: 'theme.colors.primary' },
  reviewMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  navBar: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  backBtnText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  nextBtn: { flex: 2, paddingVertical: 14, borderRadius: 10, backgroundColor: 'theme.colors.primary', alignItems: 'center' },
  submitBtn: { backgroundColor: '#22c55e' },
  nextBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
