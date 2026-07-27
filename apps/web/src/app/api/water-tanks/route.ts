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
      .collection('iot')
      .where('type', '==', 'water-tank')
      .get();

    const tanks = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(tanks);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
