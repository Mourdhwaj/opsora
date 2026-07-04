import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { tenantProfiles, beds, rooms, properties } from '../lib/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { createTenantProfileSchema, parseBody } from '../types';

export async function residentRoutes(app: FastifyInstance) {
  // List residents
  app.get('/residents', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, search, propertyId, status } = request.query as {
      page?: number; limit?: number; search?: string; propertyId?: string; status?: string;
    };
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(tenantProfiles.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(tenantProfiles.propertyId, propertyId));
    if (status) conditions.push(eq(tenantProfiles.status, status));
    if (search) conditions.push(like(tenantProfiles.fullName, `%${search}%`));

    const data = db.select().from(tenantProfiles)
      .where(and(...conditions))
      .orderBy(desc(tenantProfiles.createdAt))
      .limit(limit).offset(offset)
      .all();

    const total = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(...conditions)).get()?.count ?? 0;

    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Create resident (check-in)
  app.post('/residents', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createTenantProfileSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    // Verify bed is vacant
    const bed = db.select().from(beds)
      .where(and(eq(beds.id, body.bedId), eq(beds.status, 'vacant')))
      .get();
    if (!bed) {
      return reply.status(400).send({ error: 'Bed is not available' });
    }

    const id = uuidv4();
    db.insert(tenantProfiles).values({
      id,
      tenantId,
      propertyId: body.propertyId,
      roomId: body.roomId,
      bedId: body.bedId,
      fullName: body.fullName,
      phone: body.phone,
      email: body.email,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      occupation: body.occupation,
      companyName: body.companyName,
      collegeName: body.collegeName,
      emergencyName: body.emergencyName,
      emergencyPhone: body.emergencyPhone,
      emergencyRelation: body.emergencyRelation,
      moveInDate: body.moveInDate,
      rentAmount: body.rentAmount,
      depositPaid: body.depositPaid,
      depositBalance: body.depositPaid,
      foodOptIn: body.foodOptIn,
      breakfastOptIn: body.breakfastOptIn,
      lunchOptIn: body.lunchOptIn,
      dinnerOptIn: body.dinnerOptIn,
    }).run();

    // Mark bed as occupied
    db.update(beds).set({
      status: 'occupied',
      currentTenantId: tenantId,
      updatedAt: new Date().toISOString(),
    }).where(eq(beds.id, body.bedId)).run();

    // Update room occupancy
    const room = db.select().from(rooms).where(eq(rooms.id, body.roomId)).get();
    if (room) {
      db.update(rooms).set({
        occupiedBeds: room.occupiedBeds + 1,
        vacantBeds: room.vacantBeds - 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(rooms.id, body.roomId)).run();
    }

    // Update property occupancy
    const prop = db.select().from(properties).where(eq(properties.id, body.propertyId)).get();
    if (prop) {
      db.update(properties).set({
        occupiedBeds: prop.occupiedBeds + 1,
        vacantBeds: prop.vacantBeds - 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(properties.id, body.propertyId)).run();
    }

    const profile = db.select().from(tenantProfiles).where(eq(tenantProfiles.id, id)).get();
    return reply.status(201).send(profile);
  });

  // Get resident by ID
  app.get('/residents/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const profile = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!profile) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    return reply.send(profile);
  });

  // Update resident
  app.put('/residents/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as Partial<typeof createTenantProfileSchema._type>;

    const existing = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    db.update(tenantProfiles).set({ ...body, updatedAt: new Date().toISOString() })
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .run();

    const updated = db.select().from(tenantProfiles).where(eq(tenantProfiles.id, id)).get();
    return reply.send(updated);
  });

  // Check-out resident
  app.post('/residents/:id/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const profile = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!profile) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Update tenant profile
    db.update(tenantProfiles).set({
      status: 'checked_out',
      moveOutDate: today,
      updatedAt: new Date().toISOString(),
    }).where(eq(tenantProfiles.id, id)).run();

    // Free up bed
    db.update(beds).set({
      status: 'vacant',
      currentTenantId: null,
      updatedAt: new Date().toISOString(),
    }).where(eq(beds.id, profile.bedId)).run();

    // Update room occupancy
    const room = db.select().from(rooms).where(eq(rooms.id, profile.roomId)).get();
    if (room) {
      db.update(rooms).set({
        occupiedBeds: Math.max(0, room.occupiedBeds - 1),
        vacantBeds: room.vacantBeds + 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(rooms.id, profile.roomId)).run();
    }

    // Update property occupancy
    const prop = db.select().from(properties).where(eq(properties.id, profile.propertyId)).get();
    if (prop) {
      db.update(properties).set({
        occupiedBeds: Math.max(0, prop.occupiedBeds - 1),
        vacantBeds: prop.vacantBeds + 1,
        updatedAt: new Date().toISOString(),
      }).where(eq(properties.id, profile.propertyId)).run();
    }

    return reply.send({ message: 'Resident checked out successfully' });
  });
}
