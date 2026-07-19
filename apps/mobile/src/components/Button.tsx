import { theme } from "../lib/theme";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated, type ViewStyle, TouchableOpacityProps } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, onPressIn, onPressOut }: ButtonProps) {
  const pressScale = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.97, damping: 10, stiffness: 1000, useNativeDriver: true }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressIn?.();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, damping: 10, stiffness: 1000, useNativeDriver: true }).start();
    onPressOut?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>{title}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: '#6b7280' },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary },
  danger: { backgroundColor: '#ef4444' },
  disabled: { opacity: 0.5 },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineText: { color: theme.colors.primary },
});