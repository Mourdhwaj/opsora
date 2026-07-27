import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await req.json();
    const { status, assignedTo, resolutionNotes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
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

    const updates: Record<string, string> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (assignedTo) {
      updates.assignedTo = assignedTo;
      updates.assignedAt = new Date().toISOString();
    }
    if (resolutionNotes) {
      updates.resolutionNotes = resolutionNotes;
    }
    if (status === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
    }
    if (status === 'closed') {
      updates.closedAt = new Date().toISOString();
    }

    await docRef.update(updates);

    const updatedDoc = await docRef.get();
    return NextResponse.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch {
    return NextResponse.json({ error: 'Failed to update complaint status' }, { status: 500 });
  }
}
