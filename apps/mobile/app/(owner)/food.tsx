import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Card, LoadingSkeleton, FilterBar, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate, timeAgo } from '../../src/lib/utils';

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍿' };

export default function OwnerFoodScreen() {
  const [activeTab, setActiveTab] = useState('menus');

  const { data: menus, isLoading: menusLoading, refetch: refetchMenus } = useQuery({
    queryKey: ['food-menus'],
    queryFn: () => api.get('/food/menus').then(r => r.data?.data || r.data || []),
  });

  const { data: polls, isLoading: pollsLoading, refetch: refetchPolls } = useQuery({
    queryKey: ['food-polls'],
    queryFn: () => api.get('/food/polls').then(r => r.data?.data || r.data || []),
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['food-analytics'],
    queryFn: () => api.get('/food/analytics').then(r => r.data || r),
  });

  const { data: attendance } = useQuery({
    queryKey: ['food-attendance'],
    queryFn: () => api.get('/food/attendance').then(r => r.data || r),
  });

  const isLoading = menusLoading || pollsLoading || analyticsLoading;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetchMenus(); refetchPolls(); }} />}>
      <Text style={styles.pageTitle}>Food & Meals</Text>

      <View style={styles.tabRow}>
        {['menus', 'polls', 'analytics'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'menus' && (
        <>
          {attendance && (
            <Card style={styles.attendanceCard}>
              <Text style={styles.attendanceTitle}>Today's Attendance Prediction</Text>
              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceMeal}>🌅 Breakfast</Text>
                <Text style={styles.attendanceCount}>{attendance.breakfast?.yes || 0} yes / {attendance.breakfast?.maybe || 0} maybe</Text>
              </View>
              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceMeal}>☀️ Lunch</Text>
                <Text style={styles.attendanceCount}>{attendance.lunch?.yes || 0} yes / {attendance.lunch?.maybe || 0} maybe</Text>
              </View>
              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceMeal}>🌙 Dinner</Text>
                <Text style={styles.attendanceCount}>{attendance.dinner?.yes || 0} yes / {attendance.dinner?.maybe || 0} maybe</Text>
              </View>
            </Card>
          )}

          {(!menus || menus.length === 0) ? (
            <EmptyState title="No menus available" message="Menus will appear here" />
          ) : (
            menus.slice(0, 10).map((menu: any) => (
              <Card key={menu.id} style={styles.menuCard}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuIcon}>{MEAL_ICONS[menu.mealType] || '🍽️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.menuType}>{menu.mealType}</Text>
                    <Text style={styles.menuDate}>{formatDate(menu.date)}</Text>
                  </View>
                  {menu.isSpecial && <Text style={styles.specialBadge}>Special</Text>}
                </View>
                <View style={styles.itemsList}>
                  {(menu.items || []).map((item: string, i: number) => (
                    <Text key={i} style={styles.menuItem}>• {item}</Text>
                  ))}
                </View>
              </Card>
            ))
          )}
        </>
      )}

      {activeTab === 'polls' && (
        <>
          {(!polls || polls.length === 0) ? (
            <EmptyState title="No active polls" message="Polls will appear here" />
          ) : (
            polls.map((poll: any) => (
              <Card key={poll.id} style={styles.pollCard}>
                <View style={styles.pollHeader}>
                  <Text style={styles.pollTitle}>{poll.title}</Text>
                  <Text style={[styles.pollStatus, { color: poll.status === 'active' ? '#22c55e' : '#6b7280' }]}>{poll.status}</Text>
                </View>
                <Text style={styles.pollMeta}>{poll.mealType} · {formatDate(poll.date)} · {poll.totalVotes} votes</Text>
                {poll.options?.map((opt: any) => (
                  <View key={opt.id} style={styles.pollOption}>
                    <Text style={styles.pollOptionText}>{opt.title}</Text>
                    <Text style={styles.pollOptionVotes}>{opt.votes} votes</Text>
                  </View>
                ))}
                {poll.winner && <Text style={styles.pollWinner}>Winner: {poll.winner}</Text>}
              </Card>
            ))
          )}
        </>
      )}

      {activeTab === 'analytics' && analytics && (
        <Card style={styles.analyticsCard}>
          <Text style={styles.analyticsTitle}>Food Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{analytics.satisfactionScore?.toFixed(1) || 'N/A'}</Text>
              <Text style={styles.analyticsLabel}>Satisfaction</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{analytics.totalRatings || 0}</Text>
              <Text style={styles.analyticsLabel}>Total Ratings</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Text style={styles.analyticsValue}>{analytics.participationRate ? `${Math.round(analytics.participationRate)}%` : 'N/A'}</Text>
              <Text style={styles.analyticsLabel}>Participation</Text>
            </View>
          </View>
          {analytics.popularItems?.length > 0 && (
            <View style={styles.popularSection}>
              <Text style={styles.popularTitle}>Popular Items</Text>
              {analytics.popularItems.map((item: string, i: number) => (
                <Text key={i} style={styles.popularItem}>• {item}</Text>
              ))}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'capitalize' },
  tabTextActive: { color: '#fff' },
  attendanceCard: { marginBottom: 12, backgroundColor: '#f0fdf4' },
  attendanceTitle: { fontSize: 14, fontWeight: '700', color: '#16a34a', marginBottom: 8 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  attendanceMeal: { fontSize: 13, color: '#374151' },
  attendanceCount: { fontSize: 13, fontWeight: '500', color: '#16a34a' },
  menuCard: { marginBottom: 10 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  menuIcon: { fontSize: 24 },
  menuType: { fontSize: 16, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  menuDate: { fontSize: 12, color: '#9ca3af' },
  specialBadge: { fontSize: 11, fontWeight: '600', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemsList: { gap: 2 },
  menuItem: { fontSize: 14, color: '#374151', lineHeight: 22 },
  pollCard: { marginBottom: 10 },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pollTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pollStatus: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  pollMeta: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  pollOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pollOptionText: { fontSize: 14, color: '#374151' },
  pollOptionVotes: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  pollWinner: { fontSize: 13, fontWeight: '600', color: '#16a34a', marginTop: 8 },
  analyticsCard: { marginBottom: 16 },
  analyticsTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  analyticsItem: { alignItems: 'center' },
  analyticsValue: { fontSize: 22, fontWeight: '800', color: '#3b82f6' },
  analyticsLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  popularSection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  popularTitle: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  popularItem: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
