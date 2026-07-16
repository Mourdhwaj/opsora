import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BedDouble } from 'lucide-react-native';
import { Card, LoadingSkeleton, Button, BottomSheet } from '../../../src/components';
import { CreateRoomForm } from '../../../src/components/forms/CreateRoomForm';
import { api } from '../../../src/services/api';
import { formatCurrency } from '../../../src/lib/utils';
import { theme } from '../../../src/lib/theme';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showAddRoom, setShowAddRoom] = useState(false);

  const { data: property, isLoading, refetch } = useQuery({
    queryKey: ['property', id],
    queryFn: () => api.get(`/properties/${id}`).then(r => r.data || r),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Cannot delete property with active tenants');
    },
  });

  function handleDelete() {
    Alert.alert(
      'Delete Property',
      'Are you sure? This cannot be undone. Properties with active tenants cannot be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
      ]
    );
  }

  if (isLoading) return <LoadingSkeleton />;

  const floors = property?.floors || [];
  const rooms = property?.rooms || [];
  const totalBeds = rooms.reduce((sum: number, r: any) => sum + (r.totalBeds || 0), 0);
  const occupiedBeds = rooms.reduce((sum: number, r: any) => sum + (r.occupiedBeds || 0), 0);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Card style={styles.detailCard}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{property?.name}</Text>
              <Text style={styles.address}>{property?.address}, {property?.city}, {property?.state}</Text>
            </View>
            <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <InfoItem label="Type" value={property?.propertyType} />
            <InfoItem label="Floors" value={property?.totalFloors} />
            <InfoItem label="Status" value={property?.status} />
          </View>
          {property?.wifiSsid && (
            <View style={styles.wifiSection}>
              <Text style={styles.wifiLabel}>📶 WiFi: {property.wifiSsid}</Text>
              {property.wifiPassword && <Text style={styles.wifiPass}>Password: {property.wifiPassword}</Text>}
            </View>
          )}
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rooms</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/(details)/rooms', params: { propertyId: id as string } })}
              style={styles.viewLayoutBtn}
            >
              <BedDouble size={14} color={theme.colors.textSecondary} /><Text style={styles.viewLayoutBtnText}> Layout{totalBeds > 0 ? ' ' : ''}</Text>
              {totalBeds > 0 && (
                <Text style={[styles.occupancyBadge, { color: getOccupancyColor(occupiedBeds, totalBeds), backgroundColor: getOccupancyBg(occupiedBeds, totalBeds) }]}>
                  {occupiedBeds}/{totalBeds}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowAddRoom(true)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>+ Add Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {rooms.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No rooms yet. Add a room to get started.</Text>
          </Card>
        ) : (
          rooms.map((room: any) => (
            <Card key={room.id} style={styles.roomCard}>
              <View style={styles.roomHeader}>
                <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
                <Text style={[styles.roomStatus, {
                  color: room.status === 'available' ? '#22c55e' : room.status === 'occupied' ? '#3b82f6' : '#6b7280'
                }]}>{room.status}</Text>
              </View>
              <View style={styles.roomInfo}>
                <InfoItem label="Type" value={room.roomType} />
                <InfoItem label="Sharing" value={`${room.sharingType}-share`} />
                <InfoItem label="Beds" value={`${room.occupiedBeds || 0}/${room.totalBeds}`} />
                <InfoItem label="Rent" value={formatCurrency(room.rentPerBed)} />
              </View>
            </Card>
          ))
        )}

        <Text style={styles.sectionTitle}>Floors</Text>
        {floors.map((floor: any) => (
          <Card key={floor.id} style={styles.floorCard}>
            <Text style={styles.floorName}>Floor {floor.floorNumber}{floor.floorName ? ` - ${floor.floorName}` : ''}</Text>
            <View style={styles.floorStats}>
              <InfoItem label="Rooms" value={floor.totalRooms} />
              <InfoItem label="Beds" value={floor.totalBeds} />
              <InfoItem label="Occupied" value={floor.occupiedBeds} />
            </View>
          </Card>
        ))}
      </ScrollView>

      <BottomSheet visible={showAddRoom} onClose={() => setShowAddRoom(false)} height={650}>
        <CreateRoomForm propertyId={id as string} onClose={() => setShowAddRoom(false)} />
      </BottomSheet>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function getOccupancyColor(occupied: number, total: number): string {
  if (total === 0) return '#6b7280';
  const pct = (occupied / total) * 100;
  if (pct >= 90) return '#dc2626';
  if (pct >= 70) return '#d97706';
  return '#16a34a';
}

function getOccupancyBg(occupied: number, total: number): string {
  if (total === 0) return '#f3f4f6';
  const pct = (occupied / total) * 100;
  if (pct >= 90) return '#fee2e2';
  if (pct >= 70) return '#fef3c7';
  return '#dcfce7';
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16 },
  detailCard: { marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  name: { fontSize: 22, fontWeight: '800', color: '#111827' },
  address: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  deleteBtn: { padding: 8 },
  deleteIcon: { fontSize: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#9ca3af' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 2, textTransform: 'capitalize' },
  wifiSection: { marginTop: 12, padding: 10, backgroundColor: '#f0f9ff', borderRadius: 8 },
  wifiLabel: { fontSize: 13, color: '#0369a1', fontWeight: '500' },
  wifiPass: { fontSize: 13, color: '#0369a1', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  viewLayoutBtn: { backgroundColor: '#f0f9ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd' },
  viewLayoutBtnText: { color: '#0369a1', fontSize: 13, fontWeight: '600' },
  occupancyBadge: { fontSize: 12, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  addBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  emptyCard: { alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  roomCard: { marginBottom: 8 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNumber: { fontSize: 16, fontWeight: '600', color: '#111827' },
  roomStatus: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  roomInfo: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  floorCard: { marginBottom: 8 },
  floorName: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#111827' },
  floorStats: { flexDirection: 'row', justifyContent: 'space-around' },
});
