import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const doc = await adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('operations')
      .doc(id)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch complaint' }, { status: 500 });
  }
}
