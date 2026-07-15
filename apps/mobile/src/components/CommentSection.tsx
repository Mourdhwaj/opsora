import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { timeAgo } from '../lib/utils';

interface Comment {
  id: string;
  authorName: string;
  content: string;
  isInternal?: boolean;
  createdAt: string;
}

interface CommentSectionProps {
  complaintId: string;
  comments: Comment[];
}

export function CommentSection({ complaintId, comments }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const addCommentMutation = useMutation({
    mutationFn: (data: any) => api.post(`/complaints/${complaintId}/comments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] });
      setComment('');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to add comment');
    },
  });

  function handleSend() {
    if (!comment.trim()) return;
    addCommentMutation.mutate({ comment: comment.trim(), isInternal });
  }

  return (
    <View>
      {comments.length > 0 && (
        <View style={styles.commentsList}>
          {comments.map((c) => (
            <View key={c.id} style={[styles.comment, c.isInternal && styles.internalComment]}>
              <View style={styles.commentHeader}>
                <Text style={styles.commentAuthor}>{c.authorName}</Text>
                {c.isInternal && <Text style={styles.internalBadge}>Internal</Text>}
              </View>
              <Text style={styles.commentText}>{c.content}</Text>
              <Text style={styles.commentDate}>{timeAgo(c.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment..."
          placeholderTextColor="#9ca3af"
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={addCommentMutation.isPending}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.toggleRow} onPress={() => setIsInternal(!isInternal)}>
        <View style={[styles.checkbox, isInternal && styles.checkboxActive]} />
        <Text style={styles.toggleText}>Internal note (not visible to resident)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  commentsList: { marginBottom: 12 },
  comment: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  internalComment: { backgroundColor: '#fffbeb', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 8 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#111827' },
  internalBadge: { fontSize: 10, fontWeight: '600', color: '#d97706', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  commentText: { fontSize: 14, color: '#374151', marginTop: 4, lineHeight: 20 },
  commentDate: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  input: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 10, fontSize: 14, color: '#111827', maxHeight: 80, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: '#d1d5db' },
  checkboxActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  toggleText: { fontSize: 12, color: '#6b7280' },
});
