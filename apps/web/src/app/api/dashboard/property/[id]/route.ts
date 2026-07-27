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
    const propertyDoc = await tenantRef.collection('properties').doc(id).get();

    if (!propertyDoc.exists) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const property = { id: propertyDoc.id, ...propertyDoc.data() };

    // Payments for this property
    const paymentsSnap = await tenantRef
      .collection('financials')
      .where('propertyId', '==', id)
      .where('type', '==', 'payment')
      .get();
    const payments = paymentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));

    // Complaints for this property
    const complaintsSnap = await tenantRef
      .collection('operations')
      .where('propertyId', '==', id)
      .where('type', '==', 'complaint')
      .get();
    const complaints = complaintsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Record<string, unknown>));

    const totalExpected = payments.reduce((sum, p) => sum + ((p.totalAmount as number) || 0), 0);
    const totalCollected = payments.reduce((sum, p) => sum + ((p.paidAmount as number) || 0), 0);

    return NextResponse.json({
      property,
      stats: {
        totalPayments: payments.length,
        totalExpected,
        totalCollected,
        pendingAmount: totalExpected - totalCollected,
        totalComplaints: complaints.length,
        openComplaints: complaints.filter((c) => c.status === 'open').length,
      },
      payments,
      complaints,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
