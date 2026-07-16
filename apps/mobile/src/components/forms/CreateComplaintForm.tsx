import { theme } from "../../lib/theme";
import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button } from '..';
import { api } from '../../services/api';

const CATEGORIES = [
  'maintenance', 'plumbing', 'electrical', 'cleaning', 'security',
  'food', 'noise', 'parking', 'internet', 'other',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

interface CreateComplaintFormProps {
  onClose: () => void;
}

export function CreateComplaintForm({ onClose }: CreateComplaintFormProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('maintenance');
  const [priority, setPriority] = useState('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/complaints', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create complaint');
    },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
    });
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>New Complaint</Text>

      <Input label="Title *" value={title} onChangeText={setTitle} placeholder="Brief description" error={errors.title} />
      <Input label="Description *" value={description} onChangeText={setDescription} placeholder="Detailed description" multiline error={errors.description} />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.chipRow}>
        {PRIORITIES.map(p => (
          <TouchableOpacity key={p} style={[styles.chip, priority === p && styles.chipActive, priority === p && { backgroundColor: getPriorityColor(p) }]} onPress={() => setPriority(p)}>
            <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Submit" onPress={handleSubmit} loading={createMutation.isPending} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

function getPriorityColor(p: string): string {
  const colors: Record<string, string> = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: theme.colors.primary };
  return colors[p] || theme.colors.primary;
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '500', color: '#6b7280', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
