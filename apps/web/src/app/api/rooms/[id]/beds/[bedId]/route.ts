import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; bedId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, bedId } = await params;
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    const bedDoc = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('properties')
      .doc(propertyId)
      .collection('beds')
      .doc(bedId)
      .get();

    if (!bedDoc.exists) {
      return NextResponse.json({ error: 'Bed not found' }, { status: 404 });
    }

    const bedData = bedDoc.data()!;

    // Verify bed belongs to this room
    if (bedData.roomId !== id) {
      return NextResponse.json({ error: 'Bed not found in this room' }, { status: 404 });
    }

    // Fetch tenant profile if occupied
    let tenant = null;
    if (bedData.status === 'occupied' && bedData.tenantProfileId) {
      const profileDoc = await adminDb
        .collection('tenants')
        .doc(auth.tenantId)
        .collection('tenantProfiles')
        .doc(bedData.tenantProfileId)
        .get();

      if (profileDoc.exists) {
        tenant = { id: profileDoc.id, ...profileDoc.data() };
      }
    }

    return NextResponse.json({ id: bedDoc.id, ...bedData, tenant });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
