import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, X } from 'lucide-react-native';
import { Card, LoadingSkeleton, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';

interface Deduction {
  reason: string;
  amount: number;
}

export default function Checkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));
  const queryClient = useQueryClient();
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['resident', id],
    queryFn: () => api.get(`/residents/${id}/details`).then(r => r.data || r),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.post(`/residents/${id}/checkout`, {
      moveOutDate: new Date().toISOString().split('T')[0],
      deductions,
      notes: 'Checked out via app',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-tenants'] });
      Alert.alert('Success', 'Resident checked out successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.error || 'Failed to checkout resident');
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load resident details" />;

  const resident = data?.profile || data;
  const depositPaid = resident?.depositPaid || 5000;
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const refundAmount = Math.max(0, depositPaid - totalDeductions);

  const handleAddDeduction = () => {
    if (!newReason || !newAmount) {
      Alert.alert('Error', 'Please enter both reason and amount');
      return;
    }
    const amount = parseInt(newAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    setDeductions([...deductions, { reason: newReason, amount }]);
    setNewReason('');
    setNewAmount('');
    setShowAddDeduction(false);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleCheckout = () => {
    Alert.alert(
      'Confirm Checkout',
      `Refund amount: ${formatCurrency(refundAmount)}\n\nProceed with checkout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: () => checkoutMutation.mutate() },
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingHorizontal: hp }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Resident</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 80 }}>
        <Card style={[styles.profileCard, { marginHorizontal: hp }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{resident?.fullName?.charAt(0) || '?'}</Text>
          </View>
          <Text style={styles.name}>{resident?.fullName}</Text>
          <Text style={styles.roomInfo}>Room {data?.room?.roomNumber} · Bed {data?.bed?.bedNumber}</Text>
          <Text style={styles.stayInfo}>
            Stayed: {resident?.moveInDate} - {new Date().toLocaleDateString()}
          </Text>
        </Card>

        <Card style={[styles.summaryCard, { marginHorizontal: hp }]}>
          <Text style={styles.sectionTitle}>Deposit Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit Paid</Text>
            <Text style={styles.summaryValue}>{formatCurrency(depositPaid)}</Text>
          </View>
          
          <View style={[styles.summaryRow, styles.summaryRowBorder]}>
            <Text style={styles.summaryLabel}>Total Deductions</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>
              -{formatCurrency(totalDeductions)}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontFamily: theme.font.bold }]}>Refund Amount</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success, fontSize: 20 }]}>
              {formatCurrency(refundAmount)}
            </Text>
          </View>
        </Card>

        <Card style={[styles.deductionsCard, { marginHorizontal: hp }]}>
          <View style={styles.deductionsHeader}>
            <Text style={styles.sectionTitle}>Deductions</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddDeduction(true)}
            >
              <Plus size={16} color={theme.colors.primary} />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {deductions.length === 0 ? (
            <Text style={styles.noDeductions}>No deductions added</Text>
          ) : (
            deductions.map((deduction, index) => (
              <View key={index} style={styles.deductionItem}>
                <View style={styles.deductionInfo}>
                  <Text style={styles.deductionReason}>{deduction.reason}</Text>
                  <Text style={styles.deductionAmount}>{formatCurrency(deduction.amount)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDeduction(index)}>
                  <X size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}

          {showAddDeduction && (
            <View style={styles.addDeductionForm}>
              <TextInput
                style={styles.input}
                placeholder="Reason (e.g., Damage)"
                value={newReason}
                onChangeText={setNewReason}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="numeric"
              />
              <View style={styles.formButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowAddDeduction(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.saveButton}
                  onPress={handleAddDeduction}
                >
                  <Text style={styles.saveButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Card>

        <View style={[styles.buttonRow, { marginHorizontal: hp }]}>
          <TouchableOpacity style={styles.cancelCheckoutButton} onPress={() => router.back()}>
            <Text style={styles.cancelCheckoutText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleCheckout}
            disabled={checkoutMutation.isPending}
          >
            <Text style={styles.confirmButtonText}>
              {checkoutMutation.isPending ? 'Processing...' : `Confirm ${formatCurrency(refundAmount)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  profileCard: { alignItems: 'center', marginBottom: theme.spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 36, fontFamily: theme.font.bold },
  name: { fontSize: 22, fontFamily: theme.font.extraBold, color: theme.colors.text },
  roomInfo: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  stayInfo: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  summaryCard: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  summaryRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  summaryLabel: { fontSize: 14, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text },
  deductionsCard: { marginBottom: theme.spacing.md },
  deductionsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addButtonText: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.primary },
  noDeductions: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', paddingVertical: 16 },
  deductionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  deductionInfo: { flex: 1 },
  deductionReason: { fontSize: 14, color: theme.colors.text },
  deductionAmount: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  addDeductionForm: { marginTop: 12, padding: 12, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md },
  input: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8, fontSize: 14 },
  formButtons: { flexDirection: 'row', gap: 8 },
  cancelButton: { flex: 1, padding: 12, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, alignItems: 'center' },
  cancelButtonText: { fontSize: 14, color: theme.colors.textSecondary },
  saveButton: { flex: 1, padding: 12, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.primary, alignItems: 'center' },
  saveButtonText: { fontSize: 14, color: '#FFFFFF', fontFamily: theme.font.semiBold },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: theme.spacing.md },
  cancelCheckoutButton: { flex: 1, padding: 16, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.surface, alignItems: 'center' },
  cancelCheckoutText: { fontSize: 16, color: theme.colors.textSecondary, fontFamily: theme.font.semiBold },
  confirmButton: { flex: 2, padding: 16, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.danger, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, color: '#FFFFFF', fontFamily: theme.font.bold },
});
