import { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { theme } from '../lib/theme';

interface LoadMoreButtonProps { onPress: () => void; loading?: boolean; remaining: number; }

export function LoadMoreButton({ onPress, loading, remaining }: LoadMoreButtonProps) {
  const pressScale = useRef(new Animated.Value(1)).current;

  if (remaining <= 0) return null;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      onPressIn={() => Animated.spring(pressScale, { toValue: 0.97, damping: 8, stiffness: 500, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(pressScale, { toValue: 1, damping: 8, stiffness: 500, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.button, { transform: [{ scale: pressScale }] }]}>
        {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : <Text style={styles.text}>Load More ({remaining} remaining)</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md, marginBottom: theme.spacing.xl, paddingVertical: 12, borderRadius: theme.borderRadius.md, borderWidth: 1.5, borderColor: theme.colors.primary, alignItems: 'center' },
  text: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
});