import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, SearchBar } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import type { ArchivedUser, ArchivedResident, ArchiveStats } from '../../src/types';

export default function ArchiveScreen() {
  const [activeTab, setActiveTab] = useState<'users' | 'residents'>('users');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<ArchiveStats>({
    queryKey: ['archive-stats'],
    queryFn: () => api.get('/archive/stats').then(r => r.data || r),
  });

  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useQuery<ArchivedUser[]>({
    queryKey: ['archive-users'],
    queryFn: () => api.get('/archive/users', { params: { limit: 100 } }).then(r => r.data?.data || r.data || []),
  });

  const { data: residents, isLoading: residentsLoading, refetch: refetchResidents } = useQuery<ArchivedResident[]>({
    queryKey: ['archive-residents'],
    queryFn: () => api.get('/archive/residents', { params: { limit: 100 } }).then(r => r.data?.data || r.data || []),
  });

  const restoreUserMutation = useMutation({
    mutationFn: (id: string) => api.post(`/archive/users/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-users'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
    },
  });

  const restoreResidentMutation = useMutation({
    mutationFn: (id: string) => api.post(`/archive/residents/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-residents'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/archive/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-users'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
    },
  });

  const deleteResidentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/archive/residents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['archive-residents'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
    },
  });

  function handleRestore(type: 'user' | 'resident', id: string, name: string) {
    Alert.alert('Restore', `Restore ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: () => type === 'user' ? restoreUserMutation.mutate(id) : restoreResidentMutation.mutate(id) },
    ]);
  }

  function handleDelete(type: 'user' | 'resident', id: string, name: string) {
    Alert.alert('Permanent Delete', `Permanently delete ${name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => type === 'user' ? deleteUserMutation.mutate(id) : deleteResidentMutation.mutate(id) },
    ]);
  }

  const isLoading = usersLoading || residentsLoading;
  if (isLoading) return <LoadingSkeleton />;

  const currentData = activeTab === 'users' ? (users || []) : (residents || []);
  const filtered = currentData.filter((item: any) =>
    (item.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.primarySurface }]}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{stats?.totalArchivedUsers || 0}</Text>
          <Text style={styles.statLabel}>Archived Users</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.successSurface }]}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>{stats?.totalArchivedResidents || 0}</Text>
          <Text style={styles.statLabel}>Archived Residents</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.tabActive]} onPress={() => setActiveTab('users')}>
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Users</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'residents' && styles.tabActive]} onPress={() => setActiveTab('residents')}>
          <Text style={[styles.tabText, activeTab === 'residents' && styles.tabTextActive]}>Residents</Text>
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search archived..." />

      {filtered.length === 0 ? (
        <EmptyState title="No archived records" message="Archived users and residents will appear here" icon="📦" />
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }: any) => (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.fullName}</Text>
                  <Text style={styles.cardMeta}>{item.email || item.phone} · Archived {formatDate(item.archivedAt)}</Text>
                  {item.archiveReason && <Text style={styles.cardReason}>Reason: {item.archiveReason}</Text>}
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(activeTab === 'users' ? 'user' : 'resident', item.id, item.fullName)}>
                  <Text style={styles.restoreText}>Restore</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(activeTab === 'users' ? 'user' : 'resident', item.id, item.fullName)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.lg, paddingTop: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontFamily: theme.font.extraBold },
  statLabel: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginTop: 2 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.lg, marginTop: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.borderLight, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  tabTextActive: { color: '#fff' },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  cardMeta: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textMuted, marginTop: 2 },
  cardReason: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.warning, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  restoreBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.successSurface, alignItems: 'center' },
  restoreText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.success },
  deleteBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.dangerSurface, alignItems: 'center' },
  deleteText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.danger },
});
