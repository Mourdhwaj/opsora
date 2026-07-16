import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CreditCard } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState, SearchBar, FilterChips, TimeFilter, LoadMoreButton, PageHeader, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate, getTimeParams } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import type { RentPayment } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Partial', value: 'partial' },
];

const TIME_FILTERS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'All Time', value: 'all_time' },
];

const PAGE_SIZE = 20;

export default function PaymentsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [page, setPage] = useState(1);
  const router = useRouter();

  const timeParams = getTimeParams(timeFilter);

  const { data, isLoading, error, refetch, isFetching } = useQuery<{ data: RentPayment[]; total: number }>({
    queryKey: ['payments', statusFilter, timeFilter, page],
    queryFn: () => {
      const params: any = { page, limit: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (timeParams.startDate) params.startDate = timeParams.startDate;
      if (timeParams.endDate) params.endDate = timeParams.endDate;
      return api.get('/payments', { params }).then(r => {
        const d = r.data?.data || r.data;
        return Array.isArray(d) ? { data: d, total: r.data?.pagination?.total ?? d.length } : d;
      });
    },
  });

  const payments = data?.data || [];
  const total = data?.total || 0;

  const filtered = payments.filter(p =>
    (p.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.roomNumber || '').includes(search)
  );

  const totalPaid = filtered.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = filtered.filter(p => p.paymentStatus !== 'paid').reduce((s, p) => s + p.balanceAmount, 0);

  const remaining = total - page * PAGE_SIZE;

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load payments" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      <PageHeader title="Payments" />
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { setPage(1); refetch(); }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.successSurface }]}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{formatCurrency(totalPaid)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.dangerSurface }]}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{formatCurrency(totalPending)}</Text>
          </View>
        </View>

        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by tenant or room..." />

        <FilterChips
          options={STATUS_FILTERS}
          selected={statusFilter}
          onSelect={v => { setStatusFilter(v); setPage(1); }}
        />

        <TimeFilter
          options={TIME_FILTERS}
          selected={timeFilter}
          onSelect={v => { setTimeFilter(v); setPage(1); }}
        />

        <Text style={styles.countText}>
          Showing {filtered.length} of {total} payment{total !== 1 ? 's' : ''}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState title="No payments found" message="Record a payment to get started" />
        ) : (
          filtered.map(payment => (
            <Card key={payment.id} style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <CreditCard size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.tenantName}>{payment.tenantName || 'N/A'}</Text>
                  <Text style={styles.monthYear}>{payment.monthYear} · Room {payment.roomNumber || 'N/A'}</Text>
                </View>
                <StatusBadge status={payment.paymentStatus} />
              </View>
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Total</Text>
                  <Text style={styles.amount}>{formatCurrency(payment.totalAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Paid</Text>
                  <Text style={[styles.amount, { color: theme.colors.success }]}>{formatCurrency(payment.paidAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Balance</Text>
                  <Text style={[styles.amount, { color: payment.balanceAmount > 0 ? theme.colors.danger : theme.colors.success }]}>{formatCurrency(payment.balanceAmount)}</Text>
                </View>
              </View>
              <Text style={styles.dueDate}>Due: {formatDate(payment.dueDate)}</Text>
            </Card>
          ))
        )}

        <LoadMoreButton
          onPress={() => setPage(p => p + 1)}
          loading={isFetching && page > 1}
          remaining={remaining}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.sm },
  summaryCard: { flex: 1, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  countText: { fontSize: 13, color: theme.colors.textMuted, paddingHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  paymentCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primarySurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  tenantName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  monthYear: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  dueDate: { fontSize: 12, color: theme.colors.textMuted, textAlign: 'right', marginTop: 4 },
});
