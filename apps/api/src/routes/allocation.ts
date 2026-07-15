import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import { rooms, beds, tenantProfiles, properties, floors } from '../lib/schema';
import { eq, and, desc } from 'drizzle-orm';

function getFilteredRooms(
  allRooms: any[],
  allBeds: any[],
  activeResidents: any[],
  allFloors: any[],
  gender: 'male' | 'female' | 'couple',
  minBeds: number
) {
  return allRooms.map(room => {
    const roomBeds = allBeds.filter(b => b.roomId === room.id);
    const vacantBeds = roomBeds.filter(b => b.status === 'vacant');
    const occupiedBeds = roomBeds.filter(b => b.status === 'occupied');

    const occupants = activeResidents.filter(r => r.roomId === room.id);
    const genders = [...new Set(occupants.map(o => o.gender).filter(Boolean))];

    const floor = allFloors.find(f => f.id === room.floorId);

    const roomGender = room.gender || 'mixed';

    return {
      roomId: room.id,
      roomNumber: room.roomNumber,
      floorNumber: floor?.floorNumber || 0,
      floorName: floor?.floorName || '',
      roomType: room.roomType,
      totalBeds: room.sharingType || 2,
      vacantBeds: vacantBeds.length,
      rentPerBed: room.rentPerBed,
      depositAmount: room.depositAmount,
      currentGenders: genders,
      occupants: occupants.map(o => ({ name: o.fullName, gender: o.gender })),
      vacantBedIds: vacantBeds.map(b => ({ bedId: b.id, bedNumber: b.bedNumber })),
      roomGender,
    };
  }).filter(r => r.vacantBeds >= minBeds && (
    gender === 'couple'
      ? (r.vacantBeds >= 2 && r.currentGenders.length === 0) && r.roomGender !== 'male' && r.roomGender !== 'female'
      : gender === 'male'
        ? (r.currentGenders.length === 0 || (r.currentGenders.length === 1 && r.currentGenders[0] === 'male')) && r.roomGender !== 'female'
        : (r.currentGenders.length === 0 || (r.currentGenders.length === 1 && r.currentGenders[0] === 'female')) && r.roomGender !== 'male'
  ));
}

function generateCombinations(
  maleRooms: any[],
  femaleRooms: any[],
  coupleRooms: any[],
  malesCount: number,
  femalesCount: number,
  couplesCount: number,
  budget?: number
): any[] {
  const combinations: any[] = [];

  function pickRooms(rooms: any[], needed: number, start = 0, current: any[] = []): any[][] {
    if (needed <= 0) return [current];
    if (start >= rooms.length) return [];

    const results: any[][] = [];
    const room = rooms[start];
    const maxFromRoom = Math.min(room.vacantBeds, needed);

    for (let take = maxFromRoom; take >= 1; take--) {
      const newCurrent = [...current, { ...room, assignedBeds: take }];
      const subResults = pickRooms(rooms, needed - take, start + 1, newCurrent);
      results.push(...subResults);
    }

    const skipResults = pickRooms(rooms, needed, start + 1, current);
    results.push(...skipResults);

    return results;
  }

  const maleOptions = malesCount > 0 ? pickRooms(maleRooms, malesCount) : [[]];
  const femaleOptions = femalesCount > 0 ? pickRooms(femaleRooms, femalesCount) : [[]];
  const coupleOptions = couplesCount > 0 ? pickRooms(coupleRooms, couplesCount * 2) : [[]];

  for (const m of maleOptions) {
    for (const f of femaleOptions) {
      for (const c of coupleOptions) {
        const allSelectedRooms = [...m, ...f, ...c];
        const roomIds = allSelectedRooms.map(r => r.roomId);
        const uniqueRoomIds = new Set(roomIds);

        if (uniqueRoomIds.size !== roomIds.length) {
          continue;
        }

        const totalRooms = m.length + f.length + c.length;
        const totalBeds = allSelectedRooms.reduce((sum, r) => sum + r.assignedBeds, 0);
        const avgRent = allSelectedRooms.reduce((sum, r) => sum + r.rentPerBed, 0) / totalRooms || 0;
        const floors = allSelectedRooms.map(r => r.floorNumber);
        const uniqueFloors = new Set(floors).size;
        const sameFloorBonus = uniqueFloors === 1 && totalRooms > 1 ? -10 : 0;

        let score = totalRooms * 100 + totalBeds * 10 + avgRent * 0.01 + sameFloorBonus;

        if (budget && avgRent > budget) score += 10000;

        combinations.push({
          maleRooms: m,
          femaleRooms: f,
          coupleRooms: c,
          totalRooms,
          totalBeds,
          avgRent,
          score,
        });
      }
    }
  }

  const validCombinations = combinations.sort((a, b) => a.score - b.score).slice(0, 5);

  if (validCombinations.length === 0 && (malesCount > 0 && femalesCount > 0)) {
    const partials: any[] = [];

    if (malesCount > 0 && maleOptions.length > 0 && maleOptions[0].length > 0) {
      partials.push({
        maleRooms: maleOptions[0],
        femaleRooms: [],
        coupleRooms: [],
        totalRooms: maleOptions[0].length,
        totalBeds: maleOptions[0].reduce((sum, r) => sum + r.assignedBeds, 0),
        avgRent: maleOptions[0].reduce((sum, r) => sum + r.rentPerBed, 0) / maleOptions[0].length || 0,
        score: 99999,
        partialAllocation: {
          type: 'male-only',
          message: 'Only male rooms available. Female residents need separate rooms.',
          malesAllocated: true,
          femalesAllocated: false,
        }
      });
    }

    if (femalesCount > 0 && femaleOptions.length > 0 && femaleOptions[0].length > 0) {
      partials.push({
        maleRooms: [],
        femaleRooms: femaleOptions[0],
        coupleRooms: [],
        totalRooms: femaleOptions[0].length,
        totalBeds: femaleOptions[0].reduce((sum, r) => sum + r.assignedBeds, 0),
        avgRent: femaleOptions[0].reduce((sum, r) => sum + r.rentPerBed, 0) / femaleOptions[0].length || 0,
        score: 99999,
        partialAllocation: {
          type: 'female-only',
          message: 'Only female rooms available. Male residents need separate rooms.',
          malesAllocated: false,
          femalesAllocated: true,
        }
      });
    }

    if (partials.length > 0) {
      return partials;
    }
  }

  return validCombinations;
}

