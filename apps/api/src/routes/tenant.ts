import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import {
  users, tenantProfiles, rentPayments, complaints, complaintComments, properties, rooms,
  notifications, staff, activityLogs,
} from '../lib/schema';
import { eq, and, desc } from 'drizzle-orm';

/** Helper: look up the resident's tenantProfileId from the users table. */
function getResidentProfile(userId: string, tenantId: string) {
  const userRecord = db.select().from(users)
    .where(eq(users.id, userId))
    .get();
  if (!userRecord?.tenantProfileId) return null;
  return db.select().from(tenantProfiles)
    .where(eq(tenantProfiles.id, userRecord.tenantProfileId))
    .get();
}

export async function tenantPortalRoutes(app: FastifyInstance) {
  // ── Get my profile ──────────────────────────────────────────────────────
  app.get('/tenant/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }

    const profile = getResidentProfile(user.userId, user.tenantId);

    if (!profile) {
      return reply.status(404).send({ error: 'Resident profile not found' });
    }

    // Get property info
    const property = db.select().from(properties)
      .where(eq(properties.id, profile.propertyId))
      .get();

    // Get room info
    const room = db.select().from(rooms)
      .where(eq(rooms.id, profile.roomId))
      .get();

    return reply.send({
      ...profile,
      propertyName: property?.name ?? null,
      propertyAddress: property?.address ?? null,
      propertyCity: property?.city ?? null,
      roomNumber: room?.roomNumber ?? null,
      roomType: room?.roomType ?? null,
    });
  });

  // ── Tenant dashboard overview ───────────────────────────────────────────
  app.get('/tenant/dashboard', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }

    const profile = getResidentProfile(user.userId, user.tenantId);

    if (!profile) {
      return reply.status(404).send({ error: 'Resident profile not found' });
    }

    const property = db.select().from(properties)
      .where(eq(properties.id, profile.propertyId))
      .get();

    const room = db.select().from(rooms)
      .where(eq(rooms.id, profile.roomId))
      .get();

    // Current month payments
    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthPayments = db.select().from(rentPayments)
      .where(and(
        eq(rentPayments.tenantId, user.tenantId),
        eq(rentPayments.tenantProfileId, profile.id),
        eq(rentPayments.monthYear, currentMonth),
      ))
      .all();

    const totalDue = currentMonthPayments.reduce((s, p) => s + p.totalAmount, 0);
    const totalPaid = currentMonthPayments.reduce((s, p) => s + p.paidAmount, 0);
    const totalPending = totalDue - totalPaid;
    const latestPayment = currentMonthPayments[0];

    // Open complaints count
    const openComplaints = db.select().from(complaints)
      .where(and(
        eq(complaints.tenantId, user.tenantId),
        eq(complaints.tenantProfileId, profile.id),
        eq(complaints.status, 'open'),
      ))
      .all().length;

    const urgentComplaints = db.select().from(complaints)
      .where(and(
        eq(complaints.tenantId, user.tenantId),
        eq(complaints.tenantProfileId, profile.id),
        eq(complaints.status, 'open'),
        eq(complaints.priority, 'urgent'),
      ))
      .all().length;

    // Recent payments (last 6 months)
    const recentPayments = db.select().from(rentPayments)
      .where(and(
        eq(rentPayments.tenantId, user.tenantId),
        eq(rentPayments.tenantProfileId, profile.id),
      ))
      .orderBy(desc(rentPayments.monthYear))
      .limit(6)
      .all();

    return reply.send({
      profile: {
        fullName: profile.fullName,
        phone: profile.phone,
        email: profile.email,
        moveInDate: profile.moveInDate,
        rentAmount: profile.rentAmount,
        depositPaid: profile.depositPaid,
        status: profile.status,
        foodOptIn: profile.foodOptIn,
        occupation: profile.occupation,
      },
      property: {
        name: property?.name ?? null,
        address: property?.address ?? null,
        city: property?.city ?? null,
      },
      room: {
        number: room?.roomNumber ?? null,
        type: room?.roomType ?? null,
      },
      payments: {
        currentMonth: {
          due: totalDue,
          paid: totalPaid,
          pending: totalPending,
          status: latestPayment?.paymentStatus ?? 'pending',
        },
        recent: recentPayments.map(p => ({
          monthYear: p.monthYear,
          totalAmount: p.totalAmount,
          paidAmount: p.paidAmount,
          balanceAmount: p.balanceAmount,
          paymentStatus: p.paymentStatus,
          paidDate: p.paidDate,
        })),
      },
      complaints: {
        open: openComplaints,
        urgent: urgentComplaints,
      },
    });
  });

  // ── My payments (filtered by tenantProfileId) ──────────────────────────
  app.get('/tenant/payments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }

    const { page = 1, limit = 20, monthYear } = request.query as {
      page?: number; limit?: number; monthYear?: string;
    };

    const profile = getResidentProfile(user.userId, user.tenantId);

    if (!profile) {
      return reply.status(404).send({ error: 'Resident profile not found' });
    }

    const offset = (page - 1) * limit;
    const conditions = [
      eq(rentPayments.tenantId, user.tenantId),
      eq(rentPayments.tenantProfileId, profile.id),
    ];
    if (monthYear) conditions.push(eq(rentPayments.monthYear, monthYear));

    const data = db.select().from(rentPayments)
      .where(and(...conditions))
      .orderBy(desc(rentPayments.monthYear))
      .limit(limit).offset(offset)
      .all();

    const total = db.select().from(rentPayments)
      .where(and(...conditions))
      .all().length;

    // Summary
    const allPayments = db.select().from(rentPayments)
      .where(and(
        eq(rentPayments.tenantId, user.tenantId),
        eq(rentPayments.tenantProfileId, profile.id),
      ))
      .all();

    const totalExpected = allPayments.reduce((s, p) => s + p.totalAmount, 0);
    const totalCollected = allPayments.reduce((s, p) => s + p.paidAmount, 0);

    return reply.send({
      data,
      summary: {
        totalExpected,
        totalCollected,
        totalPending: totalExpected - totalCollected,
        collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0',
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ── My complaints (filtered by tenantProfileId) ────────────────────────
  app.get('/tenant/complaints', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }

    const { page = 1, limit = 20, status } = request.query as {
      page?: number; limit?: number; status?: string;
    };

    const profile = getResidentProfile(user.userId, user.tenantId);

    if (!profile) {
      return reply.status(404).send({ error: 'Resident profile not found' });
    }

    const offset = (page - 1) * limit;
    const conditions = [
      eq(complaints.tenantId, user.tenantId),
      eq(complaints.tenantProfileId, profile.id),
    ];
    if (status) conditions.push(eq(complaints.status, status));

    const data = db.select().from(complaints)
      .where(and(...conditions))
      .orderBy(desc(complaints.createdAt))
      .limit(limit).offset(offset)
      .all();

    const total = db.select().from(complaints)
      .where(and(...conditions))
      .all().length;

    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // ── Create complaint (auto-assign tenantProfileId) ─────────────────────
  app.post('/tenant/complaints', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }

    const profile = getResidentProfile(user.userId, user.tenantId);

    if (!profile) {
      return reply.status(404).send({ error: 'Resident profile not found' });
    }

    const body = request.body as { category: string; priority?: string; title: string; description: string };
    if (!body?.title || !body?.description || !body?.category) {
      return reply.status(400).send({ error: 'title, description, and category are required' });
    }

    const id = uuidv4();
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    db.insert(complaints).values({
      id,
      tenantId: user.tenantId,
      propertyId: profile.propertyId,
      roomId: profile.roomId,
      bedId: profile.bedId,
      tenantProfileId: profile.id,
      ticketNumber,
      category: body.category,
      priority: body.priority ?? 'medium',
      title: body.title,
      description: body.description,
      createdBy: user.userId,
    }).run();

    const complaint = db.select().from(complaints).where(eq(complaints.id, id)).get();
    return reply.status(201).send(complaint);
  });

  // ── My complaint detail (with thread) ─────────────────────────────────
  app.get('/tenant/complaints/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }
    const { id } = request.params as { id: string };
    const profile = getResidentProfile(user.userId, user.tenantId);
    if (!profile) return reply.status(404).send({ error: 'Resident profile not found' });

    const complaint = db.select().from(complaints)
      .where(and(
        eq(complaints.id, id),
        eq(complaints.tenantId, user.tenantId),
        eq(complaints.tenantProfileId, profile.id),
      )).get();
    if (!complaint) return reply.status(404).send({ error: 'Ticket not found' });

    const comments = db.select().from(complaintComments)
      .where(eq(complaintComments.complaintId, id))
      .orderBy(complaintComments.createdAt).all();

    // Enrich comments (hide internal notes from residents)
    const visibleComments = comments.filter(c => !c.isInternal).map((c) => {
      let authorName = 'System';
      let authorRole = 'system';
      if (c.userId) {
        const u = db.select().from(users).where(eq(users.id, c.userId)).get();
        if (u) { authorName = u.fullName; authorRole = u.role; }
      }
      return { ...c, authorName, authorRole };
    });

    // Assigned staff info
    let assignedStaff = null;
    if (complaint.assignedTo) {
      const s = db.select().from(staff).where(eq(staff.id, complaint.assignedTo)).get();
      if (s) assignedStaff = { fullName: s.fullName, role: s.role };
    }

    return reply.send({ ...complaint, comments: visibleComments, assignedStaff });
  });

  // ── Reply to my complaint ───────────────────────────────────────────────
  app.post('/tenant/complaints/:id/comments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }
    const { id } = request.params as { id: string };
    const body = request.body as { comment: string };
    const profile = getResidentProfile(user.userId, user.tenantId);
    if (!profile) return reply.status(404).send({ error: 'Resident profile not found' });

    if (!body.comment?.trim()) {
      return reply.status(400).send({ error: 'Comment is required' });
    }

    const complaint = db.select().from(complaints)
      .where(and(
        eq(complaints.id, id),
        eq(complaints.tenantId, user.tenantId),
        eq(complaints.tenantProfileId, profile.id),
      )).get();
    if (!complaint) return reply.status(404).send({ error: 'Ticket not found' });

    const commentId = uuidv4();
    db.insert(complaintComments).values({
      id: commentId,
      complaintId: id,
      tenantProfileId: profile.id,
      comment: body.comment.trim(),
      isInternal: false,
    }).run();

    db.update(complaints).set({ updatedAt: new Date().toISOString() })
      .where(eq(complaints.id, id)).run();

    db.insert(activityLogs).values({
      id: uuidv4(), tenantId: user.tenantId, actorType: 'resident',
      actorId: profile.id, actorName: profile.fullName,
      action: 'ticket_reply', entityType: 'complaint', entityId: id,
      newValues: JSON.stringify({ preview: body.comment.trim().slice(0, 100) }),
    }).run();

    return reply.status(201).send({
      id: commentId, complaintId: id, tenantProfileId: profile.id,
      comment: body.comment.trim(), isInternal: false,
      authorName: profile.fullName, authorRole: 'resident',
    });
  });

  // ── Rate resolved complaint ─────────────────────────────────────────────
  app.post('/tenant/complaints/:id/rate', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }
    const { id } = request.params as { id: string };
    const body = request.body as { rating: number; feedback?: string };
    const profile = getResidentProfile(user.userId, user.tenantId);
    if (!profile) return reply.status(404).send({ error: 'Resident profile not found' });

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return reply.status(400).send({ error: 'Rating must be between 1 and 5' });
    }

    const complaint = db.select().from(complaints)
      .where(and(
        eq(complaints.id, id),
        eq(complaints.tenantId, user.tenantId),
        eq(complaints.tenantProfileId, profile.id),
      )).get();
    if (!complaint) return reply.status(404).send({ error: 'Ticket not found' });

    db.update(complaints).set({
      tenantRating: body.rating,
      tenantFeedback: body.feedback,
      updatedAt: new Date().toISOString(),
    }).where(eq(complaints.id, id)).run();

    return reply.send({ message: 'Rating submitted', rating: body.rating });
  });

  // ── Notifications for this resident ─────────────────────────────────────
  app.get('/tenant/notifications', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = request.user!;
    if (user.role !== 'resident') {
      return reply.status(403).send({ error: 'Only residents can access this endpoint' });
    }

    const profile = getResidentProfile(user.userId, user.tenantId);

    if (!profile) {
      return reply.status(404).send({ error: 'Resident profile not found' });
    }

    const notifs = db.select().from(notifications)
      .where(and(
        eq(notifications.tenantId, user.tenantId),
        eq(notifications.tenantProfileId, profile.id),
      ))
      .orderBy(desc(notifications.createdAt))
      .limit(20)
      .all();

    const unreadCount = db.select().from(notifications)
      .where(and(
        eq(notifications.tenantId, user.tenantId),
        eq(notifications.tenantProfileId, profile.id),
        eq(notifications.isRead, false),
      ))
      .all().length;

    return reply.send({ notifications: notifs, unreadCount });
  });
}
