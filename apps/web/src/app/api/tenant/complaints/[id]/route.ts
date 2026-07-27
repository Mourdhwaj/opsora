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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const doc = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('operations')
      .doc(id)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const data = doc.data()!;
    // Ensure the complaint belongs to this person
    const personId = await findPersonIdByEmail(auth.tenantId, auth.email);
    if (data.personId && data.personId !== personId) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...data });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
