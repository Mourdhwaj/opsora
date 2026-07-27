import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

async function findPersonByEmail(tenantId: string, email: string) {
  const snap = await adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('people')
    .where('email', '==', email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const personRaw = await findPersonByEmail(auth.tenantId, auth.email);
    if (!personRaw) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    const person = personRaw as any;

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);

    // Get payment summary for this person
    const paymentsSnap = await tenantRef
      .collection('financials')
      .where('type', '==', 'payment')
      .get();

    const myPayments = paymentsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((p: any) => p.personId === person.id);

    const totalDue = myPayments.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);
    const totalPaid = myPayments.reduce((sum: number, p: any) => sum + (p.paidAmount || 0), 0);
    const pendingPayments = myPayments.filter((p: any) => p.paymentStatus !== 'paid' && p.paymentStatus !== 'completed').length;

    // Get complaint count
    const complaintsSnap = await tenantRef
      .collection('operations')
      .where('type', '==', 'complaint')
      .get();

    const myComplaints = complaintsSnap.docs
      .map(doc => doc.data())
      .filter((c: any) => c.personId === person.id);

    const openComplaints = myComplaints.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;

    // Look up room/property info
    let roomNumber = 'N/A';
    let propertyName = 'N/A';
    if (person.propertyId) {
      const propDoc = await tenantRef.collection('properties').doc(person.propertyId).get();
      if (propDoc.exists) {
        const propData = propDoc.data()!;
        propertyName = propData.name || 'N/A';
        const roomSummaries = propData.roomSummaries || [];
        const roomSummary = Array.isArray(roomSummaries)
          ? roomSummaries.find((r: any) => r.id === person.roomId)
          : null;
        if (roomSummary) roomNumber = roomSummary.roomNumber || 'N/A';
      }
    }

    return NextResponse.json({
      ...person,
      roomNumber,
      propertyName,
      totalDue,
      totalPaid,
      balance: totalDue - totalPaid,
      pendingPayments,
      openComplaints,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const person = await findPersonByEmail(auth.tenantId, auth.email);
    if (!person) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const allowedFields = ['phone', 'emergencyName', 'emergencyPhone', 'emergencyRelation', 'occupation', 'companyName'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('people')
      .doc(person.id)
      .update(updates);

    return NextResponse.json({ message: 'Profile updated' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
