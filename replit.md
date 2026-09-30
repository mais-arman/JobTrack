# JobTrack

JobTrack is a personal tracker for jobs, internships, training, and other opportunities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Application schema: `lib/db/src/schema/applications.ts`; development migrations: `lib/db/drizzle/`.
- API contract: `lib/api-spec/openapi.yaml`; routes: `artifacts/api-server/src/routes/applications.ts`.
- Frontend API store: `artifacts/jobtrack/src/lib/store.ts`.

## Architecture decisions

- PostgreSQL is the sole active source of application data, accessed through the shared Express API using Drizzle.
- Authentication is explicitly deferred. Applications are a shared collection, not private per-user records. Do not publish sensitive application data without adding access control.
- Legacy browser records are retained only for downloadable backup, not merged or uploaded automatically. This avoids silently sharing previously local personal records.
- Gmail is a source label only, not a connected integration.

## Product

Dashboard summaries, upcoming interviews, searchable and filterable applications, and application creation, details, updates, and deletion.

## User preferences

Follow `.local/custom_skills/jobtrack-design-system/SKILL.md` for JobTrack UI work. Keep the MVP focused on application tracking; exclude Gmail integration, daily routine, payments, social features, messaging, and advanced analytics.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
