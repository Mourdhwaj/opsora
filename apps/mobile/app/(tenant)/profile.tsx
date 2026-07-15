import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import { useAuth } from '../../src/services/auth';

export default function TenantProfile() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.get('/tenant/profile').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.fullName?.charAt(0) || 'U'}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName || user?.fullName}</Text>
        <Text style={styles.email}>{profile?.email || user?.email}</Text>
      </Card>

      <Card style={styles.detailsCard}>
        <DetailRow label="Phone" value={profile?.phone} />
        <DetailRow label="Room" value={profile?.roomNumber} />
        <DetailRow label="Move In" value={profile?.moveInDate ? formatDate(profile.moveInDate) : ''} />
        <DetailRow label="Rent" value={profile?.rentAmount ? `₹${profile.rentAmount}` : ''} />
        <DetailRow label="Deposit Paid" value={profile?.depositPaid ? `₹${profile.depositPaid}` : ''} />
        <DetailRow label="Status" value={profile?.status} />
      </Card>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  profileCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  detailsCard: { marginBottom: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
