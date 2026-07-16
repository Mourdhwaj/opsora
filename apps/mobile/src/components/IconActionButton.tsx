import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface IconActionButtonProps { icon: React.ReactNode; label: string; onPress: () => void; }

export function IconActionButton({ icon, label, onPress }: IconActionButtonProps) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconCircle}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
  iconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
});
