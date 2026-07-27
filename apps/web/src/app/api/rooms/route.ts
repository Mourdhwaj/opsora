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

    const allRooms: any[] = [];
    for (const propDoc of propertyDocs) {
      const propData = propDoc.data();
      const roomSummaries = propData.roomSummaries || [];
      for (const room of roomSummaries) {
        allRooms.push({ ...room, propertyId: propDoc.id });
        if (allRooms.length >= limit) break;
      }
      if (allRooms.length >= limit) break;
    }

    return NextResponse.json({ data: allRooms });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (!['owner', 'admin'].includes(auth.role)) {
      return NextResponse.json({ error: 'Only owners or admins can create rooms' }, { status: 403 });
    }

    const body = await req.json();
    const {
      propertyId, floorId, roomNumber, roomType, roomCategory,
      sharingType, totalBeds, rentPerBed, depositAmount, amenities, gender,
    } = body as {
      propertyId: string;
      floorId?: string;
      roomNumber: string;
      roomType?: string;
      roomCategory?: string;
      sharingType?: string;
      totalBeds: number;
      rentPerBed?: number;
      depositAmount?: number;
      amenities?: string[];
      gender?: string;
    };

    if (!propertyId || !roomNumber || !totalBeds) {
      return NextResponse.json({ error: 'propertyId, roomNumber, and totalBeds are required' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const propertyRef = tenantRef.collection('properties').doc(propertyId);

    const roomRef = propertyRef.collection('rooms').doc();
    const bedSummaries: Array<{ id: string; bedNumber: string; status: string }> = [];

    const batch = adminDb.batch();

    const roomData = {
      roomNumber,
      roomType: roomType || 'standard',
      roomCategory: roomCategory || 'single',
      sharingType: sharingType || 'single',
      rentPerBed: rentPerBed || 0,
      depositAmount: depositAmount || 0,
      amenities: amenities || [],
      gender: gender || 'mixed',
      floorId: floorId || '',
      propertyId,
      tenantId: auth.tenantId,
      status: 'vacant',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    batch.set(roomRef, roomData);

    for (let i = 1; i <= totalBeds; i++) {
      const bedRef = propertyRef.collection('beds').doc();
      const bedData = {
        bedNumber: `B${i}`,
        rentAmount: rentPerBed || 0,
        status: 'vacant',
        roomId: roomRef.id,
        roomNumber,
        floorId: floorId || '',
        propertyId,
        tenantId: auth.tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(bedRef, bedData);
      bedSummaries.push({ id: bedRef.id, bedNumber: bedData.bedNumber, status: 'vacant' });
    }

    await batch.commit();

    // Update property's roomSummaries and stats
    const propertyDoc = await propertyRef.get();
    if (propertyDoc.exists) {
      const propData = propertyDoc.data()!;
      const existingRooms = propData.roomSummaries || [];
      const existingStats = propData.stats || { totalBeds: 0, occupiedBeds: 0, totalRooms: 0 };

      existingRooms.push({
        id: roomRef.id,
        roomNumber,
        roomType: roomData.roomType,
        floorId: floorId || '',
        totalBeds,
        occupiedBeds: 0,
        rentPerBed: rentPerBed || 0,
        beds: bedSummaries,
      });

      await propertyRef.update({
        roomSummaries: existingRooms,
        stats: {
          totalBeds: existingStats.totalBeds + totalBeds,
          occupiedBeds: existingStats.occupiedBeds,
          totalRooms: existingStats.totalRooms + 1,
        },
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ id: roomRef.id, ...roomData, beds: bedSummaries }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
