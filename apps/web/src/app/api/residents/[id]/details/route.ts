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
    const personDoc = await tenantRef.collection('people').doc(id).get();

    if (!personDoc.exists) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    const personData = personDoc.data()!;
    if (personData.tenantId && personData.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: 'Resident not found' }, { status: 404 });
    }

    let room: any = null;
    let bed: any = null;
    let property: any = null;

    if (personData.propertyId) {
      const propertyDoc = await tenantRef.collection('properties').doc(personData.propertyId).get();
      if (propertyDoc.exists) {
        const propData = propertyDoc.data()!;
        property = { id: propertyDoc.id, name: propData.name, address: propData.address };

        const roomSummaries = propData.roomSummaries || [];
        const roomSummary = Array.isArray(roomSummaries)
          ? roomSummaries.find((r: any) => r.id === personData.roomId)
          : roomSummaries[personData.roomId];

        if (roomSummary) {
          room = {
            id: personData.roomId,
            roomNumber: roomSummary.roomNumber,
            roomType: roomSummary.roomType,
            rentPerBed: roomSummary.rentPerBed,
          };
        }

        if (personData.bedId && personData.roomId) {
          const beds = roomSummary?.beds || [];
          const bedData = Array.isArray(beds)
            ? beds.find((b: any) => b.id === personData.bedId)
            : beds[personData.bedId];
          if (bedData) {
            bed = {
              id: personData.bedId,
              bedNumber: bedData.bedNumber,
              rentAmount: bedData.rentAmount,
            };
          }
        }
      }
    }

    // Fetch payment history for this person
    const paymentsSnap = await tenantRef
      .collection('financials')
      .where('type', '==', 'payment')
      .where('personId', '==', id)
      .orderBy('monthYear', 'desc')
      .get();

    const paymentHistory = paymentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const totalDue = paymentHistory.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);
    const totalPaid = paymentHistory.reduce((sum: number, p: any) => sum + (p.paidAmount || 0), 0);
    const paidCount = paymentHistory.filter((p: any) => p.paymentStatus === 'paid').length;
    const pendingCount = paymentHistory.filter((p: any) => p.paymentStatus === 'pending').length;
    const partialCount = paymentHistory.filter((p: any) => p.paymentStatus === 'partial').length;

    const paymentSummary = {
      totalDue,
      totalPaid,
      totalBalance: totalDue - totalPaid,
      paidCount,
      pendingCount,
      partialCount,
      totalPayments: paymentHistory.length,
    };

    // Fetch recent complaints
    const complaintsSnap = await tenantRef
      .collection('operations')
      .where('type', '==', 'complaint')
      .where('personId', '==', id)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const recentComplaints = complaintsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({
      profile: { id: personDoc.id, ...personData },
      room,
      bed,
      property,
      paymentHistory,
      paymentSummary,
      recentComplaints,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
