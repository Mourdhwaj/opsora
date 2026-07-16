import { theme } from "../../lib/theme";
import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Input, Button } from '..';
import { api } from '../../services/api';

interface ResidentCheckinFormProps {
  onClose: () => void;
}

export function ResidentCheckinForm({ onClose }: ResidentCheckinFormProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [bedId, setBedId] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [depositPaid, setDepositPaid] = useState('');
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: properties } = useQuery({
    queryKey: ['properties-list'],
    queryFn: () => api.get('/properties', { params: { limit: 100 } }).then((r: any) => r.data?.data || []),
  });

  const { data: rooms } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => api.get('/rooms', { params: { propertyId, limit: 200 } }).then((r: any) => r.data?.data || []),
    enabled: !!propertyId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/residents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      onClose();
    },
    onError: (err: any) => {
      Alert.alert('Error', err.response?.data?.message || 'Failed to check in resident');
    },
  });

  const steps = ['Personal', 'Room', 'Financial', 'Review'];

  function validateStep() {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!fullName.trim()) e.fullName = 'Name is required';
      if (!phone.trim()) e.phone = 'Phone is required';
      if (!gender) e.gender = 'Gender is required';
    } else if (step === 1) {
      if (!propertyId) e.propertyId = 'Select a property';
      if (!roomId) e.roomId = 'Select a room';
      if (!bedId) e.bedId = 'Select a bed';
    } else if (step === 2) {
      if (!rentAmount.trim()) e.rentAmount = 'Rent is required';
      if (!moveInDate.trim()) e.moveInDate = 'Move-in date is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (validateStep()) setStep(s => s + 1);
  }

  function handleSubmit() {
    createMutation.mutate({
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gender,
      occupation: occupation.trim() || undefined,
      emergencyName: emergencyName.trim() || undefined,
      emergencyPhone: emergencyPhone.trim() || undefined,
      propertyId,
      roomId,
      bedId,
      rentAmount: parseFloat(rentAmount),
      depositPaid: depositPaid ? parseFloat(depositPaid) : 0,
      moveInDate,
    });
  }

  const selectedProperty = properties?.find((p: any) => p.id === propertyId);
  const availableRooms = (rooms || []).filter((r: any) => r.status === 'available' || r.vacantBeds > 0);
  const selectedRoom = availableRooms.find((r: any) => r.id === roomId);
  const availableBeds = selectedRoom?.beds?.filter((b: any) => b.status === 'vacant') || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Check-in Resident</Text>

      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <View key={s} style={[styles.step, i === step && styles.stepActive, i < step && styles.stepDone]}>
            <Text style={[styles.stepText, (i === step || i < step) && styles.stepTextActive]}>{i < step ? '✓' : i + 1}</Text>
            <Text style={[styles.stepLabel, i === step && styles.stepLabelActive]}>{s}</Text>
          </View>
        ))}
      </View>

      {step === 0 && (
        <View>
          <Input label="Full Name *" value={fullName} onChangeText={setFullName} placeholder="Resident's full name" error={errors.fullName} />
          <Input label="Phone *" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" error={errors.phone} />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="Email (optional)" keyboardType="email-address" />
          <Text style={styles.label}>Gender *</Text>
          <View style={styles.typeRow}>
            {['male', 'female', 'other'].map(g => (
              <TouchableOpacity key={g} style={[styles.typeChip, gender === g && styles.typeChipActive]} onPress={() => setGender(g)}>
                <Text style={[styles.typeChipText, gender === g && styles.typeChipTextActive]}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender && <Text style={styles.error}>{errors.gender}</Text>}
          <Input label="Occupation" value={occupation} onChangeText={setOccupation} placeholder="Occupation (optional)" />
          <Input label="Emergency Contact Name" value={emergencyName} onChangeText={setEmergencyName} placeholder="Name (optional)" />
          <Input label="Emergency Contact Phone" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="Phone (optional)" keyboardType="phone-pad" />
        </View>
      )}

      {step === 1 && (
        <View>
          <Text style={styles.label}>Property *</Text>
          <View style={styles.typeRow}>
            {(properties || []).map((p: any) => (
              <TouchableOpacity key={p.id} style={[styles.typeChip, propertyId === p.id && styles.typeChipActive]} onPress={() => { setPropertyId(p.id); setRoomId(''); setBedId(''); }}>
                <Text style={[styles.typeChipText, propertyId === p.id && styles.typeChipTextActive]} numberOfLines={1}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.propertyId && <Text style={styles.error}>{errors.propertyId}</Text>}

          {propertyId && (
            <>
              <Text style={styles.label}>Room *</Text>
              {availableRooms.length === 0 ? (
                <Text style={styles.emptyText}>No available rooms</Text>
              ) : (
                <View style={styles.typeRow}>
                  {availableRooms.map((r: any) => (
                    <TouchableOpacity key={r.id} style={[styles.typeChip, roomId === r.id && styles.typeChipActive]} onPress={() => { setRoomId(r.id); setBedId(''); }}>
                      <Text style={[styles.typeChipText, roomId === r.id && styles.typeChipTextActive]}>Room {r.roomNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.roomId && <Text style={styles.error}>{errors.roomId}</Text>}
            </>
          )}

          {roomId && (
            <>
              <Text style={styles.label}>Bed *</Text>
              {availableBeds.length === 0 ? (
                <Text style={styles.emptyText}>No available beds in this room</Text>
              ) : (
                <View style={styles.typeRow}>
                  {availableBeds.map((b: any) => (
                    <TouchableOpacity key={b.id} style={[styles.typeChip, bedId === b.id && styles.typeChipActive]} onPress={() => { setBedId(b.id); setRentAmount(String(b.rentAmount || selectedRoom?.rentPerBed || '')); }}>
                      <Text style={[styles.typeChipText, bedId === b.id && styles.typeChipTextActive]}>Bed {b.bedNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {errors.bedId && <Text style={styles.error}>{errors.bedId}</Text>}
            </>
          )}
        </View>
      )}

      {step === 2 && (
        <View>
          <Input label="Move-in Date *" value={moveInDate} onChangeText={setMoveInDate} placeholder="YYYY-MM-DD" error={errors.moveInDate} />
          <Input label="Rent Amount (₹) *" value={rentAmount} onChangeText={setRentAmount} placeholder="Monthly rent" keyboardType="numeric" error={errors.rentAmount} />
          <Input label="Deposit Paid (₹)" value={depositPaid} onChangeText={setDepositPaid} placeholder="Security deposit" keyboardType="numeric" />
        </View>
      )}

      {step === 3 && (
        <View>
          <Text style={styles.reviewTitle}>Review Details</Text>
          <ReviewRow label="Name" value={fullName} />
          <ReviewRow label="Phone" value={phone} />
          <ReviewRow label="Email" value={email || 'N/A'} />
          <ReviewRow label="Gender" value={gender} />
          <ReviewRow label="Property" value={selectedProperty?.name || ''} />
          <ReviewRow label="Room" value={selectedRoom?.roomNumber || ''} />
          <ReviewRow label="Bed" value={availableBeds.find((b: any) => b.id === bedId)?.bedNumber || ''} />
          <ReviewRow label="Rent" value={rentAmount ? `₹${rentAmount}/month` : ''} />
          <ReviewRow label="Deposit" value={depositPaid ? `₹${depositPaid}` : '₹0'} />
          <ReviewRow label="Move-in" value={moveInDate} />
        </View>
      )}

      <View style={styles.actions}>
        {step > 0 && <Button title="Back" variant="outline" onPress={() => setStep(s => s - 1)} style={{ flex: 1 }} />}
        {step < 3 ? (
          <Button title="Next" onPress={handleNext} style={{ flex: 1 }} />
        ) : (
          <Button title="Check In" onPress={handleSubmit} loading={createMutation.isPending} style={{ flex: 1 }} />
        )}
      </View>
    </ScrollView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 16 },
  stepRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  step: { alignItems: 'center', flex: 1 },
  stepActive: {},
  stepDone: {},
  stepText: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', textAlign: 'center', lineHeight: 32, fontSize: 14, fontWeight: '600', color: '#6b7280' },
  stepTextActive: { backgroundColor: 'theme.colors.primary', color: '#fff' },
  stepLabel: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  stepLabelActive: { color: 'theme.colors.primary', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  typeChipActive: { backgroundColor: 'theme.colors.primary', borderColor: 'theme.colors.primary' },
  typeChipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  typeChipTextActive: { color: '#fff' },
  error: { color: '#ef4444', fontSize: 12, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#9ca3af', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  reviewTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  reviewLabel: { fontSize: 14, color: '#6b7280' },
  reviewValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
