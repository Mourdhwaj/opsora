import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (user instanceof NextResponse) return user;

    const tenantRef = adminDb.collection('tenants').doc(user.tenantId);

    const usersSnap = await tenantRef.collection('archivedUsers').get();
    const residentsSnap = await tenantRef.collection('archivedResidents').get();

    return NextResponse.json({
      archivedUsers: usersSnap.size,
      archivedResidents: residentsSnap.size,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch archive stats' }, { status: 500 });
  }
}
