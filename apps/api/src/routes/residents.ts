import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { tenantProfiles, beds, rooms, properties, rentPayments, complaints, archivedResidents } from '../lib/schema';
import { eq, and, like, desc, sql, inArray } from 'drizzle-orm';
import { createTenantProfileSchema, parseBody } from '../types';

export async function residentRoutes(app: FastifyInstance) {
  // List residents
  app.get('/residents', { preHandler: [authenticate] }, async (request, reply) => {
    const query = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20));
    const search = query.search || '';
    const propertyId = query.propertyId || '';
    const status = query.status || '';
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(tenantProfiles.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(tenantProfiles.propertyId, propertyId));
    if (status) conditions.push(eq(tenantProfiles.status, status));
    if (search) conditions.push(like(tenantProfiles.fullName, `%${search}%`));

    const raw = db.select().from(tenantProfiles)
      .where(and(...conditions))
      .orderBy(desc(tenantProfiles.createdAt))
      .limit(limit).offset(offset)
      .all();

    // Batch lookup room numbers (avoid N+1 queries)
    const roomIds = [...new Set(raw.filter((r) => r.roomId).map((r) => r.roomId!))];
    const roomMap = new Map<string, string>();
    if (roomIds.length > 0) {
      const roomRows = db.select({ id: rooms.id, roomNumber: rooms.roomNumber })
        .from(rooms)
        .where(inArray(rooms.id, roomIds))
        .all();
      roomRows.forEach((r) => roomMap.set(r.id, r.roomNumber));
    }
    const data = raw.map((r) => ({
      ...r,
      roomNumber: r.roomId ? roomMap.get(r.roomId) ?? null : null,
    }));

    const total = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(...conditions)).get()?.count ?? 0;

    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Create resident (check-in)
  app.post('/residents', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createTenantProfileSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    const id = uuidv4();
    db.insert(tenantProfiles).values({
      id,
      tenantId,
      propertyId: body.propertyId || null,
      roomId: body.roomId || null,
      bedId: body.bedId || null,
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
      mealPreferences: body.mealPreferences,
    }).run();

    // Only update bed status if bed is provided
    if (body.bedId) {
      const bed = db.select().from(beds)
        .where(and(eq(beds.id, body.bedId), eq(beds.status, 'vacant')))
        .get();
      if (!bed) {
        return reply.status(400).send({ error: 'Bed is not available' });
      }
      db.update(beds).set({
        status: 'occupied',
        updatedAt: new Date().toISOString(),
      }).where(eq(beds.id, body.bedId)).run();
    }

    const profile = db.select().from(tenantProfiles).where(eq(tenantProfiles.id, id)).get();
    return reply.status(201).send(profile);
  });

  // Get resident details with room/bed info, payment history, and complaints
  app.get('/residents/:id/details', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const profile = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!profile) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    const room = profile.roomId ? db.select().from(rooms).where(eq(rooms.id, profile.roomId)).get() : null;
    const bed = profile.bedId ? db.select().from(beds).where(eq(beds.id, profile.bedId)).get() : null;
    const property = profile.propertyId ? db.select().from(properties).where(eq(properties.id, profile.propertyId)).get() : null;

    const paymentHistory = db.select().from(rentPayments)
      .where(eq(rentPayments.tenantProfileId, id))
      .orderBy(desc(rentPayments.monthYear))
      .all();

    const totalDue = paymentHistory.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const totalPaid = paymentHistory.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalBalance = paymentHistory.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);
    const paidCount = paymentHistory.filter((p) => p.paymentStatus === 'paid' || p.paymentStatus === 'confirmed').length;
    const pendingCount = paymentHistory.filter((p) => p.paymentStatus === 'pending' || p.paymentStatus === 'overdue').length;
    const partialCount = paymentHistory.filter((p) => p.paymentStatus === 'partial').length;

    const recentComplaints = db.select().from(complaints)
      .where(eq(complaints.tenantProfileId, id))
      .orderBy(desc(complaints.createdAt))
      .limit(5)
      .all();

    return reply.send({
      profile,
      room: room ? { id: room.id, roomNumber: room.roomNumber, roomType: room.roomType, rentPerBed: room.rentPerBed } : null,
      bed: bed ? { id: bed.id, bedNumber: bed.bedNumber, rentAmount: bed.rentAmount } : null,
      property: property ? { id: property.id, name: property.name, address: property.address } : null,
      paymentSummary: { totalDue, totalPaid, totalBalance, paidCount, pendingCount, partialCount, totalPayments: paymentHistory.length },
      paymentHistory,
      recentComplaints,
    });
  });

  // Get resident by ID
  app.get('/residents/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const profile = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!profile) return reply.status(404).send({ error: 'Resident not found' });
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
    if (!existing) return reply.status(404).send({ error: 'Resident not found' });
    db.update(tenantProfiles).set({ ...body, updatedAt: new Date().toISOString() })
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId))).run();
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
    if (!profile) return reply.status(404).send({ error: 'Resident not found' });

    const pendingPayments = db.select().from(rentPayments)
      .where(and(eq(rentPayments.tenantProfileId, id), inArray(rentPayments.paymentStatus, ['pending', 'overdue', 'partial'])))
      .all();
    if (pendingPayments.length > 0) {
      return reply.status(400).send({ error: 'Cannot checkout: pending payments exist', pendingAmount: pendingPayments.reduce((s, p) => s + (p.balanceAmount || 0), 0) });
    }

    const pendingComplaints = db.select().from(complaints)
      .where(and(eq(complaints.tenantProfileId, id), inArray(complaints.status, ['open', 'in_progress'])))
      .all();
    if (pendingComplaints.length > 0) {
      return reply.status(400).send({ error: 'Cannot checkout: pending complaints exist' });
    }

    const today = new Date().toISOString().split('T')[0];
    const userId = request.user!.userId;

    // Archive the resident data before checkout
    db.insert(archivedResidents).values({
      id: uuidv4(),
      originalId: id,
      tenantId,
      propertyId: profile.propertyId,
      roomId: profile.roomId,
      bedId: profile.bedId,
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      gender: profile.gender,
      occupation: profile.occupation,
      moveInDate: profile.moveInDate,
      moveOutDate: today,
      rentAmount: profile.rentAmount,
      depositPaid: profile.depositPaid,
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      reason: 'Checked out',
      originalData: JSON.stringify(profile),
    }).run();

    db.update(tenantProfiles).set({ status: 'checked_out', moveOutDate: today, updatedAt: new Date().toISOString() })
      .where(eq(tenantProfiles.id, id)).run();

    if (profile.bedId) {
      db.update(beds).set({ status: 'vacant', updatedAt: new Date().toISOString() })
        .where(eq(beds.id, profile.bedId)).run();
    }

    return reply.send({ message: 'Resident archived and checked out successfully', checkoutDate: today });
  });

  // Admin: Recalculate occupancy (kept for backward compatibility)
  app.post('/residents/recalculate', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { role: string };
    if (user.role !== 'owner' && user.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }
    return reply.send({ message: 'Occupancy is now calculated on-the-fly from bed statuses' });
  });
}
