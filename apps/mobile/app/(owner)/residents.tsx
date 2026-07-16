import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { User, Plus } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, SearchBar, FilterChips, TimeFilter, LoadMoreButton, BottomSheet, StatusBadge, PageHeader } from '../../src/components';
import { ResidentCheckinForm } from '../../src/components/forms/ResidentCheckinForm';
import { api } from '../../src/services/api';
import { formatDate, getTimeParams } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import type { TenantProfile } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Moved Out', value: 'moved_out' },
];

const TIME_FILTERS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'All Time', value: 'all_time' },
];

const PAGE_SIZE = 20;

export default function ResidentsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [page, setPage] = useState(1);
  const [showCheckin, setShowCheckin] = useState(false);
  const router = useRouter();

  const timeParams = getTimeParams(timeFilter);

  const { data, isLoading, refetch, isFetching } = useQuery<{ data: TenantProfile[]; total: number }>({
    queryKey: ['residents', statusFilter, timeFilter, page],
    queryFn: () => {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (timeParams.startDate) params.startDate = timeParams.startDate;
      if (timeParams.endDate) params.endDate = timeParams.endDate;
      return api.get('/residents', { params }).then(r => {
        const d = r.data?.data || r.data;
        return Array.isArray(d) ? { data: d, total: d.length } : d;
      });
    },
  });

  const residents = data?.data || [];
  const total = data?.total || 0;

  const filtered = residents.filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) ||
    r.roomNumber?.includes(search)
  );

  const remaining = total - page * PAGE_SIZE;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <PageHeader
        title="Residents"
        action={
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowCheckin(true)}>
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { setPage(1); refetch(); }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name, phone, or room..." />

        <FilterChips options={STATUS_FILTERS} selected={statusFilter} onSelect={v => { setStatusFilter(v); setPage(1); }} />

        <TimeFilter options={TIME_FILTERS} selected={timeFilter} onSelect={v => { setTimeFilter(v); setPage(1); }} />

        <Text style={styles.countText}>
          Showing {filtered.length} of {total} resident{total !== 1 ? 's' : ''}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState title="No residents found" message="Check in a resident to get started" />
        ) : (
          filtered.map(resident => (
            <TouchableOpacity key={resident.id} onPress={() => router.push(`/(details)/residents-${resident.id}`)}>
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.avatar}>
                    <User size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name}>{resident.fullName}</Text>
                    <Text style={styles.detail}>{resident.phone} · Room {resident.roomNumber || 'N/A'}</Text>
                  </View>
                  <StatusBadge status={resident.status} />
                </View>
                <View style={styles.footer}>
                  <Text style={styles.footerText}>Move in: {formatDate(resident.moveInDate)}</Text>
                  <Text style={styles.footerText}>Rent: ₹{resident.rentAmount.toLocaleString('en-IN')}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <LoadMoreButton
          onPress={() => setPage(p => p + 1)}
          loading={isFetching && page > 1}
          remaining={remaining}
        />
      </ScrollView>

      <BottomSheet visible={showCheckin} onClose={() => setShowCheckin(false)} height={750}>
        <ResidentCheckinForm onClose={() => setShowCheckin(false)} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  headerBtn: { backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.full, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 13, color: theme.colors.textMuted, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  card: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  detail: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  footerText: { fontSize: 12, color: theme.colors.textMuted },
});
