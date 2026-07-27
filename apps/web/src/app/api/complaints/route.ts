import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);

    let query: FirebaseFirestore.Query = adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('operations')
      .where('type', '==', 'complaint');

    if (propertyId) {
      query = query.where('propertyId', '==', propertyId);
    }

    const snapshot = await query.limit(limitParam).get();
    const data: Record<string, any>[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort in JS since createdAt may be mixed types
    data.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch complaints' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const body = await req.json();
    const { category, priority, title, description, propertyId, tenantName, roomNumber, propertyName } = body;

    if (!category || !priority || !title || !description) {
      return NextResponse.json(
        { error: 'category, priority, title, and description are required' },
        { status: 400 }
      );
    }

    // Generate a sequential ticket number
    const existingSnap = await adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('operations')
      .where('type', '==', 'complaint')
      .get();
    const ticketCount = existingSnap.size + 1;
    const ticketNumber = `TKT-${String(ticketCount).padStart(4, '0')}`;

    const complaintRef = adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('operations')
      .doc();

    await complaintRef.set({
      type: 'complaint',
      ticketNumber,
      category,
      priority,
      title,
      description,
      propertyId: propertyId || null,
      tenantName: tenantName || '',
      roomNumber: roomNumber || '',
      propertyName: propertyName || '',
      status: 'open',
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const doc = await complaintRef.get();
    return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create complaint' }, { status: 500 });
  }
}
