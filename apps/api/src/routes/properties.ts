import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { properties, floors, rooms, beds, tenantProfiles, rentPayments } from '../lib/schema';
import { eq, and, like, desc, sql, inArray } from 'drizzle-orm';
import { createPropertySchema, createFloorSchema, createRoomSchema, createBedSchema, parseBody } from '../types';

export async function propertyRoutes(app: FastifyInstance) {
  // List properties
  app.get('/properties', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, search } = request.query as { page?: number; limit?: number; search?: string };
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let data;
    if (search) {
      data = db.select().from(properties)
        .where(and(eq(properties.tenantId, tenantId), like(properties.name, `%${search}%`)))
        .orderBy(desc(properties.createdAt))
        .limit(limit).offset(offset).all();
    } else {
      data = db.select().from(properties)
        .where(eq(properties.tenantId, tenantId))
        .orderBy(desc(properties.createdAt))
        .limit(limit).offset(offset).all();
    }

    const total = db.select({ count: sql<number>`count(*)` }).from(properties).where(eq(properties.tenantId, tenantId)).get()?.count ?? 0;
    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Create property (owner/admin only)
  app.post('/properties', { preHandler: [authenticate] }, async (request, reply) => {
    if (!['owner', 'admin'].includes(request.user!.role)) {
      return reply.status(403).send({ error: 'Only owners or admins can create properties' });
    }
    const body = parseBody(createPropertySchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    const id = uuidv4();
    db.insert(properties).values({
      id,
      tenantId,
      name: body.name,
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      latitude: body.latitude,
      longitude: body.longitude,
      propertyType: body.propertyType,
      totalFloors: body.totalFloors,
      wifiSsid: body.wifiSsid,
      wifiPassword: body.wifiPassword,
      amenities: body.amenities,
    }).run();

    const property = db.select().from(properties).where(eq(properties.id, id)).get();
    return reply.status(201).send(property);
  });

  // Get property by ID with floors and rooms
  app.get('/properties/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const property = db.select().from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId)))
      .get();
    if (!property) {
      return reply.status(404).send({ error: 'Property not found' });
    }

    const propertyFloors = db.select().from(floors)
      .where(eq(floors.propertyId, id))
      .orderBy(floors.floorNumber)
      .all();

    const propertyRooms = db.select().from(rooms)
      .where(eq(rooms.propertyId, id))
      .all();

    const propertyBeds = db.select().from(beds)
      .where(eq(beds.propertyId, id))
      .all();

    return reply.send({ ...property, floors: propertyFloors, rooms: propertyRooms, beds: propertyBeds });
  });

  // Update property (owner/admin only)
  app.put('/properties/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!['owner', 'admin'].includes(request.user!.role)) {
      return reply.status(403).send({ error: 'Only owners or admins can update properties' });
    }
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as Partial<typeof createPropertySchema._type>;

    const existing = db.select().from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ error: 'Property not found' });
    }

    db.update(properties).set({ ...body, updatedAt: new Date().toISOString() })
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId)))
      .run();

    const updated = db.select().from(properties).where(eq(properties.id, id)).get();
    return reply.send(updated);
  });

  // Delete property (owner only)
  app.delete('/properties/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user!.role !== 'owner') {
      return reply.status(403).send({ error: 'Only owners can delete properties' });
    }
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const existing = db.select().from(properties)
      .where(and(eq(properties.id, id), eq(properties.tenantId, tenantId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ error: 'Property not found' });
    }

    // Check if property has active tenants
    const activeBeds = db.select().from(beds)
      .where(and(eq(beds.propertyId, id), eq(beds.status, 'occupied')))
      .all();
    if (activeBeds.length > 0) {
      return reply.status(400).send({ error: 'Cannot delete property with active tenants' });
    }

    db.delete(properties).where(and(eq(properties.id, id), eq(properties.tenantId, tenantId))).run();
    return reply.send({ message: 'Property deleted' });
  });
}

