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

    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (auth.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can delete properties' }, { status: 403 });
    }

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

    const data = doc.data();
    if (data?.stats?.occupiedBeds && data.stats.occupiedBeds > 0) {
      return NextResponse.json({ error: 'Cannot delete property with active tenants' }, { status: 400 });
    }

    await doc.ref.delete();
    return NextResponse.json({ message: 'Property deleted' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
