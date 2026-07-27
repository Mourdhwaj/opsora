import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { pollId } = await params;
    const body = await req.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ error: 'optionId is required' }, { status: 400 });
    }

    const pollRef = adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('food')
      .doc(pollId);

    const pollDoc = await pollRef.get();
    if (!pollDoc.exists) {
      return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
    }

    await pollRef.update({
      [`votes.${optionId}`]: FieldValue.arrayUnion(auth.uid),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Vote recorded' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
