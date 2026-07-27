import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await req.json();
    const { rating, feedback } = body;

    if (rating == null || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const docRef = adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('operations')
      .doc(id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    await docRef.update({
      tenantRating: rating,
      tenantFeedback: feedback || '',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Rating submitted' });
  } catch {
    return NextResponse.json({ error: 'Failed to rate complaint' }, { status: 500 });
  }
}
