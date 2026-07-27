import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    // People docs use SQLite UUIDs, not Firebase Auth UIDs — look up by email
    const email = auth.email;
    if (!email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const peopleSnap = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('people')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (peopleSnap.empty) {
      // Fallback: try by doc ID (in case UID matches)
      const byId = await adminDb
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('people')
        .doc(auth.uid)
        .get();
      if (byId.exists) {
        const { passwordHash: _pw, ...safeUser } = byId.data()!;
        return NextResponse.json({ ...safeUser, tenantId: auth.tenantId });
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const doc = peopleSnap.docs[0];
    const { passwordHash: _pw, ...safeUser } = doc.data();
    return NextResponse.json({ ...safeUser, id: doc.id, tenantId: auth.tenantId });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
