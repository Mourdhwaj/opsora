import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';

export default function StaffDashboard() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff-dashboard'],
    queryFn: () => api.get('/staff-portal/dashboard').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Staff Dashboard</Text>
      <View style={styles.metricsRow}>
        <MetricBox label="Tasks Today" value={data?.tasksToday || 0} color="#3b82f6" />
        <MetricBox label="Pending" value={data?.pendingTasks || 0} color="#eab308" />
        <MetricBox label="Complaints" value={data?.openComplaints || 0} color="#ef4444" />
        <MetricBox label="Completed" value={data?.completedToday || 0} color="#22c55e" />
      </View>
    </ScrollView>
  );
}

function MetricBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.metric, { borderTopColor: color }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderTopWidth: 3, flex: 1, minWidth: '45%', alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
