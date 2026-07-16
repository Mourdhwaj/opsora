import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { MapPin, AlertTriangle } from 'lucide-react-native';
import { Card, LoadingSkeleton, EmptyState } from '../../../src/components';
import { api } from '../../../src/services/api';
import { theme } from '../../../src/lib/theme';

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
          const color = level < 20 ? theme.colors.danger : level < 50 ? theme.colors.warning : theme.colors.success;
          return (
            <TouchableOpacity key={tank.id} onPress={() => router.push(`/(details)/iot/water/${tank.id}`)}>
              <Card style={styles.tankCard}>
                <View style={styles.tankHeader}>
                  <Text style={styles.tankName}>{tank.name}</Text>
                  <Text style={[styles.tankLevel, { color }]}>{level}%</Text>
                </View>
                <View style={styles.tankMeta}>
                  <Text style={styles.tankType}>{tank.tankType} · {tank.capacityLiters}L capacity</Text>
                  {tank.location && (
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={theme.colors.textMuted} />
                      <Text style={styles.tankLocation}>{tank.location}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${level}%`, backgroundColor: color }]} />
                </View>
                {level < 20 && (
                  <View style={styles.alertRow}>
                    <AlertTriangle size={14} color={theme.colors.danger} />
                    <Text style={styles.alertText}>Low water level!</Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: theme.spacing.lg },
  pageTitle: { fontSize: 28, fontFamily: theme.font.extraBold, color: theme.colors.text, marginBottom: 16 },
  tankCard: { marginBottom: 12 },
  tankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tankName: { fontSize: 16, fontFamily: theme.font.semiBold, color: theme.colors.text },
  tankLevel: { fontSize: 16, fontFamily: theme.font.extraBold },
  tankMeta: { marginBottom: 8 },
  tankType: { fontSize: 13, fontFamily: theme.font.regular, color: theme.colors.textSecondary },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tankLocation: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textMuted },
  progressTrack: { height: 6, backgroundColor: theme.colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  alertText: { fontSize: 12, fontFamily: theme.font.medium, color: theme.colors.danger },
});
