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
      .collection('people')
      .where('role', '==', 'staff')
      .get();

    const staff = snap.docs.map((doc) => {
      const { passwordHash, ...data } = doc.data();
      return { id: doc.id, ...data };
    });

    return NextResponse.json(staff);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
