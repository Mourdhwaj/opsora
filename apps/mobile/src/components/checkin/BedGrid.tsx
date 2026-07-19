import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '../../lib/theme';
import { BedSquare } from './BedSquare';
import type { RoomCombination, RoomAssignment, GroupCheckinResident } from '../../types';

interface BedGridProps {
  combinations: RoomCombination[];
  selectedComboIndex: number;
  assignedResidents: GroupCheckinResident[];
  totalNeeded: number;
  onAssignBed: (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassignBed: (bedId: string) => void;
  partialAllocation?: RoomCombination['partialAllocation'];
}

function getBedStatus(bedId: string, assignedResidents: GroupCheckinResident[], room: RoomAssignment, currentGroup: 'males' | 'females' | 'couples'): 'vacant' | 'occupied' | 'gender-locked' | 'selected' {
  if (assignedResidents.some(r => r.bedId === bedId)) return 'selected';
  if (!room.vacantBedIds.some(b => b.bedId === bedId)) return 'occupied';
  const assignedInRoom = assignedResidents.filter(r => r.roomId === room.roomId);
  if (assignedInRoom.length > 0) {
    const assignedGender = assignedInRoom[0].gender;
    const groupGender = currentGroup === 'females' ? 'female' : 'male';
    if (assignedGender !== groupGender) return 'gender-locked';
  }
  return 'vacant';
}

function RoomCard({ room, group, assignedResidents, onAssignBed, onUnassignBed }: {
  room: RoomAssignment; group: 'males' | 'females' | 'couples';
  assignedResidents: GroupCheckinResident[];
  onAssignBed: (group: 'males' | 'females' | 'couples', room: RoomAssignment, bed: { bedId: string; bedNumber: string }) => void;
  onUnassignBed: (bedId: string) => void;
}) {
  return (
    <View style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <Text style={styles.roomNumber}>Room {room.roomNumber}</Text>
        <Text style={styles.roomMeta}>{room.roomType} · {room.floorName} · Rs.{room.rentPerBed}/mo</Text>
      </View>
      <View style={styles.bedGrid}>
        {room.vacantBedIds.map((bed, idx) => {
          const status = getBedStatus(bed.bedId, assignedResidents, room, group);
          return (
            <BedSquare key={bed.bedId} bedId={bed.bedId} bedNumber={bed.bedNumber} status={status} index={idx}
              onPress={(id) => status === 'selected' ? onUnassignBed(id) : onAssignBed(group, room, { bedId: id, bedNumber: bed.bedNumber })} />
          );
        })}
      </View>
    </View>
  );
}

export function BedGrid({ combinations, selectedComboIndex, assignedResidents, totalNeeded, onAssignBed, onUnassignBed, partialAllocation }: BedGridProps) {
  const combo = combinations[selectedComboIndex];
  if (!combo) return null;
  const sections: { title: string; group: 'males' | 'females' | 'couples'; rooms: RoomAssignment[] }[] = [];
  if (combo.maleRooms.length > 0) sections.push({ title: 'Male Residents', group: 'males', rooms: combo.maleRooms });
  if (combo.femaleRooms.length > 0) sections.push({ title: 'Female Residents', group: 'females', rooms: combo.femaleRooms });
  if (combo.coupleRooms.length > 0) sections.push({ title: 'Couples', group: 'couples', rooms: combo.coupleRooms });

  return (
    <View style={styles.container}>
      {partialAllocation && (
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color={theme.colors.warning} />
          <Text style={styles.warningText}>{partialAllocation.message}</Text>
        </View>
      )}
      {sections.map(section => (
        <View key={section.group} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.rooms.map(room => (
            <RoomCard key={room.roomId} room={room} group={section.group} assignedResidents={assignedResidents} onAssignBed={onAssignBed} onUnassignBed={onUnassignBed} />
          ))}
        </View>
      ))}
      <View style={styles.progressBadge}>
        <Text style={styles.progressText}>{assignedResidents.length}/{totalNeeded} beds assigned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.warningSurface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 16 },
  warningText: { fontSize: 13, fontFamily: theme.font.medium, color: theme.colors.warning, flex: 1 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: theme.font.bold, color: theme.colors.text, marginBottom: 8 },
  roomCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.md, padding: 12, marginBottom: 8 },
  roomHeader: { marginBottom: 8 },
  roomNumber: { fontSize: 14, fontFamily: theme.font.semiBold, color: theme.colors.text },
  roomMeta: { fontSize: 12, fontFamily: theme.font.regular, color: theme.colors.textSecondary, marginTop: 2 },
  bedGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progressBadge: { position: 'absolute', bottom: 0, alignSelf: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.borderRadius.full, paddingHorizontal: 16, paddingVertical: 8 },
  progressText: { fontSize: 13, fontFamily: theme.font.semiBold, color: '#fff' },
});
