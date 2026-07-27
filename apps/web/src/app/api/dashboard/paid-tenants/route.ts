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

    // Enrich with tenant names
    const personIds = [...new Set(payments.map((p: any) => p.personId).filter(Boolean))];
    const personDocs = await Promise.all(
      personIds.map(id => adminDb.collection('tenants').doc(auth.tenantId).collection('people').doc(id).get())
    );
    const personMap = new Map<string, string>();
    personDocs.forEach(doc => {
      if (doc.exists) personMap.set(doc.id, doc.data()!.fullName || 'Unknown');
    });

    const paid = payments
      .filter((p: any) => p.paymentStatus === 'paid' || p.paymentStatus === 'completed')
      .map((p: any) => ({
        id: p.id,
        tenantName: personMap.get(p.personId) || 'Unknown',
        roomNumber: p.roomNumber || 'N/A',
        paidAmount: p.paidAmount || 0,
        totalAmount: p.totalAmount || 0,
        paymentMethod: p.paymentMethod || 'N/A',
        paidDate: p.paidDate || '',
        monthYear: p.monthYear || month,
      }));

    const totalCollected = paid.reduce((s, p) => s + (p.paidAmount || 0), 0);

    return NextResponse.json({ tenants: paid, summary: { totalCollected, count: paid.length } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
