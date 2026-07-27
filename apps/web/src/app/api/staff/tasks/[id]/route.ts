import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();
    const { status, completionNotes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    const docRef = adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('operations')
      .doc(id);

    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'completed') {
      updates.completedAt = new Date().toISOString();
      updates.completedBy = auth.uid;
    }
    if (completionNotes) {
      updates.completionNotes = completionNotes;
    }

    await docRef.update(updates);

    const updatedDoc = await docRef.get();
    return NextResponse.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
