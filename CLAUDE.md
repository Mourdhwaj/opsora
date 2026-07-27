# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Opsora is a multi-tenant PG/hostel management SaaS (residents, rooms/beds, rent payments + proof verification, complaints/tickets, food polls & attendance, IoT water/electricity dashboards, staff portal). `Opsora_System_Design.md` is the original blueprint and `docs/FEATURES.md` lists current feature requirements — both are aspirational specs, not always in sync with the code.

## Monorepo layout

Turborepo + npm workspaces (`apps/*`):
- `apps/api` — Fastify backend (port **3001**), Drizzle ORM over **better-sqlite3** (`apps/api/opsora.db`).
- `apps/web` — Next.js 16 App Router frontend (port **3000**), React 19, Tailwind v4, recharts, lucide-react.

## Commands

Run from the repo root unless noted:
- `npm run dev` — starts all apps via `turbo run dev` (api on :3001, web on :3000).
- `npm run build` / `npm run lint` — Turbo across the workspace.
- DB (delegates to `apps/api`): `npm run db:generate` (drizzle-kit generate from schema), `npm run db:migrate`, `npm run db:studio`, `npm run db:seed`.
- Single app: `cd apps/api && npm run dev` (tsx watch) or `cd apps/web && npm run dev`.
- Web lint: `cd apps/web && npm run lint` (eslint, flat config). There is no test runner configured.

`apps/api` requires a `JWT_SECRET` env var or it exits on startup (`openssl rand -hex 32`). Optional: `PORT`, `HOST`, `CORS_ORIGINS` (comma-separated, defaults to localhost:3000/3002).

After `db:seed`, log in with `admin@sunshinepg.com` / `password123` (owner), or `staff@sunshinepg.com` / `resident@sunshinepg.com`, same password.

## Backend architecture (apps/api)

- **Single entrypoint** `src/index.ts` registers every route module as a Fastify plugin. To add an endpoint group, create `src/routes/<name>.ts` exporting an `async function <name>Routes(app)` and register it in `index.ts`. Some files export multiple route fns (e.g. `properties.ts` → `propertyRoutes`, `floorRoutes`, `roomRoutes`).
- **Schema is one file**: `src/lib/schema.ts` (Drizzle sqlite-core). SQLite conventions: ids are `text` UUIDs (`uuid` v4), timestamps are `text` columns defaulting to `datetime('now')`, booleans use `integer({ mode: 'boolean' })`. `src/lib/db.ts` opens the DB with WAL + `foreign_keys = ON` and exports `db`.
- **Auth**: JWT via `@fastify/jwt`. `app.authenticate` (decorated in `index.ts`) is the preHandler guard — also checks an in-memory `revokedTokens` set for logout. Protect routes with `{ preHandler: [app.authenticate] }`; the decoded payload `{ userId, tenantId, email, role }` is on `request.user`. (`src/middleware/auth.ts` has older standalone middleware; the decorator in `index.ts` is what routes use.)
- **Multi-tenancy is enforced in every query, not by middleware**: nearly every table has a `tenantId` column, and route handlers must filter by `request.user.tenantId`. When writing queries, always scope by tenant — this is the security boundary.
- **Validation**: Zod schemas live in `src/types/index.ts`; use `parseBody(schema, request.body, reply)` which returns `null` (and sends a 400) on failure — early-return when it's null.
- Rate limiting (global + stricter in-memory per-IP for `/auth/login` and `/auth/register`), security headers, and a stack-trace-suppressing error handler are all configured in `index.ts`. A `/ws` WebSocket endpoint exists (auth-gated) but currently only echoes.

## Frontend architecture (apps/web)

- Next.js **App Router** with **route groups by role**: `(dashboard)` = owner/staff admin UI, `(tenant)` = resident portal (URLs under `/tenant`), `(staff)` = staff portal. Each group has its own `layout.tsx`.
- **Auth flow**: `src/lib/api.ts` exports a singleton `api` client that stores the JWT in both `localStorage` and a cookie (`opsora_token`); on any 401 it clears the token and redirects to `/login`. `src/lib/auth-context.tsx` (`useAuth`) wraps login/logout and also writes an `opsora_role` cookie.
- **Route protection is in `src/middleware.ts`** (Next middleware), not in the API: it reads `opsora_token` + `opsora_role` cookies to gate `(dashboard)` vs `(tenant)` routes and redirect by role. Keep the route-group arrays there in sync when adding protected sections.
- All backend calls go through `api.get/post/put/patch/del`; base URL is `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). Response/entity types are hand-maintained in `api.ts`.

## Next.js 16 caveat

Per `apps/web/AGENTS.md`: this is Next.js 16, which has breaking changes vs. older versions in training data. Consult `apps/web/node_modules/next/dist/docs/` before writing Next-specific code, and heed deprecation notices.
