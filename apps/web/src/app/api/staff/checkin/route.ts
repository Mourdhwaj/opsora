import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('operations')
      .add({
        type: 'attendance',
        personId: auth.uid,
        action: 'checkin',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json({ message: 'Checked in successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
