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
