import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
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

    const archivedData = archiveSnap.data()!;
    const peopleRef = adminDb.collection('tenants').doc(user.tenantId).collection('people');

    if (type === 'users') {
      const originalRef = peopleRef.doc(archivedData.originalId);
      const originalSnap = await originalRef.get();

      if (originalSnap.exists) {
        await originalRef.update({ isActive: true, updatedAt: new Date().toISOString() });
      } else {
        await originalRef.set({
          tenantId: user.tenantId,
          email: archivedData.email,
          phone: archivedData.phone,
          fullName: archivedData.fullName,
          role: archivedData.role,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      const originalRef = peopleRef.doc(archivedData.originalId);
      const originalSnap = await originalRef.get();

      if (originalSnap.exists) {
        await originalRef.update({
          status: 'active',
          moveOutDate: null,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await originalRef.set({
          tenantId: user.tenantId,
          propertyId: archivedData.propertyId || '',
          roomId: archivedData.roomId || '',
          bedId: archivedData.bedId || '',
          fullName: archivedData.fullName,
          phone: archivedData.phone,
          email: archivedData.email || '',
          role: 'resident',
          status: 'active',
          moveInDate: archivedData.moveInDate || new Date().toISOString().split('T')[0],
          rentAmount: archivedData.rentAmount || 0,
          depositPaid: archivedData.depositPaid || 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await archiveRef.delete();

    return NextResponse.json({ message: `${type === 'users' ? 'User' : 'Resident'} restored successfully` });
  } catch {
    return NextResponse.json({ error: 'Failed to restore' }, { status: 500 });
  }
}
