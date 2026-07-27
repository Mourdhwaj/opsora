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

    const ratings = snap.docs.map((doc) => doc.data());

    if (ratings.length === 0) {
      return NextResponse.json({ avgRating: 0, totalRatings: 0, complaintTags: [] });
    }

    let totalRating = 0;
    const tags: Record<string, number> = {};

    for (const r of ratings) {
      totalRating += r.rating || 0;
      if (r.tags && Array.isArray(r.tags)) {
        for (const tag of r.tags) {
          tags[tag] = (tags[tag] || 0) + 1;
        }
      }
    }

    const complaintTags = Object.entries(tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      avgRating: +(totalRating / ratings.length).toFixed(1),
      totalRatings: ratings.length,
      complaintTags,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
