import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth, paginate } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const { page, limit, search } = paginate(req);

    const snapshot = await adminDb
      .collection('tenants')
      .doc(user.tenantId)
      .collection('archivedResidents')
      .orderBy('archivedAt', 'desc')
      .get();

    let data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (search) {
      const lower = search.toLowerCase();
      data = data.filter((r: any) =>
        (r.fullName as string)?.toLowerCase().includes(lower) ||
        (r.phone as string)?.includes(search) ||
        (r.email as string)?.toLowerCase().includes(lower)
      );
    }

    const total = data.length;
    const start = (page - 1) * limit;
    const paginated = data.slice(start, start + limit);

    return NextResponse.json({
      data: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch archived residents' }, { status: 500 });
  }
}
