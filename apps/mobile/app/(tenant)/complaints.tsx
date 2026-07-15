import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge, Button } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

export default function TenantComplaints() {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const queryClient = useQueryClient();

  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['tenant-complaints'],
    queryFn: () => api.get('/tenant/complaints').then(r => r.data || r),
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

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Complaints</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
          <Text style={styles.addButtonText}>{showForm ? 'Cancel' : '+ New'}</Text>
        </TouchableOpacity>
      </View>

      {showForm && (
        <Card style={styles.form}>
          <Text style={styles.formTitle}>New Complaint</Text>
          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} placeholderTextColor="#9ca3af" />
          <TextInput style={[styles.input, styles.textArea]} placeholder="Describe the issue..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#9ca3af" />
          <Button title="Submit" onPress={() => createMutation.mutate({ title, description, category })} loading={createMutation.isPending} />
        </Card>
      )}

      {(!complaints || complaints.length === 0) ? (
        <EmptyState title="No complaints" message="Submit your first complaint" />
      ) : (
        complaints.map((complaint) => (
          <Card key={complaint.id} style={styles.card}>
            <View style={styles.complaintHeader}>
              <StatusBadge status={complaint.status} />
              <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
            </View>
            <Text style={styles.complaintTitle}>{complaint.title}</Text>
            <Text style={styles.complaintDesc} numberOfLines={2}>{complaint.description}</Text>
            <Text style={styles.date}>{formatDate(complaint.createdAt)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  addButton: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  form: { marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12, color: '#111827' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  card: { marginBottom: 10 },
  complaintHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af' },
  complaintTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  complaintDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  date: { fontSize: 12, color: '#9ca3af' },
});
