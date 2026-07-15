import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency } from '../../src/lib/utils';
import type { DashboardOverview } from '../../src/types';

export default function OwnerDashboard() {
  const { data, isLoading, refetch } = useQuery<DashboardOverview>({
    queryKey: ['owner-dashboard'],
    queryFn: () => api.get('/dashboard/overview').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Dashboard</Text>

      <View style={styles.metricsRow}>
        <MetricCard label="Occupancy" value={`${data?.occupancyRate || 0}%`} color="#3b82f6" />
        <MetricCard label="Revenue" value={formatCurrency(data?.totalRevenue || 0)} color="#22c55e" />
        <MetricCard label="Pending" value={`₹${data?.pendingPayments || 0}`} color="#eab308" />
        <MetricCard label="Complaints" value={`${data?.activeComplaints || 0}`} color="#ef4444" />
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Properties</Text>
          <Text style={styles.statValue}>{data?.totalProperties || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Beds</Text>
          <Text style={styles.statValue}>{data?.totalBeds || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Occupied Beds</Text>
          <Text style={styles.statValue}>{data?.occupiedBeds || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Vacant Beds</Text>
          <Text style={styles.statValue}>{data?.vacantBeds || 0}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Total Residents</Text>
          <Text style={styles.statValue}>{data?.totalResidents || 0}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  metricCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderTopWidth: 3, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statLabel: { fontSize: 14, color: '#6b7280' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
