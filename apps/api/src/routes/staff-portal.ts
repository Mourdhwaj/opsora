import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import {
  complaints, complaintComments, staff, users, properties, tenantProfiles,
  tasks, staffAttendance, activityLogs, notifications,
} from '../lib/schema';
import { eq, and, desc, asc, sql, gte, lte, like, inArray, isNull, ne } from 'drizzle-orm';

// ── Helper: ensure staff or owner/admin ────────────────────────────────────
function requireStaffAccess(request: any, reply: any): boolean {
  const role = request.user!.role;
  if (!['staff', 'owner', 'admin'].includes(role)) {
    reply.status(403).send({ error: 'Staff access required' });
    return false;
  }
  return true;
}

// ── SLA config (hours) by priority ─────────────────────────────────────────
const SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 8,
  medium: 24,
  low: 72,
};

function getSLADueDate(priority: string, createdAt: string): string {
  const hours = SLA_HOURS[priority] || 24;
  const created = new Date(createdAt).getTime();
  return new Date(created + hours * 3600000).toISOString();
}

function getSLAStatus(slaDue: string, status: string): string {
  if (status === 'resolved' || status === 'closed') return 'completed';
  const now = Date.now();
  const due = new Date(slaDue).getTime();
  if (now > due) return 'breached';
  if (now > due - 3600000) return 'warning';
  return 'on_track';
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Resolve staff profile from user ID ─────────────────────────────────────
function resolveStaffId(userId: string, tenantId: string): string | null {
  // First check if the user IS a staff member directly
  const staffRecord = db.select().from(staff)
    .where(and(eq(staff.userId, userId), eq(staff.tenantId, tenantId)))
    .get();
  if (staffRecord) return staffRecord.id;

  // If owner/admin, they don't have a staff profile — return null (admin mode)
  return null;
}

export async function staffPortalRoutes(app: FastifyInstance) {

  // ═══════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/staff/dashboard', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const role = request.user!.role;

    const staffId = resolveStaffId(userId, tenantId);

    // ── Ticket counts ──
    const isOwnerOrAdmin = role === 'owner' || role === 'admin';

    let myOpenConditions = [
      eq(complaints.tenantId, tenantId),
      ne(complaints.status, 'closed'),
      ne(complaints.status, 'resolved'),
    ];

    // Owners/admins see all open; staff see only assigned to them
    if (!isOwnerOrAdmin && staffId) {
      myOpenConditions.push(eq(complaints.assignedTo, staffId));
    }

    const myOpen = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(...myOpenConditions)).get()?.count ?? 0;

    const allOpen = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(
        eq(complaints.tenantId, tenantId),
        eq(complaints.status, 'open'),
      )).get()?.count ?? 0;

    const inProgress = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(
        eq(complaints.tenantId, tenantId),
        eq(complaints.status, 'in_progress'),
      )).get()?.count ?? 0;

    const resolvedToday = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(
        eq(complaints.tenantId, tenantId),
        eq(complaints.status, 'resolved'),
        gte(complaints.resolvedAt, new Date().toISOString().split('T')[0]),
      )).get()?.count ?? 0;

    // ── SLA breaches ──
    const urgentOpen = db.select().from(complaints)
      .where(and(
        eq(complaints.tenantId, tenantId),
        eq(complaints.priority, 'urgent'),
        ne(complaints.status, 'resolved'),
        ne(complaints.status, 'closed'),
      )).all();

    let slaBreached = 0;
    for (const c of urgentOpen) {
      const slaDue = getSLADueDate(c.priority, c.createdAt);
      if (getSLAStatus(slaDue, c.status) === 'breached') slaBreached++;
    }

    // ── Category breakdown ──
    const categoryCounts = db.select({
      category: complaints.category,
      count: sql<number>`count(*)`,
    }).from(complaints)
      .where(and(
        eq(complaints.tenantId, tenantId),
        ne(complaints.status, 'resolved'),
        ne(complaints.status, 'closed'),
      ))
      .groupBy(complaints.category).all();

    // ── Priority breakdown ──
    const priorityCounts = db.select({
      priority: complaints.priority,
      count: sql<number>`count(*)`,
    }).from(complaints)
      .where(and(
        eq(complaints.tenantId, tenantId),
        ne(complaints.status, 'resolved'),
        ne(complaints.status, 'closed'),
      ))
      .groupBy(complaints.priority).all();

    // ── My recent tickets ──
    let recentConditions = [eq(complaints.tenantId, tenantId)];
    if (!isOwnerOrAdmin && staffId) {
      recentConditions.push(eq(complaints.assignedTo, staffId));
    }
    const recentTickets = db.select().from(complaints)
      .where(and(...recentConditions))
      .orderBy(desc(complaints.updatedAt))
      .limit(5).all();

    // ── My tasks (if any) ──
    let myTasks: any[] = [];
    if (staffId) {
      myTasks = db.select().from(tasks)
        .where(and(
          eq(tasks.tenantId, tenantId),
          eq(tasks.assignedTo, staffId),
          ne(tasks.status, 'completed'),
        ))
        .orderBy(asc(tasks.scheduledDate))
        .limit(5).all();
    }

    // ── Today's attendance ──
    const today = new Date().toISOString().split('T')[0];
    let attendance: any = null;
    if (staffId) {
      attendance = db.select().from(staffAttendance)
        .where(and(
          eq(staffAttendance.staffId, staffId),
          eq(staffAttendance.date, today),
        )).get();
    }

    return reply.send({
      counts: {
        myOpen,
        allOpen,
        inProgress,
        resolvedToday,
        slaBreached,
      },
      categoryBreakdown: categoryCounts,
      priorityBreakdown: priorityCounts,
      recentTickets,
      myTasks,
      attendance,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE TICKET (staff can create new complaints)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post('/staff/tickets', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as {
      propertyId: string; title: string; description: string;
      category: string; priority?: string; roomId?: string; bedId?: string; tenantProfileId?: string;
    };

    if (!body.propertyId || !body.title || !body.description || !body.category) {
      return reply.status(400).send({ error: 'propertyId, title, description, and category are required' });
    }

    const prop = db.select().from(properties)
      .where(and(eq(properties.id, body.propertyId), eq(properties.tenantId, tenantId))).get();
    if (!prop) return reply.status(400).send({ error: 'Invalid propertyId' });

    const id = uuidv4();
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const staffId = resolveStaffId(userId, tenantId);

    db.insert(complaints).values({
      id, tenantId, propertyId: body.propertyId, roomId: body.roomId, bedId: body.bedId,
      tenantProfileId: body.tenantProfileId, ticketNumber, category: body.category,
      priority: body.priority || 'medium', title: body.title, description: body.description,
      status: 'open', assignedTo: staffId, assignedAt: staffId ? new Date().toISOString() : null,
      createdBy: userId,
    }).run();

    db.insert(activityLogs).values({
      id: uuidv4(), tenantId, actorType: 'user', actorId: userId,
      actorName: request.user!.email, action: 'ticket_created',
      entityType: 'complaint', entityId: id,
      newValues: JSON.stringify({ ticketNumber, title: body.title }),
    }).run();

    const ticket = db.select().from(complaints).where(eq(complaints.id, id)).get();
    return reply.status(201).send(ticket);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TICKET LIST (ServiceNow-style with filters, sorting, pagination)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/staff/tickets', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const role = request.user!.role;

    const {
      page = 1, limit = 25,
      status, priority, category, assignedTo, search,
      myTickets, sort = 'updatedAt', order = 'desc',
    } = request.query as {
      page?: number; limit?: number;
      status?: string; priority?: string; category?: string;
      assignedTo?: string; search?: string; myTickets?: string;
      sort?: string; order?: string;
    };

    const staffId = resolveStaffId(userId, tenantId);
    const offset = (page - 1) * limit;

    let conditions = [eq(complaints.tenantId, tenantId)];

    if (status) {
      const statuses = status.split(',');
      if (statuses.length === 1) {
        conditions.push(eq(complaints.status, status));
      } else {
        conditions.push(inArray(complaints.status, statuses));
      }
    }
    if (priority) conditions.push(eq(complaints.priority, priority));
    if (category) conditions.push(eq(complaints.category, category));
    if (assignedTo) conditions.push(eq(complaints.assignedTo, assignedTo));
    if (myTickets === 'true' && staffId) {
      conditions.push(eq(complaints.assignedTo, staffId));
    }
    if (search) {
      conditions.push(
        sql`(${complaints.title} LIKE ${'%' + search + '%'} OR ${complaints.ticketNumber} LIKE ${'%' + search + '%'} OR ${complaints.description} LIKE ${'%' + search + '%'})`
      );
    }

    // Sorting
    const sortColumn = sort === 'priority' ? complaints.priority
      : sort === 'status' ? complaints.status
      : sort === 'category' ? complaints.category
      : sort === 'createdAt' ? complaints.createdAt
      : complaints.updatedAt;
    const orderFn = order === 'asc' ? asc : desc;

    const data = db.select().from(complaints)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit).offset(offset).all();

    const total = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(...conditions)).get()?.count ?? 0;

    // Enrich with staff names and SLA info
    const staffMap = new Map<string, string>();
    const allStaff = db.select().from(staff).where(eq(staff.tenantId, tenantId)).all();
    for (const s of allStaff) staffMap.set(s.id, s.fullName);

    const enriched = data.map((ticket) => {
      const slaDue = getSLADueDate(ticket.priority, ticket.createdAt);
      const slaStatus = getSLAStatus(slaDue, ticket.status);
      return {
        ...ticket,
        assignedStaffName: ticket.assignedTo ? staffMap.get(ticket.assignedTo) || 'Unknown' : null,
        slaDue,
        slaStatus,
        timeAgo: formatTimeAgo(ticket.updatedAt || ticket.createdAt),
      };
    });

    return reply.send({
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TICKET DETAIL (with full thread, SLA, metadata)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/staff/tickets/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const ticket = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

    // Get comments/thread
    const comments = db.select().from(complaintComments)
      .where(eq(complaintComments.complaintId, id))
      .orderBy(asc(complaintComments.createdAt)).all();

    // Enrich comments with author names
    const enrichedComments = comments.map((c) => {
      let authorName = 'System';
      let authorRole = 'system';
      if (c.userId) {
        const user = db.select().from(users).where(eq(users.id, c.userId)).get();
        if (user) {
          authorName = user.fullName;
          authorRole = user.role;
        }
      } else if (c.tenantProfileId) {
        const profile = db.select().from(tenantProfiles)
          .where(eq(tenantProfiles.id, c.tenantProfileId)).get();
        if (profile) {
          authorName = profile.fullName;
          authorRole = 'resident';
        }
      }
      return { ...c, authorName, authorRole };
    });

    // Get assigned staff info
    let assignedStaffInfo = null;
    if (ticket.assignedTo) {
      assignedStaffInfo = db.select().from(staff)
        .where(eq(staff.id, ticket.assignedTo)).get();
    }

    // Get property info
    const property = db.select().from(properties)
      .where(eq(properties.id, ticket.propertyId)).get();

    // Get creator info
    let creatorName = 'Unknown';
    if (ticket.createdBy) {
      const creator = db.select().from(users).where(eq(users.id, ticket.createdBy)).get();
      if (creator) creatorName = creator.fullName;
    }

    // SLA
    const slaDue = getSLADueDate(ticket.priority, ticket.createdAt);
    const slaStatus = getSLAStatus(slaDue, ticket.status);
    const slaRemaining = Math.max(0, new Date(slaDue).getTime() - Date.now());

    return reply.send({
      ...ticket,
      comments: enrichedComments,
      assignedStaffInfo: assignedStaffInfo ? {
        id: assignedStaffInfo.id,
        fullName: assignedStaffInfo.fullName,
        role: assignedStaffInfo.role,
        phone: assignedStaffInfo.phone,
      } : null,
      property: property ? { name: property.name, address: property.address } : null,
      creatorName,
      slaDue,
      slaStatus,
      slaRemainingHours: Math.round(slaRemaining / 3600000 * 10) / 10,
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD REPLY (public comment visible to resident)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post('/staff/tickets/:id/reply', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as { comment: string };

    if (!body.comment?.trim()) {
      return reply.status(400).send({ error: 'Reply message is required' });
    }

    const ticket = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

    const commentId = uuidv4();
    db.insert(complaintComments).values({
      id: commentId,
      complaintId: id,
      userId,
      comment: body.comment.trim(),
      isInternal: false,
    }).run();

    // Update ticket timestamp
    db.update(complaints).set({ updatedAt: new Date().toISOString() })
      .where(eq(complaints.id, id)).run();

    // Log activity
    db.insert(activityLogs).values({
      id: uuidv4(),
      tenantId,
      actorType: 'user',
      actorId: userId,
      actorName: request.user!.email,
      action: 'ticket_reply',
      entityType: 'complaint',
      entityId: id,
      newValues: JSON.stringify({ commentId, preview: body.comment.trim().slice(0, 100) }),
    }).run();

    const comment = db.select().from(complaintComments)
      .where(eq(complaintComments.id, commentId)).get();

    const user = db.select().from(users).where(eq(users.id, userId)).get();

    return reply.status(201).send({
      ...comment,
      authorName: user?.fullName || 'Unknown',
      authorRole: user?.role || 'staff',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD WORK NOTE (internal note, not visible to resident)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post('/staff/tickets/:id/work-note', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as { note: string };

    if (!body.note?.trim()) {
      return reply.status(400).send({ error: 'Work note is required' });
    }

    const ticket = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

    const noteId = uuidv4();
    db.insert(complaintComments).values({
      id: noteId,
      complaintId: id,
      userId,
      comment: body.note.trim(),
      isInternal: true,
    }).run();

    // Update timestamp
    db.update(complaints).set({ updatedAt: new Date().toISOString() })
      .where(eq(complaints.id, id)).run();

    // Log activity
    db.insert(activityLogs).values({
      id: uuidv4(),
      tenantId,
      actorType: 'user',
      actorId: userId,
      actorName: request.user!.email,
      action: 'ticket_work_note',
      entityType: 'complaint',
      entityId: id,
      newValues: JSON.stringify({ noteId, preview: body.note.trim().slice(0, 100) }),
    }).run();

    const user = db.select().from(users).where(eq(users.id, userId)).get();

    return reply.status(201).send({
      id: noteId,
      complaintId: id,
      userId,
      comment: body.note.trim(),
      isInternal: true,
      authorName: user?.fullName || 'Unknown',
      authorRole: user?.role || 'staff',
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE TICKET STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  app.patch('/staff/tickets/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as { status: string; resolutionNotes?: string };

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(body.status)) {
      return reply.status(400).send({ error: 'Invalid status' });
    }

    const ticket = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

    const updates: Record<string, unknown> = {
      status: body.status,
      updatedAt: new Date().toISOString(),
    };

    if (body.status === 'in_progress' && !ticket.assignedAt) {
      updates.assignedAt = new Date().toISOString();
    }
    if (body.resolutionNotes) {
      updates.resolutionNotes = body.resolutionNotes;
    }
    if (body.status === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
    }
    if (body.status === 'closed') {
      updates.closedAt = new Date().toISOString();
    }

    db.update(complaints).set(updates)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId))).run();

    // Auto-assign if not assigned
    if (!ticket.assignedTo) {
      const staffId = resolveStaffId(userId, tenantId);
      if (staffId) {
        db.update(complaints).set({
          assignedTo: staffId,
          assignedAt: new Date().toISOString(),
        }).where(eq(complaints.id, id)).run();
      }
    }

    // Log activity
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    db.insert(activityLogs).values({
      id: uuidv4(),
      tenantId,
      actorType: 'user',
      actorId: userId,
      actorName: user?.fullName || request.user!.email,
      action: 'ticket_status_change',
      entityType: 'complaint',
      entityId: id,
      oldValues: JSON.stringify({ status: ticket.status }),
      newValues: JSON.stringify({ status: body.status }),
    }).run();

    // Auto-generate work note for status change
    db.insert(complaintComments).values({
      id: uuidv4(),
      complaintId: id,
      userId,
      comment: `Status changed from "${ticket.status}" to "${body.status}"${body.resolutionNotes ? `. ${body.resolutionNotes}` : ''}`,
      isInternal: true,
    }).run();

    const updated = db.select().from(complaints).where(eq(complaints.id, id)).get();
    return reply.send(updated);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ASSIGN TICKET
  // ═══════════════════════════════════════════════════════════════════════════
  app.patch('/staff/tickets/:id/assign', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as { staffId: string };

    const ticket = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

    const targetStaff = db.select().from(staff)
      .where(and(eq(staff.id, body.staffId), eq(staff.tenantId, tenantId)))
      .get();
    if (!targetStaff) return reply.status(400).send({ error: 'Invalid staff member' });

    db.update(complaints).set({
      assignedTo: body.staffId,
      assignedAt: new Date().toISOString(),
      status: ticket.status === 'open' ? 'in_progress' : ticket.status,
      updatedAt: new Date().toISOString(),
    }).where(eq(complaints.id, id)).run();

    // Log activity
    db.insert(activityLogs).values({
      id: uuidv4(),
      tenantId,
      actorType: 'user',
      actorId: userId,
      actorName: request.user!.email,
      action: 'ticket_assigned',
      entityType: 'complaint',
      entityId: id,
      oldValues: JSON.stringify({ assignedTo: ticket.assignedTo }),
      newValues: JSON.stringify({ assignedTo: body.staffId, staffName: targetStaff.fullName }),
    }).run();

    // Work note
    db.insert(complaintComments).values({
      id: uuidv4(),
      complaintId: id,
      userId,
      comment: `Assigned to ${targetStaff.fullName} (${targetStaff.role})`,
      isInternal: true,
    }).run();

    const updated = db.select().from(complaints).where(eq(complaints.id, id)).get();
    return reply.send(updated);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF LIST (for assignment dropdown)
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/staff/list', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;

    const staffList = db.select().from(staff)
      .where(and(eq(staff.tenantId, tenantId), eq(staff.isActive, true)))
      .all();

    const enriched = staffList.map((s) => {
      const openCount = db.select({ count: sql<number>`count(*)` }).from(complaints)
        .where(and(
          eq(complaints.tenantId, tenantId),
          eq(complaints.assignedTo, s.id),
          ne(complaints.status, 'resolved'),
          ne(complaints.status, 'closed'),
        )).get()?.count ?? 0;

      return {
        id: s.id,
        fullName: s.fullName,
        role: s.role,
        phone: s.phone,
        openTicketCount: openCount,
      };
    });

    return reply.send(enriched);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF PROFILE
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/staff/profile', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;

    const user = db.select().from(users)
      .where(eq(users.id, userId)).get();
    if (!user) return reply.status(404).send({ error: 'User not found' });

    const staffRecord = db.select().from(staff)
      .where(and(eq(staff.userId, userId), eq(staff.tenantId, tenantId)))
      .get();

    // Get my performance stats
    let stats = { totalAssigned: 0, resolved: 0, open: 0, avgResolutionHours: 0 };

    if (staffRecord) {
      const totalAssigned = db.select({ count: sql<number>`count(*)` }).from(complaints)
        .where(and(eq(complaints.tenantId, tenantId), eq(complaints.assignedTo, staffRecord.id)))
        .get()?.count ?? 0;

      const resolved = db.select({ count: sql<number>`count(*)` }).from(complaints)
        .where(and(
          eq(complaints.tenantId, tenantId),
          eq(complaints.assignedTo, staffRecord.id),
          eq(complaints.status, 'resolved'),
        )).get()?.count ?? 0;

      const open = db.select({ count: sql<number>`count(*)` }).from(complaints)
        .where(and(
          eq(complaints.tenantId, tenantId),
          eq(complaints.assignedTo, staffRecord.id),
          ne(complaints.status, 'resolved'),
          ne(complaints.status, 'closed'),
        )).get()?.count ?? 0;

      stats = { totalAssigned, resolved, open, avgResolutionHours: 0 };

      // Recent attendance
      const attendance = db.select().from(staffAttendance)
        .where(eq(staffAttendance.staffId, staffRecord.id))
        .orderBy(desc(staffAttendance.date))
        .limit(30).all();

      return reply.send({
        user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone },
        staff: staffRecord,
        stats,
        recentAttendance: attendance,
      });
    }

    // For owner/admin without staff record
    return reply.send({
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, phone: user.phone },
      staff: null,
      stats,
      recentAttendance: [],
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK-IN / CHECK-OUT (Attendance)
  // ═══════════════════════════════════════════════════════════════════════════
  app.post('/staff/checkin', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as { location?: string };
    const today = new Date().toISOString().split('T')[0];

    const staffId = resolveStaffId(userId, tenantId);
    if (!staffId) return reply.status(400).send({ error: 'No staff profile linked' });

    const existing = db.select().from(staffAttendance)
      .where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.date, today)))
      .get();

    if (existing?.checkIn) {
      return reply.status(400).send({ error: 'Already checked in today' });
    }

    if (existing) {
      db.update(staffAttendance).set({
        checkIn: new Date().toISOString(),
        checkInLocation: body.location,
        status: 'present',
      }).where(eq(staffAttendance.id, existing.id)).run();
    } else {
      db.insert(staffAttendance).values({
        id: uuidv4(),
        tenantId,
        staffId,
        date: today,
        checkIn: new Date().toISOString(),
        checkInLocation: body.location,
        status: 'present',
      }).run();
    }

    return reply.send({ message: 'Checked in successfully' });
  });

  app.post('/staff/checkout', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = request.body as { location?: string };
    const today = new Date().toISOString().split('T')[0];

    const staffId = resolveStaffId(userId, tenantId);
    if (!staffId) return reply.status(400).send({ error: 'No staff profile linked' });

    const existing = db.select().from(staffAttendance)
      .where(and(eq(staffAttendance.staffId, staffId), eq(staffAttendance.date, today)))
      .get();

    if (!existing?.checkIn) {
      return reply.status(400).send({ error: 'Not checked in today' });
    }
    if (existing.checkOut) {
      return reply.status(400).send({ error: 'Already checked out today' });
    }

    db.update(staffAttendance).set({
      checkOut: new Date().toISOString(),
      checkOutLocation: body.location,
    }).where(eq(staffAttendance.id, existing.id)).run();

    return reply.send({ message: 'Checked out successfully' });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MY TASKS
  // ═══════════════════════════════════════════════════════════════════════════
  app.get('/staff/tasks', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;

    const staffId = resolveStaffId(userId, tenantId);

    let conditions = [eq(tasks.tenantId, tenantId)];
    if (staffId) {
      conditions.push(eq(tasks.assignedTo, staffId));
    }

    const myTasks = db.select().from(tasks)
      .where(and(...conditions))
      .orderBy(asc(tasks.scheduledDate))
      .all();

    return reply.send(myTasks);
  });

  app.patch('/staff/tasks/:id/complete', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireStaffAccess(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as { completionNotes?: string };

    const task = db.select().from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
      .get();
    if (!task) return reply.status(404).send({ error: 'Task not found' });

    db.update(tasks).set({
      status: 'completed',
      completedAt: new Date().toISOString(),
      completionNotes: body.completionNotes,
    }).where(eq(tasks.id, id)).run();

    return reply.send({ message: 'Task completed' });
  });
}
