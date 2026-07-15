import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Card, LoadingSkeleton, EmptyState } from '../../../src/components';
import { api } from '../../../src/services/api';
import { formatCurrency } from '../../../src/lib/utils';

export default function ElectricityIoTScreen() {
  const router = useRouter();
  const { data: meters, isLoading, refetch } = useQuery({
    queryKey: ['electricity-meters'],
    queryFn: () => api.get('/electricity-meters').then(r => r.data?.data || r.data || []),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Electricity Meters</Text>

      {(!meters || meters.length === 0) ? (
        <EmptyState title="No electricity meters" message="Configure meters in your properties" />
      ) : (
        meters.map((meter: any) => {
          const reading = meter.latestReading;
          return (
            <Card key={meter.id} style={styles.meterCard}>
              <View style={styles.meterHeader}>
                <Text style={styles.meterNumber}>Meter #{meter.meterNumber}</Text>
                <Text style={styles.meterType}>{meter.meterType}</Text>
              </View>
              <View style={styles.meterStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{reading?.dailyKwh?.toFixed(1) || '0'}</Text>
                  <Text style={styles.statLabel}>Today (kWh)</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{reading?.powerKw?.toFixed(2) || '0'}</Text>
                  <Text style={styles.statLabel}>Current (kW)</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(reading?.estimatedCost || 0)}</Text>
                  <Text style={styles.statLabel}>Est. Cost</Text>
                </View>
              </View>
              <View style={styles.meterMeta}>
                <Text style={styles.metaText}>₹{meter.costPerUnit}/unit · Fixed: ₹{meter.fixedCharge}</Text>
                {reading?.timestamp && <Text style={styles.metaText}>Last updated: {new Date(reading.timestamp).toLocaleTimeString()}</Text>}
              </View>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  meterCard: { marginBottom: 12 },
  meterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  meterNumber: { fontSize: 16, fontWeight: '700', color: '#111827' },
  meterType: { fontSize: 13, color: '#6b7280', textTransform: 'capitalize' },
  meterStats: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  meterMeta: { marginTop: 8 },
  metaText: { fontSize: 12, color: '#9ca3af' },
});
