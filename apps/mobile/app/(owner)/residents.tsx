import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { TenantProfile } from '../../src/types';

export default function ResidentsList() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { data: residents, isLoading, refetch } = useQuery<TenantProfile[]>({
    queryKey: ['residents'],
    queryFn: () => api.get('/residents').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (residents || []).filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.roomNumber?.includes(search)
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Residents</Text>
      <TextInput style={styles.search} placeholder="Search by name, phone, or room..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />

      {filtered.length === 0 ? (
        <EmptyState title="No residents found" />
      ) : (
        filtered.map((resident) => (
          <TouchableOpacity key={resident.id} onPress={() => router.push(`/(owner)/residents/${resident.id}`)}>
            <Card style={styles.residentCard}>
              <View style={styles.residentHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{resident.fullName.charAt(0)}</Text>
                </View>
                <View style={styles.residentInfo}>
                  <Text style={styles.residentName}>{resident.fullName}</Text>
                  <Text style={styles.residentDetail}>{resident.phone} · Room {resident.roomNumber}</Text>
                </View>
                <StatusBadge status={resident.status} />
              </View>
              <View style={styles.residentFooter}>
                <Text style={styles.footerText}>Move in: {formatDate(resident.moveInDate)}</Text>
                <Text style={styles.footerText}>Rent: ₹{resident.rentAmount}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  residentCard: { marginBottom: 10 },
  residentHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  residentDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  residentFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  footerText: { fontSize: 12, color: '#9ca3af' },
});
