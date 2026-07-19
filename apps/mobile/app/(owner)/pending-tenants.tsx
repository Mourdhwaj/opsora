import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking, Platform, StatusBar } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, MessageCircle, Clock, AlertCircle, Share2 } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';

interface PendingTenant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  rentAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'pending' | 'overdue' | 'partial';
  dueDate: string;
}

export default function PendingTenants() {
  const router = useRouter();
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-tenants'],
    queryFn: () => api.get('/dashboard/pending-tenants').then(r => r.data || r),
  });

  const generateUpiLink = (tenant: PendingTenant) => {
    const upiId = 'owner@upi';
    const amount = tenant.balanceAmount;
    const name = encodeURIComponent('Opsora PG');
    const note = encodeURIComponent(`Rent for ${tenant.name} - Room ${tenant.roomNumber}`);
    return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
  };

  const generatePaymentUrl = (tenant: PendingTenant) => {
    const amount = tenant.balanceAmount;
    const name = encodeURIComponent(tenant.name);
    const room = encodeURIComponent(tenant.roomNumber);
    return `https://opsora.app/pay?name=${name}&room=${room}&amount=${amount}`;
  };

  const handleWhatsAppReminder = (phone: string, name: string, amount: number, roomNumber: string) => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const upiLink = generateUpiLink({ name, roomNumber, balanceAmount: amount } as PendingTenant);
    const paymentUrl = generatePaymentUrl({ name, roomNumber, balanceAmount: amount } as PendingTenant);
    
    const message = `Dear ${name},\n\nThis is a reminder that your rent payment of ₹${amount.toLocaleString('en-IN')} for ${currentMonth} is pending.\n\n📱 *Pay via UPI:* ${upiLink}\n💳 *Pay Online:* ${paymentUrl}\n\nPlease make the payment at your earliest convenience.\n\nRegards,\nOpsora Team`;
    const encodedMessage = encodeURIComponent(message);
    const phoneUrl = `whatsapp://send?phone=${phone.replace(/[^0-9]/g, '')}&text=${encodedMessage}`;
    Linking.openURL(phoneUrl).catch(() => {
      Linking.openURL(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`);
    });
  };

  const handleRemindAll = () => {
    const tenants = data?.tenants || [];
    tenants.forEach((t: PendingTenant) => {
      if (t.phone) {
        handleWhatsAppReminder(t.phone, t.name, t.balanceAmount, t.roomNumber);
      }
    });
  };

  const handleSharePayment = async (tenant: PendingTenant) => {
    const upiLink = generateUpiLink(tenant);
    const paymentUrl = generatePaymentUrl(tenant);
    const message = `Payment Details for ${tenant.name} (Room ${tenant.roomNumber}):\n\nAmount Due: ₹${tenant.balanceAmount.toLocaleString('en-IN')}\n\nUPI: ${upiLink}\nOnline: ${paymentUrl}`;
    
    try {
      const { Share } = await import('react-native');
      await Share.share({ message, title: `Payment - ${tenant.name}` });
    } catch (error) {
      console.log('Share cancelled');
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load pending tenants" onRetry={refetch} />;

  const tenants = data?.tenants || [];

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingHorizontal: hp, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + theme.spacing.md : theme.spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Tenants ({tenants.length})</Text>
        {tenants.length > 0 && (
          <TouchableOpacity style={styles.remindAllButton} onPress={handleRemindAll}>
            <MessageCircle size={16} color="#FFFFFF" />
            <Text style={styles.remindAllText}>Remind All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {tenants.length === 0 ? (
          <View style={{ paddingHorizontal: hp, paddingTop: theme.spacing.xl }}>
            <EmptyState title="No pending tenants" message="All tenants have paid for this month" />
          </View>
        ) : (
          tenants.map((tenant: PendingTenant) => (
            <Card key={tenant.id} style={[styles.tenantCard, { marginHorizontal: hp }]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  {tenant.status === 'overdue' ? (
                    <AlertCircle size={20} color={theme.colors.danger} />
                  ) : (
                    <Clock size={20} color={theme.colors.warning} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.tenantName}>{tenant.name}</Text>
                  <Text style={styles.roomNumber}>Room {tenant.roomNumber}</Text>
                </View>
                <StatusBadge status={tenant.status} />
              </View>
              
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Rent</Text>
                  <Text style={styles.amount}>{formatCurrency(tenant.rentAmount)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Paid</Text>
                  <Text style={[styles.amount, { color: theme.colors.success }]}>
                    {formatCurrency(tenant.paidAmount)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Balance</Text>
                  <Text style={[styles.amount, { color: theme.colors.danger }]}>
                    {formatCurrency(tenant.balanceAmount)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.dueDate}>Due: {formatDate(tenant.dueDate)}</Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.shareButton}
                    onPress={() => handleSharePayment(tenant)}
                  >
                    <Share2 size={14} color={theme.colors.primary} />
                    <Text style={styles.shareButtonText}>Share</Text>
                  </TouchableOpacity>
                  {tenant.phone && (
                    <TouchableOpacity
                      style={styles.whatsappButton}
                      onPress={() => handleWhatsAppReminder(tenant.phone, tenant.name, tenant.balanceAmount, tenant.roomNumber)}
                    >
                      <MessageCircle size={14} color="#FFFFFF" />
                      <Text style={styles.whatsappButtonText}>Remind</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, marginLeft: 8 },
  remindAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  remindAllText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  container: { flex: 1 },
  tenantCard: { marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.dangerSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  tenantName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomNumber: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  dueDate: { fontSize: 12, color: theme.colors.textMuted },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  shareButtonText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#25D366',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.full,
  },
  whatsappButtonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});