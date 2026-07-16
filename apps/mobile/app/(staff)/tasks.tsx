import { theme } from "../../src/lib/theme";
import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, ErrorState, SearchBar, BottomSheet } from '../../src/components';
import { api } from '../../src/services/api';
import { timeAgo } from '../../src/lib/utils';

const STATUS_TABS = ['all', 'pending', 'in_progress', 'completed'];

export default function StaffTasks() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showNotesSheet, setShowNotesSheet] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, error, refetch } = useQuery({
    queryKey: ['staff-tasks'],
    queryFn: () => api.get('/staff/tasks').then(r => r.data?.data || r.data || []),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.patch(`/staff/tasks/${id}`, { status: 'completed', completionNotes: notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      setShowNotesSheet(false);
      setSelectedTaskId(null);
      setCompletionNotes('');
      Alert.alert('Done!', 'Task marked as completed');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/staff/tasks/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
    },
  });

  const filtered = (tasks || [])
    .filter((t: any) => activeTab === 'all' || t.status === activeTab)
    .filter((t: any) => t.title?.toLowerCase().includes(search.toLowerCase()));

  const counts = {
    all: tasks?.length || 0,
    pending: tasks?.filter((t: any) => t.status === 'pending').length || 0,
    in_progress: tasks?.filter((t: any) => t.status === 'in_progress').length || 0,
    completed: tasks?.filter((t: any) => t.status === 'completed').length || 0,
  };

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load tasks" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search tasks..." />

      <View style={styles.tabRow}>
        {STATUS_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'all' ? 'All' : tab === 'in_progress' ? 'Active' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {' '}({counts[tab as keyof typeof counts]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <EmptyState title="No tasks found" message="Try adjusting your filters" />
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(item: any) => item.id}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          renderItem={({ item: task }: any) => {
            const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
            return (
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                    {task.description && <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(task.status) }]}>{formatStatus(task.status)}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  {task.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(task.priority) + '20' }]}>
                      <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>{task.priority}</Text>
                    </View>
                  )}
                  {task.dueDate && (
                    <Text style={[styles.dueDate, isOverdue && styles.overdue]}>
                      {isOverdue ? '⚠️ Overdue: ' : '📅 '}{new Date(task.dueDate).toLocaleDateString()}
                    </Text>
                  )}
                  {task.assignedTo && (
                    <Text style={styles.assignee}>👤 {task.assignedTo}</Text>
                  )}
                </View>

                {task.completionNotes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Completion Notes:</Text>
                    <Text style={styles.notesText}>{task.completionNotes}</Text>
                  </View>
                )}

                <View style={styles.actions}>
                  {task.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.startBtn}
                      onPress={() => updateStatusMutation.mutate({ id: task.id, status: 'in_progress' })}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.startText}>Start</Text>
                    </TouchableOpacity>
                  )}
                  {task.status !== 'completed' && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => {
                        setSelectedTaskId(task.id);
                        setShowNotesSheet(true);
                      }}
                      activeOpacity={0.6}
                    >
                      <Text style={styles.completeText}>Complete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      <BottomSheet visible={showNotesSheet} onClose={() => setShowNotesSheet(false)} title="Task Completion">
        <Text style={styles.sheetLabel}>Add completion notes (optional):</Text>
        <TextInput
          style={styles.notesInput}
          value={completionNotes}
          onChangeText={setCompletionNotes}
          placeholder="What did you do? Any issues?"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => {
            if (selectedTaskId) {
              completeMutation.mutate({ id: selectedTaskId, notes: completionNotes || undefined });
            }
          }}
        >
          <Text style={styles.confirmText}>Mark Complete</Text>
        </TouchableOpacity>
      </BottomSheet>
    </View>
  );
}

function formatStatus(s: string): string {
  return s?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
}

function getStatusColor(s: string): string {
  const m: Record<string, string> = { pending: theme.colors.warning, in_progress: theme.colors.primary, completed: theme.colors.success };
  return m[s] || theme.colors.textSecondary;
}

function getPriorityColor(p: string): string {
  const m: Record<string, string> = { urgent: theme.colors.danger, high: '#f97316', medium: '#eab308', low: theme.colors.primary };
  return m[p] || theme.colors.textSecondary;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 6 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.borderLight },
  tabActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 12, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.surface },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  taskTitle: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  taskDesc: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  statusText: { fontSize: 12, fontFamily: theme.font.semiBold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priorityText: { fontSize: 11, fontFamily: theme.font.semiBold, textTransform: 'capitalize' },
  dueDate: { fontSize: 12, color: theme.colors.textSecondary },
  overdue: { color: theme.colors.danger, fontFamily: theme.font.semiBold },
  assignee: { fontSize: 12, color: theme.colors.textSecondary },
  notesBox: { backgroundColor: theme.colors.background, borderRadius: 8, padding: 10, marginBottom: 8 },
  notesLabel: { fontSize: 11, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary, marginBottom: 2 },
  notesText: { fontSize: 13, color: theme.colors.textDark },
  actions: { flexDirection: 'row', gap: 8 },
  startBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.infoSurface, alignItems: 'center' },
  startText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.primary },
  completeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: theme.colors.successSurface, alignItems: 'center' },
  completeText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.success },
  sheetLabel: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.textDark, marginBottom: 8 },
  notesInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, padding: 12, fontSize: 14, minHeight: 80, marginBottom: 12, backgroundColor: theme.colors.surface },
  confirmBtn: { backgroundColor: theme.colors.success, borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: theme.colors.surface, fontSize: 16, fontFamily: theme.font.semiBold },
});
