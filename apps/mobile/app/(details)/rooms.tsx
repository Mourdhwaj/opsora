import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Card, LoadingSkeleton, EmptyState, ErrorState, SearchBar, FilterBar, BottomSheet } from '../../src/components';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import type { AllocationRoom } from '../../src/types';

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Vacant', value: 'vacant' },
  { label: 'Partial', value: 'partial' },
  { label: 'Full', value: 'full' },
];

export default function RoomsScreen() {
  const { propertyId: initialPropertyId } = useLocalSearchParams<{ propertyId?: string }>();
  const [selectedProperty, setSelectedProperty] = useState<string>(initialPropertyId || '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<AllocationRoom | null>(null);

  const { data: properties } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['properties-list'],
    queryFn: () => api.get('/properties', { params: { limit: 50 } }).then((r: any) => r.data?.data || []),
    staleTime: 60_000,
  });

  const { data: rooms, isLoading, error, refetch } = useQuery<AllocationRoom[]>({
    queryKey: ['allocation-rooms', selectedProperty],
    queryFn: () => {
      const params: any = {};
      if (selectedProperty) params.propertyId = selectedProperty;
      return api.get('/allocation/rooms', { params }).then((r: any) => r.data || []);
    },
    enabled: !!selectedProperty,
  });

  useEffect(() => {
    if (!selectedProperty && initialPropertyId) {
      setSelectedProperty(initialPropertyId);
    }
  }, [initialPropertyId]);

  const filtered = useMemo(() => (rooms || []).filter(r => {
    const matchSearch = r.roomNumber?.toLowerCase().includes(search.toLowerCase());
    let matchStatus = true;
    if (statusFilter === 'vacant') matchStatus = r.vacantBeds === r.totalBeds;
    else if (statusFilter === 'full') matchStatus = r.vacantBeds === 0;
    else if (statusFilter === 'partial') matchStatus = r.vacantBeds > 0 && r.vacantBeds < r.totalBeds;
    return matchSearch && matchStatus;
  }), [rooms, search, statusFilter]);

  const floors = useMemo(() => {
    const acc: Record<number, AllocationRoom[]> = {};
    for (const room of filtered) {
      const fn = room.floorNumber || 0;
      if (!acc[fn]) acc[fn] = [];
      acc[fn].push(room);
    }
    return acc;
  }, [filtered]);

  const floorKeys = useMemo(() => Object.keys(floors).sort((a, b) => Number(a) - Number(b)), [floors]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load rooms" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      {/* Property pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyRow}>
        {(properties || []).map((p: any) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.propertyPill, selectedProperty === p.id && styles.propertyPillActive]}
            onPress={() => setSelectedProperty(p.id)}
            activeOpacity={0.6}
          >
            <Text style={[styles.propertyPillText, selectedProperty === p.id && styles.propertyPillTextActive]}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search rooms..." />
      <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />

      {filtered.length === 0 ? (
        <EmptyState title="No rooms found" message="Add rooms to your property first" />
      ) : (
        <FlatList
          data={floorKeys}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyExtractor={(fn) => `floor-${fn}`}
          renderItem={({ item: fn }) => (
            <View style={styles.floorSection}>
              <Text style={styles.floorHeader}>Floor {fn}</Text>
              <View style={styles.roomGrid}>
                {floors[Number(fn)].map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.roomCard}
                    onPress={() => setSelectedRoom(room)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.roomCardHeader}>
                      <Text style={styles.roomNumber}>{room.roomNumber}</Text>
                      <View style={[styles.occupancyBadge, {
                        backgroundColor: room.vacantBeds === room.totalBeds ? '#dcfce7'
                          : room.vacantBeds === 0 ? '#fee2e2' : '#fef3c7'
                      }]}>
                        <Text style={[styles.occupancyText, {
                          color: room.vacantBeds === room.totalBeds ? '#16a34a'
                            : room.vacantBeds === 0 ? '#dc2626' : '#d97706'
                        }]}>{room.totalBeds - room.vacantBeds}/{room.totalBeds}</Text>
                      </View>
                    </View>
                    <Text style={styles.roomType}>{room.roomType} · {room.sharingType}-share</Text>
                    <Text style={styles.roomRent}>₹{room.rentPerBed}/mo</Text>
                    {/* Bed dots */}
                    <View style={styles.bedDots}>
                      {room.beds.map((bed) => (
                        <View
                          key={bed.id}
                          style={[styles.bedDot, {
                            backgroundColor: bed.status === 'occupied' ? theme.colors.primary
                              : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                          }]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      )}

      {/* Room detail bottom sheet */}
      <BottomSheet visible={!!selectedRoom} onClose={() => setSelectedRoom(null)} title={`Room ${selectedRoom?.roomNumber}`}>
        {selectedRoom && (
          <View style={styles.sheetContent}>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetLabel}>Type</Text>
              <Text style={styles.sheetValue}>{selectedRoom.roomType} · {selectedRoom.sharingType}-share</Text>
            </View>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetLabel}>Rent</Text>
              <Text style={styles.sheetValue}>₹{selectedRoom.rentPerBed}/month</Text>
            </View>
            <View style={styles.sheetInfo}>
              <Text style={styles.sheetLabel}>Gender</Text>
              <Text style={styles.sheetValue}>{selectedRoom.gender || 'Mixed'}</Text>
            </View>
            <Text style={styles.sheetSectionTitle}>Beds</Text>
            {selectedRoom.beds.map((bed) => (
              <View key={bed.id} style={styles.bedRow}>
                <View style={[styles.bedDotLarge, {
                  backgroundColor: bed.status === 'occupied' ? theme.colors.primary
                    : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.bedNumber}>Bed {bed.bedNumber}</Text>
                  {bed.occupant ? (
                    <Text style={styles.bedOccupant}>{bed.occupant.fullName} · {bed.occupant.gender}</Text>
                  ) : (
                    <Text style={styles.bedVacant}>Vacant</Text>
                  )}
                </View>
                <Text style={[styles.bedStatus, {
                  color: bed.status === 'occupied' ? theme.colors.primary
                    : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                }]}>{bed.status}</Text>
              </View>
            ))}
          </View>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  propertyRow: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm, gap: 8 },
  propertyPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border },
  propertyPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  propertyPillText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  propertyPillTextActive: { color: '#fff' },
  floorSection: { marginBottom: 20 },
  floorHeader: { fontSize: 15, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 10, paddingHorizontal: 4 },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.xl, padding: 12, width: '47%', ...theme.shadow.sm },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomNumber: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text },
  occupancyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  occupancyText: { fontSize: 12, fontFamily: theme.font.semiBold },
  roomType: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginBottom: 2 },
  roomRent: { fontSize: 12, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 8 },
  bedDots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  bedDot: { width: 10, height: 10, borderRadius: 5 },
  sheetContent: { paddingTop: 8 },
  sheetInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight },
  sheetLabel: { fontSize: 14, fontFamily: theme.font.regular, color: theme.colors.textSecondary },
  sheetValue: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, textTransform: 'capitalize' },
  sheetSectionTitle: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.text, marginTop: 16, marginBottom: 10 },
  bedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, gap: 10 },
  bedDotLarge: { width: 12, height: 12, borderRadius: 6 },
  bedNumber: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text },
  bedOccupant: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginTop: 2 },
  bedVacant: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.success, marginTop: 2 },
  bedStatus: { fontSize: 12, fontFamily: theme.font.semiBold, textTransform: 'capitalize' },
});
