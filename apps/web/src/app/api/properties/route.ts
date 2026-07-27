import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(200, parseInt(searchParams.get('limit') || '100'));

    const snap = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('properties')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ data, total: data.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    if (!['owner', 'admin'].includes(auth.role)) {
      return NextResponse.json({ error: 'Only owners or admins can create properties' }, { status: 403 });
    }

    const body = await req.json();
    const { name, address, city, state, pincode, latitude, longitude, propertyType, totalFloors, wifiSsid, wifiPassword, amenities } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const propertyRef = adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('properties')
      .doc();

    const propertyData = {
      name,
      address: address || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      latitude: latitude || null,
      longitude: longitude || null,
      propertyType: propertyType || 'pg',
      totalFloors: totalFloors || 1,
      wifiSsid: wifiSsid || '',
      wifiPassword: wifiPassword || '',
      amenities: amenities || [],
      roomSummaries: [],
      floorSummaries: [],
      stats: { totalBeds: 0, occupiedBeds: 0, totalRooms: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await propertyRef.set(propertyData);

    return NextResponse.json({ id: propertyRef.id, ...propertyData }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
