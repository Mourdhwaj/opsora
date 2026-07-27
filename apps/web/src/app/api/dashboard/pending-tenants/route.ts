import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || currentMonth;

    const snapshot = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('financials')
      .where('type', '==', 'payment')
      .where('monthYear', '==', month)
      .get();

    const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const personIds = [...new Set(payments.map((p: any) => p.personId).filter(Boolean))];
    const personDocs = await Promise.all(
      personIds.map(id => adminDb.collection('tenants').doc(auth.tenantId).collection('people').doc(id).get())
    );
    const personMap = new Map<string, { name: string; roomNumber: string }>();
    personDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data()!;
        personMap.set(doc.id, { name: d.fullName || 'Unknown', roomNumber: d.roomNumber || 'N/A' });
      }
    });

    const notPaid = payments
      .filter((p: any) => p.paymentStatus !== 'paid' && p.paymentStatus !== 'completed')
      .map((p: any) => ({
        id: p.id,
        tenantName: personMap.get(p.personId)?.name || 'Unknown',
        roomNumber: personMap.get(p.personId)?.roomNumber || p.roomNumber || 'N/A',
        totalAmount: p.totalAmount || 0,
        paidAmount: p.paidAmount || 0,
        balanceAmount: p.balanceAmount || (p.totalAmount - (p.paidAmount || 0)),
        paymentStatus: p.paymentStatus || 'pending',
        dueDate: p.dueDate || '',
        monthYear: p.monthYear || month,
      }));

    return NextResponse.json({ tenants: notPaid });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
