import { useRef } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../lib/theme';

interface FilterChipsProps { options: Array<{ label: string; value: string }>; selected: string; onSelect: (v: string) => void; }

function AnimatedChip({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  const pressScale = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(pressScale, { toValue: 0.95, damping: 8, stiffness: 500, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, damping: 8, stiffness: 500, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.chip, isSelected && styles.chipActive, { transform: [{ scale: pressScale }] }]}>
        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {options.map(o => (
        <AnimatedChip key={o.value} label={o.label} isSelected={selected === o.value} onPress={() => onSelect(o.value)} />
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