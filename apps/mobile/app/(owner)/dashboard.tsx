import { ScrollView, View, Text, StyleSheet, RefreshControl, Dimensions, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, ErrorState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatCurrency, timeAgo, getStatusColor } from '../../src/lib/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardData {
  properties: { total: number; totalBeds: number; occupiedBeds: number; vacantBeds: number; occupancyRate: string };
  tenants: { active: number };
  payments: { totalExpected: number; totalCollected: number; totalPending: number; collectionRate: string; paidCount: number; pendingCount: number; allTimeCollected: number; allTimeExpected: number };
  complaints: { open: number; urgent: number };
  water: Array<{ tankName: string; capacityLiters: number; currentLevel: number }>;
  visitors: { pending: number };
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
  const [propertyFilter, setPropertyFilter] = useState('');
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  const { data: properties } = useQuery<PropertyOption[]>({
    queryKey: ['properties-list'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then(r => r.data?.data || r.data || []),
  });

  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['owner-dashboard', propertyFilter],
    queryFn: () => {
      const params: any = {};
      if (propertyFilter) params.propertyId = propertyFilter;
      return api.get('/dashboard/overview', { params }).then(r => r.data || r);
    },
  });

  const { data: trend } = useQuery<TrendData[]>({
    queryKey: ['occupancy-trend', propertyFilter],
    queryFn: () => {
      const params: any = {};
      if (propertyFilter) params.propertyId = propertyFilter;
      return api.get('/dashboard/occupancy-trend', { params }).then(r => r.data || []);
    },
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={refetch} />;

  const selectedPropertyName = propertyFilter
    ? properties?.find(p => p.id === propertyFilter)?.name || 'Selected Property'
    : 'All Properties';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowPropertyPicker(!showPropertyPicker)}>
          <Text style={styles.filterText} numberOfLines={1}>{selectedPropertyName} ▾</Text>
        </TouchableOpacity>
      </View>

      {showPropertyPicker && (
        <Card style={styles.pickerCard}>
          <TouchableOpacity
            style={[styles.pickerItem, !propertyFilter && styles.pickerItemActive]}
            onPress={() => { setPropertyFilter(''); setShowPropertyPicker(false); }}
          >
            <Text style={[styles.pickerText, !propertyFilter && styles.pickerTextActive]}>All Properties</Text>
          </TouchableOpacity>
          {properties?.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pickerItem, propertyFilter === p.id && styles.pickerItemActive]}
              onPress={() => { setPropertyFilter(p.id); setShowPropertyPicker(false); }}
            >
              <Text style={[styles.pickerText, propertyFilter === p.id && styles.pickerTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <View style={styles.metricsRow}>
        <MetricCard label="Occupancy" value={`${data?.properties?.occupancyRate || 0}%`} color="#3b82f6" />
        <MetricCard label="Revenue" value={formatCurrency(data?.payments?.allTimeCollected || 0)} color="#22c55e" />
        <MetricCard label="Pending" value={`${data?.complaints?.open || 0} open`} color="#eab308" />
        <MetricCard label="Residents" value={`${data?.tenants?.active || 0}`} color="#ef4444" />
      </View>

      {trend && trend.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Occupancy Trend</Text>
          <View style={styles.chartContainer}>
            {trend.slice(-6).map((t, i) => {
              const maxVal = Math.max(...trend.slice(-6).map(x => x.occupied + x.vacant), 1);
              const occupiedHeight = (t.occupied / maxVal) * 100;
              const vacantHeight = (t.vacant / maxVal) * 100;
              return (
                <View key={i} style={styles.chartBar}>
                  <View style={styles.barGroup}>
                    <View style={[styles.bar, styles.barOccupied, { height: `${occupiedHeight}%` }]} />
                    <View style={[styles.bar, styles.barVacant, { height: `${vacantHeight}%` }]} />
                  </View>
                  <Text style={styles.chartLabel}>{t.month.split('-')[1] ? getMonthName(t.month) : t.month}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendText}>Occupied</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#e5e7eb' }]} /><Text style={styles.legendText}>Vacant</Text></View>
          </View>
        </Card>
      )}

      {trend && trend.length > 0 && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartContainer}>
            {trend.slice(-6).map((t, i) => {
              const maxVal = Math.max(...trend.slice(-6).map(x => Math.max(x.expected, x.collected)), 1);
              const collectedHeight = (t.collected / maxVal) * 100;
              const expectedHeight = (t.expected / maxVal) * 100;
              return (
                <View key={i} style={styles.chartBar}>
                  <View style={styles.barGroup}>
                    <View style={[styles.bar, styles.barExpected, { height: `${expectedHeight}%` }]} />
                    <View style={[styles.bar, styles.barCollected, { height: `${collectedHeight}%` }]} />
                  </View>
                  <Text style={styles.chartLabel}>{t.month.split('-')[1] ? getMonthName(t.month) : t.month}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} /><Text style={styles.legendText}>Collected</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#d1d5db' }]} /><Text style={styles.legendText}>Expected</Text></View>
          </View>
        </Card>
      )}

      {data?.recentActivity?.length ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {data.recentActivity.slice(0, 5).map(item => (
            <View key={item.id} style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: getStatusColor(item.action) + '20' }]}>
                <Text style={styles.activityIconText}>{getActivityIcon(item.entityType)}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText} numberOfLines={1}>
                  <Text style={{ fontWeight: '600' }}>{item.entityName}</Text>
                  {' '}{item.action.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.activityMeta}>by {item.actorName} · {timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data?.properties?.total || 0}</Text>
            <Text style={styles.statLabel}>Properties</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data?.properties?.totalBeds || 0}</Text>
            <Text style={styles.statLabel}>Total Beds</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data?.properties?.occupiedBeds || 0}</Text>
            <Text style={styles.statLabel}>Occupied</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{data?.properties?.vacantBeds || 0}</Text>
            <Text style={styles.statLabel}>Vacant</Text>
          </View>
        </View>
      </Card>

      {data?.water?.length ? (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Water Tanks</Text>
          {data.water.map((tank, i) => {
            const level = Math.round(tank.currentLevel);
            const color = level < 20 ? '#ef4444' : level < 50 ? '#eab308' : '#22c55e';
            return (
              <View key={i} style={styles.tankRow}>
                <View style={styles.tankInfo}>
                  <Text style={styles.tankName}>{tank.tankName}</Text>
                  <Text style={[styles.tankPercent, { color }]}>{level}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${level}%`, backgroundColor: color }]} />
                </View>
              </View>
            );
          })}
        </Card>
      ) : null}

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(owner)/properties')}>
          <Text style={styles.actionIcon}>🏢</Text>
          <Text style={styles.actionLabel}>Properties</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(owner)/residents')}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionLabel}>Residents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(owner)/payments')}>
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionLabel}>Payments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(owner)/complaints')}>
          <Text style={styles.actionIcon}>🎫</Text>
          <Text style={styles.actionLabel}>Issues</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.metricCard, { borderTopColor: color }]}>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getMonthName(monthYear: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = parseInt(monthYear.split('-')[1], 10);
  return months[month - 1] || monthYear;
}

function getActivityIcon(entityType: string): string {
  const icons: Record<string, string> = {
    payment: '💰', complaint: '🎫', resident: '👥', property: '🏢', task: '✅',
  };
  return icons[entityType] || '📌';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  filterButton: { backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#374151', maxWidth: 140 },
  pickerCard: { marginHorizontal: 16, marginBottom: 12, padding: 0, maxHeight: 200 },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pickerItemActive: { backgroundColor: '#eff6ff' },
  pickerText: { fontSize: 14, color: '#374151' },
  pickerTextActive: { color: '#3b82f6', fontWeight: '600' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 16 },
  metricCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderTopWidth: 3, flex: 1, minWidth: '45%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  metricValue: { fontSize: 20, fontWeight: '800' },
  metricLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingTop: 8 },
  chartBar: { alignItems: 'center', flex: 1 },
  barGroup: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 100 },
  bar: { width: 14, borderRadius: 4, minHeight: 4 },
  barOccupied: { backgroundColor: '#3b82f6' },
  barVacant: { backgroundColor: '#e5e7eb' },
  barCollected: { backgroundColor: '#22c55e' },
  barExpected: { backgroundColor: '#d1d5db' },
  chartLabel: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#6b7280' },
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 10 },
  activityIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activityIconText: { fontSize: 14 },
  activityContent: { flex: 1 },
  activityText: { fontSize: 13, color: '#374151', lineHeight: 18 },
  activityMeta: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 8 },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  tankRow: { marginBottom: 12 },
  tankInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tankName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  tankPercent: { fontSize: 14, fontWeight: '700' },
  progressTrack: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  actionButton: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#374151' },
});
