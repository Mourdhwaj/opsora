import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useRef, useEffect } from 'react';
import { theme } from '../lib/theme';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

export function AnimatedCard({ children, delay = 0, style }: AnimatedCardProps) {
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ translateY }],
          opacity,
        },
        style,
      ]}
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
