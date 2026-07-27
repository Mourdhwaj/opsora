import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const paymentsSnapshot = await adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('financials')
      .where('type', '==', 'payment')
      .get();

    const payments = paymentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort in JS since createdAt may be mixed types
    payments.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    const enriched = await Promise.all(
      payments.map(async (payment: Record<string, unknown>) => {
        let tenantName = 'Unknown';
        let roomNumber = 'N/A';

        const personId = payment.personId as string | undefined;
        if (personId) {
          const residentDoc = await adminDb
            .collection('tenants')
            .doc(user.tenantId)
            .collection('people')
            .doc(personId)
            .get();
          if (residentDoc.exists) {
            tenantName = residentDoc.data()?.fullName || 'Unknown';
          }
        }

        const propertyId = payment.propertyId as string | undefined;
        if (propertyId) {
          const propDoc = await adminDb
            .collection('tenants')
            .doc(user.tenantId)
            .collection('properties')
            .doc(propertyId)
            .get();
          if (propDoc.exists) {
            const roomSummaries = propDoc.data()?.roomSummaries || [];
            const roomId = payment.roomId as string | undefined;
            if (roomId) {
              const room = Array.isArray(roomSummaries)
                ? roomSummaries.find((r: any) => r.id === roomId)
                : null;
              if (room) roomNumber = room.roomNumber || 'N/A';
            }
          }
        }

        return { ...payment, tenantName, roomNumber };
      })
    );

    return NextResponse.json({ data: enriched });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
