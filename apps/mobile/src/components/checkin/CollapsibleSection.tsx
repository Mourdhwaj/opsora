import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { ChevronDown, CheckCircle2 } from 'lucide-react-native';
import { theme } from '../../lib/theme';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  isComplete?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, icon, isExpanded, onToggle, isComplete, children }: CollapsibleSectionProps) {
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const contentRef = useRef<View>(null);
  const measuredHeight = useRef(0);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.measure((_x: number, _y: number, w: number, h: number) => {
        if (h > 0) measuredHeight.current = h;
      });
    }
  }, []);

  useEffect(() => {
    const targetHeight = isExpanded ? measuredHeight.current || 200 : 0;
    Animated.parallel([
      Animated.timing(heightAnim, { toValue: targetHeight, duration: 250, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: isExpanded ? 1 : 0, duration: 200, useNativeDriver: false }),
      Animated.spring(chevronAnim, { toValue: isExpanded ? 1 : 0, damping: 10, stiffness: 100, useNativeDriver: true }),
    ]).start();
  }, [isExpanded]);

  const chevronRotation = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={onToggle} activeOpacity={0.8}>
        <View style={styles.headerLeft}>{icon}<Text style={styles.title}>{title}</Text></View>
        <View style={styles.headerRight}>
          {isComplete && <CheckCircle2 size={18} color={theme.colors.success} />}
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <ChevronDown size={18} color={theme.colors.textMuted} />
          </Animated.View>
        </View>
      </TouchableOpacity>
      <Animated.View ref={contentRef} style={{ height: heightAnim, opacity: opacityAnim, overflow: 'hidden' }}>
        <View style={styles.content}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontFamily: theme.font.semiBold, color: theme.colors.text },
  content: { paddingBottom: 14 },
});