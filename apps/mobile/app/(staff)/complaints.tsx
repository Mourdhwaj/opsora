import { theme } from "../../src/lib/theme";
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, SearchBar, FilterBar, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate, getPriorityColor, getCategoryIcon, timeAgo } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
];

const PRIORITY_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export default function StaffComplaints() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['staff-complaints', statusFilter, priorityFilter],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      return api.get('/staff-portal/complaints', { params }).then(r => r.data?.data || r.data || []);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/complaints/${id}/status`, { status: 'in_progress' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-complaints'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.patch(`/complaints/${id}/status`, { status: 'resolved', resolutionNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-complaints'] });
      Alert.alert('Resolved', 'Complaint marked as resolved');
    },
  });

  const filtered = (complaints || []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.ticketNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search tickets..." />
      <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />
      <FilterBar options={PRIORITY_FILTERS} selected={priorityFilter} onSelect={setPriorityFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No tickets found" message="All clear — no complaints to show" />
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item: c }) => (
            <TouchableOpacity onPress={() => router.push(`/(staff)/complaints/${c.id}`)} activeOpacity={0.7}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <StatusBadge status={c.status} />
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(c.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(c.priority) }]}>{c.priority}</Text>
                  </View>
                </View>
                <Text style={styles.ticket}>#{c.ticketNumber}</Text>
              </View>
              <Text style={styles.title}>{c.title}</Text>
              <Text style={styles.desc} numberOfLines={2}>{c.description}</Text>
              <View style={styles.metaRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {getCategoryIcon(c.category)}
                  <Text style={styles.meta}>{c.category}</Text>
                </View>
                <Text style={styles.meta}>{timeAgo(c.createdAt)}</Text>
              </View>
              <View style={styles.actions}>
                {c.status === 'open' && (
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptMutation.mutate(c.id)} activeOpacity={0.6}>
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                )}
                {(c.status === 'open' || c.status === 'in_progress') && (
                  <TouchableOpacity style={styles.resolveBtn} onPress={() => resolveMutation.mutate({ id: c.id })} activeOpacity={0.6}>
                    <Text style={styles.resolveText}>Resolve</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ticket: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  desc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginBottom: 8 },
  meta: { fontSize: 12, color: '#9ca3af' },
  actions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#eff6ff', alignItems: 'center' },
  acceptText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  resolveBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f0fdf4', alignItems: 'center' },
  resolveText: { fontSize: 13, fontWeight: '600', color: '#16a34a' },
});
