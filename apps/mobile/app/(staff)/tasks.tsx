import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, LoadingSkeleton, EmptyState, StatusBadge } from '../../src/components';
import { api } from '../../src/services/api';

export default function StaffTasks() {
  const queryClient = useQueryClient();
  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['staff-tasks'],
    queryFn: () => api.get('/staff-portal/tasks').then(r => r.data || r),
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.patch(`/staff-portal/tasks/${taskId}`, { status: 'completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-tasks'] });
      Alert.alert('Done!', 'Task marked as completed');
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>My Tasks</Text>
      {(!tasks || tasks.length === 0) ? (
        <EmptyState title="No tasks assigned" />
      ) : (
        tasks.map((task: any) => (
          <Card key={task.id} style={styles.card}>
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <StatusBadge status={task.status} />
            </View>
            {task.description && <Text style={styles.taskDesc}>{task.description}</Text>}
            {task.status !== 'completed' && (
              <TouchableOpacity style={styles.completeButton} onPress={() => completeMutation.mutate(task.id)}>
                <Text style={styles.completeText}>Mark Complete</Text>
              </TouchableOpacity>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  card: { marginBottom: 10 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  taskDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8 },
  completeButton: { backgroundColor: '#22c55e', borderRadius: 8, padding: 10, alignItems: 'center' },
  completeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
