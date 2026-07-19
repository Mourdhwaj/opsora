import React from 'react';
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
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
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
          <Field label="Rent Amount (Rs.)" value={String(resident.rentAmount)} onChangeText={(t) => onUpdate('rentAmount', Number(t) || 0)} placeholder="" keyboardType="numeric" />
          <Field label="Deposit Paid (Rs.)" value={String(resident.depositPaid)} onChangeText={(t) => onUpdate('depositPaid', Number(t) || 0)} placeholder="" keyboardType="numeric" />
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
