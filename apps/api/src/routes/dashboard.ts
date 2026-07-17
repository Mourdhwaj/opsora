import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import {
  properties, rooms, beds, tenantProfiles, rentPayments,
  complaints, visitors, staff, waterTanks, waterReadings,
  electricityMeters, electricityReadings, activityLogs,
} from '../lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function dashboardRoutes(app: FastifyInstance) {
  const requireOwner = (request: any, reply: any) => {
    if (request.user!.role !== 'owner' && request.user!.role !== 'admin') {
      reply.status(403).send({ error: 'Only owners/admins can perform this action' });
      return false;
    }
    return true;
  };

  // Dashboard overview (owner/admin only)
  app.get('/dashboard/overview', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = user.tenantId;
    const { propertyId } = request.query as { propertyId?: string };

    // Property stats — calculated from actual beds/tenants, scoped by propertyId if provided
    const totalProperties = db.select({ count: sql<number>`count(*)` }).from(properties)
      .where(eq(properties.tenantId, tenantId)).get()?.count ?? 0;

    const bedConditions = [eq(beds.tenantId, tenantId)];
    if (propertyId) bedConditions.push(eq(beds.propertyId, propertyId));
    const totalBeds = db.select({ count: sql<number>`count(*)` }).from(beds)
      .where(and(...bedConditions)).get()?.count ?? 0;
    const occupiedBeds = db.select({ count: sql<number>`count(*)` }).from(beds)
      .where(and(...bedConditions, eq(beds.status, 'occupied'))).get()?.count ?? 0;
    const vacantBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0';

    // Active tenants
    const tenantConditions = [eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')];
    if (propertyId) tenantConditions.push(eq(tenantProfiles.propertyId, propertyId));
    const activeTenants = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(...tenantConditions))
      .get()?.count ?? 0;

    // Payment stats — current month AND all-time
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthPayConditions = [eq(rentPayments.tenantId, tenantId), eq(rentPayments.monthYear, currentMonth)];
    if (propertyId) monthPayConditions.push(eq(rentPayments.propertyId, propertyId));
    const monthPayments = db.select().from(rentPayments)
      .where(and(...monthPayConditions))
      .all();

    const allPayConditions = [eq(rentPayments.tenantId, tenantId)];
    if (propertyId) allPayConditions.push(eq(rentPayments.propertyId, propertyId));
    const allPayments = db.select().from(rentPayments)
      .where(and(...allPayConditions))
      .all();

    const totalExpected = monthPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalCollected = monthPayments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalPending = totalExpected - totalCollected;

    // All-time totals for revenue card
    const allTimeExpected = allPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const allTimeCollected = allPayments.reduce((s, p) => s + (p.paidAmount || 0), 0);

    // Open complaints
    const complaintConditions = [eq(complaints.tenantId, tenantId), eq(complaints.status, 'open')];
    if (propertyId) complaintConditions.push(eq(complaints.propertyId, propertyId));
    const openComplaints = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(...complaintConditions))
      .get()?.count ?? 0;

    const urgentConditions = [eq(complaints.tenantId, tenantId), eq(complaints.status, 'open'), eq(complaints.priority, 'urgent')];
    if (propertyId) urgentConditions.push(eq(complaints.propertyId, propertyId));
    const urgentComplaints = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(...urgentConditions))
      .get()?.count ?? 0;

    // Water tanks
    const tankConditions = [eq(waterTanks.tenantId, tenantId), eq(waterTanks.isActive, true)];
    if (propertyId) tankConditions.push(eq(waterTanks.propertyId, propertyId));
    const tanks = db.select().from(waterTanks)
      .where(and(...tankConditions))
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

    const rawActivity = db.select().from(activityLogs)
      .where(eq(activityLogs.tenantId, tenantId))
      .orderBy(desc(activityLogs.createdAt)).limit(10).all();

    // Enrich activity with entityName by looking up the entity
    const recentActivity = rawActivity.map((log) => {
      let entityName = log.entityId || '';
      try {
        if (log.entityType === 'resident' || log.entityType === 'tenant') {
          const profile = db.select().from(tenantProfiles).where(eq(tenantProfiles.id, log.entityId || '')).get();
          entityName = profile?.fullName || log.entityId || '';
        } else if (log.entityType === 'property') {
          const prop = db.select().from(properties).where(eq(properties.id, log.entityId || '')).get();
          entityName = prop?.name || log.entityId || '';
        } else if (log.entityType === 'complaint') {
          const comp = db.select().from(complaints).where(eq(complaints.id, log.entityId || '')).get();
          entityName = comp?.title || log.entityId || '';
        } else if (log.entityType === 'payment') {
          const payment = db.select().from(rentPayments).where(eq(rentPayments.id, log.entityId || '')).get();
          entityName = payment ? `Room payment - ${payment.monthYear}` : log.entityId || '';
        }
      } catch { entityName = log.entityId || ''; }
      return { ...log, entityName: entityName || log.action.replace(/_/g, ' ') };
    });

    const pendingVisitors = db.select({ count: sql<number>`count(*)` }).from(visitors)
      .where(and(eq(visitors.tenantId, tenantId), eq(visitors.status, 'pending'))).get()?.count ?? 0;

    return reply.send({
      properties: { total: totalProperties, totalBeds, occupiedBeds, vacantBeds, occupancyRate },
      tenants: { active: activeTenants },
      payments: {
        totalExpected, totalCollected, totalPending,
        collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0',
        paidCount: monthPayments.filter(p => p.paymentStatus === 'paid').length,
        pendingCount: monthPayments.filter(p => p.paymentStatus === 'pending').length,
        overdueCount: monthPayments.filter(p => p.paymentStatus === 'overdue').length,
        partialCount: monthPayments.filter(p => p.paymentStatus === 'partial').length,
        allTimeCollected, allTimeExpected,
      },
      complaints: { open: openComplaints, urgent: urgentComplaints },
      water: waterStatus,
      visitors: { pending: pendingVisitors },
      recentActivity,
    });
  });

  // Occupancy trend (owner/admin only)
  // Single source of truth: rentPayments table
  // Each payment record = one occupied bed for that month
  app.get('/dashboard/occupancy-trend', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = user.tenantId;
    const { propertyId } = request.query as { propertyId?: string };

    // Total beds (the denominator for occupancy)
    const bedConditions = [eq(beds.tenantId, tenantId)];
    if (propertyId) bedConditions.push(eq(beds.propertyId, propertyId));
    const totalBedsCount = db.select({ count: sql<number>`count(*)` }).from(beds)
      .where(and(...bedConditions)).get()?.count ?? 0;

    // All payments — grouped by monthYear
    // Each unique tenantProfileId per month = 1 occupied bed
    const payConditions = [eq(rentPayments.tenantId, tenantId)];
    if (propertyId) payConditions.push(eq(rentPayments.propertyId, propertyId));
    const payments = db.select().from(rentPayments).where(and(...payConditions)).all();

    // Build monthly data from payments (single source of truth)
    const monthlyData = new Map<string, { occupied: Set<string>; expected: number; collected: number }>();

    for (const p of payments) {
      const existing = monthlyData.get(p.monthYear) || { occupied: new Set<string>(), expected: 0, collected: 0 };
      // Each payment = 1 occupied bed for that tenant
      if (p.tenantProfileId) existing.occupied.add(p.tenantProfileId);
      existing.expected += p.totalAmount || 0;
      existing.collected += (p.paidAmount || 0);
      monthlyData.set(p.monthYear, existing);
    }

    // Convert to array sorted by month
    const result = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        occupied: data.occupied.size,  // unique tenants that month = occupied beds
        vacant: Math.max(0, totalBedsCount - data.occupied.size),
        expected: data.expected,
        collected: data.collected,
        collectionRate: data.expected > 0 ? ((data.collected / data.expected) * 100).toFixed(1) : '0',
      }));

    return reply.send(result.slice(-12));
  });

  // Pending tenants for current month (owner/admin only)
  app.get('/dashboard/pending-tenants', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = user.tenantId;
    const { propertyId } = request.query as { propertyId?: string };

    const currentMonth = new Date().toISOString().slice(0, 7);

    const payConditions = [
      eq(rentPayments.tenantId, tenantId),
      eq(rentPayments.monthYear, currentMonth),
      sql`${rentPayments.paymentStatus} IN ('pending', 'overdue', 'partial')`,
    ];
    if (propertyId) payConditions.push(eq(rentPayments.propertyId, propertyId));

    const pendingPayments = db.select({
      id: rentPayments.id,
      tenantProfileId: rentPayments.tenantProfileId,
      monthYear: rentPayments.monthYear,
      rentAmount: rentPayments.rentAmount,
      totalAmount: rentPayments.totalAmount,
      paidAmount: rentPayments.paidAmount,
      balanceAmount: rentPayments.balanceAmount,
      paymentStatus: rentPayments.paymentStatus,
      dueDate: rentPayments.dueDate,
    }).from(rentPayments)
      .where(and(...payConditions))
      .all();

    const tenantsWithDetails = pendingPayments.map(payment => {
      const profile = db.select().from(tenantProfiles)
        .where(eq(tenantProfiles.id, payment.tenantProfileId))
        .get();
      const room = profile?.roomId ? db.select().from(rooms)
        .where(eq(rooms.id, profile.roomId))
        .get() : null;
      return {
        id: payment.tenantProfileId,
        name: profile?.fullName || 'Unknown',
        phone: profile?.phone || '',
        roomNumber: room?.roomNumber || 'N/A',
        rentAmount: payment.rentAmount,
        paidAmount: payment.paidAmount,
        balanceAmount: payment.balanceAmount,
        status: payment.paymentStatus,
        dueDate: payment.dueDate,
      };
    });

    const summary = {
      total: tenantsWithDetails.length,
      overdue: tenantsWithDetails.filter(t => t.status === 'overdue').length,
      pending: tenantsWithDetails.filter(t => t.status === 'pending').length,
      partial: tenantsWithDetails.filter(t => t.status === 'partial').length,
    };

    return reply.send({ tenants: tenantsWithDetails, summary });
  });

  // Paid tenants for current month (owner/admin only)
  app.get('/dashboard/paid-tenants', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = user.tenantId;
    const { propertyId } = request.query as { propertyId?: string };

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const payConditions = [
      eq(rentPayments.tenantId, tenantId),
      eq(rentPayments.monthYear, currentMonth),
      eq(rentPayments.paymentStatus, 'paid'),
    ];
    if (propertyId) payConditions.push(eq(rentPayments.propertyId, propertyId));
    
    const paidPayments = db.select({
      id: rentPayments.id,
      tenantProfileId: rentPayments.tenantProfileId,
      monthYear: rentPayments.monthYear,
      rentAmount: rentPayments.rentAmount,
      paidAmount: rentPayments.paidAmount,
      paidDate: rentPayments.paidDate,
      paymentMethod: rentPayments.paymentMethod,
    }).from(rentPayments)
      .where(and(...payConditions))
      .all();

    // Get tenant details for each payment
    const tenantsWithDetails = paidPayments.map(payment => {
      const profile = db.select().from(tenantProfiles)
        .where(eq(tenantProfiles.id, payment.tenantProfileId))
        .get();
      const room = profile?.roomId ? db.select().from(rooms)
        .where(eq(rooms.id, profile.roomId))
        .get() : null;
      return {
        id: payment.tenantProfileId,
        name: profile?.fullName || 'Unknown',
        phone: profile?.phone || '',
        roomNumber: room?.roomNumber || 'N/A',
        rentAmount: payment.rentAmount,
        paidAmount: payment.paidAmount,
        paidDate: payment.paidDate,
        paymentMethod: payment.paymentMethod || 'N/A',
      };
    });

    const totalCollected = tenantsWithDetails.reduce((sum, t) => sum + t.paidAmount, 0);

    return reply.send({ 
      tenants: tenantsWithDetails, 
      summary: { total: tenantsWithDetails.length, totalCollected } 
    });
  });

  // Property-level dashboard (owner/admin only)
  app.get('/dashboard/property/:propertyId', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { propertyId } = request.params as { propertyId: string };
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    const tenantId = user.tenantId;

    const property = db.select().from(properties)
      .where(and(eq(properties.id, propertyId), eq(properties.tenantId, tenantId))).get();
    if (!property) return reply.status(404).send({ error: 'Property not found' });

    const propertyRooms = db.select().from(rooms).where(eq(rooms.propertyId, propertyId)).all();
    const propertyBeds = db.select().from(beds).where(eq(beds.propertyId, propertyId)).all();
    const activeTenants = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(eq(tenantProfiles.propertyId, propertyId), eq(tenantProfiles.status, 'active'))).get()?.count ?? 0;
    const openComplaints = db.select({ count: sql<number>`count(*)` }).from(complaints)
      .where(and(eq(complaints.propertyId, propertyId), eq(complaints.status, 'open'))).get()?.count ?? 0;
    const waterTanksCount = db.select({ count: sql<number>`count(*)` }).from(waterTanks).where(eq(waterTanks.propertyId, propertyId)).get()?.count ?? 0;

    return reply.send({ property, rooms: propertyRooms, beds: propertyBeds, activeTenants, openComplaints, waterTanks: waterTanksCount });
  });
}
