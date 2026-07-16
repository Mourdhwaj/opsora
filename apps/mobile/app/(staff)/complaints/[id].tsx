import { useState, type ReactNode } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl, TextInput } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Card, LoadingSkeleton, StatusBadge, BottomSheet } from '../../../src/components';
import { theme } from '../../../src/lib/theme';
import { CommentSection } from '../../../src/components/CommentSection';
import { api } from '../../../src/services/api';
import { formatDate, getPriorityColor, getCategoryIcon, timeAgo } from '../../../src/lib/utils';

export default function StaffComplaintDetail() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [showResolveSheet, setShowResolveSheet] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [showStatusSheet, setShowStatusSheet] = useState(false);

  const { data: complaint, isLoading, refetch } = useQuery({
    queryKey: ['staff-complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data || r),
  });

  const statusMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/complaints/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-complaint', id] });
      queryClient.invalidateQueries({ queryKey: ['staff-complaints'] });
      setShowResolveSheet(false);
      setShowStatusSheet(false);
      setResolutionNotes('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update');
    },
  });

  function handleAccept() {
    Alert.alert('Accept Ticket', 'Accept this ticket and start working on it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => statusMutation.mutate({ status: 'in_progress' }) },
    ]);
  }

  function handleResolve() {
    if (!resolutionNotes.trim()) {
      Alert.alert('Resolution Notes', 'Please describe how you resolved this issue.');
      return;
    }
    statusMutation.mutate({ status: 'resolved', resolutionNotes: resolutionNotes.trim() });
  }

  function handleStatusChange(newStatus: string) {
    if (newStatus === 'resolved') {
      setShowStatusSheet(false);
      setShowResolveSheet(true);
      return;
    }
    statusMutation.mutate({ status: newStatus });
  }

  if (isLoading) return <LoadingSkeleton />;

  const status = complaint?.status;
  const slaDeadline = complaint?.slaDeadline ? new Date(complaint.slaDeadline) : null;
  const isOverdue = slaDeadline && slaDeadline < new Date() && status !== 'resolved' && status !== 'closed';

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Card style={styles.headerCard}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.ticket}>#{complaint?.ticketNumber}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(complaint?.priority) + '20' }]}>
                <Text style={[styles.priorityText, { color: getPriorityColor(complaint?.priority) }]}>{complaint?.priority}</Text>
              </View>
              {isOverdue && <View style={styles.overdueBadge}><Text style={styles.overdueText}>SLA BREACH</Text></View>}
            </View>
            <StatusBadge status={complaint?.status} />
          </View>
          <Text style={styles.title}>{complaint?.title}</Text>
          <Text style={styles.description}>{complaint?.description}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Category" value={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {getCategoryIcon(complaint?.category)}
              <Text style={styles.detailValue}>{complaint?.category}</Text>
            </View>
          } />
          <DetailRow label="Priority" value={complaint?.priority} />
          <DetailRow label="Created" value={complaint?.createdAt ? timeAgo(complaint.createdAt) : ''} />
          {complaint?.slaDeadline && (
            <DetailRow
              label="SLA Deadline"
              value={`${formatDate(complaint.slaDeadline)}${isOverdue ? ' ⚠️' : ''}`}
            />
          )}
          {complaint?.resolvedAt && <DetailRow label="Resolved" value={formatDate(complaint.resolvedAt)} />}
          <DetailRow label="Resident" value={complaint?.residentName || complaint?.tenantName} />
          {complaint?.assignedToName && <DetailRow label="Assigned To" value={complaint.assignedToName} />}
        </Card>

        {status === 'open' && (
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} activeOpacity={0.7}>
            <Text style={styles.acceptIcon}>👋</Text>
            <Text style={styles.acceptText}>Accept Ticket</Text>
          </TouchableOpacity>
        )}

        {(status === 'open' || status === 'in_progress') && (
          <TouchableOpacity style={styles.resolveBtn} onPress={() => setShowResolveSheet(true)} activeOpacity={0.7}>
            <Text style={styles.resolveIcon}>✅</Text>
            <Text style={styles.resolveText}>Resolve Ticket</Text>
          </TouchableOpacity>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionRow} onPress={() => setShowStatusSheet(true)}>
            <Text style={styles.actionLabel}>Change Status</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Comments ({complaint?.comments?.length || 0})</Text>
          <CommentSection complaintId={id as string} comments={complaint?.comments || []} />
        </Card>
      </ScrollView>

      <BottomSheet visible={showResolveSheet} onClose={() => setShowResolveSheet(false)} title="Resolve Ticket">
        <Text style={styles.sheetLabel}>How was this issue resolved? *</Text>
        <TextInput
          style={styles.notesInput}
          value={resolutionNotes}
          onChangeText={setResolutionNotes}
          placeholder="Describe the resolution..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity style={styles.confirmBtn} onPress={handleResolve}>
          <Text style={styles.confirmText}>Mark Resolved</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={showStatusSheet} onClose={() => setShowStatusSheet(false)} title="Change Status">
        {['open', 'in_progress', 'resolved', 'closed'].filter(s => s !== status).map(s => (
          <TouchableOpacity key={s} style={styles.statusOption} onPress={() => handleStatusChange(s)}>
            <StatusBadge status={s} />
            <Text style={styles.statusArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </BottomSheet>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      {value || <Text style={styles.detailValue}>N/A</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16 },
  headerCard: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticket: { fontSize: 14, color: '#9ca3af', fontWeight: '500' },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  overdueBadge: { backgroundColor: '#fef2f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  overdueText: { fontSize: 10, fontWeight: '700', color: '#dc2626' },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  description: { fontSize: 15, color: '#6b7280', lineHeight: 22 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary, borderRadius: 12, padding: 14, marginBottom: 10 },
  acceptIcon: { fontSize: 18 },
  acceptText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#22c55e', borderRadius: 12, padding: 14, marginBottom: 16 },
  resolveIcon: { fontSize: 18 },
  resolveText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  actionLabel: { fontSize: 15, fontWeight: '500', color: theme.colors.primary },
  actionArrow: { fontSize: 20, color: theme.colors.primary },
  sheetLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  notesInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 100, marginBottom: 16, backgroundColor: '#fff', textAlignVertical: 'top' },
  confirmBtn: { backgroundColor: '#22c55e', borderRadius: 10, padding: 14, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusArrow: { fontSize: 20, color: '#9ca3af' },
});
