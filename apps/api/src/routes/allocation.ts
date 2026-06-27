import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import { rooms, beds, tenantProfiles, properties, floors } from '../lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function allocationRoutes(app: FastifyInstance) {
  // ── Smart room suggestions for a new resident ──────────────────────────
  // POST /allocation/suggest  { gender, isCouple?, budget?, floorPreference?, propertyId? }
  app.post('/allocation/suggest', { preHandler: [app.authenticate] }, async (request, reply) => {
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

    // Get all active residents to check room gender composition
    const activeResidents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.propertyId, prop.id), eq(tenantProfiles.status, 'active')))
      .all();

    // Build room info with gender composition
    const roomInfos = allRooms.map(room => {
      const roomBeds = allBeds.filter(b => b.roomId === room.id);
      const vacantBeds = roomBeds.filter(b => b.status === 'vacant');
      const occupiedBeds = roomBeds.filter(b => b.status === 'occupied');

      // Check gender of current occupants
      const occupants = activeResidents.filter(r => r.roomId === room.id);
      const genders = [...new Set(occupants.map(o => o.gender).filter(Boolean))];
      const hasCouples = occupants.some(o => false); // placeholder - couples get single rooms

      const floor = allFloors.find(f => f.id === room.floorId);

      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        floorNumber: floor?.floorNumber || 0,
        floorName: floor?.floorName || '',
        roomType: room.roomType,
        totalBeds: room.totalBeds,
        vacantBeds: vacantBeds.length,
        rentPerBed: room.rentPerBed,
        depositAmount: room.depositAmount,
        currentGenders: genders,
        occupants: occupants.map(o => ({ name: o.fullName, gender: o.gender })),
        vacantBedIds: vacantBeds.map(b => ({ bedId: b.id, bedNumber: b.bedNumber })),
      };
    });

    // ── Smart filtering logic ────────────────────────────────────────────
    let suggestions = roomInfos.filter(r => r.vacantBeds > 0);

    // 1. Couples always get a private/single room
    if (isCouple) {
      suggestions = suggestions.filter(r =>
        r.roomType === 'single' || r.roomType === 'couple'
      );
      // If no single rooms available, suggest rooms with 2 vacant beds (entire room free)
      if (suggestions.length === 0) {
        suggestions = roomInfos.filter(r => r.vacantBeds >= 2 && r.totalBeds <= 2);
      }
    }
    // 2. Gender-based allocation: males go to male rooms, females to female rooms
    else if (gender === 'male' || gender === 'female') {
      suggestions = suggestions.filter(r => {
        // Empty rooms are always ok
        if (r.currentGenders.length === 0) return true;
        // Room has same-gender occupants
        if (r.currentGenders.length === 1 && r.currentGenders[0] === gender) return true;
        return false;
      });
    }

    // 3. Budget filter
    if (budget) {
      suggestions = suggestions.filter(r => r.rentPerBed <= budget);
    }

    // 4. Floor preference
    if (floorPreference) {
      suggestions.sort((a, b) => {
        const aDist = Math.abs(a.floorNumber - floorPreference);
        const bDist = Math.abs(b.floorNumber - floorPreference);
        return aDist - bDist;
      });
    } else {
      // Default: prefer rooms with fewer occupants (more privacy)
      suggestions.sort((a, b) => a.occupants.length - b.occupants.length);
    }

    return reply.send({
      property: { id: prop.id, name: prop.name },
      filters: { gender, isCouple, budget, floorPreference },
      suggestions: suggestions.slice(0, 10),
    });
  });

  // ── Room detail with gender breakdown ──────────────────────────────────
  app.get('/allocation/rooms', { preHandler: [app.authenticate] }, async (request, reply) => {
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
