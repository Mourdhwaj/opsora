import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);

    let propertyDocs: FirebaseFirestore.QueryDocumentSnapshot[];
    if (propertyId) {
      const doc = await tenantRef.collection('properties').doc(propertyId).get();
      propertyDocs = doc.exists ? [doc as any] : [];
    } else {
      const snap = await tenantRef.collection('properties').limit(10).get();
      propertyDocs = snap.docs;
    }

    const residentsSnap = await tenantRef
      .collection('people')
      .where('role', '==', 'resident')
      .where('status', '==', 'active')
      .get();

    const residentByBed = new Map<string, { name: string; id: string }>();
    for (const doc of residentsSnap.docs) {
      const p = doc.data();
      if (p.bedId) residentByBed.set(p.bedId, { name: p.fullName, id: doc.id });
    }

    const allRooms: any[] = [];
    for (const propDoc of propertyDocs) {
      const propData = propDoc.data();
      const roomSummaries = propData.roomSummaries || [];
      for (const room of roomSummaries) {
        const beds = (room.beds || []).map((bed: any) => ({
          ...bed,
          tenantName: residentByBed.get(bed.id)?.name || null,
          tenantProfileId: residentByBed.get(bed.id)?.id || null,
        }));
        allRooms.push({ ...room, propertyId: propDoc.id, propertyName: propData.name, beds });
        if (allRooms.length >= limit) break;
      }
      if (allRooms.length >= limit) break;
    }

    return NextResponse.json(allRooms);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
