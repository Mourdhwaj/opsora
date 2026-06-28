import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { rentPayments, tenantProfiles } from '../lib/schema';
import { eq, and, like, desc } from 'drizzle-orm';
import { createPaymentSchema, parseBody } from '../types';

export async function paymentRoutes(app: FastifyInstance) {
  // List payments
  app.get('/payments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { page = 1, limit = 20, propertyId, monthYear, status } = request.query as {
      page?: number; limit?: number; propertyId?: string; monthYear?: string; status?: string;
    };
    const tenantId = request.user!.tenantId;
    const offset = (page - 1) * limit;

    let conditions = [eq(rentPayments.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(rentPayments.propertyId, propertyId));
    if (monthYear) conditions.push(eq(rentPayments.monthYear, monthYear));
    if (status) conditions.push(eq(rentPayments.paymentStatus, status));

    const data = db.select().from(rentPayments)
      .where(and(...conditions))
      .orderBy(desc(rentPayments.createdAt))
      .limit(limit).offset(offset)
      .all();

    const total = db.select().from(rentPayments)
      .where(and(...conditions))
      .all().length;

    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Create payment record
  app.post('/payments', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = parseBody(createPaymentSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    // Get tenant profile to calculate total
    const profile = db.select().from(tenantProfiles).where(eq(tenantProfiles.id, body.tenantProfileId)).get();
    if (!profile) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    const totalAmount = body.rentAmount + body.electricityCharge + body.waterCharge +
      body.foodCharge + body.maintenanceCharge;
    const balanceAmount = totalAmount;

    const id = uuidv4();
    const receiptNumber = `RCP-${Date.now()}`;

    db.insert(rentPayments).values({
      id,
      tenantId,
      propertyId: body.propertyId,
      roomId: body.roomId,
      bedId: body.bedId,
      tenantProfileId: body.tenantProfileId,
      monthYear: body.monthYear,
      dueDate: body.dueDate,
      rentAmount: body.rentAmount,
      electricityCharge: body.electricityCharge,
      waterCharge: body.waterCharge,
      foodCharge: body.foodCharge,
      maintenanceCharge: body.maintenanceCharge,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      paymentMethod: body.paymentMethod,
      transactionId: body.transactionId,
      receiptNumber,
      notes: body.notes,
      createdBy: request.user!.userId,
    }).run();

    const payment = db.select().from(rentPayments).where(eq(rentPayments.id, id)).get();
    return reply.status(201).send(payment);
  });

  // Record payment (mark as paid)
  app.post('/payments/:id/pay', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const body = request.body as { paidAmount: number; paymentMethod: string; transactionId?: string };

    const payment = db.select().from(rentPayments)
      .where(and(eq(rentPayments.id, id), eq(rentPayments.tenantId, tenantId)))
      .get();
    if (!payment) {
      return reply.status(404).send({ error: 'Payment not found' });
    }

    const newPaidAmount = payment.paidAmount + body.paidAmount;
    const newBalance = payment.totalAmount - newPaidAmount;
    const newStatus = newBalance <= 0 ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';

    db.update(rentPayments).set({
      paidAmount: newPaidAmount,
      balanceAmount: Math.max(0, newBalance),
      paymentStatus: newStatus,
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: body.paymentMethod,
      transactionId: body.transactionId,
      updatedAt: new Date().toISOString(),
    }).where(eq(rentPayments.id, id)).run();

    const updated = db.select().from(rentPayments).where(eq(rentPayments.id, id)).get();
    return reply.send(updated);
  });

  // Get payment summary for a property
  app.get('/payments/summary', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { propertyId, monthYear } = request.query as { propertyId?: string; monthYear?: string };
    const tenantId = request.user!.tenantId;

    let conditions = [eq(rentPayments.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(rentPayments.propertyId, propertyId));
    if (monthYear) conditions.push(eq(rentPayments.monthYear, monthYear));

    const allPayments = db.select().from(rentPayments)
      .where(and(...conditions))
      .all();

    const totalExpected = allPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalCollected = allPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPending = totalExpected - totalCollected;
    const paidCount = allPayments.filter(p => p.paymentStatus === 'paid').length;
    const pendingCount = allPayments.filter(p => p.paymentStatus === 'pending').length;

    return reply.send({
      totalExpected,
      totalCollected,
      totalPending,
      collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0',
      paidCount,
      pendingCount,
      partialCount: allPayments.filter(p => p.paymentStatus === 'partial').length,
      overdueCount: allPayments.filter(p => p.paymentStatus === 'overdue').length,
    });
  });

  // Get payment by ID
  app.get('/payments/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;

    const payment = db.select().from(rentPayments)
      .where(and(eq(rentPayments.id, id), eq(rentPayments.tenantId, tenantId)))
      .get();
    if (!payment) {
      return reply.status(404).send({ error: 'Payment not found' });
    }

    return reply.send(payment);
  });
}
