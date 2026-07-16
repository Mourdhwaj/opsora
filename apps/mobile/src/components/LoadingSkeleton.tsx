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

export function DashboardSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header} />
      <View style={styles.metricsRow}>
        <View style={styles.metricSkeleton} />
        <View style={styles.metricSkeleton} />
        <View style={styles.metricSkeleton} />
        <View style={styles.metricSkeleton} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionTitle} />
        <View style={styles.chartSkeleton} />
        <View style={styles.legendSkeleton} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionTitle} />
        <View style={styles.chartSkeleton} />
        <View style={styles.legendSkeleton} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionTitle} />
        <View style={styles.activitySkeleton} />
        <View style={styles.activitySkeleton} />
        <View style={styles.activitySkeleton} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionTitle} />
        <View style={styles.statsGrid}>
          <View style={styles.statSkeleton} />
          <View style={styles.statSkeleton} />
          <View style={styles.statSkeleton} />
          <View style={styles.statSkeleton} />
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.sectionTitle} />
        <View style={styles.tankSkeleton} />
        <View style={styles.tankSkeleton} />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionTitle} />
        <View style={styles.occRowSkeleton} />
        <View style={styles.occRowSkeleton} />
        <View style={styles.occRowSkeleton} />
      </View>
      <View style={styles.quickActions}>
        <View style={styles.actionSkeleton} />
        <View style={styles.actionSkeleton} />
        <View style={styles.actionSkeleton} />
        <View style={styles.actionSkeleton} />
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

  // Dashboard skeleton styles
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  metricSkeleton: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderTopWidth: 3, borderTopColor: '#e5e7eb', flex: 1, minWidth: '45%', height: 60, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { height: 20, width: '40%', backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 },
  chartSkeleton: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingTop: 8 },
  legendSkeleton: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  activitySkeleton: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statSkeleton: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 8 },
  tankSkeleton: { marginBottom: 12, height: 40, backgroundColor: '#e5e7eb', borderRadius: 8 },
  occRowSkeleton: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', height: 50, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  actionSkeleton: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, height: 80 },
});
