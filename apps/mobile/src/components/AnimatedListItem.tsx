import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, ViewStyle } from 'react-native';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  isNew?: boolean;
  style?: ViewStyle;
}

export function AnimatedListItem({ children, index, isNew = false, style }: AnimatedListItemProps) {
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(isNew ? 20 : 0)).current;

  useEffect(() => {
    if (!isNew) return;
    const staggerDelay = index * 40;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: staggerDelay, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: staggerDelay, useNativeDriver: true }),
    ]).start();
  }, [isNew, index]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}