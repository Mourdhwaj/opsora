import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { theme } from '../lib/theme';

interface HeroStatCardProps {
  label: string;
  value: string;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
}

export function HeroStatCard({ label, value, trend, trendLabel, subtitle }: HeroStatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {trend !== undefined && (
          <View style={[styles.trendBadge, isPositive && styles.trendPositive, isNegative && styles.trendNegative]}>
            {isPositive ? <TrendingUp size={12} color={theme.colors.success} /> : <TrendingDown size={12} color={theme.colors.danger} />}
            <Text style={[styles.trendText, isPositive && styles.trendTextPositive, isNegative && styles.trendTextNegative]}>
              {isPositive ? '+' : ''}{trend}%
            </Text>
          </View>
        )}
      </View>
      {trendLabel && <Text style={styles.trendLabel}>{trendLabel}</Text>}
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginTop: -20, ...theme.shadow.md },
  label: { fontSize: 13, fontWeight: '500', color: theme.colors.textSecondary, marginBottom: theme.spacing.xs },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  value: { fontSize: 28, fontWeight: '800', color: theme.colors.text },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 6, paddingVertical: 3, borderRadius: theme.borderRadius.sm },
  trendPositive: { backgroundColor: theme.colors.successSurface },
  trendNegative: { backgroundColor: theme.colors.dangerSurface },
  trendText: { fontSize: 11, fontWeight: '600' },
  trendTextPositive: { color: theme.colors.success },
  trendTextNegative: { color: theme.colors.danger },
  trendLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: theme.spacing.xs },
});
