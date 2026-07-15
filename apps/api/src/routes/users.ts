import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { users, archivedUsers } from '../lib/schema';
import { eq, and, like, desc, sql } from 'drizzle-orm';
import { createUserSchema, updateUserSchema, parseBody } from '../types';
import bcrypt from 'bcryptjs';

export async function userRoutes(app: FastifyInstance) {
  const requireOwner = (request: any, reply: any) => {
    if (request.user!.role !== 'owner' && request.user!.role !== 'admin') {
      reply.status(403).send({ error: 'Only owners/admins can perform this action' });
      return false;
    }
    return true;
  };

  // List users for current tenant (owner/admin only)
  app.get('/users', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { page = 1, limit = 20, search } = request.query as { page?: number; limit?: number; search?: string };
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let query = db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(desc(users.createdAt));

    if (search) {
      query = db.select().from(users)
        .where(and(eq(users.tenantId, tenantId), like(users.fullName, `%${search}%`)))
        .orderBy(desc(users.createdAt));
    }

    const data = query.limit(limit).offset(offset).all();
    const total = db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.tenantId, tenantId)).get()?.count ?? 0;

    const safeData = data.map(({ passwordHash, ...rest }) => rest);
    return reply.send({ data: safeData, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Create user (owner/admin only)
  app.post('/users', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const body = parseBody(createUserSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    const existing = db.select().from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.email, body.email)))
      .get();
    if (existing) {
      return reply.status(409).send({ error: 'User with this email already exists' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(body.password, 10);

    db.insert(users).values({
      id,
      tenantId,
      email: body.email,
      phone: body.phone,
      passwordHash,
      fullName: body.fullName,
      role: body.role,
    }).run();

    const user = db.select().from(users).where(eq(users.id, id)).get();
    const { passwordHash: _, ...safeUser } = user!;
    return reply.status(201).send(safeUser);
  });

  // Get user by ID (owner/admin only)
  app.get('/users/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const user = db.select().from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .get();

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { passwordHash, ...safeUser } = user;
    return reply.send(safeUser);
  });

  // Update user (owner/admin only)
  app.put('/users/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const body = parseBody(updateUserSchema, request.body, reply);
    if (!body) return;
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const existing = db.select().from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Build update object with only provided fields (never allow passwordHash, tenantId, or id)
    const allowedUpdates: Record<string, unknown> = {};
    if (body.fullName !== undefined) allowedUpdates.fullName = body.fullName;
    if (body.phone !== undefined) allowedUpdates.phone = body.phone;
    if (body.role !== undefined) allowedUpdates.role = body.role;
    if (body.isActive !== undefined) allowedUpdates.isActive = body.isActive;
    allowedUpdates.updatedAt = new Date().toISOString();

    db.update(users).set(allowedUpdates)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .run();

    const updated = db.select().from(users).where(eq(users.id, id)).get();
    const { passwordHash, ...safeUser } = updated!;
    return reply.send(safeUser);
  });

  // Delete user (archive + soft delete, owner/admin only)
  app.delete('/users/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const { reason } = (request.body as any) || {};
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;

    const existing = db.select().from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .get();
    if (!existing) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Archive the user data before deactivation
    const { passwordHash: _, ...safeData } = existing;
    db.insert(archivedUsers).values({
      id: uuidv4(),
      originalId: id,
      tenantId,
      email: existing.email,
      phone: existing.phone,
      passwordHash: existing.passwordHash,
      fullName: existing.fullName,
      role: existing.role,
      avatarUrl: existing.avatarUrl,
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      reason: reason || null,
      originalData: JSON.stringify(safeData),
    }).run();

    // Soft-delete the user
    db.update(users).set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .run();

    return reply.send({ message: 'User archived and deactivated' });
  });
}
