import { useState } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState } from '../../src/components';
import { api } from '../../src/services/api';
import type { Property } from '../../src/types';

export default function PropertiesList() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const { data: properties, isLoading, refetch } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data || r),
  });

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (properties || []).filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
      <Text style={styles.pageTitle}>Properties</Text>
      <TextInput style={styles.search} placeholder="Search properties..." value={search} onChangeText={setSearch} placeholderTextColor="#9ca3af" />

      {filtered.length === 0 ? (
        <EmptyState title="No properties found" message="Add a property to get started" />
      ) : (
        filtered.map((property) => (
          <TouchableOpacity key={property.id} onPress={() => router.push(`/(owner)/properties/${property.id}`)}>
            <Card style={styles.propertyCard}>
              <Text style={styles.propertyName}>{property.name}</Text>
              <Text style={styles.propertyAddress}>{property.city}, {property.state}</Text>
              <View style={styles.propertyStats}>
                <Stat label="Rooms" value={property.totalRooms} />
                <Stat label="Beds" value={property.totalBeds} />
                <Stat label="Occupied" value={property.occupiedBeds} color="#22c55e" />
                <Stat label="Vacant" value={property.vacantBeds} color={property.vacantBeds > 0 ? '#eab308' : '#6b7280'} />
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
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
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  propertyCard: { marginBottom: 12 },
  propertyName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  propertyAddress: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  propertyStats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 2 },
});
