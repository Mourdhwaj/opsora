import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Card, LoadingSkeleton, StatusBadge, BottomSheet } from '../../../src/components';
import { CommentSection } from '../../../src/components/CommentSection';
import { api } from '../../../src/services/api';
import { formatDate, getPriorityColor, getCategoryIcon, timeAgo } from '../../../src/lib/utils';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

export default function ComplaintDetail() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [showStatusChange, setShowStatusChange] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data: complaint, isLoading, refetch } = useQuery({
    queryKey: ['complaint', id],
    queryFn: () => api.get(`/complaints/${id}`).then(r => r.data || r),
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff-list'],
    queryFn: () => api.get('/staff/list').then(r => r.data?.data || r.data || []),
  });

  const statusMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/complaints/${id}/status`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', id] });
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      setShowStatusChange(false);
      setResolutionNotes('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update status');
    },
  });

  function handleStatusChange(newStatus: string) {
    if (newStatus === 'resolved' && !resolutionNotes.trim()) {
      Alert.alert('Resolution Notes', 'Please enter resolution notes when marking as resolved.');
      return;
    }
    statusMutation.mutate({ status: newStatus, resolutionNotes: resolutionNotes.trim() || undefined });
  }

  function handleAssign(staffId: string) {
    statusMutation.mutate({ assignedTo: staffId });
  }

  if (isLoading) return <LoadingSkeleton />;

  const currentStatus = complaint?.status;
  const nextStatuses = STATUSES.filter(s => s !== currentStatus);

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
            </View>
            <StatusBadge status={complaint?.status} />
          </View>
          <Text style={styles.title}>{complaint?.title}</Text>
          <Text style={styles.description}>{complaint?.description}</Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <DetailRow label="Category" value={`${getCategoryIcon(complaint?.category)} ${complaint?.category}`} />
          <DetailRow label="Priority" value={complaint?.priority} />
          <DetailRow label="Created" value={complaint?.createdAt ? timeAgo(complaint.createdAt) : ''} />
          {complaint?.resolvedAt && <DetailRow label="Resolved" value={formatDate(complaint.resolvedAt)} />}
          <DetailRow label="Resident" value={complaint?.residentName || complaint?.tenantName} />
          {complaint?.assignedToName && <DetailRow label="Assigned To" value={complaint.assignedToName} />}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowStatusChange(true)}>
            <Text style={styles.actionText}>Change Status</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          {staffList && staffList.length > 0 && (
            <View style={styles.assignSection}>
              <Text style={styles.assignLabel}>Assign Staff</Text>
              {staffList.map((staff: any) => (
                <TouchableOpacity
                  key={staff.id}
                  style={[styles.staffItem, complaint?.assignedTo === staff.id && styles.staffItemActive]}
                  onPress={() => handleAssign(staff.id)}
                >
                  <Text style={styles.staffName}>{staff.fullName}</Text>
                  {staff.openTicketCount > 0 && <Text style={styles.staffCount}>{staff.openTicketCount} open</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        {complaint?.comments && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Comments ({complaint.comments.length})</Text>
            <CommentSection complaintId={id as string} comments={complaint.comments} />
          </Card>
        )}

        {!complaint?.comments && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Comments</Text>
            <CommentSection complaintId={id as string} comments={[]} />
          </Card>
        )}
      </ScrollView>

      <BottomSheet visible={showStatusChange} onClose={() => setShowStatusChange(false)} height={400}>
        <ScrollView style={styles.statusSheet} showsVerticalScrollIndicator={false}>
          <Text style={styles.sheetTitle}>Change Status</Text>
          <Text style={styles.currentStatus}>Current: {currentStatus?.replace('_', ' ')}</Text>

          {nextStatuses.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, s === 'resolved' && styles.resolveOption]}
              onPress={() => handleStatusChange(s)}
            >
              <StatusBadge status={s} />
              <Text style={styles.statusOptionArrow}>›</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Resolution Notes (required for resolving)</Text>
            <Text style={styles.notesInput}
              // Using Text as a simple display — in a real app you'd use TextInput
            >
              {resolutionNotes || 'Tap to add notes...'}
            </Text>
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || 'N/A'}</Text>
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
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  description: { fontSize: 15, color: '#6b7280', lineHeight: 22 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { fontSize: 14, color: '#6b7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  actionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  actionText: { fontSize: 15, fontWeight: '500', color: '#3b82f6' },
  actionArrow: { fontSize: 20, color: '#3b82f6' },
  assignSection: { marginTop: 12 },
  assignLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  staffItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  staffItemActive: { backgroundColor: '#eff6ff', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  staffName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  staffCount: { fontSize: 12, color: '#9ca3af' },
  statusSheet: { padding: 16 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  currentStatus: { fontSize: 14, color: '#6b7280', marginBottom: 16, textTransform: 'capitalize' },
  statusOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  resolveOption: {},
  statusOptionArrow: { fontSize: 20, color: '#9ca3af' },
  notesSection: { marginTop: 16 },
  notesLabel: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  notesInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, fontSize: 14, color: '#9ca3af', minHeight: 60, textAlignVertical: 'top' },
});
