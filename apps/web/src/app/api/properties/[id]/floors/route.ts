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
    const doc = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('properties')
      .doc(id)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const propertyData = doc.data();
    const floors = (propertyData?.floorSummaries || []) as Array<{ floorNumber?: number }>;

    return NextResponse.json(
      floors.sort((a, b) => (a.floorNumber || 0) - (b.floorNumber || 0))
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
