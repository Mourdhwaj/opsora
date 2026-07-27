import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);

    // Find the property containing this room by searching all properties
    const propertiesSnap = await tenantRef.collection('properties').get();
    let foundProperty: any = null;
    let foundRoomSummary: any = null;

    for (const propDoc of propertiesSnap.docs) {
      const propData = propDoc.data();
      const roomSummaries = propData.roomSummaries || [];
      const roomSummary = Array.isArray(roomSummaries)
        ? roomSummaries.find((r: any) => r.id === id)
        : null;
      if (roomSummary) {
        foundProperty = { id: propDoc.id, name: propData.name, address: propData.address };
        foundRoomSummary = roomSummary;
        break;
      }
    }

    if (!foundRoomSummary) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const beds = foundRoomSummary.beds || [];

    // Fetch tenants (people) for this room
    const residentsSnap = await tenantRef
      .collection('people')
      .where('role', '==', 'resident')
      .where('roomId', '==', id)
      .get();

    const tenantPromises = residentsSnap.docs.map(async (doc) => {
      const tenantData = doc.data();
      const bedData = beds.find((b: any) => b.id === tenantData.bedId);

      // Fetch latest payment for this tenant
      let latestPayment = null;
      try {
        const paymentsSnap = await tenantRef
          .collection('financials')
          .where('type', '==', 'payment')
          .where('personId', '==', doc.id)
          .orderBy('monthYear', 'desc')
          .limit(1)
          .get();
        if (!paymentsSnap.empty) {
          const p = paymentsSnap.docs[0].data();
          latestPayment = {
            monthYear: p.monthYear,
            rentAmount: p.rentAmount,
            totalAmount: p.totalAmount,
            paidAmount: p.paidAmount,
            balanceAmount: p.balanceAmount,
            paymentStatus: p.paymentStatus,
            dueDate: p.dueDate,
            paidDate: p.paidDate,
          };
        }
      } catch {
        // Payment fetch failure is non-fatal
      }

      return {
        id: doc.id,
        ...tenantData,
        bedId: tenantData.bedId,
        bedNumber: bedData?.bedNumber || null,
        latestPayment,
      };
    });

    const tenants = await Promise.all(tenantPromises);

    return NextResponse.json({
      ...foundRoomSummary,
      propertyId: foundProperty?.id,
      beds,
      tenants,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
