import { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Lock } from 'lucide-react-native';
import { theme } from '../../lib/theme';

interface BedSquareProps {
  bedId: string;
  bedNumber: string;
  status: 'vacant' | 'occupied' | 'gender-locked' | 'selected';
  onPress: (bedId: string) => void;
  index?: number;
}

export function BedSquare({ bedId, bedNumber, status, onPress, index = 0 }: BedSquareProps) {
  const isTappable = status === 'vacant' || status === 'selected';
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current === status) return;

    if (status === 'selected') {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.08, damping: 7, stiffness: 800, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 7, stiffness: 800, useNativeDriver: true }),
      ]).start();
    } else if (status === 'occupied' || status === 'gender-locked') {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.4, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 0.95, damping: 10, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, damping: 10, useNativeDriver: true }),
      ]).start();
    }
    prevStatus.current = status;
  }, [status]);

  const bgColor = status === 'selected' ? theme.colors.primary : status === 'occupied' || status === 'gender-locked' ? theme.colors.borderLight : theme.colors.surface;
  const bdrColor = status === 'selected' ? theme.colors.primary : status === 'occupied' || status === 'gender-locked' ? theme.colors.borderLight : theme.colors.border;
  const borderStyle = status === 'selected' || status === 'occupied' || status === 'gender-locked' ? 'solid' as const : 'dashed' as const;

  return (
    <TouchableOpacity
      onPress={() => isTappable && onPress(bedId)}
      disabled={!isTappable}
      activeOpacity={0.6}
      onPressIn={() => Animated.spring(pressScale, { toValue: 0.92, damping: 7, stiffness: 1000, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, damping: 7, stiffness: 1000, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.bed, { backgroundColor: bgColor, borderColor: bdrColor, borderStyle, opacity, transform: [{ scale: Animated.multiply(scale, pressScale) }] }]}>
        {status === 'occupied' || status === 'gender-locked' ? (
          <Lock size={14} color={theme.colors.textMuted} />
        ) : (
          <Text style={[styles.bedText, status === 'selected' && styles.bedTextSelected]}>
            {bedNumber}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bed: {
    width: 48, height: 48, borderRadius: theme.borderRadius.sm,
    borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  bedText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  bedTextSelected: { color: '#fff' },
});