import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageCircle, Clock, AlertCircle } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';

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

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['pending-tenants'],
    queryFn: () => api.get('/dashboard/pending-tenants').then(r => r.data || r),
  });

  const handleWhatsAppReminder = (phone: string, name: string, amount: number) => {
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const message = `Dear ${name},\n\nThis is a reminder that your rent payment of ₹${amount.toLocaleString('en-IN')} for ${currentMonth} is pending.\n\nPlease make the payment at your earliest convenience.\n\nRegards,\nOpsora Team`;
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
        handleWhatsAppReminder(t.phone, t.name, t.balanceAmount);
      }
    });
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load pending tenants" onRetry={refetch} />;

  const tenants = data?.tenants || [];
  const summary = data?.summary || {};

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
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
          <EmptyState title="No pending tenants" message="All tenants have paid for this month" />
        ) : (
          tenants.map((tenant: PendingTenant) => (
            <Card key={tenant.id} style={styles.tenantCard}>
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
                {tenant.phone && (
                  <TouchableOpacity
                    style={styles.whatsappButton}
                    onPress={() => handleWhatsAppReminder(tenant.phone, tenant.name, tenant.balanceAmount)}
                  >
                    <MessageCircle size={14} color="#FFFFFF" />
                    <Text style={styles.whatsappButtonText}>Remind</Text>
                  </TouchableOpacity>
                )}
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
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
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
  tenantCard: { marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.sm },
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
