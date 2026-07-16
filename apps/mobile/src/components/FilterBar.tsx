import { ScrollView, TouchableOpacity, Text, StyleSheet, type ViewStyle } from 'react-native';
import { theme } from '../lib/theme';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  style?: ViewStyle;
}

export function FilterBar({ options, selected, onSelect, style }: FilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.container, style]}>
      {options.map((opt) => {
        const isActive = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.6}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.borderLight,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
});
