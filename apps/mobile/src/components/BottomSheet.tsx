import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../lib/theme';
import { useResponsive } from '../lib/useResponsive';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  title?: string;
}

export function BottomSheet({ visible, onClose, children, height, title }: BottomSheetProps) {
  const { height: SCREEN_HEIGHT } = useResponsive();
  const sheetHeight = height ?? Math.round(SCREEN_HEIGHT * 0.7);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const startY = useRef(0);

  const animateTo = (target: number, callback?: () => void) => {
    const overlayTarget = target === 0 ? 1 : 0;
    Animated.parallel([
      Animated.spring(translateY, { toValue: target, damping: 0.8 * 20, stiffness: 65, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: overlayTarget, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (target === SCREEN_HEIGHT) callback?.();
    });
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
    onPanResponderGrant: () => { startY.current = 0; },
    onPanResponderMove: (_, gestureState) => {
      const newY = Math.max(0, startY.current + gestureState.dy);
      translateY.setValue(newY);
      overlayOpacity.setValue(1 - (newY / SCREEN_HEIGHT) * 0.6);
    },
    onPanResponderRelease: (_, gestureState) => {
      const currentY = startY.current + gestureState.dy;
      const projected = currentY + gestureState.vy * 0.5;
      const shouldDismiss = projected > SCREEN_HEIGHT * 0.5 || gestureState.dy > 100;
      if (shouldDismiss) {
        animateTo(SCREEN_HEIGHT, onClose);
      } else {
        animateTo(0);
      }
    },
  })).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(SCREEN_HEIGHT);
      animateTo(0);
    } else {
      animateTo(SCREEN_HEIGHT);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={() => animateTo(SCREEN_HEIGHT, onClose)} animationType="none">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => animateTo(SCREEN_HEIGHT, onClose)} activeOpacity={1} />
        </Animated.View>
        <Animated.View {...panResponder.panHandlers} style={[styles.sheet, { height: sheetHeight }, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          {title ? <Text style={styles.sheetTitle}>{title}</Text> : null}
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 32,
    overflow: 'hidden',
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 12, paddingHorizontal: 4 },
});