import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, paginate } from '@/lib/api-helpers';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { page, limit, search } = paginate(req);
    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status') || 'active';

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    let query: FirebaseFirestore.Query = tenantRef.collection('people').where('role', '==', 'resident');
    if (propertyId) query = query.where('propertyId', '==', propertyId);
    if (status) query = query.where('status', '==', status);

    // Don't use orderBy — mixed string/Timestamp createdAt from migration causes failures
    const snapshot = await query.get();
    let residents: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort in JS since Firestore can't orderBy mixed types
    residents.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    // Client-side search filter (Firestore doesn't support native text search)
    if (search) {
      const lower = search.toLowerCase();
      residents = residents.filter(r =>
        (r.fullName as string)?.toLowerCase().includes(lower) ||
        (r.phone as string)?.includes(search) ||
        (r.email as string)?.toLowerCase().includes(lower)
      );
    }

    // Enrich with room numbers from property roomSummaries
    const propertyIds = [...new Set(residents.map(r => r.propertyId).filter(Boolean))];
    const propertySnap = await Promise.all(
      propertyIds.map(id => tenantRef.collection('properties').doc(id).get())
    );
    const roomSummaryMap = new Map<string, Record<string, any>>();
    propertySnap.forEach(doc => {
      if (doc.exists) {
        const data = doc.data()!;
        if (data.roomSummaries) roomSummaryMap.set(doc.id, data.roomSummaries);
      }
    });

    const enriched = residents.map(r => {
      const roomSummary = r.roomId ? roomSummaryMap.get(r.propertyId)?.[r.roomId] : null;
      return { ...r, roomNumber: roomSummary?.roomNumber ?? null };
    });

    const total = enriched.length;
    const start = (page - 1) * limit;
    const data = enriched.slice(start, start + limit);

    return NextResponse.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { fullName, phone, email, moveInDate, rentAmount, depositPaid, status, propertyId, roomId, bedId, ...rest } = body;

    if (!fullName || !propertyId) {
      return NextResponse.json({ error: 'fullName and propertyId are required' }, { status: 400 });
    }

    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const peopleRef = tenantRef.collection('people');

    const personData: Record<string, any> = {
      role: 'resident',
      fullName,
      phone: phone || '',
      email: email || '',
      moveInDate: moveInDate || new Date().toISOString().split('T')[0],
      rentAmount: rentAmount || 0,
      depositPaid: depositPaid || 0,
      status: status || 'active',
      propertyId,
      roomId: roomId || null,
      bedId: bedId || null,
      tenantId: auth.tenantId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...rest,
    };

    const docRef = await peopleRef.add(personData);

    if (bedId && roomId) {
      const bedField = `roomSummaries.${roomId}.beds.${bedId}.status`;
      const occupantField = `roomSummaries.${roomId}.beds.${bedId}.occupantId`;
      await tenantRef.collection('properties').doc(propertyId).update({
        [bedField]: 'occupied',
        [occupantField]: docRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ id: docRef.id, ...personData }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
