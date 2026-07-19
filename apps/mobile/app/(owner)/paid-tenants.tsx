import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ArrowLeft, CheckCircle, QrCode, Share2 } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, formatDate } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';
import QRCode from 'react-native-qrcode-svg';

interface PaidTenant {
  id: string;
  name: string;
  phone: string;
  roomNumber: string;
  rentAmount: number;
  paidAmount: number;
  paidDate: string;
  paymentMethod: string;
}

export default function PaidTenants() {
  const router = useRouter();
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));
  const [qrVisible, setQrVisible] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['paid-tenants'],
    queryFn: () => api.get('/dashboard/paid-tenants').then(r => r.data || r),
  });

  const generateUpiLink = (tenant: PaidTenant) => {
    const upiId = 'owner@upi';
    const amount = tenant.paidAmount;
    const name = encodeURIComponent('Opsora PG');
    const note = encodeURIComponent(`Rent for ${tenant.name} - Room ${tenant.roomNumber}`);
    return `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
  };

  const handleShareQR = async (tenant: PaidTenant) => {
    const upiLink = generateUpiLink(tenant);
    const message = `Payment receipt for ${tenant.name} (Room ${tenant.roomNumber}) - ₹${tenant.paidAmount.toLocaleString('en-IN')} paid on ${tenant.paidDate}`;
    
    try {
      await Share.share({
        message: `${message}\n\nUPI Link: ${upiLink}`,
        title: `Payment Receipt - ${tenant.name}`,
      });
    } catch (error) {
      console.log('Share cancelled');
    }
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load paid tenants" onRetry={refetch} />;

  const tenants = data?.tenants || [];
  const summary = data?.summary || {};

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingHorizontal: hp }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paid Tenants ({tenants.length})</Text>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {tenants.length === 0 ? (
          <View style={{ paddingHorizontal: hp, paddingTop: theme.spacing.xl }}>
            <EmptyState title="No paid tenants" message="No tenants have paid for this month yet" />
          </View>
        ) : (
          <>
            <View style={[styles.summaryCard, { marginHorizontal: hp }]}>
              <Text style={styles.summaryLabel}>Total Collected</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalCollected || 0)}</Text>
            </View>

            {tenants.map((tenant: PaidTenant) => (
              <Card key={tenant.id} style={[styles.tenantCard, { marginHorizontal: hp }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <CheckCircle size={20} color={theme.colors.success} />
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.tenantName}>{tenant.name}</Text>
                    <Text style={styles.roomNumber}>Room {tenant.roomNumber}</Text>
                  </View>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Paid</Text>
                  </View>
                </View>
                
                <View style={styles.amountRow}>
                  <View>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amount}>{formatCurrency(tenant.paidAmount)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Paid On</Text>
                    <Text style={styles.amount}>{formatDate(tenant.paidDate)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amountLabel}>Method</Text>
                    <Text style={styles.methodText}>{tenant.paymentMethod}</Text>
                  </View>
                </View>

                {qrVisible === tenant.id && (
                  <View style={styles.qrContainer}>
                  <QRCode
                    value={generateUpiLink(tenant)}
                    size={150}
                    color={theme.colors.text}
                    backgroundColor={theme.colors.background}
                  />
                    <Text style={styles.qrLabel}>Payment receipt QR</Text>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.qrButton}
                      onPress={() => setQrVisible(qrVisible === tenant.id ? null : tenant.id)}
                    >
                      <QrCode size={14} color={theme.colors.primary} />
                      <Text style={styles.qrButtonText}>QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => handleShareQR(tenant)}
                    >
                      <Share2 size={14} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </>
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, flex: 1, marginLeft: 8 },
  container: { flex: 1 },
  summaryCard: {
    backgroundColor: theme.colors.successSurface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: theme.colors.textSecondary },
  summaryValue: { fontSize: 24, fontFamily: theme.font.extraBold, color: theme.colors.success, marginTop: 4 },
  tenantCard: { marginBottom: theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.successSurface, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info: { flex: 1 },
  tenantName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomNumber: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  paidBadge: { backgroundColor: theme.colors.successSurface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  paidBadgeText: { fontSize: 12, fontFamily: theme.font.semiBold, color: theme.colors.success },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  amountLabel: { fontSize: 11, color: theme.colors.textMuted },
  amount: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, marginTop: 2 },
  methodText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  qrContainer: { alignItems: 'center', paddingVertical: theme.spacing.md, marginTop: theme.spacing.sm, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.md },
  qrLabel: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10 },
  actionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  qrButtonText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  shareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
