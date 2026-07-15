import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import type { RentPayment } from '../../src/types';

export default function TenantPayments() {
  const { data: payments, isLoading, refetch } = useQuery<RentPayment[]>({
    queryKey: ['tenant-payments'],
    queryFn: () => api.get('/tenant/payments').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>My Payments</Text>

      {(!payments || payments.length === 0) ? (
        <EmptyState title="No payments" />
      ) : (
        payments.map((payment) => (
          <Card key={payment.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.month}>{payment.monthYear}</Text>
              <StatusBadge status={payment.paymentStatus} />
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.totalAmount}>{formatCurrency(payment.totalAmount)}</Text>
              <Text style={styles.statusText}>Paid: {formatCurrency(payment.paidAmount)}</Text>
            </View>
            <Text style={styles.due}>Due: {formatDate(payment.dueDate)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  month: { fontSize: 18, fontWeight: '700', color: '#111827' },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalAmount: { fontSize: 24, fontWeight: '800', color: '#111827' },
  statusText: { fontSize: 13, color: '#6b7280' },
  due: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
