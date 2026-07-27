import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from './firebase-admin';

export interface AuthUser {
  uid: string;
  tenantId: string;
  email: string;
  role: string;
}

export async function verifyAuth(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      tenantId: (decoded as any).tenantId || '',
      email: decoded.email || '',
      role: (decoded as any).role || 'resident',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthUser | NextResponse> {
  const user = await verifyAuth(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.tenantId) {
    return NextResponse.json({ error: 'No tenant' }, { status: 403 });
  }
  return user;
}

export function paginate(req: NextRequest, defaultLimit = 20) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || String(defaultLimit))));
  const search = searchParams.get('search') || '';
  const offset = (page - 1) * limit;
  return { page, limit, search, offset };
}

export function getQuery(req: NextRequest, key: string): string | null {
  const { searchParams } = new URL(req.url);
  return searchParams.get(key);
}
