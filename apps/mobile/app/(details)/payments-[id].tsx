import { theme } from "../../src/lib/theme";
import { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Card, LoadingSkeleton, StatusBadge, BottomSheet } from '../../src/components';
import { RecordPaymentForm } from '../../src/components/forms/RecordPaymentForm';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';

export default function PaymentDetail() {
  const { id } = useLocalSearchParams();
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const { data: payment, isLoading, refetch } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => api.get(`/payments/${id}`).then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  const hasBalance = (payment?.balanceAmount || 0) > 0;

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <Card style={styles.headerCard}>
          <View style={styles.header}>
            <Text style={styles.month}>{payment?.monthYear}</Text>
            <StatusBadge status={payment?.paymentStatus} />
          </View>
          <Text style={styles.tenant}>{payment?.tenantName}</Text>
          {payment?.roomNumber && <Text style={styles.room}>Room {payment.roomNumber}</Text>}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Amount Breakdown</Text>
          <AmountRow label="Total Amount" value={formatCurrency(payment?.totalAmount)} />
          <AmountRow label="Paid Amount" value={formatCurrency(payment?.paidAmount)} color="#22c55e" />
          <AmountRow label="Balance" value={formatCurrency(payment?.balanceAmount)} color={hasBalance ? '#ef4444' : '#22c55e'} />
          {payment?.lateFee > 0 && <AmountRow label="Late Fee" value={formatCurrency(payment.lateFee)} color="#ef4444" />}
          {payment?.electricityCharge > 0 && <AmountRow label="Electricity" value={formatCurrency(payment.electricityCharge)} />}
          {payment?.waterCharge > 0 && <AmountRow label="Water" value={formatCurrency(payment.waterCharge)} />}
          {payment?.foodCharge > 0 && <AmountRow label="Food" value={formatCurrency(payment.foodCharge)} />}
          {payment?.maintenanceCharge > 0 && <AmountRow label="Maintenance" value={formatCurrency(payment.maintenanceCharge)} />}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <DetailRow label="Due Date" value={payment?.dueDate ? formatDate(payment.dueDate) : ''} />
          <DetailRow label="Paid Date" value={payment?.paidDate ? formatDate(payment.paidDate) : 'Not paid yet'} />
          <DetailRow label="Month" value={payment?.monthYear} />
        </Card>

        {payment?.paymentMethod && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Info</Text>
            <DetailRow label="Method" value={payment.paymentMethod?.replace('_', ' ')} />
            {payment?.transactionId && <DetailRow label="Transaction ID" value={payment.transactionId} />}
          </Card>
        )}

        {payment?.proofUrl && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Proof</Text>
            <Text style={styles.proofLink}>📎 View uploaded proof</Text>
          </Card>
        )}
      </ScrollView>

      {hasBalance && (
        <View style={styles.bottomBar}>
          <Text style={styles.balanceText}>Balance: {formatCurrency(payment?.balanceAmount)}</Text>
          <Text style={styles.recordBtn} onPress={() => setShowRecordPayment(true)}>Record Payment</Text>
        </View>
      )}

      <BottomSheet visible={showRecordPayment} onClose={() => setShowRecordPayment(false)} height={500}>
        <RecordPaymentForm
          paymentId={id as string}
          maxAmount={payment?.balanceAmount || 0}
          onClose={() => setShowRecordPayment(false)}
        />
      </BottomSheet>
    </View>
  );
}

function AmountRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.amountRow}>
      <Text style={styles.amountLabel}>{label}</Text>
      <Text style={[styles.amountValue, color ? { color } : undefined]}>{value}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16, paddingBottom: 80 },
  headerCard: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  month: { fontSize: 22, fontWeight: '800', color: '#111827' },
  tenant: { fontSize: 15, color: '#6b7280' },
  room: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  amountLabel: { fontSize: 14, color: '#6b7280' },
  amountValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  proofLink: { fontSize: 14, color: theme.colors.primary, fontWeight: '500' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 4,
  },
  balanceText: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  recordBtn: { fontSize: 15, fontWeight: '700', color: theme.colors.primary },
});
