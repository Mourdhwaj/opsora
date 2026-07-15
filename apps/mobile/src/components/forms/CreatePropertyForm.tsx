import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input, Button } from '..';
import { api } from '../../services/api';

interface CreatePropertyFormProps {
  onClose: () => void;
}

export function CreatePropertyForm({ onClose }: CreatePropertyFormProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [propertyType, setPropertyType] = useState('pg');
  const [totalFloors, setTotalFloors] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const propertyTypes = ['pg', 'hostel', 'apartment', 'co-living', 'other'];

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/properties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create property');
    },
  });

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!address.trim()) e.address = 'Address is required';
    if (!city.trim()) e.city = 'City is required';
    if (!state.trim()) e.state = 'State is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    createMutation.mutate({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      propertyType,
      totalFloors: totalFloors ? parseInt(totalFloors) : undefined,
      wifiSsid: wifiSsid.trim() || undefined,
      wifiPassword: wifiPassword.trim() || undefined,
    });
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Add Property</Text>

      <Input label="Property Name" value={name} onChangeText={setName} placeholder="e.g., Sunshine PG" error={errors.name} />
      <Input label="Address" value={address} onChangeText={setAddress} placeholder="Full address" error={errors.address} />
      <Input label="City" value={city} onChangeText={setCity} placeholder="e.g., Bangalore" error={errors.city} />
      <Input label="State" value={state} onChangeText={setState} placeholder="e.g., Karnataka" error={errors.state} />

      <Text style={styles.label}>Property Type</Text>
      <View style={styles.typeRow}>
        {propertyTypes.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.typeChip, propertyType === t && styles.typeChipActive]}
            onPress={() => setPropertyType(t)}
          >
            <Text style={[styles.typeChipText, propertyType === t && styles.typeChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input label="Total Floors" value={totalFloors} onChangeText={setTotalFloors} placeholder="Number of floors" keyboardType="numeric" />
      <Input label="WiFi SSID (optional)" value={wifiSsid} onChangeText={setWifiSsid} placeholder="WiFi network name" />
      <Input label="WiFi Password (optional)" value={wifiPassword} onChangeText={setWifiPassword} placeholder="WiFi password" />

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
  typeChipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  typeChipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  typeChipTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
});
