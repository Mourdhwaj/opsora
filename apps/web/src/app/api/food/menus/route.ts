import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, getQuery } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const date = getQuery(req, 'date');
    let query: FirebaseFirestore.Query = adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('food')
      .where('type', '==', 'menu');

    if (date) {
      query = query.where('date', '==', date);
    }

    const snap = await query.get();
    const menus = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(menus);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
