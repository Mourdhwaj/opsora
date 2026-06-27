import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { tenants, users } from '../lib/schema';
import { eq, and } from 'drizzle-orm';
import { loginSchema, registerTenantSchema, createUserSchema, parseBody } from '../types';

// Helper: sanitize input to prevent stored XSS (escape 5 critical chars)
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function authRoutes(app: FastifyInstance) {
  // Register a new tenant (organization)
  app.post('/auth/register', async (request, reply) => {
    const body = parseBody(registerTenantSchema, request.body, reply);
    if (!body) return;

    // Check if slug already exists
    const existing = db.select().from(tenants).where(eq(tenants.slug, body.slug)).get();
    if (existing) {
      return reply.status(409).send({ error: 'Slug already taken' });
    }

    const tenantId = uuidv4();
    const userId = uuidv4();

    // Create tenant
    db.insert(tenants).values({
      id: tenantId,
      name: body.name,
      slug: body.slug,
      email: body.email,
      phone: body.phone,
      address: body.address,
      city: body.city,
      state: body.state,
      pincode: body.pincode,
    }).run();

    // Create owner user
    const passwordHash = await bcrypt.hash(body.password, 10);
    db.insert(users).values({
      id: userId,
      tenantId,
      email: body.email,
      phone: body.phone,
      passwordHash,
      fullName: body.name,
      role: 'owner',
    }).run();

    // Generate JWT
    const token = app.jwt.sign({ userId, tenantId, email: body.email, role: 'owner' }, { expiresIn: '24h' });

    return reply.status(201).send({
      token,
      tenant: { id: tenantId, name: body.name, slug: body.slug },
      user: { id: userId, email: body.email, role: 'owner' },
    });
  });

  // Login
  app.post('/auth/login', async (request, reply) => {
    const body = parseBody(loginSchema, request.body, reply);
    if (!body) return;

    const user = db.select().from(users)
      .where(and(eq(users.email, body.email), eq(users.isActive, true)))
      .get();

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    // Update last login
    db.update(users).set({ lastLoginAt: new Date().toISOString() }).where(eq(users.id, user.id)).run();

    const token = app.jwt.sign(
      { userId: user.id, tenantId: user.tenantId, email: user.email, role: user.role },
      { expiresIn: '24h' }
    );

    return reply.send({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, tenantId: user.tenantId },
    });
  });

  // Get current user profile
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = db.select().from(users).where(eq(users.id, request.user!.userId)).get();
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { passwordHash, ...safeUser } = user;
    return reply.send(safeUser);
  });

  // Logout (revoke token)
  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      app.revokedTokens.add(token);
    }
    return reply.send({ message: 'Logged out successfully' });
  });
}
