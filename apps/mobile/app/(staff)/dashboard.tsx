import { theme } from "../../src/lib/theme";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { timeAgo } from '../../src/lib/utils';

export default function StaffDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-dashboard'],
    queryFn: () => api.get('/staff/dashboard').then(r => r.data || r),
  });

  const checkinMutation = useMutation({
    mutationFn: () => api.post('/staff/checkin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.post('/staff/checkout'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard'] });
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={refetch} />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Staff Dashboard</Text>

      <View style={styles.metricsRow}>
        <MetricBox label="My Tasks" value={data?.myTasks?.length || 0} color={theme.colors.primary} />
        <MetricBox label="Open Tickets" value={data?.counts?.allOpen || 0} color="#ef4444" />
        <MetricBox label="In Progress" value={data?.counts?.inProgress || 0} color="#eab308" />
        <MetricBox label="Resolved Today" value={data?.counts?.resolvedToday || 0} color="#22c55e" />
      </View>

      {data?.counts?.slaBreached > 0 && (
        <Card style={{ marginBottom: 12, padding: 12, backgroundColor: '#fef2f2' }}>
          <Text style={styles.alertText}>⚠️ {data.counts.slaBreached} ticket{data.counts.slaBreached > 1 ? 's' : ''} approaching SLA breach</Text>
        </Card>
      )}

      <View style={styles.checkInOutRow}>
        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: '#f0fdf4' }]}
          onPress={() => checkinMutation.mutate()}
          disabled={checkinMutation.isPending || data?.isCheckedIn}
          activeOpacity={0.6}
        >
          <Text style={[styles.checkBtnText, { color: '#16a34a' }]}>
            {data?.isCheckedIn ? '✓ Checked In' : 'Check In'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: '#fef2f2' }]}
          onPress={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending || !data?.isCheckedIn}
          activeOpacity={0.6}
        >
          <Text style={[styles.checkBtnText, { color: '#dc2626' }]}>Check Out</Text>
        </TouchableOpacity>
      </View>

      {data?.recentTickets && data.recentTickets.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Tickets</Text>
          {data.recentTickets.slice(0, 5).map((ticket: any) => (
            <View key={ticket.id} style={styles.ticketRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                <Text style={styles.ticketMeta}>#{ticket.ticketNumber} · {ticket.status}</Text>
              </View>
              <Text style={styles.ticketTime}>{timeAgo(ticket.updatedAt)}</Text>
            </View>
          ))}
        </Card>
      )}

      {data?.myTasks && data.myTasks.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>My Tasks</Text>
          {data.myTasks.slice(0, 5).map((task: any) => (
            <View key={task.id} style={styles.taskRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                <Text style={styles.taskMeta}>{task.status} · {task.dueDate || 'No due date'}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(staff)/complaints')} activeOpacity={0.6}>
          <Text style={styles.actionIcon}>🎫</Text>
          <Text style={styles.actionLabel}>Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(staff)/tasks')} activeOpacity={0.6}>
          <Text style={styles.actionIcon}>✅</Text>
          <Text style={styles.actionLabel}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(staff)/residents')} activeOpacity={0.6}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabel}>Residents</Text>
        </TouchableOpacity>
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
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metric: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderTopWidth: 3, flex: 1, minWidth: '45%', alignItems: 'center' },
  metricValue: { fontSize: 28, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  alertText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  checkInOutRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  checkBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  checkBtnText: { fontSize: 14, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  ticketRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  ticketTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  ticketMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  ticketTime: { fontSize: 11, color: '#9ca3af' },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  taskTitle: { fontSize: 14, fontWeight: '500', color: '#111827' },
  taskMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2, textTransform: 'capitalize' },
  quickActions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
});
