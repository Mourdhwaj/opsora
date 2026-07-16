/**
 * Shared authentication hook for all route files.
 * Includes JWT verification + token revocation check (logout).
 */
import { db } from './db';
import { revokedTokens } from './schema';
import { eq } from 'drizzle-orm';

export async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const authHeader = request.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const revoked = db.select().from(revokedTokens).where(eq(revokedTokens.token, token)).get();
    if (revoked) {
      return reply.status(401).send({ error: 'Token has been revoked' });
    }
  }
}