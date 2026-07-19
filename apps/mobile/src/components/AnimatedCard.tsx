import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';
import { theme } from '../lib/theme';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  index?: number;
  isExiting?: boolean;
  onExitComplete?: () => void;
  style?: ViewStyle;
}

export function AnimatedCard({ children, delay = 0, index, isExiting, onExitComplete, style }: AnimatedCardProps) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const staggerDelay = index !== undefined ? Math.min(index * 60, 300) : delay;

  useEffect(() => {
    if (isExiting) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: staggerDelay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 400, delay: staggerDelay, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!isExiting) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
    ]).start(() => onExitComplete?.());
  }, [isExiting]);

  return (
    <Animated.View
      style={[styles.card, { opacity, transform: [{ translateY }] }, style]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.sm,
  },
});