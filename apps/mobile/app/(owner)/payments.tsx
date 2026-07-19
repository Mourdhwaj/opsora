import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, Platform, Modal } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CreditCard, Calendar, ArrowLeft, Search } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState, SearchBar, LoadMoreButton, PageHeader } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';
import type { RentPayment } from '../../src/types';

const TIME_FILTERS = [
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 3 Months', value: 'last_3_months' },
  { label: 'All Time', value: 'all_time' },
  { label: 'Paid', value: 'paid' },
  { label: 'Date Range', value: 'date_range' },
];

const PAGE_SIZE = 20;

function getDateRange(filter: string): { startDate?: string; endDate?: string; monthYear?: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const currentMonth = `${year}-${month}`;

  if (filter === 'this_month') {
    return { monthYear: currentMonth };
  }
  if (filter === 'last_3_months') {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    const startYear = d.getFullYear();
    const startMonth = String(d.getMonth() + 1).padStart(2, '0');
    return { startDate: `${startYear}-${startMonth}-01`, endDate: `${year}-${month}-31` };
  }
  if (filter === 'paid') {
    return {};
  }
  return {};
}

export default function PaymentsList() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string; month?: string }>();
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));

  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState(params.filter === 'paid' ? 'paid' : params.month ? 'this_month' : 'this_month');
  const [page, setPage] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(null);
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(null);
  const [activeDateInput, setActiveDateInput] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (params.filter) setTimeFilter(params.filter === 'paid' ? 'paid' : 'this_month');
    if (params.month) setTimeFilter('this_month');
  }, [params.filter, params.month]);

  const dateRange = getDateRange(timeFilter);
  const customStartDate = timeFilter === 'date_range' && dateRangeStart ? dateRangeStart.toISOString().split('T')[0] : undefined;
  const customEndDate = timeFilter === 'date_range' && dateRangeEnd ? dateRangeEnd.toISOString().split('T')[0] : undefined;

  const { data, isLoading, error, refetch, isFetching } = useQuery<{ data: RentPayment[]; total: number }>({
    queryKey: ['payments', timeFilter, page, customStartDate, customEndDate],
    queryFn: () => {
      const q: any = { page, limit: PAGE_SIZE, status: 'paid' };
      if (dateRange.monthYear) q.monthYear = dateRange.monthYear;
      if (dateRange.startDate) q.startDate = dateRange.startDate;
      if (dateRange.endDate) q.endDate = dateRange.endDate;
      if (customStartDate) q.startDate = customStartDate;
      if (customEndDate) q.endDate = customEndDate;
      return api.get('/payments', { params: q }).then(r => {
        const d = r.data?.data || r.data;
        return Array.isArray(d) ? { data: d, total: r.data?.pagination?.total ?? d.length } : d;
      });
    },
  });

  const payments = data?.data || [];
  const total = data?.total || 0;

  const filtered = payments.filter(p =>
    (p.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.roomNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalCollected = filtered.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalExpected = filtered.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const remaining = total - page * PAGE_SIZE;

  const formatDateShort = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load payments" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingHorizontal: hp }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { setPage(1); refetch(); }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <View style={[styles.summaryRow, { marginHorizontal: hp }]}>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.successSurface }]}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{formatCurrency(totalCollected)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.primarySurface }]}>
            <Text style={styles.summaryLabel}>Expected</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>{formatCurrency(totalExpected)}</Text>
          </View>
        </View>

        <View style={[styles.searchRow, { marginHorizontal: hp }]}>
          <View style={styles.searchInputWrap}>
            <Search size={16} color={theme.colors.textMuted} />
            <View style={styles.searchInput}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search by tenant or room..." />
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, { paddingHorizontal: hp }]}
        >
          {TIME_FILTERS.map(f => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filterPill, timeFilter === f.value && styles.filterPillActive]}
              onPress={() => { setTimeFilter(f.value); setPage(1); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, timeFilter === f.value && styles.filterPillTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {timeFilter === 'date_range' && (
          <View style={[styles.dateRangeRow, { marginHorizontal: hp }]}>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => { setActiveDateInput('start'); setShowDatePicker(true); }}
            >
              <Calendar size={14} color={theme.colors.textMuted} />
              <Text style={[styles.dateText, !dateRangeStart && styles.datePlaceholder]}>
                {dateRangeStart ? formatDateShort(dateRangeStart) : 'Start Date'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dateSeparator}>to</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => { setActiveDateInput('end'); setShowDatePicker(true); }}
            >
              <Calendar size={14} color={theme.colors.textMuted} />
              <Text style={[styles.dateText, !dateRangeEnd && styles.datePlaceholder]}>
                {dateRangeEnd ? formatDateShort(dateRangeEnd) : 'End Date'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={[styles.countText, { marginHorizontal: hp }]}>
          Showing {filtered.length} paid payment{filtered.length !== 1 ? 's' : ''}
        </Text>

        {filtered.length === 0 ? (
          <EmptyState title="No paid payments" message="No payments found for this period" />
        ) : (
          filtered.map(payment => (
            <Card key={payment.id} style={[styles.paymentCard, { marginHorizontal: hp }]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <CreditCard size={20} color={theme.colors.success} />
                </View>
                <View style={styles.info}>
                  <Text style={styles.tenantName}>{payment.tenantName || 'N/A'}</Text>
                  <Text style={styles.roomText}>Room {payment.roomNumber || 'N/A'}</Text>
                </View>
                <View style={styles.paidBadge}>
                  <Text style={styles.paidBadgeText}>Paid</Text>
                </View>
              </View>
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Amount</Text>
                  <Text style={styles.amount}>{formatCurrency(payment.paidAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Paid On</Text>
                  <Text style={styles.amount}>{formatDate(payment.paidDate || '')}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Method</Text>
                  <Text style={styles.methodText}>{payment.paymentMethod || 'N/A'}</Text>
                </View>
              </View>
            </Card>
          ))
        )}

        <LoadMoreButton
          onPress={() => setPage(p => p + 1)}
          loading={isFetching && page > 1}
          remaining={remaining}
        />
      </ScrollView>

      {showDatePicker && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
            <View style={styles.datePickerModal}>
              <Text style={styles.datePickerTitle}>
                Select {activeDateInput === 'start' ? 'Start' : 'End'} Date
              </Text>
              <View style={styles.quickDates}>
                {['Today', 'This Week', 'This Month', 'Last Month', '3 Months Ago'].map(label => {
                  const d = new Date();
                  if (label === 'Today') d.setDate(d.getDate());
                  else if (label === 'This Week') d.setDate(d.getDate() - 7);
                  else if (label === 'This Month') d.setDate(1);
                  else if (label === 'Last Month') { d.setMonth(d.getMonth() - 1); d.setDate(1); }
                  else if (label === '3 Months Ago') { d.setMonth(d.getMonth() - 3); d.setDate(1); }
                  return (
                    <TouchableOpacity
                      key={label}
                      style={styles.quickDateBtn}
                      onPress={() => {
                        if (activeDateInput === 'start') setDateRangeStart(d);
                        else setDateRangeEnd(d);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.quickDateText}>{label}</Text>
                      <Text style={styles.quickDateValue}>{formatDateShort(d)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.closeDatePicker} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.closeDatePickerText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, marginLeft: 8 },
  container: { flex: 1 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  summaryCard: { flex: 1, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 18, fontFamily: theme.font.extraBold, marginTop: 2 },

  // Search
  searchRow: { marginBottom: theme.spacing.md },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, paddingHorizontal: 12, paddingVertical: 4, ...theme.shadow.sm },
  searchInput: { flex: 1 },

  // Filters
  filterRow: { gap: 8, marginBottom: theme.spacing.md },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterPillText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.textSecondary },
  filterPillTextActive: { color: '#FFFFFF' },

  // Date range
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.md },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.text },
  datePlaceholder: { color: theme.colors.textMuted },
  dateSeparator: { fontSize: 13, color: theme.colors.textMuted },

  countText: { fontSize: 13, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },

  // Payment card
  paymentCard: { marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.successSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  tenantName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  paidBadge: { backgroundColor: theme.colors.successSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  paidBadgeText: { fontSize: 12, fontFamily: theme.font.semiBold, color: theme.colors.success },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, marginTop: 2 },
  methodText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  // Date picker modal
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', alignItems: 'center' },
  datePickerModal: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: theme.spacing.xl, width: '85%', maxHeight: '60%' },
  datePickerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: theme.spacing.lg, textAlign: 'center' },
  quickDates: { gap: 8 },
  quickDateBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.background },
  quickDateText: { fontSize: 14, fontFamily: theme.font.medium, color: theme.colors.text },
  quickDateValue: { fontSize: 13, color: theme.colors.textMuted },
  closeDatePicker: { marginTop: theme.spacing.lg, paddingVertical: 12, alignItems: 'center', borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary },
  closeDatePickerText: { fontSize: 16, fontFamily: theme.font.semiBold, color: '#FFFFFF' },
});
