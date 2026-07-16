import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface FilterChipsProps { options: Array<{ label: string; value: string }>; selected: string; onSelect: (v: string) => void; }

export function FilterChips({ options, selected, onSelect }: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {options.map(o => (
        <TouchableOpacity key={o.value} style={[styles.chip, selected === o.value && styles.chipActive]} onPress={() => onSelect(o.value)}>
          <Text style={[styles.chipText, selected === o.value && styles.chipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
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
