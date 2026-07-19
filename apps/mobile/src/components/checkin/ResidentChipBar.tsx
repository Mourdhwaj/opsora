import { useRef } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
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

function AnimatedResidentChip({ resident, index, isActive, onSelect }: {
  resident: GroupCheckinResident;
  index: number;
  isActive: boolean;
  onSelect: (i: number) => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const complete = isResidentComplete(resident);

  return (
    <TouchableOpacity
      onPress={() => onSelect(index)}
      onPressIn={() => Animated.spring(pressScale, { toValue: 0.93, damping: 7, stiffness: 500, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, damping: 7, stiffness: 500, useNativeDriver: true }).start()}
      activeOpacity={0.6}
    >
      <Animated.View style={[styles.chip, isActive && styles.chipActive, { transform: [{ scale: pressScale }] }]}>
        {complete ? <CheckCircle2 size={14} color={isActive ? '#fff' : theme.colors.success} /> : <Circle size={14} color={isActive ? '#fff' : theme.colors.textMuted} />}
        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{resident.bedNumber || `#${index + 1}`}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function ResidentChipBar({ residents, selectedIndex, onSelect }: ResidentChipBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {residents.map((r, i) => (
        <AnimatedResidentChip key={i} resident={r} index={i} isActive={i === selectedIndex} onSelect={onSelect} />
      ))}
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