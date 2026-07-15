import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import type { RentPayment } from '../../src/types';

export default function PaymentsList() {
  const { data: payments, isLoading, refetch } = useQuery<RentPayment[]>({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Payments</Text>

      {(!payments || payments.length === 0) ? (
        <EmptyState title="No payments yet" />
      ) : (
        payments.map((payment) => (
          <Card key={payment.id} style={styles.paymentCard}>
            <View style={styles.header}>
              <View>
                <Text style={styles.tenantName}>{payment.tenantName || 'N/A'}</Text>
                <Text style={styles.monthYear}>{payment.monthYear}</Text>
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
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  paymentCard: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  tenantName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  monthYear: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  amountLabel: { fontSize: 11, color: '#9ca3af' },
  amount: { fontSize: 18, fontWeight: '700', color: '#111827', marginTop: 2 },
  dueDate: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
});
