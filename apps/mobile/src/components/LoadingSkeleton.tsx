import { View, Text, StyleSheet } from 'react-native';
import { Inbox } from 'lucide-react-native';
import { theme } from '../lib/theme';

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
  icon?: React.ReactNode;
}

export function EmptyState({ title, message, icon }: EmptyStateProps) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        {icon || <Inbox size={32} color={theme.colors.textMuted} />}
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.lg },
  header: { height: 28, width: 160, backgroundColor: theme.colors.border, borderRadius: theme.borderRadius.sm, marginBottom: 20 },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.lg, marginBottom: 12, ...theme.shadow.sm },
  line: { height: 14, backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: 10, width: '100%' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xxl },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.borderLight, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.lg },
  emptyTitle: { fontSize: 17, fontFamily: theme.font.semiBold, color: theme.colors.text, textAlign: 'center' },
  emptyMessage: { fontSize: 14, fontFamily: theme.font.regular, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },

  // Dashboard skeleton styles
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: theme.spacing.lg, marginBottom: 16 },
  metricSkeleton: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 12, borderTopWidth: 3, borderTopColor: theme.colors.border, flex: 1, minWidth: '45%', height: 60, ...theme.shadow.sm },
  section: { marginHorizontal: theme.spacing.lg, marginBottom: 16 },
  sectionTitle: { height: 20, width: '40%', backgroundColor: theme.colors.border, borderRadius: 4, marginBottom: 12 },
  chartSkeleton: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingTop: 8 },
  legendSkeleton: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  activitySkeleton: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statSkeleton: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 8 },
  tankSkeleton: { marginBottom: 12, height: 40, backgroundColor: theme.colors.border, borderRadius: 8 },
  occRowSkeleton: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, height: 50, backgroundColor: theme.colors.surface, borderRadius: 8, marginBottom: 8 },
  quickActions: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, gap: 8 },
  actionSkeleton: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', ...theme.shadow.sm, height: 80 },
});
