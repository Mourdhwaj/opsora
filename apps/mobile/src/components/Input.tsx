import { useRef } from 'react';
import { View, TextInput, Text, StyleSheet, Animated, type KeyboardTypeOptions } from 'react-native';
import { theme } from '../lib/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline, error, autoCapitalize }: InputProps) {
  const focusAnim = useRef(new Animated.Value(0)).current;

  const borderWidth = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] });
  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [error ? theme.colors.danger : theme.colors.border, theme.colors.primary] });
  const shadowOpacity = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] });
  const labelColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const focusIn = () => Animated.timing(focusAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  const focusOut = () => Animated.timing(focusAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();

  return (
    <View style={styles.container}>
      {label && (
        <Animated.Text style={[styles.label, { color: labelColor.interpolate({ inputRange: [0, 1], outputRange: [theme.colors.textSecondary, theme.colors.primary] }) }]}>
          {label}
        </Animated.Text>
      )}
      <AnimatedTextInput
        style={[styles.input, multiline && styles.multiline, {
          borderWidth, borderColor,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity,
          shadowRadius: 8,
          elevation: 2,
        }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        onFocus={focusIn}
        onBlur={focusOut}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  input: { borderRadius: 10, padding: 12, fontSize: 16, color: theme.colors.text, backgroundColor: theme.colors.surface },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  error: { color: theme.colors.danger, fontSize: 12, marginTop: 4 },
});