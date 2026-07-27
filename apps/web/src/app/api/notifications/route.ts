import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

async function findPersonIdByEmail(tenantId: string, email: string): Promise<string | null> {
  const snap = await adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('people')
    .where('email', '==', email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const personId = await findPersonIdByEmail(auth.tenantId, auth.email);

    // Query all notifications and filter client-side to avoid composite index requirement
    const snap = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('operations')
      .where('type', '==', 'notification')
      .get();

    const notifications = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((n: any) => n.personId === personId)
      .sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 50);

    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