// =============================================================================
// Floor Routes
// =============================================================================
export async function floorRoutes(app: FastifyInstance) {
  // List floors for a property
  app.get('/properties/:propertyId/floors', { preHandler: [authenticate] }, async (request, reply) => {
    const { propertyId } = request.params as { propertyId: string };
    const tenantId = request.user!.tenantId;

    const data = db.select().from(floors)
      .where(and(eq(floors.propertyId, propertyId), eq(floors.tenantId, tenantId)))
      .orderBy(floors.floorNumber)
      .all();

    return reply.send(data);
  });

  // Create floor (owner/admin only)
  app.post('/floors', { preHandler: [authenticate] }, async (request, reply) => {
    if (!['owner', 'admin'].includes(request.user!.role)) {
      return reply.status(403).send({ error: 'Only owners or admins can create floors' });
    }
    const body = parseBody(createFloorSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    const id = uuidv4();
    db.insert(floors).values({
      id,
      tenantId,
      propertyId: body.propertyId,
      floorNumber: body.floorNumber,
      floorName: body.floorName,
    }).run();

    const floor = db.select().from(floors).where(eq(floors.id, id)).get();
    return reply.status(201).send(floor);
  });

  // Update floor
  app.put('/floors/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as Partial<typeof createFloorSchema._type>;

    db.update(floors).set({ ...body, updatedAt: new Date().toISOString() })
      .where(and(eq(floors.id, id), eq(floors.tenantId, tenantId)))
      .run();

    const updated = db.select().from(floors).where(eq(floors.id, id)).get();
    return reply.send(updated);
  });

  // Delete floor
  app.delete('/floors/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    db.delete(floors).where(and(eq(floors.id, id), eq(floors.tenantId, tenantId))).run();
    return reply.send({ message: 'Floor deleted' });
  });
}

