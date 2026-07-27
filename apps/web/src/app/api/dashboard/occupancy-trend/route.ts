import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);

    // Total beds (denominator for occupancy)
    let propertiesQuery: FirebaseFirestore.Query = tenantRef.collection('properties');
    if (propertyId) propertiesQuery = propertiesQuery.where('__name__', '==', propertyId);
    const propertiesSnap = await propertiesQuery.get();

    let totalBedsCount = 0;
    for (const doc of propertiesSnap.docs) {
      totalBedsCount += doc.data().stats?.totalBeds || 0;
    }

    // All payments grouped by monthYear
    let payQuery: FirebaseFirestore.Query = tenantRef
      .collection('financials')
      .where('type', '==', 'payment');
    if (propertyId) payQuery = payQuery.where('propertyId', '==', propertyId);
    const paySnap = await payQuery.get();

    const monthlyData = new Map<string, { occupied: Set<string>; expected: number; collected: number }>();

    for (const d of paySnap.docs) {
      const p = d.data();
      const month = p.monthYear;
      if (!month) continue;

      const existing = monthlyData.get(month) || { occupied: new Set<string>(), expected: 0, collected: 0 };
      if (p.personId) existing.occupied.add(p.personId);
      existing.expected += p.totalAmount || 0;
      existing.collected += p.paidAmount || 0;
      monthlyData.set(month, existing);
    }

    const result = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, data]) => ({
        month,
        occupied: data.occupied.size,
        vacant: Math.max(0, totalBedsCount - data.occupied.size),
        expected: data.expected,
        collected: data.collected,
        collectionRate: data.expected > 0 ? ((data.collected / data.expected) * 100).toFixed(1) : '0',
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
