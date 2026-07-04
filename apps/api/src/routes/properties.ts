import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { properties, floors, rooms, beds } from '../lib/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
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

  // Create property
  app.post('/properties', { preHandler: [authenticate] }, async (request, reply) => {
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

  // Update property
  app.put('/properties/:id', { preHandler: [authenticate] }, async (request, reply) => {
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

  // Delete property
  app.delete('/properties/:id', { preHandler: [authenticate] }, async (request, reply) => {
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

  // Create floor
  app.post('/floors', { preHandler: [authenticate] }, async (request, reply) => {
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

  // Create room with beds
  app.post('/rooms', { preHandler: [authenticate] }, async (request, reply) => {
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
      totalBeds: body.totalBeds,
      vacantBeds: body.totalBeds,
      rentPerBed: body.rentPerBed,
      depositAmount: body.depositAmount,
      amenities: body.amenities,
      gender: body.gender || null,
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

  // Update room
  app.put('/rooms/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as Partial<typeof createRoomSchema._type>;

    db.update(rooms).set({ ...body, updatedAt: new Date().toISOString() })
      .where(and(eq(rooms.id, id), eq(rooms.tenantId, tenantId)))
      .run();

    const updated = db.select().from(rooms).where(eq(rooms.id, id)).get();
    return reply.send(updated);
  });

  // Delete room
  app.delete('/rooms/:id', { preHandler: [authenticate] }, async (request, reply) => {
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
