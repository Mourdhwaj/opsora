import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
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
    const { comment, isInternal } = body;

    if (!comment) {
      return NextResponse.json({ error: 'comment is required' }, { status: 400 });
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

    // Look up author name
    let authorName = 'Staff';
    try {
      const peopleSnap = await adminDb
        .collection('tenants')
        .doc(user.tenantId)
        .collection('people')
        .where('email', '==', user.email)
        .limit(1)
        .get();
      if (!peopleSnap.empty) {
        authorName = peopleSnap.docs[0].data().fullName || 'Staff';
      }
    } catch {
      // Non-fatal
    }

    const newComment = {
      userId: user.uid,
      authorName,
      comment,
      isInternal: isInternal || false,
      createdAt: new Date().toISOString(),
    };

    await docRef.update({
      comments: FieldValue.arrayUnion(newComment),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
