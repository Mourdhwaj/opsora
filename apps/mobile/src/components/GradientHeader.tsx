import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../lib/theme';

interface GradientHeaderProps {
  greeting: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export function GradientHeader({ greeting, subtitle, rightAction }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();
  
  return (
    <LinearGradient
      colors={[theme.colors.primaryGradientStart, theme.colors.primaryGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, { paddingTop: insets.top + theme.spacing.lg }]}
    >
      <View style={styles.topRow}>
        <View style={styles.textContainer}>
          <Text style={styles.greeting}>{greeting}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl + 8,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  textContainer: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '400', color: 'rgba(255, 255, 255, 0.8)' },
  rightAction: { marginLeft: theme.spacing.md },
});
