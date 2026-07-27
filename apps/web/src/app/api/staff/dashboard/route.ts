import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);

    const [peopleSnap, paymentsSnap, tasksSnap, complaintsSnap] = await Promise.all([
      tenantRef.collection('people').where('role', '==', 'resident').where('status', '==', 'active').get(),
      tenantRef.collection('financials').where('type', '==', 'payment').where('monthYear', '==', currentMonth).get(),
      tenantRef.collection('operations').where('type', '==', 'task').where('assignedTo', '==', auth.uid).get(),
      tenantRef.collection('operations').where('type', '==', 'complaint').where('status', '==', 'in_progress').get(),
    ]);

    const payments = paymentsSnap.docs.map(d => d.data());
    const totalExpected = payments.reduce((s, p: any) => s + (p.totalAmount || 0), 0);
    const totalCollected = payments.reduce((s, p: any) => s + (p.paidAmount || 0), 0);

    return NextResponse.json({
      activeTenants: peopleSnap.size,
      totalExpected,
      totalCollected,
      collectionRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      pendingTasks: tasksSnap.size,
      activeComplaints: complaintsSnap.size,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
