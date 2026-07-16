import { theme } from "../../src/lib/theme";
import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, BottomSheet, Input, Button } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import { useAuth } from '../../src/services/auth';

export default function TenantProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [phone, setPhone] = useState('');
  const [occupation, setOccupation] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.get('/tenant/me').then(r => r.data || r),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.patch('/tenant/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      setShowEdit(false);
      Alert.alert('Success', 'Profile updated');
    },
  });

  function openEdit() {
    setPhone(profile?.phone || '');
    setOccupation(profile?.occupation || '');
    setEmergencyName(profile?.emergencyName || '');
    setEmergencyPhone(profile?.emergencyPhone || '');
    setShowEdit(true);
  }

  function handleSave() {
    updateMutation.mutate({
      phone: phone.trim() || undefined,
      occupation: occupation.trim() || undefined,
      emergencyName: emergencyName.trim() || undefined,
      emergencyPhone: emergencyPhone.trim() || undefined,
    });
  }

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.fullName?.charAt(0) || 'U'}</Text>
          </View>
          <Text style={styles.name}>{profile?.fullName || user?.fullName}</Text>
          <Text style={styles.email}>{profile?.email || user?.email}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={openEdit}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Personal Info</Text>
          <DetailRow label="Phone" value={profile?.phone} />
          <DetailRow label="Occupation" value={profile?.occupation} />
          <DetailRow label="Gender" value={profile?.gender} />
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Stay Details</Text>
          <DetailRow label="Room" value={profile?.roomNumber} />
          <DetailRow label="Property" value={profile?.propertyName} />
          <DetailRow label="Move In" value={profile?.moveInDate ? formatDate(profile.moveInDate) : ''} />
          <DetailRow label="Rent" value={profile?.rentAmount ? `₹${profile.rentAmount.toLocaleString('en-IN')}` : ''} />
          <DetailRow label="Deposit Paid" value={profile?.depositPaid ? `₹${profile.depositPaid.toLocaleString('en-IN')}` : ''} />
          <DetailRow label="Status" value={profile?.status} />
        </Card>

        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <DetailRow label="Name" value={profile?.emergencyName} />
          <DetailRow label="Phone" value={profile?.emergencyPhone} />
          <DetailRow label="Relation" value={profile?.emergencyRelation} />
        </Card>
      </ScrollView>

      <BottomSheet visible={showEdit} onClose={() => setShowEdit(false)} height={500}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Edit Profile</Text>
          <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" />
          <Input label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Occupation" />
          <Input label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} placeholder="Name" />
          <Input label="Emergency Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="Phone" keyboardType="phone-pad" />
          <View style={styles.actions}>
            <Button title="Cancel" variant="outline" onPress={() => setShowEdit(false)} style={{ flex: 1 }} />
            <Button title="Save" onPress={handleSave} loading={updateMutation.isPending} style={{ flex: 1 }} />
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
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
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16 },
  profileCard: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  email: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  editBtn: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.primary },
  editBtnText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
  detailsCard: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
