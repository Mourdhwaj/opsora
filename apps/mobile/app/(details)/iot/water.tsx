import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Card, LoadingSkeleton, EmptyState } from '../../../src/components';
import { api } from '../../../src/services/api';

export default function WaterIoTScreen() {
  const router = useRouter();
  const { data: tanks, isLoading, refetch } = useQuery({
    queryKey: ['water-tanks'],
    queryFn: () => api.get('/water-tanks').then(r => r.data?.data || r.data || []),
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Water Tanks</Text>

      {(!tanks || tanks.length === 0) ? (
        <EmptyState title="No water tanks" message="Configure water tanks in your properties" />
      ) : (
        tanks.map((tank: any) => {
          const level = Math.round(tank.latestReading?.levelPercentage || tank.currentLevel || 0);
          const color = level < 20 ? '#ef4444' : level < 50 ? '#eab308' : '#22c55e';
          return (
            <TouchableOpacity key={tank.id} onPress={() => router.push(`/(details)/iot/water/${tank.id}`)}>
              <Card style={styles.tankCard}>
                <View style={styles.tankHeader}>
                  <Text style={styles.tankName}>{tank.name}</Text>
                  <Text style={[styles.tankLevel, { color }]}>{level}%</Text>
                </View>
                <View style={styles.tankMeta}>
                  <Text style={styles.tankType}>{tank.tankType} · {tank.capacityLiters}L capacity</Text>
                  {tank.location && <Text style={styles.tankLocation}>📍 {tank.location}</Text>}
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${level}%`, backgroundColor: color }]} />
                </View>
                {level < 20 && <Text style={styles.alertText}>⚠️ Low water level!</Text>}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  tankCard: { marginBottom: 12 },
  tankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tankName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  tankLevel: { fontSize: 22, fontWeight: '800' },
  tankMeta: { marginBottom: 10 },
  tankType: { fontSize: 13, color: '#6b7280' },
  tankLocation: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  progressTrack: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  alertText: { fontSize: 13, color: '#ef4444', fontWeight: '600', marginTop: 8 },
});
