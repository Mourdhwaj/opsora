import { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, StatusBar, Animated, Modal, Pressable, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { User, Phone, ArrowLeft, ChevronDown, X } from 'lucide-react-native';
import { LoadingSkeleton, EmptyState, ErrorState, SearchBar, FilterBar } from '../../src/components';
import { api } from '../../src/services/api';
import { theme } from '../../src/lib/theme';
import type { AllocationRoom, AllocationBed } from '../../src/types';
import { useResponsive } from '../../src/lib/useResponsive';

const SCREEN_WIDTH = Dimensions.get('window').width;

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Vacant', value: 'vacant' },
  { label: 'Partial', value: 'partial' },
  { label: 'Full', value: 'full' },
];

const OCCUPANCY_COLORS = {
  vacant: '#22C55E',
  single: '#F59E0B',
  partial: '#3B82F6',
  full: '#EF4444',
};

const OCCUPANCY_LABELS = {
  vacant: 'Vacant',
  single: 'Single Occupied',
  partial: 'Partially Occupied',
  full: 'Full',
};

// ── Helpers: Calculate occupancy from ACTUAL bed data ────────────────────────
function getBedOccupancy(room: AllocationRoom) {
  const beds = room.beds || [];
  const total = beds.length || room.totalBeds || 0;
  const occupied = beds.filter(b => b.status === 'occupied').length;
  const vacant = beds.filter(b => b.status === 'vacant').length;
  const maintenance = beds.filter(b => b.status === 'maintenance').length;
  return { total, occupied, vacant, maintenance };
}

function getOccupancyStatus(room: AllocationRoom): 'vacant' | 'single' | 'partial' | 'full' {
  const { occupied, total } = getBedOccupancy(room);
  if (occupied === 0) return 'vacant';
  if (occupied === 1) return 'single';
  if (occupied < total) return 'partial';
  return 'full';
}

function getOccupancyLabel(room: AllocationRoom): string {
  const { occupied, total } = getBedOccupancy(room);
  return `${occupied}/${total} beds`;
}

function getBedDisplayNumber(bed: AllocationBed, index: number): string {
  if (bed.bedNumber && bed.bedNumber !== 'undefined' && bed.bedNumber !== 'NaN') {
    return bed.bedNumber;
  }
  return String(index + 1);
}

