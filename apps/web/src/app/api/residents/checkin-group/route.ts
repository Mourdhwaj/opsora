import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { propertyId, moveInDate, residents } = body;

    if (!propertyId || !moveInDate || !residents || !Array.isArray(residents) || residents.length === 0) {
      return NextResponse.json({ error: 'Missing required fields: propertyId, moveInDate, residents[]' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const propertyDoc = await tenantRef.collection('properties').doc(propertyId).get();
    if (!propertyDoc.exists) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const propertyData = propertyDoc.data()!;
    const roomSummaries = propertyData.roomSummaries || {};

    // Validate all beds are vacant
    for (const resident of residents) {
      if (!resident.bedId) {
        return NextResponse.json({ error: `Bed ID required for resident ${resident.fullName}` }, { status: 400 });
      }
      const room = roomSummaries[resident.roomId];
      if (!room) {
        return NextResponse.json({ error: `Room ${resident.roomId} not found in property` }, { status: 400 });
      }
      const bed = room.beds?.[resident.bedId];
      if (!bed) {
        return NextResponse.json({ error: `Bed ${resident.bedId} not found in room ${resident.roomId}` }, { status: 400 });
      }
      if (bed.status !== 'vacant') {
        return NextResponse.json({ error: `Bed ${resident.bedId} is not available` }, { status: 400 });
      }
    }

    const batch = adminDb.batch();
    const createdResidents: any[] = [];

    // Firestore batch limit is 500 operations
    if (residents.length > 499) {
      return NextResponse.json({ error: 'Maximum 499 residents per group check-in' }, { status: 400 });
    }

    for (const resident of residents) {
      const peopleRef = tenantRef.collection('people').doc();
      const personData: Record<string, any> = {
        role: 'resident',
        fullName: resident.fullName,
        phone: resident.phone || '',
        email: resident.email || '',
        gender: resident.gender || '',
        dateOfBirth: resident.dateOfBirth || '',
        bloodGroup: resident.bloodGroup || '',
        occupation: resident.occupation || '',
        companyName: resident.companyName || '',
        collegeName: resident.collegeName || '',
        emergencyName: resident.emergencyName || '',
        emergencyPhone: resident.emergencyPhone || '',
        emergencyRelation: resident.emergencyRelation || '',
        moveInDate,
        rentAmount: resident.rentAmount || 0,
        depositPaid: resident.depositPaid || 0,
        propertyId,
        roomId: resident.roomId || null,
        bedId: resident.bedId || null,
        status: 'active',
        tenantId: auth.tenantId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.set(peopleRef, personData);
      createdResidents.push({ id: peopleRef.id, ...personData });

      // Mark bed as occupied in property roomSummaries
      if (resident.bedId && resident.roomId) {
        const bedField = `roomSummaries.${resident.roomId}.beds.${resident.bedId}.status`;
        const occupantField = `roomSummaries.${resident.roomId}.beds.${resident.bedId}.occupantId`;
        batch.update(tenantRef.collection('properties').doc(propertyId), {
          [bedField]: 'occupied',
          [occupantField]: peopleRef.id,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();

    return NextResponse.json({ residents: createdResidents }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
