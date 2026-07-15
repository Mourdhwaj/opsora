import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

export default function StaffComplaints() {
  const queryClient = useQueryClient();
  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['staff-complaints'],
    queryFn: () => api.get('/staff-portal/complaints').then(r => r.data || r),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/complaints/${id}`, { status: 'resolved' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-complaints'] });
      Alert.alert('Resolved', 'Complaint marked as resolved');
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Complaints</Text>
      {(!complaints || complaints.length === 0) ? (
        <EmptyState title="No complaints" />
      ) : (
        complaints.map((c) => (
          <Card key={c.id} style={styles.card}>
            <View style={styles.header}>
              <StatusBadge status={c.status} />
              <Text style={styles.ticket}>#{c.ticketNumber}</Text>
            </View>
            <Text style={styles.title}>{c.title}</Text>
            <Text style={styles.desc} numberOfLines={2}>{c.description}</Text>
            <Text style={styles.meta}>{c.category} · {formatDate(c.createdAt)}</Text>
            {c.status === 'open' && (
              <TouchableOpacity style={styles.resolveButton} onPress={() => resolveMutation.mutate(c.id)}>
                <Text style={styles.resolveText}>Mark Resolved</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  desc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  meta: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  resolveButton: { backgroundColor: '#22c55e', borderRadius: 8, padding: 10, alignItems: 'center' },
  resolveText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
