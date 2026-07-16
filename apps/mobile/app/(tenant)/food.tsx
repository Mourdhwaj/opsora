import { theme } from "../../src/lib/theme";
import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, FilterBar } from '../../src/components';
import { api } from '../../src/services/api';
import { formatDate, timeAgo } from '../../src/lib/utils';
import type { FoodMenu } from '../../src/types';

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍿' };

export default function TenantFood() {
  const [activeTab, setActiveTab] = useState('menu');
  const [attendance, setAttendance] = useState<Record<string, 'yes' | 'maybe' | 'no'>>({});
  const queryClient = useQueryClient();

  const { data: menus, isLoading: menusLoading, refetch: refetchMenus } = useQuery<FoodMenu[]>({
    queryKey: ['tenant-food'],
    queryFn: () => api.get('/food/menus').then(r => r.data?.data || r.data || []),
  });

  const { data: polls, isLoading: pollsLoading, refetch: refetchPolls } = useQuery({
    queryKey: ['tenant-polls'],
    queryFn: () => api.get('/food/polls', { params: { status: 'active' } }).then(r => r.data?.data || r.data || []),
  });

  const { data: myAttendance } = useQuery({
    queryKey: ['tenant-attendance'],
    queryFn: () => api.get('/food/attendance/my').then(r => r.data?.data || r.data || []),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      api.post(`/food/polls/${pollId}/vote`, { optionId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-polls'] });
      Alert.alert('Success', 'Vote recorded');
    },
  });

  const attendanceMutation = useMutation({
    mutationFn: (data: any) => api.post('/food/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-attendance'] });
      Alert.alert('Success', 'Attendance updated');
    },
  });

  const isLoading = menusLoading || pollsLoading;

  function handleVote(pollId: string, optionId: string) {
    voteMutation.mutate({ pollId, optionId });
  }

  function handleAttendance(meal: string, value: 'yes' | 'maybe' | 'no') {
    const newAttendance = { ...attendance, [meal]: value };
    setAttendance(newAttendance);
    const today = new Date().toISOString().split('T')[0];
    attendanceMutation.mutate({
      date: today,
      breakfast: newAttendance.breakfast,
      lunch: newAttendance.lunch,
      dinner: newAttendance.dinner,
    });
  }

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refetchMenus(); refetchPolls(); }} />}>
      <Text style={styles.pageTitle}>Food & Meals</Text>

      <View style={styles.tabRow}>
        {['menu', 'polls', 'attendance'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'menu' && (
        <>
          {(!menus || menus.length === 0) ? (
            <EmptyState title="No menu available" message="Check back later" />
          ) : (
            menus.slice(0, 10).map((menu: any) => (
              <Card key={menu.id} style={styles.card}>
                <View style={styles.menuHeader}>
                  <Text style={styles.menuIcon}>{MEAL_ICONS[menu.mealType] || '🍽️'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealType}>{menu.mealType}</Text>
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
            <EmptyState title="No active polls" message="Check back later" />
          ) : (
            polls.map((poll: any) => (
              <Card key={poll.id} style={styles.card}>
                <View style={styles.pollHeader}>
                  <Text style={styles.pollTitle}>{poll.title}</Text>
                  <Text style={styles.pollMeta}>{poll.totalVotes} votes</Text>
                </View>
                <Text style={styles.pollInfo}>{poll.mealType} · {formatDate(poll.date)}</Text>
                {poll.options?.map((opt: any) => (
                  <TouchableOpacity key={opt.id} style={styles.pollOption} onPress={() => handleVote(poll.id, opt.id)}>
                    <Text style={styles.pollOptionText}>{opt.title}</Text>
                    <Text style={styles.pollOptionVotes}>{opt.votes} votes</Text>
                  </TouchableOpacity>
                ))}
              </Card>
            ))
          )}
        </>
      )}

      {activeTab === 'attendance' && (
        <>
          <Card style={styles.card}>
            <Text style={styles.attendanceTitle}>Mark Today's Attendance</Text>
            {['breakfast', 'lunch', 'dinner'].map(meal => (
              <View key={meal} style={styles.attendanceRow}>
                <Text style={styles.attendanceLabel}>{MEAL_ICONS[meal]} {meal}</Text>
                <View style={styles.attendanceButtons}>
                  {(['yes', 'maybe', 'no'] as const).map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.attBtn, attendance[meal] === val && styles.attBtnActive, attendance[meal] === val && { backgroundColor: val === 'yes' ? '#22c55e' : val === 'maybe' ? '#eab308' : '#ef4444' }]}
                      onPress={() => handleAttendance(meal, val)}
                    >
                      <Text style={[styles.attBtnText, attendance[meal] === val && styles.attBtnTextActive]}>
                        {val === 'yes' ? '✓' : val === 'maybe' ? '?' : '✕'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </Card>

          {myAttendance && myAttendance.length > 0 && (
            <Card style={styles.card}>
              <Text style={styles.attendanceTitle}>Recent Attendance</Text>
              {myAttendance.slice(0, 7).map((record: any) => (
                <View key={record.id} style={styles.historyRow}>
                  <Text style={styles.historyDate}>{formatDate(record.date)}</Text>
                  <Text style={styles.historyMeals}>
                    {record.breakfast && `B:${record.breakfast} `}
                    {record.lunch && `L:${record.lunch} `}
                    {record.dinner && `D:${record.dinner}`}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center' },
  tabActive: { backgroundColor: 'theme.colors.primary' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'capitalize' },
  tabTextActive: { color: '#fff' },
  card: { marginBottom: 12 },
  menuHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  menuIcon: { fontSize: 24 },
  mealType: { fontSize: 16, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  menuDate: { fontSize: 12, color: '#9ca3af' },
  specialBadge: { fontSize: 11, fontWeight: '600', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  itemsList: { gap: 2 },
  menuItem: { fontSize: 14, color: '#374151', lineHeight: 22 },
  pollHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  pollTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  pollMeta: { fontSize: 12, color: '#9ca3af' },
  pollInfo: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  pollOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  pollOptionText: { fontSize: 14, color: '#374151' },
  pollOptionVotes: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  attendanceTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  attendanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  attendanceLabel: { fontSize: 14, fontWeight: '500', color: '#374151', textTransform: 'capitalize' },
  attendanceButtons: { flexDirection: 'row', gap: 8 },
  attBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  attBtnActive: {},
  attBtnText: { fontSize: 16, fontWeight: '700', color: '#6b7280' },
  attBtnTextActive: { color: '#fff' },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyDate: { fontSize: 13, color: '#374151' },
  historyMeals: { fontSize: 13, color: '#6b7280' },
});
