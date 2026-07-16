import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface TimeFilterProps { options: Array<{ label: string; value: string }>; selected: string; onSelect: (v: string) => void; }

export function TimeFilter({ options, selected, onSelect }: TimeFilterProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container}>
      {options.map(o => (
        <TouchableOpacity key={o.value} style={[styles.pill, selected === o.value && styles.pillActive]} onPress={() => onSelect(o.value)}>
          <Text style={[styles.pillText, selected === o.value && styles.pillTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight, marginRight: 6 },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  pillTextActive: { color: '#FFFFFF' },
});
