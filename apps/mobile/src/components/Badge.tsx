import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
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
  const scale = useRef(new Animated.Value(1)).current;
  const prevStatus = useRef(status);

  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || status;
  const color = getStatusColor(status);

  useEffect(() => {
    if (prevStatus.current === status) return;
    const isSuccess = status === 'paid' || status === 'resolved';
    if (isSuccess) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.05, damping: 6, stiffness: 400, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 8, stiffness: 400, useNativeDriver: true }),
      ]).start();
    }
    prevStatus.current = status;
  }, [status]);

  return (
    <Animated.View style={[styles.badge, { backgroundColor: color + '20', transform: [{ scale }] }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  text: { fontSize: 12, fontWeight: '500' },
});