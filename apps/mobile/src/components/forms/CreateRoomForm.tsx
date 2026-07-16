import { theme } from "../../lib/theme";
import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button } from '..';
import { api } from '../../services/api';

interface CreateRoomFormProps {
  propertyId: string;
  floorId?: string;
  onClose: () => void;
}

export function CreateRoomForm({ propertyId, floorId, onClose }: CreateRoomFormProps) {
  const queryClient = useQueryClient();
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('single');
  const [sharingType, setSharingType] = useState('1');
  const [rentPerBed, setRentPerBed] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [totalBeds, setTotalBeds] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roomTypes = ['single', 'double', 'triple', 'dormitory'];
  const sharingTypes = ['1', '2', '3', '4', '6'];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/rooms', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create room');
    },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!roomNumber.trim()) e.roomNumber = 'Room number is required';
    if (!rentPerBed.trim()) e.rentPerBed = 'Rent per bed is required';
    if (!totalBeds.trim()) e.totalBeds = 'Total beds is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createMutation.mutate({
      propertyId,
      floorId,
      roomNumber: roomNumber.trim(),
      roomType,
      sharingType: parseInt(sharingType),
      rentPerBed: parseFloat(rentPerBed),
      depositAmount: depositAmount ? parseFloat(depositAmount) : undefined,
      totalBeds: parseInt(totalBeds),
    });
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Add Room</Text>

      <Input label="Room Number" value={roomNumber} onChangeText={setRoomNumber} placeholder="e.g., 101" error={errors.roomNumber} />

      <Text style={styles.label}>Room Type</Text>
      <View style={styles.typeRow}>
        {roomTypes.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, roomType === t && styles.typeChipActive]}
            onPress={() => setRoomType(t)}
          >
            <Text style={[styles.typeChipText, roomType === t && styles.typeChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Sharing Type</Text>
      <View style={styles.typeRow}>
        {sharingTypes.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.typeChip, sharingType === s && styles.typeChipActive]}
            onPress={() => setSharingType(s)}
          >
            <Text style={[styles.typeChipText, sharingType === s && styles.typeChipTextActive]}>{s} sharing</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input label="Total Beds" value={totalBeds} onChangeText={setTotalBeds} placeholder="Number of beds" keyboardType="numeric" error={errors.totalBeds} />
      <Input label="Rent per Bed (₹)" value={rentPerBed} onChangeText={setRentPerBed} placeholder="Monthly rent" keyboardType="numeric" error={errors.rentPerBed} />
      <Input label="Deposit Amount (₹)" value={depositAmount} onChangeText={setDepositAmount} placeholder="Security deposit" keyboardType="numeric" />

      <View style={styles.actions}>
        <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
        <Button title="Create" onPress={handleSubmit} loading={createMutation.isPending} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  typeChipActive: { backgroundColor: 'theme.colors.primary', borderColor: 'theme.colors.primary' },
  typeChipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  typeChipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
