# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace

Two apps live side by side (both in this workspace):

- **`role-hoje/`** — backend: NestJS 11 + Prisma 7 (Postgres, multi-schema) + Redis. Package name `template-backend-nest`. Uses **pnpm**.
- **`onde-hoje-frontend/`** — frontend: React 19 + Vite 7 + TanStack Query + Tailwind v4. Package name `template-frontend`.

The product ("Onde Hoje") is a social map where users vote for places they plan to go to.

## Commands

### Backend (`role-hoje`)
- Local infra (required before migrations/dev): `docker compose up -d` (Postgres + Redis).
- Dev server: `pnpm start:dev` (runs `tsx watch`, reads `.env`, port `APP_PORT`/3333).
- **Typecheck: `pnpm exec tsc --noEmit -p tsconfig.json`** — use this to verify changes.
- Migrations (needs local Postgres up): `pnpm exec prisma migrate dev --name <name>`. Deploy migrations: `pnpm exec prisma migrate deploy`.
- Regenerate client after any schema change: `pnpm exec prisma generate`.
- Lint/format (Biome): `pnpm check:src:biome`.
- **E2E route tests: `pnpm test`** (Vitest + supertest, `test/e2e/*.e2e-spec.ts`). They boot the real Nest app against the **local Postgres/Redis** (start `docker compose up -d` first), stub only the email sender, and run serially. Run one file: `npx vitest run test/e2e/votes.e2e-spec.ts`. Helpers in `test/utils/e2e.ts` (`createTestApp`, `createUser`, `createPlace`, `createGroup`). Vitest uses SWC (`vitest.config.ts`) to keep NestJS decorator metadata working; the tsconfig path aliases are mirrored there as `resolve.alias`. Not covered (external/stream): `/events` SSE, `/sessions/google[/callback]` OAuth, `PATCH /users/me/avatar` upload.
- Quick boot smoke test (validates DI + route mapping) on a free port: `APP_PORT=3334 node_modules/.bin/tsx src/main.ts` then curl and kill it.

### Frontend (`onde-hoje-frontend`)
- Dev: `pnpm dev`. Typecheck: `npx tsc -b`. Build: `pnpm build` (`tsc -b && vite build`). Lint: `pnpm lint`.
- Env: `VITE_BACKEND_URL`, `VITE_GOOGLE_MAPS_API_KEY`.
- The frontend has **no test runner** — verify via typecheck + build.

## Critical gotchas

- **The backend `pnpm build` is broken**: it invokes `tsdown`, which is referenced in scripts but not installed. Production does **not** build — it runs the app directly via `tsx` under PM2. So never rely on `pnpm build` to validate the backend; use `tsc --noEmit`.
- **Prisma client is generated into `src/@types/prisma`** (not `node_modules`). Import Prisma types from `@/@types/prisma/client`. Always `prisma generate` after editing the schema.
- **Multi-schema Postgres.** Models are split across `prisma/models/*.prisma` (Prisma schema-folder feature); `prisma/schema.prisma` only holds the generator + datasource, which lists the schemas: `users, authentication_audit, places, groups, social, moderation`. A new model needs an `@@schema("...")`.
- **Migrations must be applied in production** (`prisma migrate deploy`) — the app crashes at runtime if a column/constraint the code expects is missing. When a change adds/edits `prisma/`, the deploy MUST run migrations.
- Frontend **modals must be rendered through a React portal** (`components/ui/Modal` and `PlaceVoteDialog` use `createPortal(..., document.body)`). The page-transition wrapper only fades opacity (no transform) so `position: fixed` works; keep it that way.

## Backend architecture (clean / DDD)

Request flow: **Controller → UseCase → Repository (interface) → Prisma impl**, with `Result`-based error handling.

