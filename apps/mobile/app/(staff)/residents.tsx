import { theme } from '../../src/lib/theme';
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, ErrorState, LoadMoreButton } from '../../src/components';
import { api } from '../../src/services/api';
import type { TenantProfile } from '../../src/types';

const PAGE_SIZE = 20;

export default function StaffResidents() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isFetching } = useQuery<{ data: TenantProfile[]; pagination?: { total: number } }>({
    queryKey: ['staff-residents', page],
    queryFn: () => api.get('/staff-portal/residents', { params: { page, limit: PAGE_SIZE } }).then(r => r.data),
  });

  const residents = data?.data || [];
  const total = data?.pagination?.total ?? residents.length;

  const remaining = total - page * PAGE_SIZE;

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load residents" onRetry={refetch} />;

  const filtered = residents.filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.roomNumber?.includes(search)
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { setPage(1); refetch(); }} />}>
      <Text style={styles.pageTitle}>Residents</Text>
      <TextInput style={styles.search} placeholder="Search..." value={search} onChangeText={setSearch} placeholderTextColor={theme.colors.textMuted} />
      {filtered.length === 0 ? (
        <EmptyState title="No residents found" message="Residents will appear here" />
      ) : (
        filtered.map((r) => (
          <Card key={r.id} style={styles.card}>
            <Text style={styles.name}>{r.fullName}</Text>
            <Text style={styles.detail}>Room {r.roomNumber} · {r.phone}</Text>
          </Card>
        ))
      )}
      <LoadMoreButton onPress={() => setPage(p => p + 1)} loading={isFetching && page > 1} remaining={remaining} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  pageTitle: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text, marginBottom: 16 },
  search: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 },
  card: { marginBottom: 8 },
  name: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  detail: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
});
