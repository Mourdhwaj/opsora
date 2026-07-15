import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor } from '../lib/utils';

interface BadgeProps {
  label: string;
  color?: string;
}

export function Badge({ label, color = '#6b7280' }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || status;
  return <Badge label={label} color={getStatusColor(status)} />;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '500' },
});
