import { View, Text, StyleSheet } from 'react-native';

export function LoadingSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header} />
      <View style={styles.card}>
        <View style={styles.line} />
        <View style={[styles.line, { width: '60%' }]} />
        <View style={[styles.line, { width: '80%' }]} />
      </View>
      <View style={styles.card}>
        <View style={styles.line} />
        <View style={[styles.line, { width: '70%' }]} />
      </View>
      <View style={styles.card}>
        <View style={styles.line} />
        <View style={[styles.line, { width: '50%' }]} />
        <View style={[styles.line, { width: '90%' }]} />
      </View>
    </View>
  );
}

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: string;
}

export function EmptyState({ title, message, icon = '📭' }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { height: 28, width: 160, backgroundColor: '#e5e7eb', borderRadius: 6, marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#1a1a2e', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  line: { height: 14, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 10, width: '100%' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#374151', textAlign: 'center' },
  emptyMessage: { fontSize: 14, color: '#9ca3af', marginTop: 6, textAlign: 'center', lineHeight: 20 },
});
