import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { archivedUsers, archivedResidents, users, tenantProfiles, beds } from '../lib/schema';
import { eq, and, desc, sql, like } from 'drizzle-orm';

export async function archiveRoutes(app: FastifyInstance) {
  const requireOwner = (request: any, reply: any) => {
    if (request.user!.role !== 'owner' && request.user!.role !== 'admin') {
      reply.status(403).send({ error: 'Only owners/admins can perform this action' });
      return false;
    }
    return true;
  };

  // ── ARCHIVE USER ──────────────────────────────────────────────────────────
  // POST /archive/user/:id - Archive a user before deactivation
  app.post('/archive/user/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };
    const authUser = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = authUser.tenantId;
    const userId = authUser.userId;

    // Get the user to archive
    const targetUser = db.select().from(users)
      .where(and(eq(users.id, id), eq(users.tenantId, tenantId)))
      .get();
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Check if already archived
    const existingArchive = db.select().from(archivedUsers)
      .where(and(eq(archivedUsers.originalId, id), eq(archivedUsers.tenantId, tenantId)))
      .get();
    if (existingArchive) {
      return reply.status(409).send({ error: 'User is already archived' });
    }

    // Create archive record
    const { passwordHash: _, ...safeData } = targetUser;
    db.insert(archivedUsers).values({
      id: uuidv4(),
      originalId: id,
      tenantId,
      email: targetUser.email,
      phone: targetUser.phone,
      passwordHash: targetUser.passwordHash,
      fullName: targetUser.fullName,
      role: targetUser.role,
      avatarUrl: targetUser.avatarUrl,
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      reason: reason || null,
      originalData: JSON.stringify(safeData),
    }).run();

    // Soft-delete the user
    db.update(users).set({
      isActive: false,
      updatedAt: new Date().toISOString(),
    }).where(eq(users.id, id)).run();

    return reply.send({ message: 'User archived successfully', archivedId: id });
  });

  // ── ARCHIVE RESIDENT ──────────────────────────────────────────────────────
  // POST /archive/resident/:id - Archive a resident before checkout
  app.post('/archive/resident/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const { reason } = request.body as { reason?: string };
    const authUser = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = authUser.tenantId;
    const userId = authUser.userId;

    // Get the resident to archive
    const resident = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.id, id), eq(tenantProfiles.tenantId, tenantId)))
      .get();
    if (!resident) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    // Check if already archived
    const existingArchive = db.select().from(archivedResidents)
      .where(and(eq(archivedResidents.originalId, id), eq(archivedResidents.tenantId, tenantId)))
      .get();
    if (existingArchive) {
      return reply.status(409).send({ error: 'Resident is already archived' });
    }

    // Create archive record
    db.insert(archivedResidents).values({
      id: uuidv4(),
      originalId: id,
      tenantId,
      propertyId: resident.propertyId,
      roomId: resident.roomId,
      bedId: resident.bedId,
      fullName: resident.fullName,
      phone: resident.phone,
      email: resident.email,
      gender: resident.gender,
      occupation: resident.occupation,
      moveInDate: resident.moveInDate,
      moveOutDate: resident.moveOutDate,
      rentAmount: resident.rentAmount,
      depositPaid: resident.depositPaid,
      archivedAt: new Date().toISOString(),
      archivedBy: userId,
      reason: reason || null,
      originalData: JSON.stringify(resident),
    }).run();

    return reply.send({ message: 'Resident archived successfully', archivedId: id });
  });

  // ── LIST ARCHIVED USERS ───────────────────────────────────────────────────
  // GET /archive/users - List all archived users
  app.get('/archive/users', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { page = 1, limit = 20, search } = request.query as { page?: number; limit?: number; search?: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(archivedUsers.tenantId, tenantId)];
    if (search) {
      conditions.push(like(archivedUsers.fullName, `%${search}%`));
    }

    const data = db.select().from(archivedUsers)
      .where(and(...conditions))
      .orderBy(desc(archivedUsers.archivedAt))
      .limit(limit).offset(offset).all();

    const total = db.select({ count: sql<number>`count(*)` })
      .from(archivedUsers)
      .where(and(...conditions))
      .get()?.count ?? 0;

    // Strip passwordHash from response
    const safeData = data.map(({ passwordHash, ...rest }) => rest);

    return reply.send({
      data: safeData,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  // ── LIST ARCHIVED RESIDENTS ───────────────────────────────────────────────
  // GET /archive/residents - List all archived residents
  app.get('/archive/residents', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { page = 1, limit = 20, search } = request.query as { page?: number; limit?: number; search?: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(archivedResidents.tenantId, tenantId)];
    if (search) {
      conditions.push(like(archivedResidents.fullName, `%${search}%`));
    }

    const data = db.select().from(archivedResidents)
      .where(and(...conditions))
      .orderBy(desc(archivedResidents.archivedAt))
      .limit(limit).offset(offset).all();

    const total = db.select({ count: sql<number>`count(*)` })
      .from(archivedResidents)
      .where(and(...conditions))
      .get()?.count ?? 0;

    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  });

  // ── RESTORE USER ──────────────────────────────────────────────────────────
  // POST /archive/users/:id/restore - Restore an archived user
  app.post('/archive/users/:id/restore', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;

    // Get the archived user
    const archived = db.select().from(archivedUsers)
      .where(and(eq(archivedUsers.id, id), eq(archivedUsers.tenantId, tenantId)))
      .get();
    if (!archived) {
      return reply.status(404).send({ error: 'Archived user not found' });
    }

    // Check if original user still exists
    const existingUser = db.select().from(users)
      .where(eq(users.id, archived.originalId))
      .get();

    if (existingUser) {
      // Reactivate the existing user
      db.update(users).set({
        isActive: true,
        updatedAt: new Date().toISOString(),
      }).where(eq(users.id, archived.originalId)).run();
    } else {
      // User was hard-deleted, recreate from archive
      db.insert(users).values({
        id: archived.originalId,
        tenantId: archived.tenantId,
        email: archived.email,
        phone: archived.phone,
        passwordHash: archived.passwordHash,
        fullName: archived.fullName,
        role: archived.role,
        avatarUrl: archived.avatarUrl,
        isActive: true,
      }).run();
    }

    // Remove from archive
    db.delete(archivedUsers).where(eq(archivedUsers.id, id)).run();

    return reply.send({ message: 'User restored successfully' });
  });

  // ── RESTORE RESIDENT ──────────────────────────────────────────────────────
  // POST /archive/residents/:id/restore - Restore an archived resident
  app.post('/archive/residents/:id/restore', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;

    // Get the archived resident
    const archived = db.select().from(archivedResidents)
      .where(and(eq(archivedResidents.id, id), eq(archivedResidents.tenantId, tenantId)))
      .get();
    if (!archived) {
      return reply.status(404).send({ error: 'Archived resident not found' });
    }

    // Check if original resident still exists
    const existingResident = db.select().from(tenantProfiles)
      .where(eq(tenantProfiles.id, archived.originalId))
      .get();

    if (existingResident) {
      // Reactivate the existing resident
      db.update(tenantProfiles).set({
        status: 'active',
        moveOutDate: null,
        updatedAt: new Date().toISOString(),
      }).where(eq(tenantProfiles.id, archived.originalId)).run();

      // Mark bed as occupied only if bed exists AND is currently vacant
      if (existingResident.bedId) {
        const bed = db.select().from(beds)
          .where(eq(beds.id, existingResident.bedId))
          .get();
        if (bed && bed.status === 'vacant') {
          db.update(beds).set({
            status: 'occupied',
            updatedAt: new Date().toISOString(),
          }).where(eq(beds.id, existingResident.bedId)).run();
        }
      }
    } else {
      // Resident was hard-deleted, recreate from archive
      const newId = archived.originalId;
      db.insert(tenantProfiles).values({
        id: newId,
        tenantId: archived.tenantId,
        propertyId: archived.propertyId || '',
        roomId: archived.roomId || '',
        bedId: archived.bedId || '',
        fullName: archived.fullName,
        phone: archived.phone,
        email: archived.email || null,
        gender: archived.gender || null,
        occupation: archived.occupation || null,
        moveInDate: archived.moveInDate || new Date().toISOString().split('T')[0],
        rentAmount: archived.rentAmount || 0,
        depositPaid: archived.depositPaid || 0,
        status: 'active',
      }).run();

      // Mark bed as occupied only if vacant
      if (archived.bedId) {
        const bed = db.select().from(beds)
          .where(eq(beds.id, archived.bedId))
          .get();
        if (bed && bed.status === 'vacant') {
          db.update(beds).set({
            status: 'occupied',
            updatedAt: new Date().toISOString(),
          }).where(eq(beds.id, archived.bedId)).run();
        }
      }
    }

    // Remove from archive
    db.delete(archivedResidents).where(eq(archivedResidents.id, id)).run();

    return reply.send({ message: 'Resident restored successfully' });
  });

  // ── PERMANENTLY DELETE ARCHIVED USER ──────────────────────────────────────
  // DELETE /archive/users/:id - Permanently delete an archived user
  app.delete('/archive/users/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;

    const archived = db.select().from(archivedUsers)
      .where(and(eq(archivedUsers.id, id), eq(archivedUsers.tenantId, tenantId)))
      .get();
    if (!archived) {
      return reply.status(404).send({ error: 'Archived user not found' });
    }

    db.delete(archivedUsers).where(eq(archivedUsers.id, id)).run();

    return reply.send({ message: 'Archived user permanently deleted' });
  });

  // ── PERMANENTLY DELETE ARCHIVED RESIDENT ──────────────────────────────────
  // DELETE /archive/residents/:id - Permanently delete an archived resident
  app.delete('/archive/residents/:id', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const tenantId = (request.user as { tenantId: string }).tenantId;

    const archived = db.select().from(archivedResidents)
      .where(and(eq(archivedResidents.id, id), eq(archivedResidents.tenantId, tenantId)))
      .get();
    if (!archived) {
      return reply.status(404).send({ error: 'Archived resident not found' });
    }

    db.delete(archivedResidents).where(eq(archivedResidents.id, id)).run();

    return reply.send({ message: 'Archived resident permanently deleted' });
  });

  // ── GET ARCHIVE STATS ─────────────────────────────────────────────────────
  // GET /archive/stats - Get archive statistics
  app.get('/archive/stats', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = (request.user as { tenantId: string }).tenantId;

    const userCount = db.select({ count: sql<number>`count(*)` })
      .from(archivedUsers)
      .where(eq(archivedUsers.tenantId, tenantId))
      .get()?.count ?? 0;

    const residentCount = db.select({ count: sql<number>`count(*)` })
      .from(archivedResidents)
      .where(eq(archivedResidents.tenantId, tenantId))
      .get()?.count ?? 0;

    return reply.send({ archivedUsers: userCount, archivedResidents: residentCount });
  });
}
