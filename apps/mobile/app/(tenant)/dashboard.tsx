import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';

interface TenantDashboardData {
  profile: { fullName: string; phone: string };
  property: { name: string; address: string; city: string };
  room: { number: string; type: string };
  payments: { currentMonth: { due: number; paid: number; pending: number; status: string }; recent: any[] };
  complaints: { open: number; urgent: number; recent: any[] };
}

export default function TenantDashboard() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery<TenantDashboardData>({
    queryKey: ['tenant-dashboard'],
    queryFn: () => api.get('/tenant/dashboard').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={refetch} />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning!' : hour < 17 ? 'Good Afternoon!' : 'Good Evening!';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.greeting}>{greeting}</Text>
      <Text style={styles.name}>{data?.profile?.fullName || ''}</Text>

      <Card style={styles.rentCard}>
        <Text style={styles.cardTitle}>Rent Status</Text>
        <Text style={styles.rentAmount}>{formatCurrency(data?.payments?.currentMonth?.due || 0)}</Text>
        <Text style={[styles.dueDate, { color: data?.payments?.currentMonth?.status === 'paid' ? theme.colors.success : theme.colors.danger }]}>
          {data?.payments?.currentMonth?.status === 'paid' ? 'Paid' : `Pending: ${formatCurrency(data?.payments?.currentMonth?.pending || 0)}`}
        </Text>
      </Card>

      <View style={styles.row}>
        <Card style={[styles.smallCard, { flex: 1, marginRight: 4 }]}>
          <Text style={styles.cardTitle}>Room</Text>
          <Text style={styles.roomText}>{data?.room?.number || 'N/A'}</Text>
          <Text style={styles.roomType}>{data?.room?.type || ''}</Text>
        </Card>
        <Card style={[styles.smallCard, { flex: 1, marginLeft: 4 }]}>
          <Text style={styles.cardTitle}>Issues</Text>
          <Text style={[styles.issueCount, { color: (data?.complaints?.open || 0) > 0 ? theme.colors.danger : theme.colors.success }]}>
            {data?.complaints?.open || 0}
          </Text>
          <Text style={styles.roomType}>{data?.complaints?.urgent || 0} urgent</Text>
        </Card>
      </View>

      <Card style={styles.section}>
        <Text style={styles.cardTitle}>Property</Text>
        <Text style={styles.propName}>{data?.property?.name || ''}</Text>
        <Text style={styles.propAddr}>{data?.property?.address}, {data?.property?.city}</Text>
      </Card>

      {data?.complaints?.recent && data.complaints.recent.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.cardTitle}>Recent Complaints</Text>
          {data.complaints.recent.slice(0, 3).map((c: any) => (
            <View key={c.id} style={styles.complaintRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.complaintTitle} numberOfLines={1}>{c.title}</Text>
                <Text style={styles.complaintMeta}>#{c.ticketNumber} · {c.status}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tenant)/payments')}>
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionLabel}>Pay Rent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tenant)/complaints')}>
          <Text style={styles.actionIcon}>🎫</Text>
          <Text style={styles.actionLabel}>Report Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tenant)/food')}>
          <Text style={styles.actionIcon}>🍽️</Text>
          <Text style={styles.actionLabel}>View Menu</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  greeting: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text, marginBottom: 4 },
  name: { fontSize: 16, color: theme.colors.textSecondary, marginBottom: 20 },
  rentCard: { marginBottom: 12 },
  cardTitle: { fontSize: 14, color: theme.colors.textSecondary, fontFamily: theme.font.medium },
  rentAmount: { fontSize: 36, fontFamily: theme.font.extraBold, color: theme.colors.text, marginTop: 8 },
  dueDate: { fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', marginBottom: 12 },
  smallCard: { padding: 16 },
  roomText: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text, marginTop: 8 },
  roomType: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  issueCount: { fontSize: 28, fontFamily: theme.font.extraBold, marginTop: 8 },
  section: { marginBottom: 12 },
  propName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text, marginTop: 8 },
  propAddr: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  complaintRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  complaintTitle: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text },
  complaintMeta: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionButton: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 11, fontFamily: theme.font.semiBold, color: theme.colors.textDark },
});
