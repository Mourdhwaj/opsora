import { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, PanResponder, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../lib/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  title?: string;
}

export function BottomSheet({ visible, onClose, children, height = SCREEN_HEIGHT * 0.7, title }: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateY, { toValue: SCREEN_HEIGHT, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const close = () => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: SCREEN_HEIGHT, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 10,
      onPanResponderRelease: (_, g) => {
        if (g.dy > 50 || g.vy > 0.5) close();
      },
    })
  ).current;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={close} animationType="none">
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={close} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={[styles.sheet, { height, transform: [{ translateY }] }]} {...panResponder.panHandlers}>
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
