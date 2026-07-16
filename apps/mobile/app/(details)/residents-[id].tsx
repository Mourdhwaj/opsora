import { theme } from "../../src/lib/theme";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, LoadingSkeleton, StatusBadge, Button } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate, formatCurrency } from '../../src/lib/utils';

export default function ResidentDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => api.get(`/residents/${id}/details`).then(r => r.data || r),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.post(`/residents/${id}/checkout`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Cannot checkout resident with pending payments or complaints');
    },
  });

  function handleCheckout() {
    Alert.alert(
      'Checkout Resident',
      'Are you sure? This will archive the resident and free the bed. Residents with pending payments or complaints cannot be checked out.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Checkout', style: 'destructive', onPress: () => checkoutMutation.mutate() },
      ]
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  const resident = data?.profile || data;
  const room = data?.room;
  const bed = data?.bed;
  const property = data?.property;
  const paymentHistory = data?.paymentHistory || [];
  const complaints = data?.recentComplaints || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{resident?.fullName?.charAt(0) || '?'}</Text>
        </View>
        <Text style={styles.name}>{resident?.fullName}</Text>
        <Text style={styles.email}>{resident?.email || resident?.phone}</Text>
        <View style={{ marginTop: 8 }}>
          <StatusBadge status={resident?.status || 'active'} />
        </View>
        {resident?.status === 'active' && (
          <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
            <Text style={styles.checkoutText}>Checkout Resident</Text>
          </TouchableOpacity>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <DetailRow label="Phone" value={resident?.phone} />
        <DetailRow label="Emergency Contact" value={resident?.emergencyName ? `${resident.emergencyName} (${resident.emergencyPhone})` : undefined} />
        <DetailRow label="ID Proof" value={resident?.idProofType} />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Stay Details</Text>
        <DetailRow label="Room" value={room?.roomNumber || resident?.roomId?.substring(0, 8)} />
        <DetailRow label="Bed" value={bed?.bedNumber || resident?.bedId?.substring(0, 8)} />
        <DetailRow label="Property" value={property?.name || resident?.propertyId?.substring(0, 8)} />
        <DetailRow label="Move In" value={resident?.moveInDate ? formatDate(resident.moveInDate) : ''} />
        <DetailRow label="Move Out" value={resident?.moveOutDate ? formatDate(resident.moveOutDate) : 'Currently staying'} />
        <DetailRow label="Rent" value={resident?.rentAmount ? formatCurrency(resident.rentAmount) + '/month' : ''} />
        <DetailRow label="Deposit" value={resident?.depositPaid ? formatCurrency(resident.depositPaid) : ''} />
      </Card>

      {paymentHistory.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {paymentHistory.slice(0, 5).map((payment: any) => (
            <View key={payment.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{payment.monthYear}</Text>
                <Text style={styles.historySubtitle}>{payment.paymentStatus}</Text>
              </View>
              <Text style={styles.historyAmount}>{formatCurrency(payment.totalAmount)}</Text>
            </View>
          ))}
        </Card>
      )}

      {complaints.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Complaints</Text>
          {complaints.slice(0, 5).map((complaint: any) => (
            <View key={complaint.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle} numberOfLines={1}>{complaint.title}</Text>
                <Text style={styles.historySubtitle}>{complaint.ticketNumber} · {complaint.status}</Text>
              </View>
              <View style={[styles.miniBadge, { backgroundColor: getStatusBg(complaint.status) }]}>
                <Text style={[styles.miniBadgeText, { color: getStatusColor(complaint.status) }]}>{complaint.status}</Text>
              </View>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );
}

function getStatusBg(status: string): string {
  const colors: Record<string, string> = { open: '#fff7ed', in_progress: '#eff6ff', resolved: '#f0fdf4', closed: '#f9fafb' };
  return colors[status] || '#f9fafb';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = { open: '#ea580c', in_progress: theme.colors.primary, resolved: '#16a34a', closed: '#6b7280' };
  return colors[status] || '#6b7280';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  profileCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  checkoutBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444' },
  checkoutText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  historySubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  historyAmount: { fontSize: 14, fontWeight: '700', color: '#111827' },
  miniBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  miniBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
