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
    queryFn: () => api.get('/properties', { params: { limit: 50 } }).then((r) => r.data?.data || []),
  });

  const totalPeople = composition.males + composition.females + composition.couples * 2;

  const updateComposition = (field: keyof GroupComposition, delta: number) => {
    setComposition(prev => ({ ...prev, [field]: Math.max(0, prev[field] + delta) }));
  };

  const fetchSuggestions = useCallback(async () => {
    setSuggesting(true);
    try {
      const result = await api.post('/allocation/suggest-group', { males: composition.males, females: composition.females, couples: composition.couples, propertyId: selectedProperty });
      const data = result.data || result;
      if (data.message && (!data.combinations || data.combinations.length === 0)) { Alert.alert('No Rooms', data.message); return; }
      setCombinations((data.combinations || []).slice(0, 5));
      setSelectedComboIndex(data.bestFitIndex || 0);
      setStep(1);
    } catch (err) { Alert.alert('Error', 'Failed to get suggestions'); }
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

  const updateResident = (field: string, value: string | number) => {
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
    } catch (err) { Alert.alert('Error', 'Failed to check in'); }
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
              {(properties || []).map((p: { id: string; name: string }) => (
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
