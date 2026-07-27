import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, paginate } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { page, limit } = paginate(req);

    const snapshot = await adminDb
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('people')
      .where('role', '==', 'resident')
      .where('status', '==', 'active')
      .get();

    let residents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    residents.sort((a: any, b: any) => (a.fullName || '').localeCompare(b.fullName || ''));

    const total = residents.length;
    const start = (page - 1) * limit;
    const data = residents.slice(start, start + limit);

    return NextResponse.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
