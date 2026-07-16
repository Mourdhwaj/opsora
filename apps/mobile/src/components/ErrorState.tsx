import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle size={40} color={theme.colors.warning} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xxl },
  message: { fontSize: 15, fontFamily: theme.font.regular, color: theme.colors.textSecondary, textAlign: 'center', marginTop: theme.spacing.md, marginBottom: theme.spacing.lg },
  retryButton: { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: theme.borderRadius.md },
  retryText: { color: '#fff', fontSize: 15, fontFamily: theme.font.semiBold },
});
