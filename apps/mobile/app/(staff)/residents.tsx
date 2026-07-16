import { theme } from '../../src/lib/theme';
import { useState } from 'react';
import { ScrollView, View, Text, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import type { TenantProfile } from '../../src/types';

export default function StaffResidents() {
  const [search, setSearch] = useState('');
  const { data: residents, isLoading, refetch } = useQuery<TenantProfile[]>({
    queryKey: ['staff-residents'],
    queryFn: () => api.get('/staff-portal/residents').then(r => r.data?.data || r.data || []),
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
