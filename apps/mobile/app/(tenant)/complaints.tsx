import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, StatusBadge, SearchBar, FilterBar, BottomSheet } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate, getPriorityColor, getCategoryIcon } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

const CATEGORIES = [
  'maintenance', 'plumbing', 'electrical', 'cleaning', 'security',
  'food', 'noise', 'parking', 'internet', 'other',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
];

export default function TenantComplaints() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [priority, setPriority] = useState('medium');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['tenant-complaints', statusFilter],
    queryFn: () => {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      return api.get('/tenant/complaints', { params }).then(r => r.data?.data || r.data || []);
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post('/complaints', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-complaints'] });
      setShowForm(false);
      setTitle('');
      setDescription('');
      Alert.alert('Success', 'Complaint submitted');
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.error || 'Failed to submit'),
  });

  function handleCreate() {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }
    createMutation.mutate({ title: title.trim(), description: description.trim(), category, priority });
  }

  const filtered = (complaints || []).filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.ticketNumber?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>My Complaints</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      <BottomSheet visible={showForm} onClose={() => setShowForm(false)} height={600}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>New Complaint</Text>
          <Text style={styles.label}>Title *</Text>
          <View style={styles.input}>
            <Text style={styles.inputPlaceholder}>Brief description</Text>
          </View>
          <Text style={styles.label}>Description *</Text>
          <View style={[styles.input, styles.textArea]}>
            <Text style={styles.inputPlaceholder}>Detailed description</Text>
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {getCategoryIcon(c)}
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity key={p} style={[styles.chip, priority === p && { backgroundColor: getPriorityColor(p) }]} onPress={() => setPriority(p)}>
                <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={createMutation.isPending}>
            <Text style={styles.submitText}>{createMutation.isPending ? 'Submitting...' : 'Submit Complaint'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search complaints..." />
      <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No complaints" message="Submit your first complaint" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {filtered.map((complaint) => (
            <TouchableOpacity key={complaint.id} onPress={() => router.push(`/(tenant)/complaints/${complaint.id}`)}>
              <Card style={styles.card}>
                <View style={styles.complaintHeader}>
                  <StatusBadge status={complaint.status} />
                  <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
                </View>
                <Text style={styles.complaintTitle}>{complaint.title}</Text>
                <Text style={styles.complaintDesc} numberOfLines={2}>{complaint.description}</Text>
                <View style={styles.complaintMeta}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {getCategoryIcon(complaint.category)}
                    <Text style={styles.metaText}>{complaint.category}</Text>
                  </View>
                  <Text style={styles.metaText}>{formatDate(complaint.createdAt)}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  addButton: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, marginBottom: 12 },
  textArea: { minHeight: 80 },
  inputPlaceholder: { fontSize: 16, color: '#9ca3af' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#6b7280', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: { marginHorizontal: 16, marginBottom: 10 },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af' },
  complaintTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  complaintDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  complaintMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  metaText: { fontSize: 12, color: '#9ca3af' },
});
