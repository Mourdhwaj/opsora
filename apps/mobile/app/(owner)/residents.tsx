import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, SearchBar, FilterBar, BottomSheet } from '../../src/components';
import { ResidentCheckinForm } from '../../src/components/forms/ResidentCheckinForm';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { TenantProfile } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Moved Out', value: 'moved_out' },
];

export default function ResidentsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCheckin, setShowCheckin] = useState(false);
  const router = useRouter();

  const { data: residents, isLoading, refetch } = useQuery<TenantProfile[]>({
    queryKey: ['residents', statusFilter],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      return api.get('/residents', { params }).then(r => r.data?.data || r.data || []);
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (residents || []).filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.roomNumber?.includes(search)
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Text style={styles.pageTitle}>Residents</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, phone, or room..." />
        <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

        <Text style={styles.countText}>{filtered.length} resident{filtered.length !== 1 ? 's' : ''}</Text>

        {filtered.length === 0 ? (
          <EmptyState title="No residents found" message="Check in a resident to get started" />
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
                    <Text style={styles.residentDetail}>{resident.phone} · Room {resident.roomNumber || 'N/A'}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(resident.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(resident.status) }]}>{resident.status}</Text>
                  </View>
                </View>
                <View style={styles.residentFooter}>
                  <Text style={styles.footerText}>Move in: {formatDate(resident.moveInDate)}</Text>
                  <Text style={styles.footerText}>Rent: ₹{resident.rentAmount.toLocaleString('en-IN')}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCheckin(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <BottomSheet visible={showCheckin} onClose={() => setShowCheckin(false)} height={750}>
        <ResidentCheckinForm onClose={() => setShowCheckin(false)} />
      </BottomSheet>
    </View>
  );
}

function getStatusBg(status: string): string {
  const colors: Record<string, string> = { active: '#dcfce7', inactive: '#fef2f2', moved_out: '#f3f4f6' };
  return colors[status] || '#f3f4f6';
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = { active: '#16a34a', inactive: '#dc2626', moved_out: '#6b7280' };
  return colors[status] || '#6b7280';
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  countText: { fontSize: 13, color: '#9ca3af', marginHorizontal: 16, marginBottom: 8 },
  residentCard: { marginBottom: 10 },
  residentHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  residentInfo: { flex: 1 },
  residentName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  residentDetail: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  residentFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  footerText: { fontSize: 12, color: '#9ca3af' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabIcon: { fontSize: 28, color: '#fff', marginTop: -2 },
});
