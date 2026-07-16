import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface MoreGridItem { icon: React.ReactNode; label: string; route: string; }
interface MoreGridProps { items: MoreGridItem[]; onNavigate: (route: string) => void; }

export function MoreGrid({ items, onNavigate }: MoreGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item, i) => (
        <TouchableOpacity key={i} style={styles.cell} onPress={() => onNavigate(item.route)} activeOpacity={0.7}>
          <View style={styles.iconCircle}>{item.icon}</View>
          <Text style={styles.label}>{item.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  cell: { width: '47%', backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.sm, ...theme.shadow.sm },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
});
