import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const personDoc = await tenantRef.collection('people').doc(id).get();

    if (!personDoc.exists) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const personData = personDoc.data()!;
    const body = await req.json().catch(() => ({}));
    const checkoutDate = body.checkoutDate || new Date().toISOString().split('T')[0];

    // Update person status
    await tenantRef.collection('people').doc(id).update({
      status: 'checked_out',
      moveOutDate: checkoutDate,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Free up the bed in property roomSummaries
    if (personData.propertyId && personData.roomId && personData.bedId) {
      const bedField = `roomSummaries.${personData.roomId}.beds.${personData.bedId}.status`;
      const occupantField = `roomSummaries.${personData.roomId}.beds.${personData.bedId}.occupantId`;
      await tenantRef.collection('properties').doc(personData.propertyId).update({
        [bedField]: 'vacant',
        [occupantField]: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({
      message: 'Resident checked out successfully',
      checkoutDate,
      depositRefund: personData.depositPaid || 0,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
