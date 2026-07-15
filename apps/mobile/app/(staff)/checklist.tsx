import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, EmptyState } from '../../src/components';

const DEFAULT_CHECKLIST = [
  { id: '1', title: 'Check main entrance locks', category: 'Security' },
  { id: '2', title: 'Verify CCTV cameras operational', category: 'Security' },
  { id: '3', title: 'Inspect common area cleanliness', category: 'Housekeeping' },
  { id: '4', title: 'Check water tank levels', category: 'Utilities' },
  { id: '5', title: 'Review pending complaints', category: 'Admin' },
  { id: '6', title: 'Verify fire extinguishers', category: 'Safety' },
  { id: '7', title: 'Check parking area', category: 'Security' },
  { id: '8', title: 'Log daily visitor entries', category: 'Admin' },
];

const STORAGE_KEY = 'staff_checklist';

interface ChecklistItem {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  completedAt?: string;
}

export default function StaffChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadChecklist();
  }, [selectedDate]);

  async function loadChecklist() {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY}_${selectedDate}`);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems(DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false })));
      }
    } catch {
      setItems(DEFAULT_CHECKLIST.map(item => ({ ...item, completed: false })));
    }
  }

  async function saveChecklist(updated: ChecklistItem[]) {
    setItems(updated);
    await AsyncStorage.setItem(`${STORAGE_KEY}_${selectedDate}`, JSON.stringify(updated));
  }

  async function toggleItem(id: string) {
    const updated = items.map(item =>
      item.id === id
        ? { ...item, completed: !item.completed, completedAt: !item.completed ? new Date().toISOString() : undefined }
        : item
    );
    await saveChecklist(updated);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadChecklist();
    setRefreshing(false);
  }

  const completedCount = items.filter(i => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const grouped = items.reduce((acc: Record<string, ChecklistItem[]>, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <View style={styles.wrapper}>
      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => {
          const d = new Date(selectedDate);
          d.setDate(d.getDate() - 1);
          setSelectedDate(d.toISOString().split('T')[0]);
        }}>
          <Text style={styles.dateArrow}>◀</Text>
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
          {selectedDate === new Date().toISOString().split('T')[0] && (
            <Text style={styles.todayBadge}>Today</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => {
          const d = new Date(selectedDate);
          d.setDate(d.getDate() + 1);
          if (d <= new Date()) setSelectedDate(d.toISOString().split('T')[0]);
        }}>
          <Text style={styles.dateArrow}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{completedCount}/{items.length} completed</Text>
      </View>

      {items.length === 0 ? (
        <EmptyState title="No checklist items" message="Checklist items will appear here" icon="☑️" />
      ) : (
        <FlatList
          data={Object.keys(grouped)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(cat) => cat}
          renderItem={({ item: category }) => (
            <View style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category}</Text>
              {grouped[category].map((item: ChecklistItem) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, item.completed && styles.itemDone]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
                    {item.completed && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={[styles.itemTitle, item.completed && styles.itemTitleDone]}>{item.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dateArrow: { fontSize: 20, color: '#3b82f6', padding: 8 },
  dateCenter: { alignItems: 'center' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  todayBadge: { fontSize: 11, fontWeight: '600', color: '#3b82f6', marginTop: 2 },
  progressSection: { padding: 16 },
  progressBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  progressText: { fontSize: 13, fontWeight: '600', color: '#6b7280', textAlign: 'center' },
  categorySection: { marginBottom: 16 },
  categoryTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, paddingHorizontal: 4 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 6, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  itemDone: { backgroundColor: '#f0fdf4' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  checkboxDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#111827', flex: 1 },
  itemTitleDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
});
