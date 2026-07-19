import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Plus, AlertCircle } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, SearchBar, FilterChips, TimeFilter, LoadMoreButton, PageHeader, StatusBadge, BottomSheet } from '../../src/components';
import { CreateComplaintForm } from '../../src/components/forms/CreateComplaintForm';
import { api } from '../../src/services/api';
import { formatDate, getPriorityColor, getTimeParams } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';
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

const TIME_FILTERS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'All Time', value: 'all_time' },
];

const PAGE_SIZE = 20;

export default function ComplaintsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));

  const timeParams = getTimeParams(timeFilter);

  const { data, isLoading, refetch, isFetching } = useQuery<{ data: Complaint[]; total: number }>({
    queryKey: ['complaints', statusFilter, priorityFilter, timeFilter, page],
    queryFn: () => {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (timeParams.startDate) params.startDate = timeParams.startDate;
      if (timeParams.endDate) params.endDate = timeParams.endDate;
      return api.get('/complaints', { params }).then(r => {
        const d = r.data?.data || r.data;
        return Array.isArray(d) ? { data: d, total: r.data?.pagination?.total ?? d.length } : d;
      });
    },
  });

  const complaints = data?.data || [];
  const total = data?.total || 0;

  const filtered = complaints.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const openCount = complaints.filter(c => c.status === 'open' || c.status === 'in_progress').length;
  const urgentCount = complaints.filter(c => c.priority === 'urgent' && c.status !== 'resolved' && c.status !== 'closed').length;

  const remaining = total - page * PAGE_SIZE;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <PageHeader
        title="Issues"
        action={
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreate(true)}>
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { setPage(1); refetch(); }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={[styles.summaryRow, { paddingHorizontal: hp }]}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.warningSurface }]}>
            <Text style={[styles.summaryValue, { color: theme.colors.warning }]}>{openCount}</Text>
            <Text style={styles.summaryLabel}>Open</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.dangerSurface }]}>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{urgentCount}</Text>
            <Text style={styles.summaryLabel}>Urgent</Text>
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Search issues..." />

        <FilterChips
          options={STATUS_FILTERS}
          selected={statusFilter}
          onSelect={v => { setStatusFilter(v); setPage(1); }}
        />

        <FilterChips
          options={PRIORITY_FILTERS}
          selected={priorityFilter}
          onSelect={v => { setPriorityFilter(v); setPage(1); }}
        />

        <TimeFilter
          options={TIME_FILTERS}
          selected={timeFilter}
          onSelect={v => { setTimeFilter(v); setPage(1); }}
        />

        <Text style={[styles.countText, { marginHorizontal: hp }]}>
          Showing {filtered.length} of {total} issue{total !== 1 ? 's' : ''}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState title="No issues found" message="All clear!" />
        ) : (
          filtered.map(complaint => (
            <Card key={complaint.id} style={[styles.card, { marginHorizontal: hp }]}>
              <TouchableOpacity
                style={styles.cardContent}
                onPress={() => router.push(`/(details)/complaints/${complaint.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <AlertCircle size={20} color={theme.colors.primary} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.title}>{complaint.title}</Text>
                    <Text style={styles.ticket}>#{complaint.ticketNumber}</Text>
                  </View>
                  <StatusBadge status={complaint.status} />
                </View>

                <Text style={styles.description} numberOfLines={2}>{complaint.description}</Text>

                <View style={styles.footer}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(complaint.priority) + '20' }]}>
                    <Text style={[styles.priorityText, { color: getPriorityColor(complaint.priority) }]}>{complaint.priority}</Text>
                  </View>
                  <Text style={styles.meta}>{formatDate(complaint.createdAt)}</Text>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}

        <LoadMoreButton
          onPress={() => setPage(p => p + 1)}
          loading={isFetching && page > 1}
          remaining={remaining}
        />
      </ScrollView>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} height={650}>
        <CreateComplaintForm onClose={() => setShowCreate(false)} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.sm },
  summaryCard: { flex: 1, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontFamily: theme.font.extraBold },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  countText: { fontSize: 13, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  card: { marginBottom: theme.spacing.sm },
  cardContent: {},
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primarySurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  title: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.text },
  ticket: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  description: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.borderRadius.full },
  priorityText: { fontSize: 11, fontFamily: theme.font.semiBold, textTransform: 'capitalize' },
  meta: { fontSize: 12, color: theme.colors.textMuted },
});
