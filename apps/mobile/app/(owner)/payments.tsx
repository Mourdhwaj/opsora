import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, SearchBar, FilterBar, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import type { RentPayment } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Paid', value: 'paid' },
  { label: 'Pending', value: 'pending' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Partial', value: 'partial' },
];

export default function PaymentsList() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const router = useRouter();

  const { data: payments, isLoading, refetch } = useQuery<RentPayment[]>({
    queryKey: ['payments', statusFilter],
    queryFn: () => {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      return api.get('/payments', { params }).then(r => r.data?.data || r.data || []);
    },
  });

  const filtered = (payments || []).filter(p =>
    (p.tenantName || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.roomNumber || '').includes(search)
  );

  const totalPaid = filtered.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = filtered.filter(p => p.paymentStatus !== 'paid').reduce((s, p) => s + p.balanceAmount, 0);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.summaryLabel}>Collected</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{formatCurrency(totalPending)}</Text>
        </View>
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search by tenant or room..." />
      <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No payments found" message="Record a payment to get started" icon="💰" />
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item: payment }) => (
            <Card style={styles.paymentCard}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
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
                  <Text style={[styles.amount, { color: '#22c55e' }]}>{formatCurrency(payment.paidAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Balance</Text>
                  <Text style={[styles.amount, { color: payment.balanceAmount > 0 ? '#ef4444' : '#22c55e' }]}>{formatCurrency(payment.balanceAmount)}</Text>
                </View>
              </View>
              <Text style={styles.dueDate}>Due: {formatDate(payment.dueDate)}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  paymentCard: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tenantName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  monthYear: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 11, color: '#9ca3af' },
  amount: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  dueDate: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
});
