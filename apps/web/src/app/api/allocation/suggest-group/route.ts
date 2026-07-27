import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

interface RoomInfo {
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  floorName: string;
  roomType: string;
  totalBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  currentGenders: string[];
  vacantBedIds: { bedId: string; bedNumber: string }[];
  roomGender: string;
}

function getFilteredRooms(
  allRooms: Record<string, any>[],
  roomSummaries: Record<string, any>,
  gender: 'male' | 'female' | 'couple',
  minBeds: number,
  budget?: number,
  floorPreference?: number
): RoomInfo[] {
  const result: RoomInfo[] = [];

  for (const [roomId, summary] of Object.entries(roomSummaries)) {
    const beds = summary.beds || {};
    const bedEntries = Object.entries(beds) as [string, any][];
    const vacantBeds = bedEntries.filter(([, b]) => b.status === 'vacant');
    if (vacantBeds.length < minBeds) continue;

    const occupiedBedIds = bedEntries.filter(([, b]) => b.status === 'occupied').map(([, b]) => b.occupantId).filter(Boolean);
    const currentGenders = [...new Set(occupiedBedIds.map((id: string) => {
      const room = allRooms.find(r => r.id === roomId);
      return room?.gender || 'mixed';
    }))];

    const roomGender = summary.roomGender || 'mixed';
    if (budget && summary.rentPerBed > budget) continue;

    if (gender === 'couple') {
      if (vacantBeds.length < 2) continue;
      if (roomGender === 'male' || roomGender === 'female') continue;
    } else if (gender === 'male') {
      if (roomGender === 'female') continue;
      if (currentGenders.length > 0 && currentGenders[0] !== 'male') continue;
    } else if (gender === 'female') {
      if (roomGender === 'male') continue;
      if (currentGenders.length > 0 && currentGenders[0] !== 'female') continue;
    }

    if (floorPreference !== undefined && summary.floorNumber !== undefined) {
      // Already filtered at property level, floor preference applied during sort
    }

    result.push({
      roomId,
      roomNumber: summary.roomNumber || '',
      floorNumber: summary.floorNumber || 0,
      floorName: summary.floorName || '',
      roomType: summary.roomType || 'shared',
      totalBeds: summary.totalBeds || bedEntries.length,
      vacantBeds: vacantBeds.length,
      rentPerBed: summary.rentPerBed || 0,
      currentGenders,
      vacantBedIds: vacantBeds.map(([id, b]) => ({ bedId: id, bedNumber: b.bedNumber || id })),
      roomGender,
    });
  }

  return result;
}

function generateCombinations(
  maleRooms: RoomInfo[],
  femaleRooms: RoomInfo[],
  coupleRooms: RoomInfo[],
  malesCount: number,
  femalesCount: number,
  couplesCount: number,
  budget?: number
): any[] {
  const combinations: any[] = [];

  function pickRooms(rooms: RoomInfo[], needed: number, start = 0, current: any[] = []): any[][] {
    if (needed <= 0) return [current];
    if (start >= rooms.length) return [];
    const results: any[][] = [];
    const room = rooms[start];
    const maxFromRoom = Math.min(room.vacantBeds, needed);
    for (let take = maxFromRoom; take >= 1; take--) {
      const newCurrent = [...current, { ...room, assignedBeds: take }];
      results.push(...pickRooms(rooms, needed - take, start + 1, newCurrent));
    }
    results.push(...pickRooms(rooms, needed, start + 1, current));
    return results;
  }

  const maleOptions = malesCount > 0 ? pickRooms(maleRooms, malesCount) : [[]];
  const femaleOptions = femalesCount > 0 ? pickRooms(femaleRooms, femalesCount) : [[]];
  const coupleOptions = couplesCount > 0 ? pickRooms(coupleRooms, couplesCount * 2) : [[]];

  for (const m of maleOptions) {
    for (const f of femaleOptions) {
      for (const c of coupleOptions) {
        const allSelected = [...m, ...f, ...c];
        const roomIds = allSelected.map(r => r.roomId);
        if (new Set(roomIds).size !== roomIds.length) continue;

        const totalRooms = m.length + f.length + c.length;
        const totalBeds = allSelected.reduce((sum, r) => sum + r.assignedBeds, 0);
        const avgRent = totalRooms > 0 ? allSelected.reduce((sum, r) => sum + r.rentPerBed, 0) / totalRooms : 0;
        const floors = allSelected.map(r => r.floorNumber);
        const sameFloorBonus = new Set(floors).size === 1 && totalRooms > 1 ? -10 : 0;
        let score = totalRooms * 100 + totalBeds * 10 + avgRent * 0.01 + sameFloorBonus;
        if (budget && avgRent > budget) score += 10000;

        combinations.push({
          maleRooms: m, femaleRooms: f, coupleRooms: c,
          totalRooms, totalBeds, avgRent, score,
        });
      }
    }
  }

  return combinations.sort((a, b) => a.score - b.score).slice(0, 5);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { males = 0, females = 0, couples = 0, budget, floorPreference, propertyId } = body;

    const totalPeople = males + females + couples * 2;
    if (totalPeople === 0) {
      return NextResponse.json({ combinations: [], bestFitIndex: -1, message: 'No residents specified' });
    }

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    let propertyQuery: FirebaseFirestore.Query = tenantRef.collection('properties');
    if (propertyId) propertyQuery = propertyQuery.where('__name__', '==', propertyId);
    const propertiesSnap = await propertyQuery.get();

    if (propertiesSnap.empty) {
      return NextResponse.json({ combinations: [], bestFitIndex: -1, message: 'No properties found' });
    }

    const propDoc = propertiesSnap.docs[0];
    const propData = propDoc.data();
    const roomSummaries = propData.roomSummaries || {};
    const roomsList = Object.entries(roomSummaries).map(([id, s]: [string, any]) => ({ id, ...s }));

    const maleRooms = getFilteredRooms(roomsList, roomSummaries, 'male', 1, budget, floorPreference);
    const femaleRooms = getFilteredRooms(roomsList, roomSummaries, 'female', 1, budget, floorPreference);
    const coupleRooms = getFilteredRooms(roomsList, roomSummaries, 'couple', 2, budget, floorPreference);

    if (males > 0 && maleRooms.length === 0) {
      return NextResponse.json({ combinations: [], bestFitIndex: -1, message: 'No suitable rooms for male residents' });
    }
    if (females > 0 && femaleRooms.length === 0) {
      return NextResponse.json({ combinations: [], bestFitIndex: -1, message: 'No suitable rooms for female residents' });
    }
    if (couples > 0 && coupleRooms.length === 0) {
      return NextResponse.json({ combinations: [], bestFitIndex: -1, message: 'No suitable rooms for couples' });
    }

    const combinations = generateCombinations(maleRooms, femaleRooms, coupleRooms, males, females, couples, budget);

    if (combinations.length === 0) {
      return NextResponse.json({ combinations: [], bestFitIndex: -1, message: 'No valid room combinations found' });
    }

    return NextResponse.json({
      property: { id: propDoc.id, name: propData.name },
      filters: { males, females, couples, budget, floorPreference },
      combinations,
      bestFitIndex: 0,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
