import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useEffect, useRef } from 'react';
import { theme } from '../lib/theme';
import { useResponsive } from '../lib/useResponsive';

const RANGES = ['1M', '3M', '6M', '12M'];

interface RevenueChartProps { data: Array<{ month: string; collected: number; expected: number }>; range: string; onRangeChange: (r: string) => void; }

export function RevenueChart({ data, range, onRangeChange }: RevenueChartProps) {
  const { width: SCREEN_WIDTH } = useResponsive();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const rangeMonths: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '12M': 12 };
  const monthsToShow = rangeMonths[range] || 6;
  const chartData = data.slice(-monthsToShow);
  
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const currentMonthIndex = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const labels = chartData.map(d => {
    const p = d.month.split('-');
    const monthIdx = parseInt(p[1], 10) - 1;
    return months[monthIdx] || p[1];
  });
  const collected = chartData.map(d => d.collected);
  const expected = chartData.map(d => d.expected);

  const lastIdx = chartData.length - 1;
  const isCurrentMonthPartial = lastIdx >= 0 && (() => {
    const [y, m] = chartData[lastIdx].month.split('-').map(Number);
    return y === currentYear && m - 1 === currentMonthIndex;
  })();

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [range, data]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Revenue Trend</Text>
          {isCurrentMonthPartial && <Text style={styles.partialBadge}>In progress</Text>}
        </View>
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity key={r} style={[styles.pill, range === r && styles.pillActive]} onPress={() => onRangeChange(r)}>
              <Text style={[styles.pillText, range === r && styles.pillTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Animated.View style={[styles.chartContainer, { opacity: fadeAnim }]}>
        {chartData.length > 0 ? (
          <LineChart
            data={{
              labels,
              datasets: [
                { data: collected.length > 0 ? collected : [0], color: () => theme.colors.primary, strokeWidth: 2 },
                { data: expected.length > 0 ? expected : [0], color: () => theme.colors.textMuted, strokeWidth: 2, withDots: false },
              ],
              legend: ['Collected', 'Expected'],
            }}
            width={SCREEN_WIDTH - 64}
            height={170}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108, 60, 225, ${opacity})`,
              labelColor: () => theme.colors.textMuted,
              propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
              propsForBackgroundLines: { strokeDasharray: '5,5', stroke: theme.colors.borderLight },
            }}
            bezier
            style={styles.chart}
            formatYLabel={(v) => { const n = parseInt(v,10); return n >= 100000 ? `${(n/100000).toFixed(1)}L` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : v; }}
          />
        ) : (
          <View style={styles.empty}><Text style={styles.emptyText}>No revenue data yet</Text></View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadow.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  partialBadge: {
    fontSize: 10,
    fontFamily: theme.font.semiBold,
    color: theme.colors.warning,
    backgroundColor: theme.colors.warningSurface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  rangeRow: { flexDirection: 'row', gap: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  pillTextActive: { color: '#FFFFFF' },
  chartContainer: { marginLeft: -theme.spacing.md, marginTop: theme.spacing.xs },
  chart: { marginLeft: 0 },
  empty: { height: 170, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
