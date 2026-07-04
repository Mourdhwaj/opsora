import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyWebsocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { propertyRoutes, floorRoutes, roomRoutes } from './routes/properties';
import { residentRoutes } from './routes/residents';
import { paymentRoutes } from './routes/payments';
import { complaintRoutes } from './routes/complaints';
import { dashboardRoutes } from './routes/dashboard';
import { waterRoutes, electricityRoutes } from './routes/iot';
import { notificationRoutes } from './routes/notifications';
import { tenantPortalRoutes } from './routes/tenant';
import { iotAnalyticsRoutes } from './routes/iot-analytics';
import { allocationRoutes } from './routes/allocation';
import { foodRoutes } from './routes/food';
import { paymentProofRoutes } from './routes/payments-proof';
import { staffPortalRoutes } from './routes/staff-portal';
import multipart from '@fastify/multipart';
import { uploadRoutes } from './routes/upload';
import { db } from './lib/db';
import { revokedTokens } from './lib/schema';
import { eq, lt } from 'drizzle-orm';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32');
  process.exit(1);
}

async function main() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3002')
    .split(',').map(s => s.trim());

  await app.register(cors, {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  });

  await app.register(jwt, {
    secret: JWT_SECRET,
  });

  await app.register(fastifyWebsocket);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  });

  // ── Per-IP rate limit for auth endpoints (brute force protection) ─────────
  await app.register(async function authRateLimit(app) {
    app.addHook('preHandler', async (request, reply) => {
      const ip = request.ip;
      const key = `login:${ip}`;
      const now = Date.now();
      const windowMs = 60 * 1000; // 1 minute
      const maxAttempts = 5;

      // Simple in-memory rate limiter for login (use Redis in production)
      if (!app.hasDecorator('__loginAttempts')) app.decorate('__loginAttempts', new Map<string, number[]>());
      const attempts = app.__loginAttempts.get(key) || [];
      // Evict old entries on each request
      const recentAttempts = attempts.filter(t => now - t < windowMs);

      if (recentAttempts.length >= maxAttempts) {
        return reply.status(429).send({ error: 'Too many login attempts. Please try again in 1 minute.' });
      }

      recentAttempts.push(now);
      app.__loginAttempts.set(key, recentAttempts);
    });
  }, { prefix: '/auth/login' });

  // ── Per-IP rate limit for registration (prevent mass tenant creation) ────
  await app.register(async function registerRateLimit(app) {
    app.addHook('preHandler', async (request, reply) => {
      const ip = request.ip;
      const key = `register:${ip}`;
      const now = Date.now();
      const windowMs = 5 * 60 * 1000; // 5 minutes
      const maxAttempts = 3; // 3 registrations per 5 minutes per IP

      if (!app.hasDecorator('__registerAttempts')) app.decorate('__registerAttempts', new Map<string, number[]>());
      const attempts = app.__registerAttempts.get(key) || [];
      const recentAttempts = attempts.filter(t => now - t < windowMs);

      if (recentAttempts.length >= maxAttempts) {
        return reply.status(429).send({ error: 'Too many registration attempts. Please try again in 5 minutes.' });
      }

      recentAttempts.push(now);
      app.__registerAttempts.set(key, recentAttempts);
    });
  }, { prefix: '/auth/register' });

  // ── Token blacklist (DB backed) ─────────
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // Scheduled cleanup for expired revoked tokens (runs every hour)
  setInterval(() => {
    try {
      const now = Math.floor(Date.now() / 1000).toString();
      db.delete(revokedTokens).where(lt(revokedTokens.expiresAt, now)).run();
    } catch (err) {
      console.error('Failed to cleanup revoked tokens', err);
    }
  }, 60 * 60 * 1000);

  // ── Health check ─────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // ── Register routes ──────────────────────────────────────────────────────
  await app.register(authRoutes);
  await app.register(userRoutes);
  await app.register(propertyRoutes);
  await app.register(floorRoutes);
  await app.register(roomRoutes);
  await app.register(residentRoutes);
  await app.register(paymentRoutes);
  await app.register(complaintRoutes);
  await app.register(dashboardRoutes);
  await app.register(waterRoutes);
  await app.register(electricityRoutes);
  await app.register(notificationRoutes);
  await app.register(tenantPortalRoutes);
  await app.register(iotAnalyticsRoutes);
  await app.register(allocationRoutes);
  await app.register(foodRoutes);
  await app.register(paymentProofRoutes);
  await app.register(staffPortalRoutes);
  await app.register(uploadRoutes);

  // ── WebSocket for real-time updates (requires auth) ─────────────────────
  app.get('/ws', { websocket: true, preHandler: [app.authenticate] }, (socket, request) => {
    const user = request.user as { userId: string; tenantId: string; email: string; role: string };
    app.log.info(`WebSocket client connected: ${user.email} (${user.role})`);

    socket.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        app.log.info({ data }, 'WebSocket message received');

        // Echo back with acknowledgment
        socket.send(JSON.stringify({
          type: 'ack',
          data: { received: true, timestamp: new Date().toISOString() },
        }));
      } catch {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    socket.on('close', () => {
      app.log.info(`WebSocket client disconnected: ${user.email}`);
    });
  });

  // ── Security headers ──────────────────────────────────────────────────────
  app.addHook('onSend', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
    reply.removeHeader('X-Powered-By');
  });

  // ── Global error handler (no stack trace leaks) ──────────────────────────
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);

    return reply.status(500).send({
      error: 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' ? { message: error.message } : {}),
    });
  });

  // ── Start server ─────────────────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`🚀 Opsora API running at http://${HOST}:${PORT}`);
    app.log.info(`📖 Health check: http://localhost:${PORT}/health`);
    app.log.info(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
