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
