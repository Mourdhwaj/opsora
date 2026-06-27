import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { notifications, activityLogs } from '../lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function notificationRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, unreadOnly } = request.query as { page?: number; limit?: number; unreadOnly?: string };
    const tenantId = request.user!.tenantId, userId = request.user!.userId;
    let conditions = [eq(notifications.tenantId, tenantId), eq(notifications.userId, userId)];
    if (unreadOnly === 'true') conditions.push(eq(notifications.isRead, false));
    const data = db.select().from(notifications).where(and(...conditions)).orderBy(desc(notifications.createdAt)).limit(limit).offset((page - 1) * limit).all();
    const total = db.select().from(notifications).where(and(...conditions)).all().length;
    const unreadCount = db.select().from(notifications).where(and(eq(notifications.tenantId, tenantId), eq(notifications.userId, userId), eq(notifications.isRead, false))).all().length;
    return reply.send({ data, unreadCount, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  app.patch('/notifications/:id/read', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    db.update(notifications).set({ isRead: true, readAt: new Date().toISOString() }).where(eq(notifications.id, id)).run();
    return reply.send({ message: 'Marked as read' });
  });

  app.post('/notifications/read-all', { preHandler: [app.authenticate] }, async (request, reply) => {
    db.update(notifications).set({ isRead: true, readAt: new Date().toISOString() })
      .where(and(eq(notifications.tenantId, request.user!.tenantId), eq(notifications.userId, request.user!.userId), eq(notifications.isRead, false))).run();
    return reply.send({ message: 'All notifications marked as read' });
  });

  app.get('/activity-logs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { page = 1, limit = 50, entityType, entityId } = request.query as { page?: number; limit?: number; entityType?: string; entityId?: string };
    let conditions = [eq(activityLogs.tenantId, request.user!.tenantId)];
    if (entityType) conditions.push(eq(activityLogs.entityType, entityType));
    if (entityId) conditions.push(eq(activityLogs.entityId, entityId));
    const data = db.select().from(activityLogs).where(and(...conditions)).orderBy(desc(activityLogs.createdAt)).limit(limit).offset((page - 1) * limit).all();
    const total = db.select().from(activityLogs).where(and(...conditions)).all().length;
    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });
}

export function logActivity(params: { tenantId: string; actorType: string; actorId: string; actorName?: string; action: string; entityType: string; entityId?: string; oldValues?: unknown; newValues?: unknown }) {
  db.insert(activityLogs).values({ id: uuidv4(), ...params, oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null, newValues: params.newValues ? JSON.stringify(params.newValues) : null }).run();
}

export function createNotification(params: { tenantId: string; userId?: string; title: string; message: string; type: string; priority?: string }) {
  db.insert(notifications).values({ id: uuidv4(), ...params, priority: params.priority || 'normal' }).run();
}
