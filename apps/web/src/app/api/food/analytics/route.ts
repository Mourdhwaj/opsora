import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const snap = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('food')
      .where('type', '==', 'rating')
      .get();

    const ratings = snap.docs.map(doc => doc.data());

    // Aggregate by menu
    const byMenu: Record<string, { sum: number; count: number }> = {};
    for (const r of ratings) {
      const key = r.foodMenuId || 'unknown';
      if (!byMenu[key]) byMenu[key] = { sum: 0, count: 0 };
      byMenu[key].sum += r.rating || 0;
      byMenu[key].count += 1;
    }

    const avgRating = ratings.length > 0
      ? +(ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1)
      : 0;

    return NextResponse.json({
      avgRating,
      totalRatings: ratings.length,
      menuBreakdown: Object.entries(byMenu).map(([id, v]) => ({
        foodMenuId: id,
        avgRating: v.count > 0 ? +(v.sum / v.count).toFixed(1) : 0,
        count: v.count,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
