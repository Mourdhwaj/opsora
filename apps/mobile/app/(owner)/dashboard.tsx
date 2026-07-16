import { ScrollView, View, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Bell, Building, Users, CreditCard, AlertCircle, UserPlus, BedDouble, CheckCircle } from 'lucide-react-native';
import { GradientHeader, HeroStatCard, IconActionButton, RevenueChart, ProgressRing, ErrorState, DashboardSkeleton } from '../../src/components';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';

interface DashboardData {
  properties: { total: number; totalBeds: number; occupiedBeds: number; vacantBeds: number; occupancyRate: string };
  tenants: { active: number };
  payments: { totalExpected: number; totalCollected: number; totalPending: number; collectionRate: string; paidCount: number; pendingCount: number; allTimeCollected: number; allTimeExpected: number };
  complaints: { open: number; urgent: number };
  water: Array<{ tankName: string; capacityLiters: number; currentLevel: number }>;
  recentActivity: Array<{ id: string; action: string; entityType: string; entityName: string; actorName: string; createdAt: string }>;
}

interface TrendData {
  month: string;
  occupied: number;
  vacant: number;
  expected: number;
  collected: number;
}

interface PropertyOption {
  id: string;
  name: string;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const [chartRange, setChartRange] = useState('3M');
  const [propertyFilter, setPropertyFilter] = useState('');

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

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={refetch} />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <GradientHeader
        greeting={`${getGreeting()}, ${data?.tenants?.active ? 'Rajesh' : 'Admin'}`}
        subtitle="Your PG at a Glance"
        rightAction={
          <TouchableOpacity>
            <Bell size={22} color="#FFFFFF" />
          </TouchableOpacity>
        }
      />

      <HeroStatCard
        label="Total Revenue This Month"
        value={`₹${(data?.payments?.allTimeCollected || 0).toLocaleString('en-IN')}`}
        subtitle={`from ${data?.tenants?.active || 0} active tenants`}
      />

      <View style={styles.quickActions}>
        <IconActionButton icon={<Building size={22} color={theme.colors.primary} />} label="Properties" onPress={() => router.push('/(owner)/properties')} />
        <IconActionButton icon={<Users size={22} color={theme.colors.primary} />} label="Residents" onPress={() => router.push('/(owner)/residents')} />
        <IconActionButton icon={<CreditCard size={22} color={theme.colors.primary} />} label="Payments" onPress={() => router.push('/(owner)/payments')} />
        <IconActionButton icon={<AlertCircle size={22} color={theme.colors.primary} />} label="Issues" onPress={() => router.push('/(owner)/complaints')} />
      </View>

      <RevenueChart data={trend} range={chartRange} onRangeChange={setChartRange} />

      <View style={styles.occupancyCard}>
        <Text style={styles.sectionTitle}>Occupancy Overview</Text>
        <View style={styles.occupancyRow}>
          <ProgressRing percentage={occupancyRate} size={90} label={`${occupiedBeds}/${totalBeds}`} sublabel="beds occupied" />
          <View style={styles.occupancyDetails}>
            <Text style={styles.occupancyRate}>{occupancyRate}% occupancy rate</Text>
            <Text style={styles.occupancySub}>{occupancy.vacantBeds || 0} beds vacant</Text>
          </View>
        </View>
      </View>

      {data?.recentActivity?.length ? (
        <View style={styles.activityCard}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {data.recentActivity.slice(0, 5).map((item: any) => {
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

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  quickActions: { flexDirection: 'row', paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm, marginTop: theme.spacing.md, marginBottom: theme.spacing.md },
  occupancyCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadow.sm },
  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg, marginTop: theme.spacing.md },
  occupancyDetails: { flex: 1 },
  occupancyRate: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  occupancySub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  activityCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadow.sm },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 10 },
  activityIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primarySurface, alignItems: 'center', justifyContent: 'center' },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  activityBold: { fontWeight: '600' },
  activityMeta: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
