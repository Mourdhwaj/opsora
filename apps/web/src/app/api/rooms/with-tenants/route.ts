import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);

    // Get properties to query
    let propertyDocs: FirebaseFirestore.QueryDocumentSnapshot[];
    if (propertyId) {
      const doc = await tenantRef.collection('properties').doc(propertyId).get();
      propertyDocs = doc.exists ? [doc as any] : [];
    } else {
      const snap = await tenantRef.collection('properties').get();
      propertyDocs = snap.docs;
    }

    // Fetch all active residents to map bedId → person
    const residentsSnap = await tenantRef
      .collection('people')
      .where('role', '==', 'resident')
      .where('status', '==', 'active')
      .get();

    const residentByBed = new Map<string, { name: string; id: string }>();
    const residentByProperty = new Map<string, Map<string, { name: string; id: string }>>();
    for (const doc of residentsSnap.docs) {
      const p = doc.data();
      if (p.bedId) {
        residentByBed.set(p.bedId, { name: p.fullName, id: doc.id });
      }
      if (p.propertyId) {
        if (!residentByProperty.has(p.propertyId)) {
          residentByProperty.set(p.propertyId, new Map());
        }
        residentByProperty.get(p.propertyId)!.set(doc.id, { name: p.fullName, id: doc.id });
      }
    }

    const allRooms: any[] = [];

    for (const propDoc of propertyDocs) {
      const propertyData = propDoc.data();
      const roomSummaries = (propertyData.roomSummaries || []) as any[];

      for (const room of roomSummaries) {
        const beds = (room.beds || []).map((bed: any) => {
          const resident = residentByBed.get(bed.id);
          return {
            ...bed,
            tenantName: resident?.name || null,
            tenantProfileId: resident?.id || null,
          };
        });
        allRooms.push({ ...room, propertyId: propDoc.id, beds });
      }
    }

    return NextResponse.json(allRooms);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
