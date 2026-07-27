import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { foodMenuId, rating, tags } = body;

    if (!foodMenuId || !rating) {
      return NextResponse.json({ error: 'foodMenuId and rating are required' }, { status: 400 });
    }

    const docRef = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('food')
      .add({
        type: 'rating',
        foodMenuId,
        rating,
        tags: tags || [],
        personId: auth.uid,
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json({ id: docRef.id, success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
