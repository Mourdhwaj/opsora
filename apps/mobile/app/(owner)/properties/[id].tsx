import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card, LoadingSkeleton } from '../../../src/components';
import { api } from '../../../src/services/api';
import type { Floor, Room } from '../../../src/types';

export default function PropertyDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: property } = useQuery({
    queryKey: ['property', id],
    queryFn: () => api.get(`/properties/${id}`).then(r => r.data || r),
  });

  const { data: floors } = useQuery<Floor[]>({
    queryKey: ['floors', id],
    queryFn: () => api.get(`/properties/${id}/floors`).then(r => r.data || r),
  });

  const { data: rooms } = useQuery<Room[]>({
    queryKey: ['rooms', id],
    queryFn: () => api.get(`/properties/${id}/rooms`).then(r => r.data || r),
  });

  if (!property) return <LoadingSkeleton />;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.detailCard}>
        <Text style={styles.name}>{property.name}</Text>
        <Text style={styles.address}>{property.address}</Text>
        <View style={styles.infoRow}>
          <InfoItem label="Type" value={property.propertyType} />
          <InfoItem label="Floors" value={property.totalFloors} />
          <InfoItem label="Status" value={property.status} />
        </View>
      </Card>

      <Text style={styles.sectionTitle}>Floors</Text>
      {floors?.map((floor) => (
        <Card key={floor.id} style={styles.floorCard}>
          <Text style={styles.floorName}>Floor {floor.floorNumber}{floor.floorName ? ` - ${floor.floorName}` : ''}</Text>
          <View style={styles.floorStats}>
            <InfoItem label="Rooms" value={floor.totalRooms} />
            <InfoItem label="Beds" value={floor.totalBeds} />
            <InfoItem label="Occupied" value={floor.occupiedBeds} />
          </View>
        </Card>
      ))}

      <Text style={styles.sectionTitle}>Rooms</Text>
      {rooms?.map((room) => (
        <Card key={room.id} style={styles.roomCard}>
          <View style={styles.roomHeader}>
            <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
            <Text style={[styles.roomStatus, { color: room.status === 'available' ? '#22c55e' : '#6b7280' }]}>{room.status}</Text>
          </View>
          <View style={styles.roomStats}>
            <InfoItem label="Type" value={room.roomType} />
            <InfoItem label="Sharing" value={`${room.sharingType}`} />
            <InfoItem label="Occupied" value={`${room.occupiedBeds}/${room.totalBeds}`} />
            <InfoItem label="Rent" value={`₹${room.rentPerBed}`} />
          </View>
        </Card>
      ))}
    </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  detailCard: { marginBottom: 16 },
  name: { fontSize: 24, fontWeight: '800', color: '#111827' },
  address: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  infoItem: { alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#9ca3af' },
  infoValue: { fontSize: 16, fontWeight: '600', color: '#111827', marginTop: 2 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 8, marginBottom: 12 },
  floorCard: { marginBottom: 8 },
  floorName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  floorStats: { flexDirection: 'row', justifyContent: 'space-around' },
  roomCard: { marginBottom: 8 },
  roomHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomNumber: { fontSize: 16, fontWeight: '600' },
  roomStatus: { fontSize: 13, fontWeight: '500', textTransform: 'capitalize' },
  roomStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