// ── Floor Dropdown ──────────────────────────────────────────────────────────
function FloorDropdown({ selectedFloor, floors, onSelect }: { selectedFloor: number | null; floors: number[]; onSelect: (f: number | null) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.7}>
        <Text style={styles.dropdownText}>
          {selectedFloor !== null ? `Floor ${selectedFloor}` : 'All Floors'}
        </Text>
        <ChevronDown size={16} color={theme.colors.textSecondary} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          <TouchableOpacity
            style={[styles.dropdownItem, selectedFloor === null && styles.dropdownItemActive]}
            onPress={() => { onSelect(null); setOpen(false); }}
          >
            <Text style={[styles.dropdownItemText, selectedFloor === null && styles.dropdownItemTextActive]}>All Floors</Text>
          </TouchableOpacity>
          {floors.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.dropdownItem, selectedFloor === f && styles.dropdownItemActive]}
              onPress={() => { onSelect(f); setOpen(false); }}
            >
              <Text style={[styles.dropdownItemText, selectedFloor === f && styles.dropdownItemTextActive]}>Floor {f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Room Card (Bus/Flight Style) ────────────────────────────────────────────
function RoomCard({ room, onPress, index }: { room: AllocationRoom; onPress: () => void; index: number }) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const occupancyStatus = getOccupancyStatus(room);
  const occupancyColor = OCCUPANCY_COLORS[occupancyStatus];
  const { occupied, total } = getBedOccupancy(room);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.95, damping: 10, stiffness: 500, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, damping: 10, stiffness: 500, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      <Animated.View style={[styles.roomCard, { opacity, transform: [{ scale: pressScale }] }]}>
        <View style={[styles.roomCardTopBar, { backgroundColor: occupancyColor }]} />
        
        <View style={styles.roomCardContent}>
          <View style={styles.roomCardHeader}>
            <Text style={styles.roomNumber}>{room.roomNumber}</Text>
            <View style={[styles.occupancyBadge, { backgroundColor: occupancyColor + '20' }]}>
              <Text style={[styles.occupancyText, { color: occupancyColor }]}>{occupied}/{total}</Text>
            </View>
          </View>
          
          <Text style={styles.roomType}>{room.roomType} · {room.sharingType}-share</Text>
          <Text style={styles.roomRent}>₹{room.rentPerBed.toLocaleString('en-IN')}/mo</Text>
          
          <View style={styles.bedDotsContainer}>
            {(room.beds || []).map((bed, i) => (
              <View
                key={bed.id || i}
                style={[styles.bedDot, {
                  backgroundColor: bed.status === 'occupied' ? theme.colors.primary
                    : bed.status === 'maintenance' ? '#9ca3af' : '#22c55e'
                }]}
              />
            ))}
          </View>
          
          <View style={[styles.roomCardStatus, { backgroundColor: occupancyColor + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: occupancyColor }]} />
            <Text style={[styles.roomCardStatusText, { color: occupancyColor }]}>
              {OCCUPANCY_LABELS[occupancyStatus]}
            </Text>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Room Detail Modal ────────────────────────────────────────────────────────
function RoomDetailModal({ visible, room, onClose, onAddTenant }: { visible: boolean; room: AllocationRoom | null; onClose: () => void; onAddTenant: () => void }) {
  const router = useRouter();
  
  if (!room) return null;
  
  const occupancyStatus = getOccupancyStatus(room);
  const occupancyColor = OCCUPANCY_COLORS[occupancyStatus];
  const { occupied, total } = getBedOccupancy(room);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Room {room.roomNumber}</Text>
              <Text style={styles.modalSubtitle}>{room.roomType} · {room.sharingType}-share · {room.gender || 'Mixed'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSummary}>
            <View style={[styles.modalSummaryDot, { backgroundColor: occupancyColor }]} />
            <Text style={styles.modalSummaryText}>
              {occupied} of {total} beds occupied
            </Text>
            <View style={[styles.modalSummaryBadge, { backgroundColor: occupancyColor + '20' }]}>
              <Text style={[styles.modalSummaryBadgeText, { color: occupancyColor }]}>{OCCUPANCY_LABELS[occupancyStatus]}</Text>
            </View>
          </View>

          <View style={styles.modalRentRow}>
            <Text style={styles.modalRentLabel}>Rent per bed</Text>
            <Text style={styles.modalRentValue}>₹{room.rentPerBed.toLocaleString('en-IN')}/month</Text>
          </View>

          <Text style={styles.modalSectionTitle}>Bed Layout</Text>
          <ScrollView style={styles.bedGridScroll} contentContainerStyle={styles.bedGrid}>
            {(room.beds || []).map((bed, i) => {
              const isOccupied = bed.status === 'occupied';
              const isMaintenance = bed.status === 'maintenance';
              const bedColor = isOccupied ? theme.colors.primary : isMaintenance ? '#9ca3af' : '#22c55e';
              const displayNumber = getBedDisplayNumber(bed, i);
              
              return (
                <TouchableOpacity
                  key={bed.id || i}
                  style={[styles.bedGridItem, { borderColor: bedColor + '40' }]}
                  activeOpacity={bed.occupant ? 0.7 : 1}
                  onPress={() => {
                    if (bed.occupant?.id) {
                      router.push(`/(details)/residents/${bed.occupant.id}`);
                    }
                  }}
                >
                  <View style={[styles.bedGridDot, { backgroundColor: bedColor }]} />
                  <Text style={styles.bedGridNumber}>Bed {displayNumber}</Text>
                  
                  {bed.occupant ? (
                    <View style={styles.bedGridOccupant}>
                      <View style={styles.bedGridOccupantRow}>
                        <User size={12} color={theme.colors.textSecondary} />
                        <Text style={styles.bedGridOccupantName} numberOfLines={1}>{bed.occupant.fullName || 'Unknown'}</Text>
                      </View>
                      {bed.occupant.phone ? (
                        <View style={styles.bedGridOccupantRow}>
                          <Phone size={10} color={theme.colors.textMuted} />
                          <Text style={styles.bedGridOccupantPhone} numberOfLines={1}>{bed.occupant.phone}</Text>
                        </View>
                      ) : null}
                      {bed.occupant.gender ? (
                        <Text style={[styles.bedGridOccupantGender, { color: bed.occupant.gender === 'male' ? '#3B82F6' : bed.occupant.gender === 'female' ? '#EC4899' : '#8B5CF6' }]}>
                          {bed.occupant.gender}
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.bedGridVacant}>
                      <Text style={styles.bedGridVacantText}>Vacant</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalActionPrimary} onPress={onAddTenant}>
              <Text style={styles.modalActionPrimaryText}>Add Tenant</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalActionSecondary} onPress={onClose}>
              <Text style={styles.modalActionSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function RoomsScreen() {
  const router = useRouter();
  const { propertyId: initialPropertyId } = useLocalSearchParams<{ propertyId?: string }>();
  const [selectedProperty, setSelectedProperty] = useState<string>(initialPropertyId || '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<AllocationRoom | null>(null);
  const { width } = useResponsive();
  const hp = Math.max(16, Math.round(width * 0.04));

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

  const allFloors = useMemo(() => {
    const floorSet = new Set<number>();
    (rooms || []).forEach(r => floorSet.add(r.floorNumber || 0));
    return Array.from(floorSet).sort((a, b) => a - b);
  }, [rooms]);

  const filtered = useMemo(() => (rooms || []).filter(r => {
    const matchSearch = r.roomNumber?.toLowerCase().includes(search.toLowerCase());
    let matchStatus = true;
    const { occupied, total } = getBedOccupancy(r);
    if (statusFilter === 'vacant') matchStatus = occupied === 0;
    else if (statusFilter === 'full') matchStatus = occupied > 0 && occupied >= total;
    else if (statusFilter === 'partial') matchStatus = occupied > 0 && occupied < total;
    const matchFloor = selectedFloor === null || r.floorNumber === selectedFloor;
    return matchSearch && matchStatus && matchFloor;
  }), [rooms, search, statusFilter, selectedFloor]);

  const uniqueRooms = useMemo(() => {
    const seen = new Set<string>();
    return filtered.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [filtered]);

  const floors = useMemo(() => {
    const acc: Record<number, AllocationRoom[]> = {};
    for (const room of uniqueRooms) {
      const fn = room.floorNumber || 0;
      if (!acc[fn]) acc[fn] = [];
      acc[fn].push(room);
    }
    return acc;
  }, [uniqueRooms]);

  const floorKeys = useMemo(() => Object.keys(floors).sort((a, b) => Number(a) - Number(b)), [floors]);

  const stats = useMemo(() => {
    const totalRooms = uniqueRooms.length;
    const vacantRooms = uniqueRooms.filter(r => getOccupancyStatus(r) === 'vacant').length;
    const fullRooms = uniqueRooms.filter(r => getOccupancyStatus(r) === 'full').length;
    const partialRooms = uniqueRooms.filter(r => {
      const s = getOccupancyStatus(r);
      return s === 'partial' || s === 'single';
    }).length;
    return { total: totalRooms, vacant: vacantRooms, full: fullRooms, partial: partialRooms };
  }, [uniqueRooms]);

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState message="Failed to load rooms" onRetry={refetch} />;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + theme.spacing.md : theme.spacing.lg }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rooms</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.propertyRow, { paddingHorizontal: hp }]}>
        {(properties || []).map((p: any) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.propertyPill, selectedProperty === p.id && styles.propertyPillActive]}
            onPress={() => setSelectedProperty(p.id)}
            activeOpacity={0.6}
          >
            <Text style={[styles.propertyPillText, selectedProperty === p.id && styles.propertyPillTextActive]} numberOfLines={1}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={[styles.filterContainer, { paddingHorizontal: hp }]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search rooms..." />
      </View>

      <View style={[styles.filterRow, { paddingHorizontal: hp }]}>
        <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />
        <FloorDropdown selectedFloor={selectedFloor} floors={allFloors} onSelect={setSelectedFloor} />
      </View>

      <View style={[styles.statsBar, { paddingHorizontal: hp }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: OCCUPANCY_COLORS.vacant }]}>{stats.vacant}</Text>
          <Text style={styles.statLabel}>Vacant</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.partial}</Text>
          <Text style={styles.statLabel}>Partial</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.colors.borderLight }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: OCCUPANCY_COLORS.full }]}>{stats.full}</Text>
          <Text style={styles.statLabel}>Full</Text>
        </View>
      </View>

      <View style={[styles.legendRow, { paddingHorizontal: hp }]}>
        {Object.entries(OCCUPANCY_LABELS).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: OCCUPANCY_COLORS[key as keyof typeof OCCUPANCY_COLORS] }]} />
            <Text style={styles.legendLabel}>{label.split(' ')[0]}</Text>
          </View>
        ))}
      </View>

      {uniqueRooms.length === 0 ? (
        <EmptyState title="No rooms found" message="Add rooms to your property first" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: hp, paddingBottom: 32 }}>
          {floorKeys.map(fn => (
            <View key={`floor-${fn}`} style={styles.floorSection}>
              <Text style={styles.floorHeader}>Floor {fn}</Text>
              <View style={styles.roomGrid}>
                {floors[Number(fn)].map((room, idx) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    index={idx}
                    onPress={() => setSelectedRoom(room)}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <RoomDetailModal
        visible={!!selectedRoom}
        room={selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onAddTenant={() => {
          setSelectedRoom(null);
          router.push('/(details)/check-in');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  headerTitle: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text },
  propertyRow: { paddingVertical: theme.spacing.sm, gap: 8 },
  propertyPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.borderLight, borderWidth: 1, borderColor: theme.colors.border },
  propertyPillActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  propertyPillText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  propertyPillTextActive: { color: '#fff' },
  filterContainer: { marginBottom: theme.spacing.sm },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: theme.spacing.sm },
  dropdownContainer: { position: 'relative', zIndex: 100 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownText: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.textSecondary },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    minWidth: 140,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.md,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  dropdownItemActive: { backgroundColor: theme.colors.primarySurface },
  dropdownItemText: { fontSize: 14, fontFamily: theme.font.medium, color: theme.colors.text },
  dropdownItemTextActive: { color: theme.colors.primary, fontFamily: theme.font.semiBold },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadow.sm,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: theme.font.extraBold },
  statLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: theme.spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, fontFamily: theme.font.medium, color: theme.colors.textSecondary },
  floorSection: { marginBottom: 20 },
  floorHeader: { fontSize: 15, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 10, paddingHorizontal: 4 },
  roomGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roomCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    width: (SCREEN_WIDTH - 64) / 2,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  roomCardTopBar: { height: 4 },
  roomCardContent: { padding: 12 },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  roomNumber: { fontSize: 18, fontFamily: theme.font.bold, color: theme.colors.text },
  occupancyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  occupancyText: { fontSize: 11, fontFamily: theme.font.semiBold },
  roomType: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginBottom: 2 },
  roomRent: { fontSize: 13, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 8 },
  bedDotsContainer: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  bedDot: { width: 12, height: 12, borderRadius: 6 },
  roomCardStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  roomCardStatusText: { fontSize: 11, fontFamily: theme.font.semiBold, textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalTitle: { fontSize: 20, fontFamily: theme.font.bold, color: theme.colors.text },
  modalSubtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.borderLight, alignItems: 'center', justifyContent: 'center' },
  modalSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: theme.spacing.lg,
    paddingBottom: 0,
  },
  modalSummaryDot: { width: 10, height: 10, borderRadius: 5 },
  modalSummaryText: { flex: 1, fontSize: 14, color: theme.colors.textSecondary },
  modalSummaryBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalSummaryBadgeText: { fontSize: 12, fontFamily: theme.font.semiBold },
  modalRentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalRentLabel: { fontSize: 14, color: theme.colors.textSecondary },
  modalRentValue: { fontSize: 16, fontFamily: theme.font.bold, color: theme.colors.primary },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: theme.font.bold,
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  bedGridScroll: { maxHeight: 300 },
  bedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: theme.spacing.lg,
  },
  bedGridItem: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  bedGridDot: { width: 10, height: 10, borderRadius: 5, marginBottom: 8 },
  bedGridNumber: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text, marginBottom: 8 },
  bedGridOccupant: { gap: 4 },
  bedGridOccupantRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bedGridOccupantName: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.text, flex: 1 },
  bedGridOccupantPhone: { fontSize: 11, color: theme.colors.textMuted, flex: 1 },
  bedGridOccupantGender: { fontSize: 10, fontFamily: theme.font.semiBold, textTransform: 'uppercase', marginTop: 4 },
  bedGridVacant: { marginTop: 4 },
  bedGridVacantText: { fontSize: 13, color: theme.colors.success, fontFamily: theme.font.medium },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  modalActionPrimary: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionPrimaryText: { color: '#fff', fontSize: 16, fontFamily: theme.font.semiBold },
  modalActionSecondary: {
    flex: 1,
    backgroundColor: theme.colors.borderLight,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionSecondaryText: { color: theme.colors.textSecondary, fontSize: 16, fontFamily: theme.font.semiBold },
});