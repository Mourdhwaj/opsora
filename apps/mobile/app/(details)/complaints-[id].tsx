import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Card, LoadingSkeleton, StatusBadge, BottomSheet } from '../../src/components';
import { CommentSection } from '../../src/components/CommentSection';
import { api } from '../../src/services/api';
import { formatDate, getPriorityColor, timeAgo } from '../../src/lib/utils';
import { theme } from '../../src/lib/theme';
import {
  Tag, AlertTriangle, Clock, CheckCircle, User, UserCog, ChevronRight,
  Wrench, Droplets, Zap, Sparkles, Shield, UtensilsCrossed, Volume2,
  Car, Wifi, ClipboardList, CircleDot,
} from 'lucide-react-native';

const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

const CATEGORY_ICONS: Record<string, any> = {
  maintenance: Wrench,
  plumbing: Droplets,
  electrical: Zap,
  cleaning: Sparkles,
  security: Shield,
  food: UtensilsCrossed,
  noise: Volume2,
  parking: Car,
  internet: Wifi,
  other: ClipboardList,
};

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
  const CategoryIcon = CATEGORY_ICONS[complaint?.category?.toLowerCase()] || ClipboardList;
  const priorityColor = complaint?.priority ? getPriorityColor(complaint.priority) : '#6b7280';

  return (
    <View style={s.wrapper}>
      <ScrollView
        style={s.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Card style={s.headerCard}>
          <View style={s.headerRow}>
            <Text style={s.ticket}>#{complaint?.ticketNumber}</Text>
            <View style={s.headerBadges}>
              <View style={[s.priorityBadge, { backgroundColor: priorityColor + '18' }]}>
                <AlertTriangle size={12} color={priorityColor} />
                <Text style={[s.priorityText, { color: priorityColor }]}>
                  {complaint?.priority}
                </Text>
              </View>
              <StatusBadge status={complaint?.status} />
            </View>
          </View>
          <Text style={s.title}>{complaint?.title}</Text>
          <Text style={s.description}>{complaint?.description}</Text>
        </Card>

        <Card style={s.section}>
          <Text style={s.sectionTitle}>Details</Text>

          <View style={s.detailRow}>
            <View style={s.detailIcon}>
              <Tag size={16} color={theme.colors.textSecondary} />
            </View>
            <Text style={s.detailLabel}>Category</Text>
            <View style={s.detailValueWrap}>
              <CategoryIcon size={14} color={theme.colors.textSecondary} />
              <Text style={s.detailValue}>{complaint?.category || 'N/A'}</Text>
            </View>
          </View>

          <View style={s.detailRow}>
            <View style={s.detailIcon}>
              <AlertTriangle size={16} color={theme.colors.textSecondary} />
            </View>
            <Text style={s.detailLabel}>Priority</Text>
            <Text style={[s.detailValue, { color: priorityColor, textTransform: 'capitalize' }]}>
              {complaint?.priority || 'N/A'}
            </Text>
          </View>

          <View style={s.detailRow}>
            <View style={s.detailIcon}>
              <Clock size={16} color={theme.colors.textSecondary} />
            </View>
            <Text style={s.detailLabel}>Created</Text>
            <Text style={s.detailValue}>
              {complaint?.createdAt ? timeAgo(complaint.createdAt) : 'N/A'}
            </Text>
          </View>

          {complaint?.resolvedAt && (
            <View style={s.detailRow}>
              <View style={s.detailIcon}>
                <CheckCircle size={16} color={theme.colors.success} />
              </View>
              <Text style={s.detailLabel}>Resolved</Text>
              <Text style={s.detailValue}>{formatDate(complaint.resolvedAt)}</Text>
            </View>
          )}

          <View style={s.detailRow}>
            <View style={s.detailIcon}>
              <User size={16} color={theme.colors.textSecondary} />
            </View>
            <Text style={s.detailLabel}>Resident</Text>
            <Text style={s.detailValue}>
              {complaint?.residentName || complaint?.tenantName || 'N/A'}
            </Text>
          </View>

          {complaint?.assignedToName && (
            <View style={[s.detailRow, { borderBottomWidth: 0 }]}>
              <View style={s.detailIcon}>
                <UserCog size={16} color={theme.colors.textSecondary} />
              </View>
              <Text style={s.detailLabel}>Assigned To</Text>
              <Text style={s.detailValue}>{complaint.assignedToName}</Text>
            </View>
          )}
        </Card>

        <Card style={s.section}>
          <Text style={s.sectionTitle}>Actions</Text>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowStatusChange(true)}>
            <View style={s.actionLeft}>
              <CircleDot size={18} color={theme.colors.primary} />
              <Text style={s.actionText}>Change Status</Text>
            </View>
            <ChevronRight size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>

          {staffList && staffList.length > 0 && (
            <View style={s.assignSection}>
              <Text style={s.assignLabel}>Assign Staff</Text>
              {staffList.map((staff: any) => {
                const isActive = complaint?.assignedTo === staff.id;
                return (
                  <TouchableOpacity
                    key={staff.id}
                    style={[s.staffItem, isActive && s.staffItemActive]}
                    onPress={() => handleAssign(staff.id)}
                  >
                    <View style={s.staffLeft}>
                      <UserCog size={16} color={isActive ? theme.colors.primary : theme.colors.textMuted} />
                      <Text style={[s.staffName, isActive && { color: theme.colors.primary }]}>
                        {staff.fullName}
                      </Text>
                    </View>
                    {staff.openTicketCount > 0 && (
                      <View style={s.staffCountBadge}>
                        <Text style={s.staffCount}>{staff.openTicketCount} open</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        <Card style={s.section}>
          <Text style={s.sectionTitle}>
            Comments ({complaint?.comments?.length || 0})
          </Text>
          <CommentSection
            complaintId={id as string}
            comments={complaint?.comments || []}
          />
        </Card>
      </ScrollView>

      <BottomSheet visible={showStatusChange} onClose={() => setShowStatusChange(false)} height={400}>
        <ScrollView style={s.statusSheet} showsVerticalScrollIndicator={false}>
          <Text style={s.sheetTitle}>Change Status</Text>
          <Text style={s.currentStatus}>Current: {currentStatus?.replace('_', ' ')}</Text>

          {nextStatuses.map(status => (
            <TouchableOpacity
              key={status}
              style={s.statusOption}
              onPress={() => handleStatusChange(status)}
            >
              <StatusBadge status={status} />
              <ChevronRight size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}

          <View style={s.notesSection}>
            <Text style={s.notesLabel}>Resolution Notes (required for resolving)</Text>
            <Text style={s.notesInput}>
              {resolutionNotes || 'Tap to add notes...'}
            </Text>
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, padding: theme.spacing.lg },

  headerCard: { marginBottom: theme.spacing.lg },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  ticket: { ...theme.typography.label, fontSize: 13 },
  headerBadges: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  priorityText: { ...theme.typography.badge, textTransform: 'capitalize' },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.sm },
  description: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22 },

  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { ...theme.typography.sectionTitle, marginBottom: theme.spacing.md },

  detailRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  detailIcon: {
    width: 32, height: 32, borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  detailLabel: { ...theme.typography.body, flex: 1, color: theme.colors.textSecondary },
  detailValue: { ...theme.typography.body, fontWeight: '600', color: theme.colors.text, textTransform: 'capitalize' },
  detailValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  actionBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  actionText: { fontSize: 15, fontWeight: '500', color: theme.colors.primary },

  assignSection: { marginTop: theme.spacing.md },
  assignLabel: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  staffItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  staffItemActive: {
    backgroundColor: theme.colors.primarySurface,
    marginHorizontal: -theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  staffLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  staffName: { ...theme.typography.body, fontWeight: '500' },
  staffCountBadge: {
    backgroundColor: theme.colors.infoSurface,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  staffCount: { fontSize: 11, fontWeight: '600', color: theme.colors.info },

  statusSheet: { padding: theme.spacing.lg },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginBottom: theme.spacing.sm },
  currentStatus: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.lg, textTransform: 'capitalize' },
  statusOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight,
  },
  notesSection: { marginTop: theme.spacing.xl },
  notesLabel: { ...theme.typography.label, marginBottom: theme.spacing.sm },
  notesInput: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md, ...theme.typography.body,
    color: theme.colors.textMuted, minHeight: 60, textAlignVertical: 'top',
  },
});
