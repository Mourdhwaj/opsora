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
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const personId = await findPersonIdByEmail(user.tenantId, user.email);
    if (!personId) {
      return NextResponse.json({ payments: [] });
    }

    // Query all payments and filter client-side to avoid composite index requirement
    const snapshot = await adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('financials')
      .where('type', '==', 'payment')
      .get();

    const payments = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((p: any) => p.personId === personId)
      .sort((a: any, b: any) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

    return NextResponse.json({ payments });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
