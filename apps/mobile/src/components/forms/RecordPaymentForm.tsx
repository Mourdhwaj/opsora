import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button } from '..';
import { api } from '../../services/api';

interface RecordPaymentFormProps {
  paymentId: string;
  maxAmount: number;
  onClose: () => void;
}

export function RecordPaymentForm({ paymentId, maxAmount, onClose }: RecordPaymentFormProps) {
  const queryClient = useQueryClient();
  const [paidAmount, setPaidAmount] = useState(String(maxAmount));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');

  const methods = ['cash', 'upi', 'bank_transfer', 'card', 'other'];

  const payMutation = useMutation({
    mutationFn: (data: any) => api.post(`/payments/${paymentId}/pay`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to record payment');
    },
  });

  function handleSubmit() {
    const amount = parseFloat(paidAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (amount > maxAmount) {
      setError(`Amount cannot exceed ₹${maxAmount.toLocaleString('en-IN')}`);
      return;
    }
    payMutation.mutate({
      paidAmount: amount,
      paymentMethod,
      transactionId: transactionId.trim() || undefined,
    });
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Record Payment</Text>

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Outstanding Balance</Text>
        <Text style={styles.amountValue}>₹{maxAmount.toLocaleString('en-IN')}</Text>
      </View>

      <Input label="Amount to Record (₹)" value={paidAmount} onChangeText={setPaidAmount} placeholder="Enter amount" keyboardType="numeric" error={error} />

      <Text style={styles.label}>Payment Method</Text>
      <View style={styles.methodRow}>
        {methods.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
            onPress={() => setPaymentMethod(m)}
          >
            <Text style={[styles.methodChipText, paymentMethod === m && styles.methodChipTextActive]}>{m.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input label="Transaction ID (optional)" value={transactionId} onChangeText={setTransactionId} placeholder="Reference number" />

      <View style={styles.actions}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Record" onPress={handleSubmit} loading={payMutation.isPending} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  amountCard: { backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  amountLabel: { fontSize: 13, color: '#6b7280' },
  amountValue: { fontSize: 28, fontWeight: '800', color: '#ef4444', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  methodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  methodChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  methodChipText: { fontSize: 13, fontWeight: '500', color: '#6b7280', textTransform: 'capitalize' },
  methodChipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
