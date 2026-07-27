import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

interface BulkRoom {
  roomNumber: string;
  roomType?: string;
  roomCategory?: string;
  sharingType?: string;
  bedsPerRoom?: number;
  rentPerBed?: number;
  depositAmount?: number;
  gender?: string;
  amenities?: string[];
}

interface BulkFloor {
  floorNumber: number;
  floorName?: string;
  rooms?: BulkRoom[];
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (!['owner', 'admin'].includes(auth.role)) {
      return NextResponse.json({ error: 'Only owners or admins can create properties' }, { status: 403 });
    }

    const body = await req.json();
    const { propertyId, name, address, city, state, pincode, propertyType, floors } = body as {
      propertyId?: string;
      name: string;
      address?: string;
      city?: string;
      state?: string;
      pincode?: string;
      propertyType?: string;
      floors: BulkFloor[];
    };

    if (!name || !floors?.length) {
      return NextResponse.json({ error: 'Name and at least one floor are required' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const propertyRef = propertyId
      ? tenantRef.collection('properties').doc(propertyId)
      : tenantRef.collection('properties').doc();

    const floorSummaries: Array<{ id: string; floorNumber: number; floorName: string }> = [];
    const roomSummaries: Array<Record<string, unknown>> = [];
    let totalBeds = 0;
    let totalRooms = 0;
    const batch = adminDb.batch();

    for (const floor of floors) {
      const floorRef = propertyRef.collection('floors').doc();
      const floorData = {
        floorNumber: floor.floorNumber,
        floorName: floor.floorName || `Floor ${floor.floorNumber}`,
        propertyId: propertyRef.id,
        tenantId: auth.tenantId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(floorRef, floorData);

      floorSummaries.push({
        id: floorRef.id,
        floorNumber: floor.floorNumber,
        floorName: floorData.floorName,
      });

      for (const room of (floor.rooms || [])) {
        const roomRef = propertyRef.collection('rooms').doc();
        const roomData = {
          roomNumber: room.roomNumber,
          roomType: room.roomType || 'standard',
          roomCategory: room.roomCategory || 'single',
          sharingType: room.sharingType || 'single',
          rentPerBed: room.rentPerBed || 0,
          depositAmount: room.depositAmount || 0,
          gender: room.gender || 'mixed',
          amenities: room.amenities || [],
          floorId: floorRef.id,
          floorNumber: floor.floorNumber,
          propertyId: propertyRef.id,
          tenantId: auth.tenantId,
          status: 'vacant',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.set(roomRef, roomData);

        const bedsPerRoom = room.bedsPerRoom || 1;
        totalRooms++;
        totalBeds += bedsPerRoom;

        const bedSummaries: Array<{ id: string; bedNumber: string; status: string }> = [];
        for (let b = 1; b <= bedsPerRoom; b++) {
          const bedRef = propertyRef.collection('beds').doc();
          const bedData = {
            bedNumber: `B${b}`,
            rentAmount: room.rentPerBed || 0,
            status: 'vacant',
            roomId: roomRef.id,
            roomNumber: room.roomNumber,
            floorId: floorRef.id,
            floorNumber: floor.floorNumber,
            propertyId: propertyRef.id,
            tenantId: auth.tenantId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          batch.set(bedRef, bedData);
          bedSummaries.push({ id: bedRef.id, bedNumber: bedData.bedNumber, status: 'vacant' });
        }

        roomSummaries.push({
          id: roomRef.id,
          roomNumber: room.roomNumber,
          roomType: roomData.roomType,
          floorId: floorRef.id,
          floorNumber: floor.floorNumber,
          totalBeds: bedsPerRoom,
          occupiedBeds: 0,
          rentPerBed: room.rentPerBed || 0,
          beds: bedSummaries,
        });
      }
    }

    const propertyData = {
      name,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      propertyType: propertyType || 'pg',
      totalFloors: floors.length,
      roomSummaries,
      floorSummaries,
      stats: { totalBeds, occupiedBeds: 0, totalRooms },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    batch.set(propertyRef, propertyData, { merge: true });
    await batch.commit();

    return NextResponse.json({ id: propertyRef.id, ...propertyData }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
