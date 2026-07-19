import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import {
  rentPayments, tenantProfiles, properties, beds,
  activityLogs, paymentReminders, paymentActivities,
} from '../lib/schema';
import { eq, and, desc, sql, lte } from 'drizzle-orm';

export async function invoiceRoutes(app: FastifyInstance) {
  const requireOwner = (request: any, reply: any) => {
    if (request.user!.role !== 'owner' && request.user!.role !== 'admin') {
      reply.status(403).send({ error: 'Only owners/admins can perform this action' });
      return false;
    }
    return true;
  };

  // ── Generate Monthly Invoices ────────────────────────────────────────────
  // Creates rent_payment records for all active residents for a given month
  app.post('/invoices/generate', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const user = request.user as { userId: string; tenantId: string; role: string };
    const body = request.body as { monthYear?: string } | undefined;
    const monthYear = body?.monthYear || new Date().toISOString().slice(0, 7);
    const tenantId = user.tenantId;

    // Get all active residents
    const activeResidents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')))
      .all();

    if (activeResidents.length === 0) {
      return reply.status(404).send({ error: 'No active residents found' });
    }

    // Check which residents already have invoices for this month
    const existingPayments = db.select().from(rentPayments)
      .where(and(eq(rentPayments.tenantId, tenantId), eq(rentPayments.monthYear, monthYear)))
      .all();

    const existingTenantIds = new Set(existingPayments.map(p => p.tenantProfileId));
    const newInvoices: any[] = [];

    for (const resident of activeResidents) {
      if (existingTenantIds.has(resident.id)) continue;

      const invoiceId = uuidv4();
      const dueDate = `${monthYear}-05`;
      const totalAmount = resident.rentAmount;

      db.insert(rentPayments).values({
        id: invoiceId,
        tenantId,
        propertyId: resident.propertyId,
        roomId: resident.roomId,
        bedId: resident.bedId,
        tenantProfileId: resident.id,
        monthYear,
        dueDate,
        rentAmount: totalAmount,
        electricityCharge: 0,
        waterCharge: 0,
        foodCharge: 0,
        maintenanceCharge: 0,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        paymentStatus: 'pending',
        notes: 'Auto-generated monthly invoice',
        createdBy: user.userId,
      }).run();

      newInvoices.push({
        id: invoiceId,
        residentName: resident.fullName,
        amount: totalAmount,
        dueDate,
      });

      // Log activity
      db.insert(activityLogs).values({
        id: uuidv4(),
        tenantId,
        actorType: 'system',
        actorId: user.userId,
        actorName: 'System',
        action: 'invoice_generated',
        entityType: 'payment',
        entityId: invoiceId,
        newValues: JSON.stringify({ monthYear, amount: totalAmount }),
        createdAt: new Date().toISOString(),
      }).run();
    }

    return reply.status(201).send({
      message: `Generated ${newInvoices.length} invoices for ${monthYear}`,
      invoices: newInvoices,
      skipped: existingTenantIds.size,
    });
  });

  // ── Update Overdue Status ────────────────────────────────────────────────
  // Auto-marks pending invoices as overdue after due date
  app.post('/invoices/update-overdue', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const today = new Date().toISOString().split('T')[0];

    // Find all pending/partial payments where dueDate has passed
    const overduePayments = db.select().from(rentPayments)
      .where(and(
        eq(rentPayments.tenantId, tenantId),
        lte(rentPayments.dueDate, today),
        sql`${rentPayments.paymentStatus} IN ('pending', 'partial')`,
      ))
      .all();

    let updatedCount = 0;
    for (const payment of overduePayments) {
      db.update(rentPayments)
        .set({ paymentStatus: 'overdue' })
        .where(eq(rentPayments.id, payment.id))
        .run();

      // Create reminder
      db.insert(paymentReminders).values({
        id: uuidv4(),
        tenantId,
        invoiceId: payment.id,
        tenantProfileId: payment.tenantProfileId,
        channel: 'in_app',
        reminderType: 'overdue',
        message: `Payment of ₹${payment.totalAmount} is overdue. Due date was ${payment.dueDate}.`,
      }).run();

      updatedCount++;
    }

    return reply.send({
      message: `Updated ${updatedCount} payments to overdue status`,
      updatedCount,
    });
  });

  // ── Process Move-Out & Deposit Refund ────────────────────────────────────
  app.post('/invoices/move-out', { preHandler: [authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const user = request.user as { userId: string; tenantId: string; role: string };
    const body = request.body as {
      tenantProfileId: string;
      moveOutDate: string;
      refundAmount: number;
      deductions?: Array<{ reason: string; amount: number }>;
      notes?: string;
    };

    const tenantId = user.tenantId;

    // Get resident profile
    const profile = db.select().from(tenantProfiles)
      .where(and(
        eq(tenantProfiles.id, body.tenantProfileId),
        eq(tenantProfiles.tenantId, tenantId),
      ))
      .get();

    if (!profile) {
      return reply.status(404).send({ error: 'Resident not found' });
    }

    // Calculate total deductions
    const totalDeductions = body.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
    const depositPaid = profile.depositPaid || 0;
    const finalRefund = Math.max(0, depositPaid - totalDeductions);

    // Check for pending payments
    const pendingPayments = db.select().from(rentPayments)
      .where(and(
        eq(rentPayments.tenantId, tenantId),
        eq(rentPayments.tenantProfileId, body.tenantProfileId),
        sql`${rentPayments.paymentStatus} IN ('pending', 'partial', 'overdue')`,
      ))
      .all();

    const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.balanceAmount, 0);

    // Update resident status
    db.update(tenantProfiles)
      .set({
        moveOutDate: body.moveOutDate,
        status: 'moved_out',
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tenantProfiles.id, body.tenantProfileId))
      .run();

    // Free up the bed
    db.update(beds)
      .set({ status: 'vacant', updatedAt: new Date().toISOString() })
      .where(eq(beds.id, profile.bedId))
      .run();

    // Log activity
    db.insert(activityLogs).values({
      id: uuidv4(),
      tenantId,
      actorType: 'user',
      actorId: user.userId,
      actorName: user.userId,
      action: 'resident_checked_out',
      entityType: 'resident',
      entityId: body.tenantProfileId,
      oldValues: JSON.stringify({ depositPaid, status: 'active' }),
      newValues: JSON.stringify({
        moveOutDate: body.moveOutDate,
        depositPaid,
        refundAmount: finalRefund,
        deductions: body.deductions,
        pendingAmount,
      }),
      createdAt: new Date().toISOString(),
    }).run();

    // Log payment activity
    db.insert(paymentActivities).values({
      id: uuidv4(),
      tenantId,
      tenantProfileId: body.tenantProfileId,
      activityType: 'deposit_refund',
      description: `Deposit refund processed: ₹${finalRefund} (Deductions: ₹${totalDeductions}, Pending rent: ₹${pendingAmount})`,
    }).run();

    return reply.send({
      message: 'Move-out processed successfully',
      resident: profile.fullName,
      depositPaid,
      totalDeductions,
      deductions: body.deductions || [],
      pendingRentAmount: pendingAmount,
      pendingPayments: pendingPayments.length,
      refundAmount: finalRefund,
      moveOutDate: body.moveOutDate,
    });
  });

  // ── Get Invoice Summary ──────────────────────────────────────────────────
  app.get('/invoices/summary', { preHandler: [authenticate] }, async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const { monthYear } = request.query as { monthYear?: string };

    const currentMonth = monthYear || new Date().toISOString().slice(0, 7);

    const allPayments = db.select().from(rentPayments)
      .where(and(eq(rentPayments.tenantId, tenantId), eq(rentPayments.monthYear, currentMonth)))
      .all();

    const totalExpected = allPayments.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalCollected = allPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPending = totalExpected - totalCollected;

    const paid = allPayments.filter(p => p.paymentStatus === 'paid').length;
    const pending = allPayments.filter(p => p.paymentStatus === 'pending').length;
    const partial = allPayments.filter(p => p.paymentStatus === 'partial').length;
    const overdue = allPayments.filter(p => p.paymentStatus === 'overdue').length;

    return reply.send({
      monthYear: currentMonth,
      totalResidents: allPayments.length,
      paidCount: paid,
      pendingCount: pending,
      partialCount: partial,
      overdueCount: overdue,
      totalExpected,
      totalCollected,
      totalPending,
      collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0',
    });
  });

  // ── Send Payment Reminder ────────────────────────────────────────────────
  app.post('/invoices/remind/:paymentId', { preHandler: [authenticate] }, async (request, reply) => {
    const user = request.user as { userId: string; tenantId: string; role: string };
    const { paymentId } = request.params as { paymentId: string };
    const tenantId = user.tenantId;

    const payment = db.select().from(rentPayments)
      .where(and(eq(rentPayments.id, paymentId), eq(rentPayments.tenantId, tenantId)))
      .get();

    if (!payment) {
      return reply.status(404).send({ error: 'Payment not found' });
    }

    const profile = db.select().from(tenantProfiles)
      .where(eq(tenantProfiles.id, payment.tenantProfileId))
      .get();

    db.insert(paymentReminders).values({
      id: uuidv4(),
      tenantId,
      invoiceId: payment.id,
      tenantProfileId: payment.tenantProfileId,
      channel: 'in_app',
      reminderType: 'manual',
      message: `Payment reminder: ₹${payment.balanceAmount} pending for ${profile?.fullName || 'resident'}. Due date: ${payment.dueDate}`,
    }).run();

    db.insert(paymentActivities).values({
      id: uuidv4(),
      tenantId,
      tenantProfileId: payment.tenantProfileId,
      invoiceId: payment.id,
      activityType: 'reminder_sent',
      description: `Manual payment reminder sent for ₹${payment.balanceAmount}`,
    }).run();

    return reply.send({
      message: 'Reminder sent successfully',
      residentName: profile?.fullName,
      amount: payment.balanceAmount,
      dueDate: payment.dueDate,
    });
  });
}
