import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

async function findPersonByEmail(tenantId: string, email: string): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const snap = await adminDb
    .collection('tenants')
    .doc(tenantId)
    .collection('people')
    .where('email', '==', email)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, data: snap.docs[0].data() };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const person = await findPersonByEmail(auth.tenantId, auth.email);
    if (!person) {
      return NextResponse.json({ error: 'Resident profile not found' }, { status: 404 });
    }

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const personData = person.data;

    // Look up room/bed/property info
    let room: Record<string, unknown> | null = null;
    let bed: Record<string, unknown> | null = null;
    let property: Record<string, unknown> | null = null;

    if (personData.propertyId) {
      const propertyDoc = await tenantRef.collection('properties').doc(personData.propertyId as string).get();
      if (propertyDoc.exists) {
        const propData = propertyDoc.data()!;
        property = { id: propertyDoc.id, name: propData.name, address: propData.address, city: propData.city };

        const roomSummaries = propData.roomSummaries || [];
        const roomSummary = Array.isArray(roomSummaries)
          ? roomSummaries.find((r: any) => r.id === personData.roomId)
          : null;
        if (roomSummary) {
          room = { id: roomSummary.id, roomNumber: roomSummary.roomNumber, roomType: roomSummary.roomType, rentPerBed: roomSummary.rentPerBed };
          const bedData = (roomSummary.beds || []).find((b: any) => b.id === personData.bedId);
          if (bedData) {
            bed = { id: bedData.id, bedNumber: bedData.bedNumber, rentAmount: bedData.rentAmount };
          }
        }
      }
    }

    return NextResponse.json({
      id: person.id,
      ...personData,
      tenantId: auth.tenantId,
      propertyName: property?.name || null,
      propertyAddress: property?.address || null,
      propertyCity: property?.city || null,
      roomNumber: (room as any)?.roomNumber || null,
      roomType: (room as any)?.roomType || null,
      bedNumber: (bed as any)?.bedNumber || null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
