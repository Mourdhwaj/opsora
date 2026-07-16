import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, ErrorState, StatusBadge, LoadMoreButton } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import type { RentPayment } from '../../src/types';

const PAGE_SIZE = 20;

export default function TenantPayments() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch, isFetching } = useQuery<{ data: RentPayment[]; pagination?: { total: number } }>({
    queryKey: ['tenant-payments', page],
    queryFn: () => api.get('/tenant/payments', { params: { page, limit: PAGE_SIZE } }).then(r => r.data),
  });

  const payments = data?.data || [];
  const total = data?.pagination?.total ?? payments.length;

  const totalPaid = payments.filter(p => p.paymentStatus === 'paid').reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = payments.filter(p => p.paymentStatus !== 'paid').reduce((s, p) => s + p.balanceAmount, 0);

  const remaining = total - page * PAGE_SIZE;

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load payments" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.successSurface }]}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{formatCurrency(totalPaid)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.dangerSurface }]}>
          <Text style={styles.summaryLabel}>Pending</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{formatCurrency(totalPending)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => { setPage(1); refetch(); }} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Text style={styles.pageTitle}>Payment History</Text>

        {payments.length === 0 ? (
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
                  <Text style={[styles.amount, { color: theme.colors.success }]}>{formatCurrency(payment.paidAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Balance</Text>
                  <Text style={[styles.amount, { color: payment.balanceAmount > 0 ? theme.colors.danger : theme.colors.success }]}>{formatCurrency(payment.balanceAmount)}</Text>
                </View>
              </View>
              <Text style={styles.due}>Due: {formatDate(payment.dueDate)}</Text>
            </Card>
          ))
        )}
        <LoadMoreButton onPress={() => setPage(p => p + 1)} loading={isFetching && page > 1} remaining={remaining} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 18, fontFamily: theme.font.extraBold, marginTop: 2 },
  container: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text, marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  month: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginTop: 2 },
  due: { fontSize: 12, color: theme.colors.textMuted },
});
