import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import type { Complaint } from '../../src/types';

export default function ComplaintsList() {
  const { data: complaints, isLoading, refetch } = useQuery<Complaint[]>({
    queryKey: ['complaints'],
    queryFn: () => api.get('/complaints').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Complaints</Text>

      {(!complaints || complaints.length === 0) ? (
        <EmptyState title="No complaints" message="All clear!" />
      ) : (
        complaints.map((complaint) => (
          <Card key={complaint.id} style={styles.card}>
            <View style={styles.header}>
              <StatusBadge status={complaint.status} />
              <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
            </View>
            <Text style={styles.title}>{complaint.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{complaint.description}</Text>
            <View style={styles.footer}>
              <Text style={styles.meta}>{complaint.category}</Text>
              <Text style={styles.meta}>{formatDate(complaint.createdAt)}</Text>
            </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticket: { fontSize: 12, color: '#9ca3af', fontWeight: '500' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  description: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  meta: { fontSize: 12, color: '#9ca3af' },
});
