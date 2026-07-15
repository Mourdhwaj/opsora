import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, SearchBar, FilterBar, StatusBadge, BottomSheet } from '../../src/components';
import { CreateComplaintForm } from '../../src/components/forms/CreateComplaintForm';
import { api } from '../../src/services/api';
import { formatDate, getPriorityColor, getCategoryIcon } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const PRIORITY_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export default function ComplaintsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['complaints', statusFilter, priorityFilter],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      return api.get('/complaints', { params }).then(r => r.data?.data || r.data || []);
    },
  });

  const filtered = (complaints || []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = (complaints || []).filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const urgentCount = (complaints || []).filter(c => c.priority === 'urgent' && c.status !== 'resolved' && c.status !== 'closed').length;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: '#fff7ed' }]}>
          <Text style={[styles.statValue, { color: '#ea580c' }]}>{openCount}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{urgentCount}</Text>
          <Text style={styles.statLabel}>Urgent</Text>
        </View>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search complaints..." />
      <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />
      <FilterBar options={PRIORITY_FILTERS} selected={priorityFilter} onSelect={setPriorityFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No complaints found" message="All clear!" />
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item: complaint }) => (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <StatusBadge status={complaint.status} />
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(complaint.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(complaint.priority) }]}>{complaint.priority}</Text>
                  </View>
                </View>
                <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
              </View>
              <Text style={styles.title}>{complaint.title}</Text>
              <Text style={styles.description} numberOfLines={2}>{complaint.description}</Text>
              <View style={styles.footer}>
                <Text style={styles.meta}>{getCategoryIcon(complaint.category)} {complaint.category}</Text>
                <Text style={styles.meta}>{formatDate(complaint.createdAt)}</Text>
              </View>
            </Card>
          )}
        />
      )}

      <Text style={styles.fab} onPress={() => setShowCreate(true)}>+</Text>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} height={650}>
        <CreateComplaintForm onClose={() => setShowCreate(false)} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ticket: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  description: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  meta: { fontSize: 12, color: '#9ca3af' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', textAlign: 'center', lineHeight: 56, fontSize: 28, color: '#fff', elevation: 6, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
