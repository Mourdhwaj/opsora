import { FastifyRequest, FastifyReply } from 'fastify';

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return reply.status(401).send({ error: 'Authorization token required' });
    }

    const decoded = request.server.jwt.verify<{ userId: string; tenantId: string; email: string; role: string }>(token);
    request.user = decoded;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // Tenant isolation is enforced through the tenantId from JWT
  // All queries filter by tenantId
}

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      tenantId: string;
      email: string;
      role: string;
    };
  }
}
