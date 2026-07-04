/**
 * Shared authentication hook for all route files.
 * 
 * Fastify decorators (app.decorate) are encapsulated by default — a decorator
 * defined on the root app is NOT visible inside plugins registered via
 * app.register(). This causes app.authenticate to silently fail in route
 * plugins, returning 401 for all requests.
 *
 * The fix: export a plain function and import it in each route file that needs
 * authentication, similar to how auth.ts defines authenticateHook locally.
 */
export async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}
