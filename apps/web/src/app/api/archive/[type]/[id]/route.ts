import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { type, id } = await params;
    if (type !== 'users' && type !== 'residents') {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const archiveCol = type === 'users' ? 'archivedUsers' : 'archivedResidents';
    const archiveRef = adminDb.collection('tenants').doc(user.tenantId).collection(archiveCol).doc(id);
    const archiveSnap = await archiveRef.get();

    if (!archiveSnap.exists) {
      return NextResponse.json({ error: 'Archived record not found' }, { status: 404 });
    }

    await archiveRef.delete();

    return NextResponse.json({ message: `Archived ${type === 'users' ? 'user' : 'resident'} permanently deleted` });
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
