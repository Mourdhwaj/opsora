import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { theme } from '../lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RANGES = ['1M', '3M', '6M'];

interface RevenueChartProps { data: Array<{ month: string; collected: number; expected: number }>; range: string; onRangeChange: (r: string) => void; }

export function RevenueChart({ data, range, onRangeChange }: RevenueChartProps) {
  const chartData = data.slice(-6);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const labels = chartData.map(d => { const p = d.month.split('-'); return months[parseInt(p[1],10)-1] || p[1]; });
  const collected = chartData.map(d => d.collected);
  const expected = chartData.map(d => d.expected);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Revenue Trend</Text>
        <View style={styles.rangeRow}>
          {RANGES.map(r => (
            <TouchableOpacity key={r} style={[styles.pill, range === r && styles.pillActive]} onPress={() => onRangeChange(r)}>
              <Text style={[styles.pillText, range === r && styles.pillTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
          height={200}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginHorizontal: theme.spacing.lg, marginBottom: theme.spacing.md, ...theme.shadow.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  rangeRow: { flexDirection: 'row', gap: 4 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: theme.borderRadius.full, backgroundColor: theme.colors.borderLight },
  pillActive: { backgroundColor: theme.colors.primary },
  pillText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary },
  pillTextActive: { color: '#FFFFFF' },
  chart: { marginLeft: -theme.spacing.md, marginTop: theme.spacing.sm },
  empty: { height: 200, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: theme.colors.textMuted },
});
