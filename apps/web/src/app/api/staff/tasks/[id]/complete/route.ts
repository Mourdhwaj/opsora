import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const taskRef = adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('operations')
      .doc(id);

    const taskSnap = await taskRef.get();
    if (!taskSnap.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = taskSnap.data()!;
    if (task.assignedTo !== auth.uid) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await taskRef.update({
      status: 'completed',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