// =============================================================================
// Room Routes
// =============================================================================
export async function roomRoutes(app: FastifyInstance) {
  // List rooms for a property or floor
  app.get('/rooms', { preHandler: [authenticate] }, async (request, reply) => {
    const { propertyId, floorId, page = 1, limit = 50 } = request.query as {
      propertyId?: string; floorId?: string; page?: number; limit?: number;
    };
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(rooms.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(rooms.propertyId, propertyId));
    if (floorId) conditions.push(eq(rooms.floorId, floorId));

    const data = db.select().from(rooms)
      .where(and(...conditions))
      .limit(limit).offset(offset)
      .all();

    return reply.send(data);
  });

  // Create room with beds (owner/admin only)
  app.post('/rooms', { preHandler: [authenticate] }, async (request, reply) => {
    if (!['owner', 'admin'].includes(request.user!.role)) {
      return reply.status(403).send({ error: 'Only owners or admins can create rooms' });
    }
    const body = parseBody(createRoomSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    const id = uuidv4();
    db.insert(rooms).values({
      id,
      tenantId,
      propertyId: body.propertyId,
      floorId: body.floorId,
      roomNumber: body.roomNumber,
      roomType: body.roomType,
      sharingType: body.sharingType,
      rentPerBed: body.rentPerBed,
      depositAmount: body.depositAmount,
      amenities: body.amenities,
      gender: body.gender || 'mixed',
    }).run();

    // Auto-create beds
    for (let i = 1; i <= body.totalBeds; i++) {
      db.insert(beds).values({
        id: uuidv4(),
        tenantId,
        propertyId: body.propertyId,
        floorId: body.floorId,
        roomId: id,
        bedNumber: `B${i}`,
        rentAmount: body.rentPerBed,
      }).run();
    }

    const room = db.select().from(rooms).where(eq(rooms.id, id)).get();
    const roomBeds = db.select().from(beds).where(eq(beds.roomId, id)).all();
    return reply.status(201).send({ ...room, beds: roomBeds });
  });

  // Get all rooms with bed-level tenant info (MUST be before /rooms/:id)
  app.get('/rooms/with-tenants', { preHandler: [authenticate] }, async (request, reply) => {
    const { propertyId, floorId } = request.query as { propertyId?: string; floorId?: string };
    const tenantId = request.user!.tenantId;

    let roomConditions = [eq(rooms.tenantId, tenantId)];
    if (propertyId) roomConditions.push(eq(rooms.propertyId, propertyId));
    if (floorId) roomConditions.push(eq(rooms.floorId, floorId));

    const allRooms = db.select().from(rooms)
      .where(and(...roomConditions)).all();

    const bedConditions = [eq(beds.tenantId, tenantId)];
    if (propertyId) bedConditions.push(eq(beds.propertyId, propertyId));
    const allBeds = db.select().from(beds)
      .where(and(...bedConditions)).all();

    const profileConditions = [eq(tenantProfiles.tenantId, tenantId)];
    if (propertyId) profileConditions.push(eq(tenantProfiles.propertyId, propertyId));
    const allProfiles = db.select().from(tenantProfiles)
      .where(and(...profileConditions)).all();

    // Build tenant lookup: bedId -> profile name
    const tenantByBed = new Map<string, string>();
    for (const profile of allProfiles) {
      if (profile.bedId) {
        tenantByBed.set(profile.bedId, profile.fullName);
      }
    }

    // Enrich rooms with bed tenant info
    // Build tenant lookup: bedId -> profile id (for clicking through to tenant detail)
    const tenantProfileIdByBed = new Map<string, string>();
    for (const profile of allProfiles) {
      if (profile.bedId) {
        tenantProfileIdByBed.set(profile.bedId, profile.id);
      }
    }

    // Enrich rooms with bed tenant info
    const enriched = allRooms.map((room) => {
      const roomBeds = allBeds
        .filter((b) => b.roomId === room.id)
        .map((bed) => ({
          ...bed,
          tenantName: tenantByBed.get(bed.id) || null,
          tenantProfileId: tenantProfileIdByBed.get(bed.id) || null,
        }));
      return { ...room, beds: roomBeds };
    });

    return reply.send(enriched);
  });

  // Get room details with beds, tenant profiles, and rent payment status
  // MUST be before /rooms/:id to avoid Fastify catching 'details' as an :id param
  app.get('/rooms/:id/details', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const room = db.select().from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)))
      .get();
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const roomBeds = db.select().from(beds).where(eq(beds.roomId, id)).all();

    // Get tenant profiles for this room
    const roomProfiles = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.roomId, id), eq(tenantProfiles.tenantId, tenantId)))
      .all();

    // Get latest rent payment per tenant profile (batch query, not N+1)
    const profileIds = roomProfiles.map((p) => p.id);
    const allPayments = profileIds.length > 0
      ? db.select().from(rentPayments)
          .where(inArray(rentPayments.tenantProfileId, profileIds))
          .orderBy(desc(rentPayments.monthYear))
          .all()
      : [];

    // Group payments by tenantProfileId and pick the latest
    const paymentByProfile = new Map<string, typeof allPayments[0]>();
    for (const p of allPayments) {
      if (!paymentByProfile.has(p.tenantProfileId)) {
        paymentByProfile.set(p.tenantProfileId, p);
      }
    }

    const profiles = roomProfiles.map((profile) => {
      const latestPayment = paymentByProfile.get(profile.id) || null;
      return {
        ...profile,
        latestPayment: latestPayment ? {
          monthYear: latestPayment.monthYear,
          rentAmount: latestPayment.rentAmount,
          totalAmount: latestPayment.totalAmount,
          paidAmount: latestPayment.paidAmount,
          balanceAmount: latestPayment.balanceAmount,
          paymentStatus: latestPayment.paymentStatus,
          dueDate: latestPayment.dueDate,
          paidDate: latestPayment.paidDate,
        } : null,
      };
    });

    return reply.send({ ...room, beds: roomBeds, tenants: profiles });
  });

  // Get room with beds
  app.get('/rooms/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const room = db.select().from(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)))
      .get();
    if (!room) {
      return reply.status(404).send({ error: 'Room not found' });
    }

    const roomBeds = db.select().from(beds).where(eq(beds.roomId, id)).all();
    return reply.send({ ...room, beds: roomBeds });
  });

  // Update room (owner/admin only)
  app.put('/rooms/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!['owner', 'admin'].includes(request.user!.role)) {
      return reply.status(403).send({ error: 'Only owners or admins can update rooms' });
    }
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as Partial<typeof createRoomSchema._type>;

    db.update(rooms).set({ ...body, updatedAt: new Date().toISOString() })
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)))
      .run();

    const updated = db.select().from(rooms).where(eq(rooms.id, id)).get();
    return reply.send(updated);
  });

  // Delete room (owner only)
  app.delete('/rooms/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (request.user!.role !== 'owner') {
      return reply.status(403).send({ error: 'Only owners can delete rooms' });
    }
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const occupiedBeds = db.select().from(beds)
      .where(and(eq(beds.roomId, id), eq(beds.status, 'occupied')))
      .all();
    if (occupiedBeds.length > 0) {
      return reply.status(400).send({ error: 'Cannot delete room with occupied beds' });
    }

    db.delete(beds).where(eq(beds.roomId, id)).run();
    db.delete(rooms).where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId))).run();
    return reply.send({ message: 'Room deleted' });
  });
}
