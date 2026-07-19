import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Bell, Building, Users, CreditCard, AlertCircle, UserPlus, BedDouble, CheckCircle, Plus, Receipt, MessageCircle } from 'lucide-react-native';
import { GradientHeader, RevenueChart, ErrorState, DashboardSkeleton, AnimatedCard, MetricGrid, ComingSoon } from '../../src/components';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import { useResponsive } from '../../src/lib/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OwnerDashboard() {
  const router = useRouter();
  const [chartRange, setChartRange] = useState('12M');
  const [propertyFilter, setPropertyFilter] = useState('');
  const { width } = useResponsive();
  const insets = useSafeAreaInsets();
  const hp = Math.max(16, Math.round(width * 0.04));

  const { data: allData, isLoading, error, refetch } = useQuery({
    queryKey: ['owner-dashboard-full', propertyFilter],
    queryFn: async () => {
      const params: any = {};
      if (propertyFilter) params.propertyId = propertyFilter;
      const [overviewRes, trendRes, roomsRes, propsRes] = await Promise.all([
        api.get('/dashboard/overview', { params }),
        api.get('/dashboard/occupancy-trend', { params }),
        api.get('/allocation/rooms', { params: { limit: 200 } }),
        api.get('/properties', { params: { limit: 50 } }),
      ]);
      return {
        overview: overviewRes.data || overviewRes,
        trend: trendRes.data || [],
        rooms: roomsRes.data || [],
        properties: propsRes.data?.data || propsRes.data || [],
      };
    },
  });

  const data = allData?.overview;
  const trend = allData?.trend || [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const occupancy = data?.properties || {};
  const occupancyRate = parseFloat(occupancy.occupancyRate || '0');
  const totalBeds = occupancy.totalBeds || 0;
  const occupiedBeds = occupancy.occupiedBeds || 0;

  const getActivityIcon = (entityType: string) => {
    const icons: Record<string, any> = {
      payment: CreditCard, complaint: AlertCircle, resident: UserPlus, property: Building, task: CheckCircle, bed: BedDouble,
    };
    return icons[entityType] || AlertCircle;
  };

  const payments = data?.payments || {};
  const paidCount = payments.paidCount || 0;
  const pendingCount = payments.pendingCount || 0;
  const overdueCount = payments.overdueCount || 0;
  const partialCount = payments.partialCount || 0;
  const totalExpected = payments.totalExpected || 0;
  const totalCollected = payments.totalCollected || 0;
  const allTimeCollected = payments.allTimeCollected || 0;
  const allTimeExpected = payments.allTimeExpected || 0;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const activeTenants = data?.tenants?.active || 0;
  const totalResidents = paidCount + partialCount + pendingCount + overdueCount;
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const notPaidCount = pendingCount + overdueCount;
  const rateColor = collectionRate >= 80 ? theme.colors.success : collectionRate >= 50 ? theme.colors.warning : theme.colors.danger;

  const totalParts = paidCount + partialCount + pendingCount + overdueCount;
  const paidPct = totalParts > 0 ? (paidCount / totalParts) * 100 : 0;
  const partialPct = totalParts > 0 ? (partialCount / totalParts) * 100 : 0;
  const pendingPct = totalParts > 0 ? (pendingCount / totalParts) * 100 : 0;
  const overduePct = totalParts > 0 ? (overdueCount / totalParts) * 100 : 0;

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={refetch} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
    >
      <GradientHeader
        greeting={`${getGreeting()}, ${activeTenants ? 'Rajesh' : 'Admin'}`}
        rightAction={
          <TouchableOpacity onPress={() => router.push('/(owner)/notifications')}>
            <Bell size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <View style={{ marginHorizontal: hp, marginTop: -12 }}>
        <MetricGrid
          revenueCollected={allTimeCollected}
          revenueExpected={allTimeExpected}
          occupancyRate={occupancyRate}
          occupiedBeds={occupiedBeds}
          totalBeds={totalBeds}
          collectionRate={collectionRate}
          activeTenants={activeTenants}
          onRevenuePress={() => router.push({ pathname: '/(owner)/payments', params: { filter: 'all', month: currentMonth } })}
          onCollectionPress={() => router.push({ pathname: '/(owner)/payments', params: { filter: 'all', month: currentMonth } })}
          onOccupancyPress={() => router.push({ pathname: '/(details)/rooms', params: { propertyId: propertyFilter } })}
          onTenantsPress={() => router.push('/(owner)/residents')}
        />
      </View>

      <AnimatedCard delay={100} style={{ marginHorizontal: hp }}>
        <View style={styles.paymentAccent} />
        <View style={styles.paymentHeader}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{currentMonth}</Text>
          </View>
        </View>

        <View style={styles.stackedBar}>
          {paidCount > 0 && <View style={[styles.barSegment, { flex: paidPct, backgroundColor: theme.colors.success }]} />}
          {partialCount > 0 && <View style={[styles.barSegment, { flex: partialPct, backgroundColor: theme.colors.warning }]} />}
          {pendingCount > 0 && <View style={[styles.barSegment, { flex: pendingPct, backgroundColor: '#F97316' }]} />}
          {overdueCount > 0 && <View style={[styles.barSegment, { flex: overduePct, backgroundColor: theme.colors.danger }]} />}
        </View>

        <View style={styles.legendRow}>
          <TouchableOpacity style={styles.legendItem} onPress={() => router.push('/(owner)/payments')} activeOpacity={0.7}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
            <Text style={styles.legendLabel}>Paid</Text>
            <Text style={[styles.legendCount, { color: theme.colors.success }]}>{paidCount}</Text>
          </TouchableOpacity>
          {partialCount > 0 && (
            <TouchableOpacity style={styles.legendItem} onPress={() => router.push('/(owner)/payments')} activeOpacity={0.7}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
              <Text style={styles.legendLabel}>Partial</Text>
              <Text style={[styles.legendCount, { color: theme.colors.warning }]}>{partialCount}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.legendItem} onPress={() => router.push('/(owner)/pending-tenants')} activeOpacity={0.7}>
            <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.legendLabel}>Pending</Text>
            <Text style={[styles.legendCount, { color: '#F97316' }]}>{pendingCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.legendItem} onPress={() => router.push('/(owner)/pending-tenants')} activeOpacity={0.7}>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
            <Text style={styles.legendLabel}>Overdue</Text>
            <Text style={[styles.legendCount, { color: theme.colors.danger }]}>{overdueCount}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.paymentPills}>
          <TouchableOpacity
            style={[styles.payPill, { backgroundColor: theme.colors.primarySurface }]}
            onPress={() => router.push({ pathname: '/(owner)/payments', params: { filter: 'all', month: currentMonth } })}
          >
            <Text style={[styles.payPillText, { color: theme.colors.primary }]}>All ({totalResidents})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payPill, { backgroundColor: theme.colors.successSurface }]}
            onPress={() => router.push('/(owner)/paid-tenants')}
          >
            <Text style={[styles.payPillText, { color: theme.colors.success }]}>Paid ({paidCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payPill, { backgroundColor: theme.colors.dangerSurface }]}
            onPress={() => router.push('/(owner)/pending-tenants')}
          >
            <Text style={[styles.payPillText, { color: theme.colors.danger }]}>Not Paid ({notPaidCount})</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>

      <RevenueChart data={trend} range={chartRange} onRangeChange={setChartRange} />

      <AnimatedCard delay={200} style={{ marginHorizontal: hp }}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/residents')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primarySurface }]}>
              <Plus size={18} color={theme.colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Add Tenant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/pending-tenants')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.warningSurface }]}>
              <Receipt size={18} color={theme.colors.warning} />
            </View>
            <Text style={styles.actionLabel}>Collect Rent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/complaints')} activeOpacity={0.7}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.dangerSurface }]}>
              <MessageCircle size={18} color={theme.colors.danger} />
            </View>
            <Text style={styles.actionLabel}>Log Issue</Text>
          </TouchableOpacity>
        </View>
      </AnimatedCard>

      <AnimatedCard delay={300} style={{ marginHorizontal: hp }}>
        <ComingSoon
          title="Smart Monitoring"
          features={[
            'Real-time water tank levels',
            'Electricity usage tracking',
            'Automated billing alerts',
          ]}
        />
      </AnimatedCard>

      <AnimatedCard delay={350} style={{ marginHorizontal: hp }}>
        {data?.recentActivity?.length ? (
          <View>
            <View style={styles.activityHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(owner)/notifications')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>
            {data.recentActivity.slice(0, 3).map((item: any) => {
              const IconComponent = getActivityIcon(item.entityType);
              return (
                <View key={item.id} style={styles.activityRow}>
                  <View style={styles.activityIconCircle}>
                    <IconComponent size={14} color={theme.colors.primary} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText} numberOfLines={1}>
                      <Text style={styles.activityBold}>{item.entityName}</Text> {item.action.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.activityMeta}>by {item.actorName} · {item.createdAt}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </AnimatedCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  sectionTitle: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text },

  // Payment card
  paymentAccent: {
    height: 4,
    marginHorizontal: -theme.spacing.lg,
    marginTop: -theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
    opacity: 0.8,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  monthBadge: {
    backgroundColor: theme.colors.primarySurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  monthBadgeText: {
    fontSize: 12,
    fontFamily: theme.font.semiBold,
    color: theme.colors.primary,
  },

  // Stacked bar
  stackedBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  barSegment: {
    height: '100%',
  },

  // Legend
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  legendCount: {
    fontSize: 14,
    fontFamily: theme.font.bold,
  },

  // Payment pills
  paymentPills: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingTop: theme.spacing.md,
  },
  payPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
  },
  payPillText: {
    fontSize: 13,
    fontFamily: theme.font.semiBold,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: theme.font.medium,
    color: theme.colors.textSecondary,
  },

  // Activity
  activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { fontSize: 13, color: theme.colors.primary, fontWeight: '600' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 10 },
  activityIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  activityBold: { fontFamily: theme.font.semiBold },
  activityMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