export async function allocationRoutes(app: FastifyInstance) {
  app.post('/allocation/suggest', { preHandler: [authenticate] }, async (request, reply) => {
    const { gender, isCouple = false, budget, floorPreference, propertyId } = request.body as {
      gender?: string; isCouple?: boolean; budget?: number; floorPreference?: number; propertyId?: string;
    };
    const tenantId = request.user!.tenantId;

    let propertyConditions = [eq(properties.tenantId, tenantId)];
    if (propertyId) propertyConditions.push(eq(properties.id, propertyId));

    const props = db.select().from(properties).where(and(...propertyConditions)).all();
    if (props.length === 0) {
      return reply.send({ suggestions: [], message: 'No properties found' });
    }

    const prop = props[0];
    const allFloors = db.select().from(floors)
      .where(eq(floors.propertyId, prop.id))
      .orderBy(floors.floorNumber)
      .all();

    const allRooms = db.select().from(rooms)
      .where(eq(rooms.propertyId, prop.id))
      .all();

    const allBeds = db.select().from(beds)
      .where(eq(beds.propertyId, prop.id))
      .all();

    const activeResidents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.propertyId, prop.id), eq(tenantProfiles.status, 'active')))
      .all();

    const roomInfos = allRooms.map(room => {
      const roomBeds = allBeds.filter(b => b.roomId === room.id);
      const vacantBeds = roomBeds.filter(b => b.status === 'vacant');
      const occupiedBeds = roomBeds.filter(b => b.status === 'occupied');

      const occupants = activeResidents.filter(r => r.roomId === room.id);
      const genders = [...new Set(occupants.map(o => o.gender).filter(Boolean))];

      const floor = allFloors.find(f => f.id === room.floorId);

      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        floorNumber: floor?.floorNumber || 0,
        floorName: floor?.floorName || '',
        roomType: room.roomType,
        totalBeds: room.sharingType,
        vacantBeds: vacantBeds.length,
        rentPerBed: room.rentPerBed,
        depositAmount: room.depositAmount,
        currentGenders: genders,
        occupants: occupants.map(o => ({ name: o.fullName, gender: o.gender })),
        vacantBedIds: vacantBeds.map(b => ({ bedId: b.id, bedNumber: b.bedNumber })),
        roomGender: room.gender || 'mixed',
      };
    });

    let suggestions = roomInfos.filter(r => r.vacantBeds > 0);

    if (isCouple) {
      suggestions = suggestions.filter(r =>
        r.roomType === 'single' || r.roomType === 'couple' || (r.vacantBeds >= 2 && r.currentGenders.length === 0 && r.roomGender !== 'male' && r.roomGender !== 'female')
      );
      if (suggestions.length === 0) {
        suggestions = roomInfos.filter(r => r.vacantBeds >= 2 && (r.totalBeds || 2) <= 2 && r.roomGender !== 'male' && r.roomGender !== 'female');
      }
    }
    else if (gender === 'male' || gender === 'female') {
      suggestions = suggestions.filter(r => {
        if (r.currentGenders.length === 0) return true;
        if (r.currentGenders.length === 1 && r.currentGenders[0] === gender) return true;
        return false;
      });
    }

    if (budget) {
      suggestions = suggestions.filter(r => r.rentPerBed <= budget);
    }

    if (floorPreference) {
      suggestions.sort((a, b) => {
        const aDist = Math.abs(a.floorNumber - floorPreference);
        const bDist = Math.abs(b.floorNumber - floorPreference);
        return aDist - bDist;
      });
    } else {
      suggestions.sort((a, b) => a.occupants.length - b.occupants.length);
    }

    return reply.send({
      property: { id: prop.id, name: prop.name },
      filters: { gender, isCouple, budget, floorPreference },
      suggestions: suggestions.slice(0, 10),
    });
  });

  app.post('/allocation/suggest-group', { preHandler: [authenticate] }, async (request, reply) => {
    const { males = 0, females = 0, couples = 0, budget, floorPreference, propertyId } = request.body as {
      males?: number; females?: number; couples?: number; budget?: number; floorPreference?: number; propertyId?: string;
    };
    const tenantId = request.user!.tenantId;

    const totalPeople = males + females + couples * 2;
    if (totalPeople === 0) {
      return reply.send({ combinations: [], bestFitIndex: -1, message: 'No residents specified' });
    }

    let propertyConditions = [eq(properties.tenantId, tenantId)];
    if (propertyId) propertyConditions.push(eq(properties.id, propertyId));

    const props = db.select().from(properties).where(and(...propertyConditions)).all();
    if (props.length === 0) {
      return reply.send({ combinations: [], bestFitIndex: -1, message: 'No properties found' });
    }

    const prop = props[0];
    const allFloors = db.select().from(floors)
      .where(eq(floors.propertyId, prop.id))
      .orderBy(floors.floorNumber)
      .all();

    const allRooms = db.select().from(rooms)
      .where(eq(rooms.propertyId, prop.id))
      .all();

    const allBeds = db.select().from(beds)
      .where(eq(beds.propertyId, prop.id))
      .all();

    const activeResidents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.propertyId, prop.id), eq(tenantProfiles.status, 'active')))
      .all();

    const maleRooms = getFilteredRooms(allRooms, allBeds, activeResidents, allFloors, 'male', 1);
    const femaleRooms = getFilteredRooms(allRooms, allBeds, activeResidents, allFloors, 'female', 1);
    const coupleRooms = getFilteredRooms(allRooms, allBeds, activeResidents, allFloors, 'couple', 2);

    if (males > 0 && maleRooms.length === 0) {
      return reply.send({ combinations: [], bestFitIndex: -1, message: 'No suitable rooms for male residents' });
    }
    if (females > 0 && femaleRooms.length === 0) {
      return reply.send({ combinations: [], bestFitIndex: -1, message: 'No suitable rooms for female residents' });
    }
    if (couples > 0 && coupleRooms.length === 0) {
      return reply.send({ combinations: [], bestFitIndex: -1, message: 'No suitable rooms for couples' });
    }

    const combinations = generateCombinations(maleRooms, femaleRooms, coupleRooms, males, females, couples, budget);

    if (combinations.length === 0) {
      return reply.send({ combinations: [], bestFitIndex: -1, message: 'No valid room combinations found' });
    }

    if (floorPreference) {
      combinations.sort((a, b) => {
        const aDist = Math.abs((a.maleRooms[0]?.floorNumber || 0) + (a.femaleRooms[0]?.floorNumber || 0) + (a.coupleRooms[0]?.floorNumber || 0) - floorPreference * (a.totalRooms || 1));
        const bDist = Math.abs((b.maleRooms[0]?.floorNumber || 0) + (b.femaleRooms[0]?.floorNumber || 0) + (b.coupleRooms[0]?.floorNumber || 0) - floorPreference * (b.totalRooms || 1));
        return aDist - bDist;
      });
    }

    return reply.send({
      property: { id: prop.id, name: prop.name },
      filters: { males, females, couples, budget, floorPreference },
      combinations,
      bestFitIndex: 0,
    });
  });

  app.get('/allocation/rooms', { preHandler: [authenticate] }, async (request, reply) => {
    const { propertyId, floorId } = request.query as { propertyId?: string; floorId?: string };
    const tenantId = request.user!.tenantId;

    let roomConditions = [eq(rooms.tenantId, tenantId)];
    if (propertyId) roomConditions.push(eq(rooms.propertyId, propertyId));
    if (floorId) roomConditions.push(eq(rooms.floorId, floorId));

    const allRooms = db.select().from(rooms).where(and(...roomConditions)).all();    const bedConditions = [eq(beds.tenantId, tenantId)];
    if (propertyId) bedConditions.push(eq(beds.propertyId, propertyId));
    const allBeds = db.select().from(beds)
      .where(and(...bedConditions))
      .all();
    const activeResidents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')))
      .all();

    const allFloors = db.select().from(floors)
      .where(eq(floors.tenantId, tenantId))
      .all();

    const roomDetails = allRooms.map(room => {
      const roomBeds = allBeds.filter(b => b.roomId === room.id);
      const occupants = activeResidents.filter(r => r.roomId === room.id);
      const floor = allFloors.find(f => f.id === room.floorId);

      return {
        ...room,
        floorNumber: floor?.floorNumber || 0,
        floorName: floor?.floorName || '',
        beds: roomBeds.map(b => ({
          ...b,
          occupant: occupants.find(o => o.bedId === b.id) || null,
        })),
        genderBreakdown: {
          male: occupants.filter(o => o.gender === 'male').length,
          female: occupants.filter(o => o.gender === 'female').length,
          other: occupants.filter(o => o.gender && o.gender !== 'male' && o.gender !== 'female').length,
        },
      };
    });

    return reply.send(roomDetails);
  });
}