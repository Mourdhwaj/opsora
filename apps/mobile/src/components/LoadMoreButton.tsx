import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../lib/theme';

interface LoadMoreButtonProps { onPress: () => void; loading?: boolean; remaining: number; }

export function LoadMoreButton({ onPress, loading, remaining }: LoadMoreButtonProps) {
  if (remaining <= 0) return null;
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={loading} activeOpacity={0.7}>
      {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.text}>Load More ({remaining} remaining)</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl, paddingVertical: 12, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.primary, alignItems: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
});
