import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { theme } from '../lib/theme';

interface ProgressRingProps { percentage: number; size?: number; strokeWidth?: number; label?: string; sublabel?: string; }

export function ProgressRing({ percentage, size = 80, strokeWidth = 8, label, sublabel }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (progress / 100) * circumference;
  const color = progress >= 70 ? theme.colors.success : progress >= 50 ? theme.colors.warning : theme.colors.danger;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Circle cx={size/2} cy={size/2} r={radius} stroke={theme.colors.borderLight} strokeWidth={strokeWidth} fill="none" />
        <Circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90, ${size/2}, ${size/2})`} />
      </Svg>
      <View style={[styles.textContainer, { width: size, height: size }]}>
        <Text style={[styles.percentage, { color }]}>{Math.round(progress)}%</Text>
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
      {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  textContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  percentage: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.xs },
  sublabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
});
