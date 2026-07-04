import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { complaints, complaintComments, properties, users, tenantProfiles } from '../lib/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { createComplaintSchema, parseBody } from '../types';

import { sanitize } from '../lib/sanitize';

// Helper: resolve tenantProfileId from JWT userId
function resolveProfileId(userId: string): string | null {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  return user?.tenantProfileId || null;
}

export async function complaintRoutes(app: FastifyInstance) {
  // List complaints
  app.get('/complaints', { preHandler: [authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, propertyId, status, priority, category } = request.query as {
      page?: number; limit?: number; propertyId?: string; status?: string;
      priority?: string; category?: string;
    };
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(complaints.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(complaints.propertyId, propertyId));
    if (status) conditions.push(eq(complaints.status, status));
    if (priority) conditions.push(eq(complaints.priority, priority));
    if (category) conditions.push(eq(complaints.category, category));

    const data = db.select().from(complaints)
      .where(and(...conditions))
      .orderBy(desc(complaints.createdAt))
      .limit(limit).offset(offset)
      .all();

    const total = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(...conditions)).get()?.count ?? 0;

    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Create complaint
  app.post('/complaints', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createComplaintSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    // Validate property exists
    const prop = db.select().from(properties)
      .where(and(eq(properties.id, body.propertyId), eq(properties.tenantId, tenantId))).get();
    if (!prop) return reply.status(400).send({ error: 'Invalid propertyId' });

    const id = uuidv4();
    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}`;

    db.insert(complaints).values({
      id,
      tenantId,
      propertyId: body.propertyId,
      roomId: body.roomId,
      bedId: body.bedId,
      tenantProfileId: body.tenantProfileId,
      ticketNumber,
      category: body.category,
      priority: body.priority,
      title: sanitize(body.title),
      description: sanitize(body.description),
      createdBy: request.user!.userId,
    }).run();

    const complaint = db.select().from(complaints).where(eq(complaints.id, id)).get();
    return reply.status(201).send(complaint);
  });

  // Get complaint by ID with comments (with IDOR protection for residents)
  app.get('/complaints/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const complaint = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!complaint) {
      return reply.status(404).send({ error: 'Complaint not found' });
    }

    // IDOR protection: residents can only view their own complaints
    if (request.user!.role === 'resident') {
      const profileId = resolveProfileId(request.user!.userId);
      if (!profileId || complaint.tenantProfileId !== profileId) {
        return reply.status(403).send({ error: 'Access denied' });
      }
    }

    const comments = db.select().from(complaintComments)
      .where(eq(complaintComments.complaintId, id))
      .orderBy(complaintComments.createdAt)
      .all();

    return reply.send({ ...complaint, comments });
  });

  // Update complaint status
  app.patch('/complaints/:id/status', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as { status: string; assignedTo?: string; resolutionNotes?: string };

    const existing = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ error: 'Complaint not found' });
    }

    const updates: Record<string, unknown> = {
      status: body.status,
      updatedAt: new Date().toISOString(),
    };

    if (body.assignedTo) {
      updates.assignedTo = body.assignedTo;
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
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .run();

    const updated = db.select().from(complaints).where(eq(complaints.id, id)).get();
    return reply.send(updated);
  });

  // Add comment to complaint
  app.post('/complaints/:id/comments', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as { comment: string; isInternal?: boolean };

    const complaint = db.select().from(complaints)
      .where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId)))
      .get();
    if (!complaint) {
      return reply.status(404).send({ error: 'Complaint not found' });
    }

    const commentId = uuidv4();
    db.insert(complaintComments).values({
      id: commentId,
      complaintId: id,
      userId: request.user!.userId,
      comment: body.comment,
      isInternal: body.isInternal || false,
    }).run();

    const comment = db.select().from(complaintComments).where(eq(complaintComments.id, commentId)).get();
    return reply.status(201).send(comment);
  });

  // Rate resolved complaint
  app.post('/complaints/:id/rate', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as { rating: number; feedback?: string };

    if (body.rating < 1 || body.rating > 5) {
      return reply.status(400).send({ error: 'Rating must be between 1 and 5' });
    }

    db.update(complaints).set({
      tenantRating: body.rating,
      tenantFeedback: body.feedback,
      updatedAt: new Date().toISOString(),
    }).where(and(eq(complaints.id, id), eq(complaints.tenantId, tenantId))).run();

    return reply.send({ message: 'Rating submitted' });
  });
}
