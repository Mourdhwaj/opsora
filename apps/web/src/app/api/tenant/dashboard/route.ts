import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const currentMonth = new Date().toISOString().slice(0, 7);

    const personSnap = await tenantRef.collection('people').where('email', '==', auth.email).limit(1).get();
    if (personSnap.empty) {
      return NextResponse.json({ profile: { fullName: auth.email, phone: '' }, property: null, room: null, payments: { currentMonth: { due: 0, paid: 0, pending: 0, status: 'unknown' }, recent: [] }, complaints: { open: 0, urgent: 0, recent: [] } });
    }

    const person = personSnap.docs[0].data();
    const personId = personSnap.docs[0].id;

    const propertyId = person.propertyId as string | undefined;
    const roomId = person.roomId as string | undefined;

    let property = null;
    let room = null;

    if (propertyId) {
      const propDoc = await tenantRef.collection('properties').doc(propertyId).get();
      if (propDoc.exists) {
        const pd = propDoc.data()!;
        property = { name: pd.name || '', address: pd.address || '', city: pd.city || '' };
        const summaries = pd.roomSummaries || [];
        const roomSummary = Array.isArray(summaries) ? summaries.find((r: any) => r.id === roomId) : null;
        if (roomSummary) {
          room = { number: roomSummary.roomNumber || 'N/A', type: roomSummary.roomType || '' };
        }
      }
    }

    const paymentsSnap = await tenantRef.collection('financials').where('type', '==', 'payment').where('personId', '==', personId).get();
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const currentPayment = payments.find((p: any) => p.monthYear === currentMonth);

    const currentMonthData = currentPayment
      ? {
          due: (currentPayment as any).totalAmount || 0,
          paid: (currentPayment as any).paidAmount || 0,
          pending: (currentPayment as any).balanceAmount || ((currentPayment as any).totalAmount - (currentPayment as any).paidAmount) || 0,
          status: (currentPayment as any).paymentStatus || 'pending',
        }
      : { due: (person as any).rentAmount || 0, paid: 0, pending: (person as any).rentAmount || 0, status: 'pending' };

    const recentPayments = payments
      .sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const complaintsSnap = await tenantRef.collection('operations').where('type', '==', 'complaint').get();
    const myComplaints = complaintsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter((c: any) => c.personId === personId || c.createdBy === personId);
    const open = myComplaints.filter((c: any) => c.status === 'open' || c.status === 'in_progress').length;
    const urgent = myComplaints.filter((c: any) => c.priority === 'urgent' && c.status !== 'resolved' && c.status !== 'closed').length;
    const recent = myComplaints
      .sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 3);

    return NextResponse.json({
      profile: { fullName: person.fullName || auth.email, phone: person.phone || '' },
      property,
      room,
      payments: { currentMonth: currentMonthData, recent: recentPayments },
      complaints: { open, urgent, recent },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
