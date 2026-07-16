import { useState, type ReactNode } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Card, LoadingSkeleton, StatusBadge } from '../../../src/components';
import { theme } from '../../../src/lib/theme';
import { CommentSection } from '../../../src/components/CommentSection';
import { api } from '../../../src/services/api';
import { formatDate, timeAgo, getPriorityColor, getCategoryIcon } from '../../../src/lib/utils';

export default function TenantComplaintDetail() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showRating, setShowRating] = useState(false);

  const { data: complaint, isLoading, refetch } = useQuery({
    queryKey: ['tenant-complaint', id],
    queryFn: () => api.get(`/tenant/complaints/${id}`).then(r => r.data || r),
  });

  const rateMutation = useMutation({
    mutationFn: (data: any) => api.post(`/complaints/${id}/rate`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-complaint', id] });
      setShowRating(false);
      Alert.alert('Thank you', 'Your feedback has been recorded');
    },
  });

  if (isLoading) return <LoadingSkeleton />;

  const canRate = complaint?.status === 'resolved' || complaint?.status === 'closed';

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Card style={styles.headerCard}>
        <View style={styles.header}>
          <Text style={styles.ticket}>#{complaint?.ticketNumber}</Text>
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
        {complaint?.assignedToName && <DetailRow label="Assigned To" value={complaint.assignedToName} />}
      </Card>

      {canRate && !complaint?.rating && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Rate Resolution</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(star => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={[styles.star, star <= rating && styles.starActive]}>{star <= rating ? '★' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.feedbackInput}
            value={feedback}
            onChangeText={setFeedback}
            placeholder="Share your feedback (optional)"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
          <TouchableOpacity
            style={[styles.rateBtn, rating === 0 && styles.rateBtnDisabled]}
            onPress={() => rateMutation.mutate({ rating, feedback: feedback.trim() || undefined })}
            disabled={rating === 0 || rateMutation.isPending}
          >
            <Text style={styles.rateBtnText}>{rateMutation.isPending ? 'Submitting...' : 'Submit Rating'}</Text>
          </TouchableOpacity>
        </Card>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Comments</Text>
        <CommentSection complaintId={id as string} comments={complaint?.comments || []} />
      </Card>
    </ScrollView>
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
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  headerCard: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  ticket: { fontSize: 14, color: theme.colors.textMuted, fontFamily: theme.font.medium },
  title: { fontSize: 20, fontFamily: theme.font.extraBold, color: theme.colors.text, marginBottom: 8 },
  description: { fontSize: 15, color: theme.colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  detailLabel: { fontSize: 14, color: theme.colors.textSecondary },
  detailValue: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, textTransform: 'capitalize' },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  star: { fontSize: 32, color: theme.colors.borderMedium },
  starActive: { color: theme.colors.warning },
  feedbackInput: { borderWidth: 1, borderColor: theme.colors.borderMedium, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
  rateBtn: { backgroundColor: theme.colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  rateBtnDisabled: { backgroundColor: theme.colors.borderMedium },
  rateBtnText: { color: theme.colors.surface, fontSize: 15, fontFamily: theme.font.semiBold },
});
