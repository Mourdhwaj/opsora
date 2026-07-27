import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, getQuery } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const days = parseInt(getQuery(req, 'days') || '7');

    // Electricity meter data lives in the iot collection with type=electricity-meter
    const metersSnap = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('iot')
      .where('type', '==', 'electricity-meter')
      .get();

    const meters: any[] = metersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (meters.length === 0) {
      return NextResponse.json({
        meters: [],
        summary: { totalKwh: 0, totalCost: 0, avgDailyKwh: 0, days },
      });
    }

    let totalKwh = 0;
    let totalCost = 0;

    for (const meter of meters) {
      totalKwh += meter.currentKwh || meter.dailyKwh || 0;
      totalCost += meter.estimatedCost || 0;
    }

    const avgDailyKwh = days > 0 ? +(totalKwh / days).toFixed(2) : 0;

    return NextResponse.json({
      meters,
      summary: {
        totalKwh: +totalKwh.toFixed(2),
        totalCost: +totalCost.toFixed(2),
        avgDailyKwh,
        days,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