- `src/domain/main/enterprise/entities/**` — domain entities & types (framework-free).
- `src/domain/main/application/use-cases/**` — business logic. Each returns `Result<Error, Value>` (`fail(...)` / `success(...)` from `@/core/result`). Errors are `AppError` subclasses under `application/use-cases/errors`.
- `src/domain/main/application/repositories/**` — **abstract classes** used as DI tokens.
- `src/infra/database/prisma/repositories/**` — Prisma implementations, bound to the abstract tokens in `src/infra/database/database.module.ts` (both `providers` and `exports`).
- `src/infra/http/controllers/**` — feature-grouped NestJS controllers + one `*.module.ts` per feature. Controllers translate `Result` failures with `throwHttpError(result.value)` and shape responses via `presenters/**`.
- HTTP input is validated with **zod** schemas (`src/infra/http/schemas/**`) applied through `ZodValidationPipe`.

Auth & realtime:
- Global `JwtAuthGuard` (registered as `APP_GUARD` in `auth.module.ts`). `@Public()` opts an endpoint out; `@CurrentUser()` yields `{ sub, role }`. `OptionalViewerResolver` resolves an optional viewer on `@Public()` endpoints (e.g. to include per-viewer data).
- The JWT strategy extracts the token from the `Authorization: Bearer` header **or** the `access_token` query param (needed because browser `EventSource` can't set headers).
- Domain events go through `EventBus` (`RedisEventBus`, Redis pub/sub) and are streamed to clients via SSE at `GET /events`. Persisted notifications use the `Notification` model + `NotificationDispatcher` (persists a row **and** publishes a `notification.created` SSE event to the recipient).

## Frontend architecture

- Pages: `src/pages/<Name>/index.tsx`, each with a `hooks/` folder (TanStack Query queries/mutations, e.g. `useHome`) and local `components/`. Reusable UI lives in `src/components` (`ui/*`, `GooglePlacesMap`, `NotificationBell`, ...).
- API: all endpoints in `src/api/ondeHoje.ts`; axios instances in `src/api/api.ts` (`axiosPublic` vs `axiosPrivate`, which injects the JWT and logs out on 401). Backend error strings are translated in `src/api/apiErrorMessages.ts` — add a mapping there when the backend introduces a new error message.
- Auth/session state: `src/stores/userStore` (zustand, persisted). Routing: `src/router/router.tsx` with `ProtectedRoute`.
- Realtime: `src/hooks/useNotifications.ts` opens an `EventSource` to `${API_BASE_URL}/events?access_token=...` and invalidates queries on `notification.created`.
- Google Maps: `src/components/GooglePlacesMap` uses the **new** Places API (`AutocompleteSuggestion.fetchAutocompleteSuggestions`); a `403` there means "Places API (New)" / billing / key-referrer config in Google Cloud, not a code bug.

## Domain rules (place votes)

- A vote targets a place for a specific `day` (+ optional `voteTime` "HH:MM"), in a scope: **public** (`groupId null`, `scopeKey "global"`) or a **group** (`scopeKey = group.publicId`). Unique per `(user, place, scopeKey, day)`.
- `going`: `true` = "vou", `false` = "não vou" (a decline). "Não vou" is only allowed on a place that already has an active going vote for that day; declines don't count toward the limit, don't put the place on the map, and don't notify.
- **Weekly limit: 6 active going votes per Mon–Sun week** (admins are unlimited).
- Map default = next 7 days (`from`/`to` range); can filter to one day. `myGroups=1` aggregates public votes with the viewer's active groups. Map `voteCount` counts only `going` votes; a place appears only if someone is going. Voters are included only for authenticated viewers.

## Deploy (backend, Hostinger VPS)

Run `bash deploy.prod.sh` on the VPS (git pull → pnpm install → prisma generate → **migrate deploy** → PM2 restart `role-hoje-api`). The app runs via `tsx` under PM2; Nginx reverse-proxies with SSE-friendly settings; Postgres/Redis run in Docker bound to `127.0.0.1`. Never run `prisma db seed` in production (the seed creates an admin with a public password + demo data).
