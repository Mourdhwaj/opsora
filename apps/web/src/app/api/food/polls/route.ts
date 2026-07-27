import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, getQuery } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const status = getQuery(req, 'status');
    let query: FirebaseFirestore.Query = adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('food')
      .where('type', '==', 'poll');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();
    const polls = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(polls);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
