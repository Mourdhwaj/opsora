import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, getQuery } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const days = parseInt(getQuery(req, 'days') || '7');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();

    // Water tank data lives in the iot collection with type=water-tank
    const tanksSnap = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('iot')
      .where('type', '==', 'water-tank')
      .get();

    const tanks: any[] = tanksSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // If no tanks exist, return empty summary
    if (tanks.length === 0) {
      return NextResponse.json({
        tanks: [],
        summary: { totalCapacity: 0, currentLevel: 0, dailyConsumption: 0, days },
      });
    }

    // Try to get readings from a readings subcollection, or compute from tank data
    let totalCapacity = 0;
    let totalLevel = 0;
    let totalConsumption = 0;

    for (const tank of tanks) {
      totalCapacity += tank.capacityLiters || 0;
      totalLevel += tank.currentLevel || 0;
      totalConsumption += tank.dailyConsumption || 0;
    }

    return NextResponse.json({
      tanks,
      summary: {
        totalCapacity,
        currentLevel: totalLevel,
        dailyConsumption: totalConsumption,
        days,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
