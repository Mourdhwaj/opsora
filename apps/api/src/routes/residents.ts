import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { tenantProfiles, beds, rooms, properties, rentPayments, complaints, archivedResidents, activityLogs } from '../lib/schema';
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

  // ── Group Check-in (multiple residents in one transaction) ─────────────────
  // POST /residents/checkin-group  { propertyId, moveInDate, residents: [{ fullName, phone, email?, gender, dateOfBirth?, bloodGroup?, aadhaarNumber?, panNumber?, passportNumber?, occupation?, companyName?, collegeName?, workAddress?, emergencyName?, emergencyPhone?, emergencyRelation?, bedId, rentAmount, depositPaid, foodPreference?, mealPlan?, specialDietary? }] }
  app.post('/residents/checkin-group', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as {
      propertyId: string;
      moveInDate: string;
      residents: Array<{
        fullName: string;
        phone: string;
        email?: string;
        gender: 'male' | 'female' | 'other';
        dateOfBirth?: string;
        bloodGroup?: string;
        aadhaarNumber?: string;
        panNumber?: string;
        passportNumber?: string;
        occupation?: string;
        companyName?: string;
        collegeName?: string;
        workAddress?: string;
        emergencyName?: string;
        emergencyPhone?: string;
        emergencyRelation?: string;
        bedId: string;
        rentAmount: number;
        depositPaid: number;
        foodPreference?: string;
        mealPlan?: string;
        specialDietary?: string;
      }>;
    };

    const tenantId = request.user!.tenantId;
    const { propertyId, moveInDate, residents } = body;

    if (!propertyId || !moveInDate || !residents || residents.length === 0) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    // Verify all beds are vacant and belong to the property
    const bedIds = residents.map(r => r.bedId);
    const bedRecords = db.select().from(beds)
      .where(and(eq(beds.propertyId, propertyId), inArray(beds.id, bedIds)))
      .all();

    if (bedRecords.length !== bedIds.length) {
      return reply.status(400).send({ error: 'Some beds not found in this property' });
    }

    const occupiedBeds = bedRecords.filter(b => b.status !== 'vacant');
    if (occupiedBeds.length > 0) {
      return reply.status(400).send({ error: 'Some beds are not available', beds: occupiedBeds.map(b => b.bedNumber) });
    }

    // Verify gender rules for each bed's room
    const roomIds = [...new Set(bedRecords.map(b => b.roomId))];
    const roomRecords = db.select().from(rooms).where(inArray(rooms.id, roomIds)).all();
    const roomGenderMap = new Map(roomRecords.map(r => [r.id, r.gender]));

    for (const resident of residents) {
      const bed = bedRecords.find(b => b.id === resident.bedId);
      if (!bed) continue;
      const roomGender = roomGenderMap.get(bed.roomId);
      if (roomGender === 'male' && resident.gender !== 'male') {
        return reply.status(400).send({ error: `Bed ${bed.bedNumber} is in a male-only room` });
      }
      if (roomGender === 'female' && resident.gender !== 'female') {
        return reply.status(400).send({ error: `Bed ${bed.bedNumber} is in a female-only room` });
      }
    }

    const createdResidents: any[] = [];

    // Transaction: create all residents and update bed statuses
    db.transaction(() => {
      for (const resident of residents) {
        const id = uuidv4();
        db.insert(tenantProfiles).values({
          id,
          tenantId,
          propertyId,
          roomId: bedRecords.find(b => b.id === resident.bedId)?.roomId || null,
          bedId: resident.bedId,
          fullName: resident.fullName,
          phone: resident.phone,
          email: resident.email,
          dateOfBirth: resident.dateOfBirth,
          gender: resident.gender,
          bloodGroup: resident.bloodGroup,
          aadhaarNumber: resident.aadhaarNumber,
          panNumber: resident.panNumber,
          passportNumber: resident.passportNumber,
          occupation: resident.occupation,
          companyName: resident.companyName,
          collegeName: resident.collegeName,
          workAddress: resident.workAddress,
          emergencyName: resident.emergencyName,
          emergencyPhone: resident.emergencyPhone,
          emergencyRelation: resident.emergencyRelation,
          moveInDate,
          rentAmount: resident.rentAmount,
          depositPaid: resident.depositPaid,
          mealPreferences: JSON.stringify({
            preference: resident.foodPreference || 'vegetarian',
            plan: resident.mealPlan || 'both',
            specialDietary: resident.specialDietary || '',
          }),
          status: 'active',
        }).run();

        db.update(beds).set({
          status: 'occupied',
          updatedAt: new Date().toISOString(),
        }).where(eq(beds.id, resident.bedId)).run();

        const profile = db.select().from(tenantProfiles).where(eq(tenantProfiles.id, id)).get();
        createdResidents.push(profile);
      }
    });

    return reply.status(201).send({ residents: createdResidents });
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

  // Check-out resident with deposit refund
  app.post('/residents/:id/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as {
      moveOutDate?: string;
      refundAmount?: number;
      deductions?: Array<{ reason: string; amount: number }>;
      notes?: string;
    };
    
    const profile = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!profile) return reply.status(404).send({ error: 'Resident not found' });

    // Check for pending payments
    const pendingPayments = db.select().from(rentPayments)
      .where(and(
        eq(rentPayments.tenantProfileId, id),
        sql`${rentPayments.paymentStatus} IN ('pending', 'overdue', 'partial')`,
      ))
      .all();
    if (pendingPayments.length > 0) {
      return reply.status(400).send({ 
        error: 'Cannot checkout: pending payments exist', 
        pendingAmount: pendingPayments.reduce((s, p) => s + (p.balanceAmount || 0), 0) 
      });
    }

    // Check for pending complaints
    const pendingComplaints = db.select().from(complaints)
      .where(and(eq(complaints.tenantProfileId, id), sql`${complaints.status} IN ('open', 'in_progress')`))
      .all();
    if (pendingComplaints.length > 0) {
      return reply.status(400).send({ error: 'Cannot checkout: pending complaints exist' });
    }

    const today = body.moveOutDate || new Date().toISOString().split('T')[0];
    const userId = request.user!.userId;
    const depositPaid = profile.depositPaid || 0;
    const totalDeductions = body.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
    const refundAmount = body.refundAmount ?? Math.max(0, depositPaid - totalDeductions);

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
      depositPaid,
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      reason: body.notes || 'Checked out',
      originalData: JSON.stringify(profile),
    }).run();

    // Update resident status
    db.update(tenantProfiles).set({ 
      status: 'checked_out', 
      moveOutDate: today, 
      updatedAt: new Date().toISOString() 
    }).where(eq(tenantProfiles.id, id)).run();

    // Free up the bed
    if (profile.bedId) {
      db.update(beds).set({ status: 'vacant', updatedAt: new Date().toISOString() })
        .where(eq(beds.id, profile.bedId)).run();
    }

    // Log activity
    db.insert(activityLogs).values({
      id: uuidv4(),
      tenantId,
      actorType: 'user',
      actorId: userId,
      actorName: profile.fullName,
      action: 'resident_checked_out',
      entityType: 'resident',
      entityId: id,
      oldValues: JSON.stringify({ depositPaid, status: 'active' }),
      newValues: JSON.stringify({
        moveOutDate: today,
        depositPaid,
        refundAmount,
        deductions: body.deductions,
      }),
      createdAt: new Date().toISOString(),
    }).run();

    return reply.send({ 
      message: 'Resident checked out successfully',
      resident: profile.fullName,
      depositPaid,
      totalDeductions,
      deductions: body.deductions || [],
      refundAmount,
      moveOutDate: today,
    });
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
