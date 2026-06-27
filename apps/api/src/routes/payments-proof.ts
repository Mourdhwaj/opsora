import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import {
  rentInvoices, paymentProofs, paymentVerifications, receipts,
  paymentReminders, paymentActivities, tenantProfiles, notifications, rooms, beds, users,
} from '../lib/schema';
import { eq, and, desc, count, sql } from 'drizzle-orm';
import {
  createRentInvoiceSchema, uploadPaymentProofSchema, verifyPaymentSchema,
  createReminderSchema, generateBulkRemindersSchema, parseBody,
} from '../types';

export async function paymentProofRoutes(app: FastifyInstance) {

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 1: RENT INVOICE MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════════

  // Helper: check owner/admin role
  const requireOwner = (request: any, reply: any) => {
    if (request.user!.role !== 'owner' && request.user!.role !== 'admin') {
      reply.status(403).send({ error: 'Only owners/admins can perform this action' });
      return false;
    }
    return true;
  };

  // Helper: resolve tenantProfileId from JWT userId (users.id -> tenant_profiles.id)
  const resolveProfileId = (userId: string): string | null => {
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    return user?.tenantProfileId || null;
  };

  // Helper: sanitize input to prevent stored XSS
  const sanitize = (input: string): string => input.replace(/[<>]/g, (c) => c === '<' ? '&lt;' : '&gt;');

  // Generate monthly invoices for all active tenants
  app.post('/payments-proof/invoices/generate', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const { monthYear, dueDate } = request.body as { monthYear: string; dueDate: string };

    if (!monthYear || !dueDate) {
      return reply.status(400).send({ error: 'monthYear and dueDate are required' });
    }

    // Get all active residents
    const residents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')))
      .all();

    let generated = 0;
    const monthPrefix = monthYear.replace('-', '');

    for (const resident of residents) {
      // Check if invoice already exists for this month
      const existing = db.select().from(rentInvoices)
        .where(and(
          eq(rentInvoices.tenantId, tenantId),
          eq(rentInvoices.tenantProfileId, resident.id),
          eq(rentInvoices.monthYear, monthYear),
        )).get();

      if (existing) continue;

      const invoiceNumber = `INV-${monthPrefix}-${String(generated + 1).padStart(4, '0')}`;
      const totalAmount = resident.rentAmount;

      db.insert(rentInvoices).values({
        id: uuidv4(), tenantId, propertyId: resident.propertyId,
        tenantProfileId: resident.id, invoiceNumber, monthYear,
        rentAmount: resident.rentAmount, utilityCharges: 0,
        lateFee: 0, discounts: 0, totalAmount, dueDate,
        status: 'pending',
      }).run();

      // Log activity
      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: resident.id,
        activityType: 'invoice_generated', description: `Invoice ${invoiceNumber} generated for ${monthYear}`,
      }).run();

      // Notify tenant
      db.insert(notifications).values({
        id: uuidv4(), tenantId, tenantProfileId: resident.id,
        title: `Invoice Generated - ${monthYear}`,
        message: `Your rent invoice of ₹${totalAmount.toLocaleString()} is due on ${dueDate}`,
        type: 'payment_invoice', priority: 'normal',
      }).run();

      generated++;
    }

    return reply.send({ message: `${generated} invoices generated`, count: generated });
  });

  // List invoices (admin sees all, residents see only their own)
  app.get('/payments-proof/invoices', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { status, monthYear, page = 1, limit = 20 } = request.query as {
      status?: string; monthYear?: string; page?: number; limit?: number;
    };
    const tenantId = request.user!.tenantId;
    let conditions = [eq(rentInvoices.tenantId, tenantId)];
    if (request.user!.role === 'resident') {
      const profileId = resolveProfileId(request.user!.userId);
      if (profileId) conditions.push(eq(rentInvoices.tenantProfileId, profileId));
    }
    if (status) conditions.push(eq(rentInvoices.status, status));
    if (monthYear) conditions.push(eq(rentInvoices.monthYear, monthYear));

    const data = db.select().from(rentInvoices).where(and(...conditions))
      .orderBy(desc(rentInvoices.createdAt)).limit(limit).offset((page - 1) * limit).all();

    // Enrich with resident info
    const enriched = data.map(inv => {
      const profile = db.select().from(tenantProfiles)
        .where(eq(tenantProfiles.id, inv.tenantProfileId)).get();
      const room = profile ? db.select().from(rooms)
        .where(eq(rooms.id, profile.roomId)).get() : null;
      return { ...inv, resident: profile ? { fullName: profile.fullName, phone: profile.phone } : null, roomNumber: room?.roomNumber || '—' };
    });

    const total = db.select().from(rentInvoices).where(and(...conditions)).all().length;
    return reply.send({ data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Get single invoice (with full IDOR protection for all non-admin roles)
  app.get('/payments-proof/invoices/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const invoice = db.select().from(rentInvoices)
      .where(and(eq(rentInvoices.id, id), eq(rentInvoices.tenantId, tenantId))).get();
    if (!invoice) return reply.status(404).send({ error: 'Invoice not found' });
    // Non-admin users can only view their own invoices
    const role = request.user!.role;
    if (role !== 'owner' && role !== 'admin') {
      const profileId = resolveProfileId(request.user!.userId);
      if (invoice.tenantProfileId !== profileId) return reply.status(403).send({ error: 'Access denied' });
    }

    const profile = db.select().from(tenantProfiles)
      .where(eq(tenantProfiles.id, invoice.tenantProfileId)).get();
    const room = profile ? db.select().from(rooms)
      .where(eq(rooms.id, profile.roomId)).get() : null;

    // Get related proofs
    const proofs = db.select().from(paymentProofs)
      .where(eq(paymentProofs.invoiceId, id)).orderBy(desc(paymentProofs.submittedAt)).all();

    // Get receipt if paid
    const receipt = db.select().from(receipts)
      .where(eq(receipts.invoiceId, id)).get();

    return reply.send({
      ...invoice,
      resident: profile ? { fullName: profile.fullName, phone: profile.phone, email: profile.email } : null,
      roomNumber: room?.roomNumber || '—',
      proofs, receipt,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 2: PAYMENT PROOF UPLOAD
  // ══════════════════════════════════════════════════════════════════════════

  // Upload payment proof
  app.post('/payments-proof/proofs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = parseBody(uploadPaymentProofSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;
    const profileId = resolveProfileId(request.user!.userId);
    if (!profileId) return reply.status(404).send({ error: 'Resident profile not found' });

    const invoice = db.select().from(rentInvoices).where(eq(rentInvoices.id, body.invoiceId)).get();
    if (!invoice) return reply.status(404).send({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return reply.status(400).send({ error: 'Invoice already paid' });

    // Check for pending proof on same invoice
    const pendingProof = db.select().from(paymentProofs)
      .where(and(eq(paymentProofs.invoiceId, body.invoiceId), eq(paymentProofs.status, 'pending'))).get();
    if (pendingProof) return reply.status(400).send({ error: 'A proof is already pending review for this invoice' });

    const proofId = uuidv4();
    db.insert(paymentProofs).values({
      id: proofId, tenantId, invoiceId: body.invoiceId,
      tenantProfileId: profileId, amountPaid: body.amountPaid,
      paymentDate: body.paymentDate, transactionReference: body.transactionReference,
      screenshotUrl: body.screenshotUrl, notes: body.notes,
      status: 'pending',
    }).run();

    // Update invoice status
    db.update(rentInvoices).set({ status: 'proof_submitted', updatedAt: new Date().toISOString() })
      .where(eq(rentInvoices.id, body.invoiceId)).run();

    // Log activity
    db.insert(paymentActivities).values({
      id: uuidv4(), tenantId, tenantProfileId: profileId, invoiceId: body.invoiceId,
      activityType: 'proof_uploaded', description: `Payment proof uploaded for ₹${body.amountPaid}`,
    }).run();

    // Notify owner (find an owner/admin user for this tenant)
    const ownerUser = db.select().from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.role, 'owner'))).get();
    if (ownerUser) {
      db.insert(notifications).values({
        id: uuidv4(), tenantId, userId: ownerUser.id,
        title: 'Payment Proof Uploaded', message: `A resident uploaded payment proof for invoice ${invoice.invoiceNumber}`,
        type: 'payment_proof', priority: 'high',
      }).run();
    }

    return reply.status(201).send({ id: proofId, message: 'Payment proof uploaded' });
  });

  // List my proofs
  app.get('/payments-proof/proofs/my', { preHandler: [app.authenticate] }, async (request, reply) => {
    const profileId = resolveProfileId(request.user!.userId);
    if (!profileId) return reply.send([]);
    const data = db.select().from(paymentProofs)
      .where(eq(paymentProofs.tenantProfileId, profileId))
      .orderBy(desc(paymentProofs.submittedAt)).all();

    // Enrich with invoice info
    const enriched = data.map(proof => {
      const invoice = db.select().from(rentInvoices)
        .where(eq(rentInvoices.id, proof.invoiceId)).get();
      return { ...proof, invoiceNumber: invoice?.invoiceNumber, totalAmount: invoice?.totalAmount };
    });

    return reply.send(enriched);
  });

  // List all proofs (admin - verification queue)
  app.get('/payments-proof/proofs', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { status, page = 1, limit = 20 } = request.query as {
      status?: string; page?: number; limit?: number;
    };
    const tenantId = request.user!.tenantId;
    let conditions = [eq(paymentProofs.tenantId, tenantId)];
    if (status) conditions.push(eq(paymentProofs.status, status));

    const data = db.select().from(paymentProofs).where(and(...conditions))
      .orderBy(desc(paymentProofs.submittedAt)).limit(limit).offset((page - 1) * limit).all();

    // Enrich with resident and invoice info
    const enriched = data.map(proof => {
      const profile = db.select().from(tenantProfiles)
        .where(eq(tenantProfiles.id, proof.tenantProfileId)).get();
      const invoice = db.select().from(rentInvoices)
        .where(eq(rentInvoices.id, proof.invoiceId)).get();
      const room = profile ? db.select().from(rooms)
        .where(eq(rooms.id, profile.roomId)).get() : null;
      return {
        ...proof,
        residentName: profile?.fullName || '—',
        roomNumber: room?.roomNumber || '—',
        invoiceNumber: invoice?.invoiceNumber || '—',
        invoiceAmount: invoice?.totalAmount || 0,
      };
    });

    const total = db.select().from(paymentProofs).where(and(...conditions)).all().length;
    return reply.send({ data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Get proof detail (non-admin users can only see their own proofs)
  app.get('/payments-proof/proofs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user!.tenantId;
    const proof = db.select().from(paymentProofs)
      .where(and(eq(paymentProofs.id, id), eq(paymentProofs.tenantId, tenantId))).get();
    if (!proof) return reply.status(404).send({ error: 'Proof not found' });
    const role = request.user!.role;
    if (role !== 'owner' && role !== 'admin') {
      const profileId = resolveProfileId(request.user!.userId);
      if (proof.tenantProfileId !== profileId) return reply.status(403).send({ error: 'Access denied' });
    }

    const invoice = db.select().from(rentInvoices)
      .where(eq(rentInvoices.id, proof.invoiceId)).get();
    const profile = db.select().from(tenantProfiles)
      .where(eq(tenantProfiles.id, proof.tenantProfileId)).get();
    const room = profile ? db.select().from(rooms)
      .where(eq(rooms.id, profile.roomId)).get() : null;

    const verification = db.select().from(paymentVerifications)
      .where(eq(paymentVerifications.proofId, id))
      .orderBy(desc(paymentVerifications.verifiedAt)).all();

    return reply.send({
      ...proof,
      invoiceNumber: invoice?.invoiceNumber || '—',
      invoiceAmount: invoice?.totalAmount || 0,
      residentName: profile?.fullName || '—',
      roomNumber: room?.roomNumber || '—',
      verification,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 3: PAYMENT VERIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  // Verify payment proof (approve / reject / reupload)
  app.post('/payments-proof/proofs/:id/verify', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { id } = request.params as { id: string };
    const body = parseBody(verifyPaymentSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;

    const proof = db.select().from(paymentProofs).where(eq(paymentProofs.id, id)).get();
    if (!proof) return reply.status(404).send({ error: 'Proof not found' });

    // Create verification record
    db.insert(paymentVerifications).values({
      id: uuidv4(), proofId: id, tenantId, verifiedBy: userId,
      verificationStatus: body.verificationStatus,
      rejectionReason: body.rejectionReason, notes: body.notes,
    }).run();

    const newProofStatus = body.verificationStatus === 'approved' ? 'approved'
      : body.verificationStatus === 'rejected' ? 'rejected' : 'reupload_requested';

    // Update proof status
    db.update(paymentProofs).set({ status: newProofStatus, updatedAt: new Date().toISOString() })
      .where(eq(paymentProofs.id, id)).run();

    if (body.verificationStatus === 'approved') {
      // Update invoice to paid
      db.update(rentInvoices).set({ status: 'paid', updatedAt: new Date().toISOString() })
        .where(eq(rentInvoices.id, proof.invoiceId)).run();

      // Generate receipt
      const invoice = db.select().from(rentInvoices)
        .where(eq(rentInvoices.id, proof.invoiceId)).get();
      const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}`;

      db.insert(receipts).values({
        id: uuidv4(), tenantId, invoiceId: proof.invoiceId,
        receiptNumber, amount: proof.amountPaid,
        paymentDate: proof.paymentDate, verifiedBy: userId,
      }).run();

      // Log activity
      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId, invoiceId: proof.invoiceId,
        activityType: 'payment_approved', description: `Payment of ₹${proof.amountPaid} approved. Receipt: ${receiptNumber}`,
      }).run();

      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId, invoiceId: proof.invoiceId,
        activityType: 'receipt_generated', description: `Receipt ${receiptNumber} generated`,
      }).run();

      // Notify tenant
      db.insert(notifications).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId,
        title: 'Payment Approved', message: `Your payment of ₹${proof.amountPaid} has been verified. Receipt: ${receiptNumber}`,
        type: 'payment_approved', priority: 'high',
      }).run();

    } else if (body.verificationStatus === 'rejected') {
      // Update invoice back to pending
      db.update(rentInvoices).set({ status: 'pending', updatedAt: new Date().toISOString() })
        .where(eq(rentInvoices.id, proof.invoiceId)).run();

      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId, invoiceId: proof.invoiceId,
        activityType: 'payment_rejected', description: `Payment rejected: ${body.rejectionReason || 'No reason provided'}`,
      }).run();

      db.insert(notifications).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId,
        title: 'Payment Rejected', message: `Your payment proof was rejected. Reason: ${body.rejectionReason || 'See details'}`,
        type: 'payment_rejected', priority: 'high',
      }).run();

    } else {
      // Reupload requested
      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId, invoiceId: proof.invoiceId,
        activityType: 'reupload_requested', description: `Reupload requested: ${body.notes || 'Please provide a clearer screenshot'}`,
      }).run();

      db.insert(notifications).values({
        id: uuidv4(), tenantId, tenantProfileId: proof.tenantProfileId,
        title: 'Reupload Requested', message: `Please upload a clearer payment proof. ${body.notes || ''}`,
        type: 'payment_reupload', priority: 'normal',
      }).run();
    }

    return reply.send({ message: `Payment ${body.verificationStatus}` });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 4: RECEIPTS
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/payments-proof/receipts', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const data = db.select().from(receipts)
      .where(eq(receipts.tenantId, tenantId))
      .orderBy(desc(receipts.createdAt)).all();

    const enriched = data.map(r => {
      const invoice = db.select().from(rentInvoices)
        .where(eq(rentInvoices.id, r.invoiceId)).get();
      const profile = invoice ? db.select().from(tenantProfiles)
        .where(eq(tenantProfiles.id, invoice.tenantProfileId)).get() : null;
      const room = profile ? db.select().from(rooms)
        .where(eq(rooms.id, profile.roomId)).get() : null;
      return {
        ...r,
        residentName: profile?.fullName || '—',
        roomNumber: room?.roomNumber || '—',
        invoiceNumber: invoice?.invoiceNumber || '—',
      };
    });

    return reply.send(enriched);
  });

  app.get('/payments-proof/receipts/my', { preHandler: [app.authenticate] }, async (request, reply) => {
    const profileId = resolveProfileId(request.user!.userId);
    if (!profileId) return reply.send([]);
    const myInvoices = db.select().from(rentInvoices)
      .where(eq(rentInvoices.tenantProfileId, profileId)).all();
    const invoiceIds = myInvoices.map(i => i.id);

    if (invoiceIds.length === 0) return reply.send([]);

    const data = db.select().from(receipts).where(
      sql`${receipts.invoiceId} IN (${sql.join(invoiceIds.map(id => sql`${id}`), sql`, `)})`
    ).orderBy(desc(receipts.createdAt)).all();

    return reply.send(data);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 5: REMINDERS
  // ══════════════════════════════════════════════════════════════════════════

  app.post('/payments-proof/reminders', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = parseBody(createReminderSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    if (body.invoiceId && body.tenantProfileId) {
      const reminderId = uuidv4();
      db.insert(paymentReminders).values({
        id: reminderId, tenantId, invoiceId: body.invoiceId,
        tenantProfileId: body.tenantProfileId, channel: body.channel,
        reminderType: body.reminderType, message: body.message,
      }).run();

      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: body.tenantProfileId, invoiceId: body.invoiceId,
        activityType: 'reminder_sent', description: `Reminder sent via ${body.channel}`,
      }).run();

      db.insert(notifications).values({
        id: uuidv4(), tenantId, tenantProfileId: body.tenantProfileId,
        title: 'Rent Reminder', message: body.message || 'Your rent payment is due. Please upload proof.',
        type: 'payment_reminder', priority: 'normal',
      }).run();

      return reply.status(201).send({ id: reminderId, message: 'Reminder sent' });
    }

    return reply.status(400).send({ error: 'invoiceId and tenantProfileId required' });
  });

  // Bulk reminders
  app.post('/payments-proof/reminders/bulk', { preHandler: [app.authenticate] }, async (request, reply) => {
    const body = parseBody(generateBulkRemindersSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    let targetResidents: { id: string; invoiceId: string }[] = [];

    if (body.targetGroup === 'all_pending' || body.targetGroup === 'all_overdue') {
      const statusFilter = body.targetGroup === 'all_overdue' ? 'overdue' : 'pending';
      const invoices = db.select().from(rentInvoices)
        .where(and(eq(rentInvoices.tenantId, tenantId), eq(rentInvoices.status, statusFilter)))
        .all();
      targetResidents = invoices.map(i => ({ id: i.tenantProfileId, invoiceId: i.id }));
    } else if (body.tenantProfileIds && body.tenantProfileIds.length > 0) {
      const invoices = db.select().from(rentInvoices)
        .where(and(eq(rentInvoices.tenantId, tenantId), eq(rentInvoices.status, 'pending')))
        .all();
      for (const inv of invoices) {
        if (body.tenantProfileIds.includes(inv.tenantProfileId)) {
          targetResidents.push({ id: inv.tenantProfileId, invoiceId: inv.id });
        }
      }
    }

    let sent = 0;
    for (const target of targetResidents) {
      const reminderId = uuidv4();
      db.insert(paymentReminders).values({
        id: reminderId, tenantId, invoiceId: target.invoiceId,
        tenantProfileId: target.id, channel: body.channel,
        reminderType: body.reminderType, message: body.message,
      }).run();

      db.insert(notifications).values({
        id: uuidv4(), tenantId, tenantProfileId: target.id,
        title: 'Rent Reminder', message: body.message || 'Your rent payment is due.',
        type: 'payment_reminder', priority: 'normal',
      }).run();

      db.insert(paymentActivities).values({
        id: uuidv4(), tenantId, tenantProfileId: target.id, invoiceId: target.invoiceId,
        activityType: 'reminder_sent', description: `Bulk reminder sent via ${body.channel}`,
      }).run();

      sent++;
    }

    return reply.send({ message: `${sent} reminders sent`, count: sent });
  });

  // Get reminders (owner only)
  app.get('/payments-proof/reminders', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const data = db.select().from(paymentReminders)
      .where(eq(paymentReminders.tenantId, tenantId))
      .orderBy(desc(paymentReminders.sentAt)).limit(100).all();
    return reply.send(data);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 6: REVENUE DASHBOARD & ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/payments-proof/dashboard', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const tenantId = request.user!.tenantId;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const allInvoices = db.select().from(rentInvoices)
      .where(eq(rentInvoices.tenantId, tenantId)).all();
    const currentInvoices = allInvoices.filter(i => i.monthYear === currentMonth);

    const totalResidents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active'))).all().length;

    const projectedRevenue = currentInvoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const collectedRevenue = currentInvoices.filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0);
    const outstandingRevenue = currentInvoices.filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0);
    const overdueRevenue = allInvoices.filter(i => i.status === 'overdue')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    const pendingProofs = db.select().from(paymentProofs)
      .where(and(eq(paymentProofs.tenantId, tenantId), eq(paymentProofs.status, 'pending')))
      .all().length;

    const paidCount = currentInvoices.filter(i => i.status === 'paid').length;
    const collectionRate = totalResidents > 0 ? ((paidCount / totalResidents) * 100).toFixed(1) : '0';

    // Late payments (invoices past due)
    const now = new Date().toISOString().slice(0, 10);
    const latePayments = currentInvoices.filter(i => i.status !== 'paid' && i.dueDate < now).length;

    // Advance balances
    const totalDeposit = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active'))).all()
      .reduce((sum, t) => sum + (t.depositPaid || 0), 0);

    return reply.send({
      projectedRevenue, collectedRevenue, outstandingRevenue, overdueRevenue,
      collectionRate, pendingVerifications: pendingProofs,
      latePayments, advanceBalances: totalDeposit,
      totalResidents, paidCount,
      pendingCount: currentInvoices.filter(i => i.status !== 'paid').length,
      totalInvoices: currentInvoices.length,
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 7: ACTIVITY LOG
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/payments-proof/activities', { preHandler: [app.authenticate] }, async (request, reply) => {
    if (!requireOwner(request, reply)) return;
    const { tenantProfileId, invoiceId } = request.query as { tenantProfileId?: string; invoiceId?: string };
    const tenantId = request.user!.tenantId;
    let conditions = [eq(paymentActivities.tenantId, tenantId)];
    if (tenantProfileId) conditions.push(eq(paymentActivities.tenantProfileId, tenantProfileId));
    if (invoiceId) conditions.push(eq(paymentActivities.invoiceId, invoiceId));

    const data = db.select().from(paymentActivities)
      .where(and(...conditions))
      .orderBy(desc(paymentActivities.createdAt)).limit(100).all();

    return reply.send(data);
  });

  // Get my activity (tenant)
  app.get('/payments-proof/activities/my', { preHandler: [app.authenticate] }, async (request, reply) => {
    const profileId = resolveProfileId(request.user!.userId);
    if (!profileId) return reply.send([]);
    const data = db.select().from(paymentActivities)
      .where(eq(paymentActivities.tenantProfileId, profileId))
      .orderBy(desc(paymentActivities.createdAt)).limit(50).all();
    return reply.send(data);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 8: TENANT PORTAL
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/payments-proof/my-invoices', { preHandler: [app.authenticate] }, async (request, reply) => {
    const profileId = resolveProfileId(request.user!.userId);
    if (!profileId) return reply.send([]);
    const data = db.select().from(rentInvoices)
      .where(eq(rentInvoices.tenantProfileId, profileId))
      .orderBy(desc(rentInvoices.createdAt)).limit(12).all();
    return reply.send(data);
  });

  app.get('/payments-proof/my-overview', { preHandler: [app.authenticate] }, async (request, reply) => {
    const profileId = resolveProfileId(request.user!.userId);
    if (!profileId) return reply.send({ currentInvoice: null, latestProof: null, outstandingAmount: 0, totalPaid: 0, totalPending: 0 });

    const invoices = db.select().from(rentInvoices)
      .where(eq(rentInvoices.tenantProfileId, profileId))
      .orderBy(desc(rentInvoices.createdAt)).all();

    const proofs = db.select().from(paymentProofs)
      .where(eq(paymentProofs.tenantProfileId, profileId))
      .orderBy(desc(paymentProofs.submittedAt)).all();

    const currentInvoice = invoices.find(i => i.status !== 'paid') || invoices[0] || null;
    const latestProof = proofs[0] || null;

    const outstandingAmount = invoices.filter(i => i.status !== 'paid')
      .reduce((sum, i) => sum + i.totalAmount, 0);

    return reply.send({
      currentInvoice,
      latestProof,
      outstandingAmount,
      totalPaid: invoices.filter(i => i.status === 'paid').length,
      totalPending: invoices.filter(i => i.status !== 'paid').length,
    });
  });
}
