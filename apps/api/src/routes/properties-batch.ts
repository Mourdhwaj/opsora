import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { properties, floors, rooms, beds } from '../lib/schema';
import { eq, and } from 'drizzle-orm';

interface FloorInput {
  floorNumber: number;
  floorName?: string;
  rooms: RoomInput[];
}

interface RoomInput {
  roomNumber: string;
  roomType?: string;
  sharingType?: number;
  bedsPerRoom: number;
  rentPerBed: number;
  depositAmount?: number;
  amenities?: string;
  gender?: string;
}

interface BulkSetupBody {
  propertyId: string;
  floors: FloorInput[];
}

export async function batchPropertyRoutes(app: FastifyInstance) {
  // Batch create floors, rooms, and beds in a single transaction
  app.post('/properties/bulk-setup', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ error: 'Only owners/admins can perform this action' });
    }
    const tenantId = user.tenantId;
    const body = request.body as BulkSetupBody;

    if (!body?.propertyId || !body?.floors?.length) {
      return reply.status(400).send({ error: 'propertyId and floors array are required' });
    }

    // Verify property exists and belongs to tenant
    const property = db.select().from(properties)
      .where(and(eq(properties.id, body.propertyId), eq(properties.tenantId, tenantId)))
      .get();
    if (!property) {
      return reply.status(404).send({ error: 'Property not found' });
    }

    const createdFloors: any[] = [];
    const createdRooms: any[] = [];
    const createdBeds: any[] = [];

    // Use a transaction-like approach (SQLite doesn't support complex transactions via Drizzle easily,
    // but we do all inserts in sequence and rollback conceptually by catching errors)
    try {
      for (const floorInput of body.floors) {
        const floorId = uuidv4();
        db.insert(floors).values({
          id: floorId,
          tenantId,
          propertyId: body.propertyId,
          floorNumber: floorInput.floorNumber,
          floorName: floorInput.floorName || `Floor ${floorInput.floorNumber}`,
        }).run();

        createdFloors.push({ id: floorId, floorNumber: floorInput.floorNumber });

        for (const roomInput of floorInput.rooms) {
          const roomId = uuidv4();
          db.insert(rooms).values({
            id: roomId,
            tenantId,
            propertyId: body.propertyId,
            floorId,
            roomNumber: roomInput.roomNumber,
            roomType: roomInput.roomType || 'shared',
            sharingType: roomInput.sharingType || roomInput.bedsPerRoom || 2,
            rentPerBed: roomInput.rentPerBed,
            depositAmount: roomInput.depositAmount || 15000,
            amenities: roomInput.amenities || '[]',
            gender: roomInput.gender || 'mixed',
          }).run();

          createdRooms.push({ id: roomId, roomNumber: roomInput.roomNumber, floorId });

          // Create beds for this room
          for (let b = 1; b <= roomInput.bedsPerRoom; b++) {
            const bedId = uuidv4();
            db.insert(beds).values({
              id: bedId,
              tenantId,
              propertyId: body.propertyId,
              floorId,
              roomId,
              bedNumber: `B${b}`,
              bedType: 'standard',
              status: 'vacant',
              rentAmount: roomInput.rentPerBed,
            }).run();

            createdBeds.push({ id: bedId, bedNumber: `B${b}`, roomId });
          }
        }
      }

      return reply.status(201).send({
        message: 'Bulk setup completed',
        summary: {
          floorsCreated: createdFloors.length,
          roomsCreated: createdRooms.length,
          bedsCreated: createdBeds.length,
        },
        floors: createdFloors,
        rooms: createdRooms,
        beds: createdBeds,
      });
    } catch (error: any) {
      return reply.status(500).send({ error: 'Bulk setup failed: ' + error.message });
    }
  });
}
