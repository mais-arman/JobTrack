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

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- The initial MVP is browser-local with no sign-in or server-side application storage. This keeps personal records separate without adding account management to the core tracking scope. Records do not sync between devices and can be lost if browser storage is cleared.
- The shared API service is not required by this frontend-only MVP.
- Gmail is a source label only, not a connected integration.

## Product

Dashboard summaries, upcoming interviews, searchable and filterable applications, and application creation, details, updates, and deletion.

## User preferences

Follow `.local/custom_skills/jobtrack-design-system/SKILL.md` for JobTrack UI work. Keep the MVP focused on application tracking; exclude Gmail integration, daily routine, payments, social features, messaging, and advanced analytics.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
