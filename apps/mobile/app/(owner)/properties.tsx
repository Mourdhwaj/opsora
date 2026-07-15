import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, SearchBar, BottomSheet } from '../../src/components';
import { CreatePropertyForm } from '../../src/components/forms/CreatePropertyForm';
import { api } from '../../src/services/api';
import type { Property } from '../../src/types';

export default function PropertiesList() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();
  const { data: properties, isLoading, refetch } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then(r => r.data?.data || r.data || []),
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (properties || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        <Text style={styles.pageTitle}>Properties</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search by name or city..." />

        {filtered.length === 0 ? (
          <EmptyState title="No properties found" message="Add a property to get started" />
        ) : (
          filtered.map((property) => (
            <TouchableOpacity key={property.id} onPress={() => router.push(`/(owner)/properties/${property.id}`)}>
              <Card style={styles.propertyCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.propertyName}>{property.name}</Text>
                  <Text style={[styles.statusBadge, { backgroundColor: property.status === 'active' ? '#dcfce7' : '#f3f4f6', color: property.status === 'active' ? '#16a34a' : '#6b7280' }]}>
                    {property.status}
                  </Text>
                </View>
                <Text style={styles.propertyAddress}>{property.address}, {property.city}, {property.state}</Text>
                <View style={styles.propertyStats}>
                  <Stat label="Rooms" value={property.totalRooms} />
                  <Stat label="Beds" value={property.totalBeds} />
                  <Stat label="Occupied" value={property.occupiedBeds} color="#22c55e" />
                  <Stat label="Vacant" value={property.vacantBeds} color={property.vacantBeds > 0 ? '#eab308' : '#6b7280'} />
                </View>
                {property.totalBeds > 0 && (
                  <View style={styles.occupancyBar}>
                    <View style={[styles.occupancyFill, { width: `${Math.round((property.occupiedBeds / property.totalBeds) * 100)}%` }]} />
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      <BottomSheet visible={showCreate} onClose={() => setShowCreate(false)} height={700}>
        <CreatePropertyForm onClose={() => setShowCreate(false)} />
      </BottomSheet>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View>
      <Text style={[styles.statValue, color ? { color } : undefined]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 4 },
  propertyCard: { marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  propertyName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  statusBadge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  propertyAddress: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  propertyStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
  occupancyBar: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  occupancyFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabIcon: { fontSize: 28, color: '#fff', marginTop: -2 },
});
