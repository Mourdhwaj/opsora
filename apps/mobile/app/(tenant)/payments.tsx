import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import type { RentPayment } from '../../src/types';

export default function TenantPayments() {
  const { data: payments, isLoading, refetch } = useQuery<RentPayment[]>({
    queryKey: ['tenant-payments'],
    queryFn: () => api.get('/tenant/payments').then(r => r.data?.data || r.data || []),
  });

  const totalPaid = (payments || []).filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = (payments || []).filter(p => p.paymentStatus !== 'paid').reduce((s, p) => s + p.balanceAmount, 0);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#fef2f2' }]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{formatCurrency(totalPending)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text style={styles.pageTitle}>Payment History</Text>

        {(!payments || payments.length === 0) ? (
          <EmptyState title="No payments yet" message="Payments will appear here" />
        ) : (
          payments.map((payment) => (
            <Card key={payment.id} style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.month}>{payment.monthYear}</Text>
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
              <Text style={styles.due}>Due: {formatDate(payment.dueDate)}</Text>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#6b7280' },
  summaryValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  container: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  month: { fontSize: 18, fontWeight: '700', color: '#111827' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 11, color: '#9ca3af' },
  amount: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 2 },
  due: { fontSize: 12, color: '#9ca3af' },
});
