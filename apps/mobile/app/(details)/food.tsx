import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Sunrise, Sun, Moon, Popcorn, UtensilsCrossed } from 'lucide-react-native';
import { Card, LoadingSkeleton, FilterBar, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate, timeAgo } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Sunrise size={18} color={theme.colors.warning} />,
  lunch: <Sun size={18} color={theme.colors.warning} />,
  dinner: <Moon size={18} color={theme.colors.primary} />,
  snacks: <Popcorn size={18} color={theme.colors.success} />,
};

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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sunrise size={16} color={theme.colors.warning} />
                  <Text style={styles.attendanceMeal}>Breakfast</Text>
                </View>
                <Text style={styles.attendanceCount}>{attendance.breakfast?.yes || 0} yes / {attendance.breakfast?.maybe || 0} maybe</Text>
              </View>
              <View style={styles.attendanceRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sun size={16} color={theme.colors.warning} />
                  <Text style={styles.attendanceMeal}>Lunch</Text>
                </View>
                <Text style={styles.attendanceCount}>{attendance.lunch?.yes || 0} yes / {attendance.lunch?.maybe || 0} maybe</Text>
              </View>
              <View style={styles.attendanceRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Moon size={16} color={theme.colors.primary} />
                  <Text style={styles.attendanceMeal}>Dinner</Text>
                </View>
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
                  <View style={styles.menuIconWrap}>
                    {MEAL_ICONS[menu.mealType] || <UtensilsCrossed size={18} color={theme.colors.textMuted} />}
                  </View>
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
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  pageTitle: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: theme.borderRadius.md, backgroundColor: theme.colors.borderLight, alignItems: 'center' },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary, textTransform: 'capitalize' },
  tabTextActive: { color: '#fff' },
  attendanceCard: { marginBottom: 12, backgroundColor: theme.colors.successSurface },
  attendanceTitle: { fontSize: 14, fontFamily: theme.font.bold, color: theme.colors.success, marginBottom: 8 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  attendanceMeal: { fontSize: 13, fontFamily: theme.font.regular, color: theme.colors.text },
  attendanceCount: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.success },
  menuCard: { marginBottom: 10 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  menuIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primarySurface, justifyContent: 'center', alignItems: 'center' },
  menuType: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text, textTransform: 'capitalize' },
  menuDate: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textMuted },
  specialBadge: { fontSize: 11, fontFamily: theme.font.semiBold, color: theme.colors.warning, backgroundColor: theme.colors.warningSurface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemsList: { gap: 2 },
  menuItem: { fontSize: 14, fontFamily: theme.font.regular, color: theme.colors.text, lineHeight: 22 },
  pollCard: { marginBottom: 10 },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pollTitle: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  pollStatus: { fontSize: 12, fontFamily: theme.font.semiBold, textTransform: 'capitalize' },
  pollMeta: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textMuted, marginBottom: 8 },
  pollOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  pollOptionText: { fontSize: 14, fontFamily: theme.font.regular, color: theme.colors.text },
  pollOptionVotes: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  pollWinner: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.success, marginTop: 8 },
  analyticsCard: { marginBottom: 16 },
  analyticsTitle: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 12 },
  analyticsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  analyticsItem: { alignItems: 'center' },
  analyticsValue: { fontSize: 22, fontFamily: theme.font.extraBold, color: theme.colors.primary },
  analyticsLabel: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginTop: 2 },
  popularSection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.borderLight },
  popularTitle: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 8 },
  popularItem: { fontSize: 14, fontFamily: theme.font.regular, color: theme.colors.text, lineHeight: 22 },
});
