import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { foodMenuId, status, date } = body;

    if (!foodMenuId || !status) {
      return NextResponse.json({ error: 'foodMenuId and status are required' }, { status: 400 });
    }

    await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('food')
      .add({
        type: 'attendance',
        foodMenuId,
        personId: auth.uid,
        status,
        date: date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json({ message: 'Attendance recorded' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
