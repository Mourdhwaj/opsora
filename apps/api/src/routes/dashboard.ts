import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import {
  properties, rooms, beds, tenantProfiles, rentPayments,
  complaints, visitors, staff, waterTanks, waterReadings,
  electricityMeters, electricityReadings, activityLogs,
} from '../lib/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function dashboardRoutes(app: FastifyInstance) {
  const requireOwner = (request: any, reply: any) => {
    if (request.user!.role !== 'owner' && request.user!.role !== 'admin') {
      reply.status(403).send({ error: 'Only owners/admins can perform this action' });
      return false;
    }
    return true;
  };

  // Dashboard overview (owner/admin only)
  app.get('/dashboard/overview', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;

    // Property stats
    const allProperties = db.select().from(properties).where(eq(properties.tenantId, tenantId)).all();
    const totalProperties = allProperties.length;
    const totalBeds = allProperties.reduce((s, p) => s + p.totalBeds, 0);
    const occupiedBeds = allProperties.reduce((s, p) => s + p.occupiedBeds, 0);
    const vacantBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0';

    // Active tenants
    const activeTenants = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')))
      .all().length;

    // Payment stats for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthPayments = db.select().from(rentPayments)
      .where(and(eq(rentPayments.tenantId, tenantId), eq(rentPayments.monthYear, currentMonth)))
      .all();

    const totalExpected = monthPayments.reduce((s, p) => s + p.totalAmount, 0);
    const totalCollected = monthPayments.reduce((s, p) => s + p.paidAmount, 0);
    const totalPending = totalExpected - totalCollected;

    // Open complaints
    const openComplaints = db.select().from(complaints)
      .where(and(eq(complaints.tenantId, tenantId), eq(complaints.status, 'open')))
      .all().length;

    const urgentComplaints = db.select().from(complaints)
      .where(and(eq(complaints.tenantId, tenantId), eq(complaints.status, 'open'), eq(complaints.priority, 'urgent')))
      .all().length;

    // Water tanks
    const tanks = db.select().from(waterTanks)
      .where(and(eq(waterTanks.tenantId, tenantId), eq(waterTanks.isActive, true)))
      .all();

    const waterStatus = tanks.map(tank => {
      const latest = db.select().from(waterReadings)
        .where(eq(waterReadings.tankId, tank.id))
        .orderBy(desc(waterReadings.time)).limit(1).get();
      return {
        tankId: tank.id, tankName: tank.name, capacityLiters: tank.capacityLiters,
        currentLevel: latest?.levelPercentage ?? null, currentLiters: latest?.levelLiters ?? null,
      };
    });

    const recentActivity = db.select().from(activityLogs)
      .where(eq(activityLogs.tenantId, tenantId))
      .orderBy(desc(activityLogs.createdAt)).limit(10).all();

    const pendingVisitors = db.select().from(visitors)
      .where(and(eq(visitors.tenantId, tenantId), eq(visitors.status, 'pending'))).all().length;

    return reply.send({
      properties: { total: totalProperties, totalBeds, occupiedBeds, vacantBeds, occupancyRate },
      tenants: { active: activeTenants },
      payments: {
        totalExpected, totalCollected, totalPending,
        collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0',
        paidCount: monthPayments.filter(p => p.paymentStatus === 'paid').length,
        pendingCount: monthPayments.filter(p => p.paymentStatus === 'pending').length,
      },
      complaints: { open: openComplaints, urgent: urgentComplaints },
      water: waterStatus,
      visitors: { pending: pendingVisitors },
      recentActivity,
    });
  });

  // Occupancy trend (owner/admin only)
  app.get('/dashboard/occupancy-trend', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const { propertyId } = request.query as { propertyId?: string };

    const conditions = [eq(rentPayments.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(rentPayments.propertyId, propertyId));

    const payments = db.select().from(rentPayments).where(and(...conditions)).orderBy(rentPayments.monthYear).all();
    const monthlyData = new Map<string, { expected: number; collected: number; count: number }>();
    for (const p of payments) {
      const existing = monthlyData.get(p.monthYear) || { expected: 0, collected: 0, count: 0 };
      existing.expected += p.totalAmount;
      existing.collected += p.paidAmount;
      existing.count += 1;
      monthlyData.set(p.monthYear, existing);
    }

    return reply.send(Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, d]) => ({
        month, expected: d.expected, collected: d.collected,
        collectionRate: d.expected > 0 ? ((d.collected / d.expected) * 100).toFixed(1) : '0',
        tenantCount: d.count,
      })));
  });

  // Property-level dashboard (owner/admin only)
  app.get('/dashboard/property/:propertyId', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { propertyId } = request.params as { propertyId: string };
    const tenantId = request.user!.tenantId;

    const property = db.select().from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId))).get();
    if (!property) return reply.status(404).send({ error: 'Property not found' });

    const propertyRooms = db.select().from(rooms).where(eq(rooms.propertyId, propertyId)).all();
    const propertyBeds = db.select().from(beds).where(eq(beds.propertyId, propertyId)).all();
    const activeTenants = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.propertyId, propertyId), eq(tenantProfiles.status, 'active'))).all().length;
    const openComplaints = db.select().from(complaints)
      .where(and(eq(complaints.propertyId, propertyId), eq(complaints.status, 'open'))).all().length;
    const waterTanksCount = db.select().from(waterTanks).where(eq(waterTanks.propertyId, propertyId)).all().length;

    return reply.send({ property, rooms: propertyRooms, beds: propertyBeds, activeTenants, openComplaints, waterTanks: waterTanksCount });
  });
}
