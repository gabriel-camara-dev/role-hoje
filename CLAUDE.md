# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm**.

```bash
pnpm start:dev              # tsx watch, loads .env
pnpm build                  # prisma generate + nest build
pnpm ci:lint                # verify only — fails on drift (what CI runs)
pnpm ci:format              # same checks, but auto-fixes
pnpm typecheck              # tsc --noEmit over src AND test (build config excludes both)

pnpm test                   # unit tests (*.spec.ts, co-located with source)
pnpm test:watch
pnpm test src/domain/main/application/use-cases/onde-hoje/friendships/request-friendship.spec.ts
pnpm test -t "should be able to request a friendship"   # single test by name

pnpm test:e2e               # *.e2e-spec.ts under test/e2e/ — needs Postgres + Redis up
pnpm test:e2e -- test/e2e/friends.e2e-spec.ts

pnpm db:reset               # generate + migrate reset + seed
pnpm db:migrate:dev
pnpm combo                  # full local bootstrap: install, docker compose recreate, db reset, start:dev
```

Prisma's client is generated into `src/@types/prisma` (not `node_modules`), so `pnpm db:generate` is required before typecheck/build after any schema change. Schema is split: `prisma/schema.prisma` + `prisma/models/*.prisma`, multiSchema across `users, authentication_audit, places, groups, social, moderation`.

## Architecture

Clean/DDD layering (the "05-nest-clean" shape), three layers:

- `src/core` — framework-free primitives: `Entity`/`AggregateRoot`/`UniqueEntityID`, `Result` (`fail`/`success`), `AppError`, the `DomainEvents` registry and the `EventBus` abstract class.
- `src/domain/main` — `enterprise/` holds entities and domain events; `application/` holds use cases, subscribers, and **abstract repository classes** (the ports).
- `src/infra` — Nest wiring and adapters: `database/prisma` (repository implementations), `http` (controllers, zod schemas, presenters, swagger DTOs), `auth`, `cache`, `events`, `mail`, `storage`, `geocoding`, `tasks`.

Dependency direction is inward only: domain code never imports from `src/infra`.

### Use cases and error handling

Use cases are `@Injectable()` classes with a single `execute()` returning `Result<Error, Value>` — **they never throw for expected failures**. Controllers call `execute()`, then `if (result.isFail()) throwHttpError(result.value)`. `throwHttpError` maps `AppError.type` to an HTTP status via `toHttpStatus` in `src/core/types/error-type.ts`; adding an error type means extending that map, not adding try/catch in controllers.

Ports are **abstract classes, not interfaces**, so they can serve as Nest DI tokens. Injection is explicit: `@Inject(FriendshipsRepository) private repo: FriendshipsRepository`. Bindings live in `src/infra/database/database.module.ts` as `{ provide: XRepository, useClass: PrismaXRepository }`.

### Two event systems — do not conflate them

- **Domain events** (in-process): aggregates call `addDomainEvent()`; the repository dispatches via `DomainEvents.dispatchEventsForAggregate()` after save. Subscribers in `application/subscribers/**` register handlers in their constructor (`DomainEvents.register(this.handle.bind(this), SomeEvent.name)`) — they must be listed as Nest providers or they never wire up. Used for side effects: notifications, etc.
- **Integration events** (cross-process): `EventBus.publish(createIntegrationEvent({...}))`, backed by Redis pub/sub (`src/infra/events/redis-event-bus.ts`) and streamed to browsers over SSE from the realtime controllers.

A use case publishing an integration event *and* an aggregate raising a domain event for the same action is normal and intentional.

### Transactions

Repositories read `dbContext.client` (`src/infra/database/prisma/database-context.ts`), not `PrismaService`, so they transparently join an ambient transaction opened by `DatabaseContext.runInTransaction()` (AsyncLocalStorage). Nested calls reuse the outer transaction. Never inject `PrismaService` into a repository method path directly.

### HTTP layer

One controller class per endpoint, in `src/infra/http/controllers/<area>/<action>.controller.ts`, registered by a feature module. Request validation uses zod schemas in `src/infra/http/schemas/**` through `ZodValidationPipe`; Swagger response shapes live separately in `src/infra/http/swagger/presenter-schemas/**` (Nest's decorators can't read zod). Auth is JWT-global via `JwtAuthGuard`; opt out with the `@Public()` decorator from `src/infra/auth/public.ts`.

## Testing

**Unit tests** are co-located `*.spec.ts` next to the code, and run against in-memory repository fakes from `test/repositories/` plus entity factories from `test/factories/` (`makeUser`, `makeFriendship`, ...). Convention: the subject is named `sut`, wired in `beforeEach`. Test the use case's own behavior only — side effects owned by a subscriber belong in that subscriber's spec. `test/setup-unit.ts` clears the global `DomainEvents` registry after each test.

**E2E tests** are `*.e2e-spec.ts` — the hyphen keeps them out of the unit run. Most live in `test/e2e/`, but a few sit next to their controller under `src/infra/http/controllers/`; both are picked up by the e2e config's `**/*.e2e-spec.ts` include. Each file gets a throwaway Postgres *database* (not schema — the datasource is multiSchema) created and migrated in `test/setup-e2e.ts`; Redis is shared and flushed per file, so e2e files run single-fork, serially. Boot the app with `createTestApp()` from `test/utils/e2e.ts`, which stubs `EmailSender` and clears leaked domain-event handlers.

## Conventions

Biome enforces (as errors, not warnings): kebab-case filenames, no `any`, no `console`, no non-null assertions, no unused imports/vars, `import type` where applicable. 120-col, single quotes, trailing commas.

Path aliases are defined in **three** places that must stay in sync: `tsconfig.json` `paths`, `vitest.shared.ts` `alias`, and the Nest build. Common ones: `@/*` → `src/*`, `@test/*` → `test/*`, `@repositories/*` → domain ports, `@repositories/prisma/*` → Prisma implementations.

One caveat worth knowing: `useImportType` will rewrite a value import to `import type` and silently break Nest DI — that's why constructor params carry explicit `@Inject()` decorators throughout.

Some comments and user-facing strings are in Portuguese (pt-BR); match the surrounding file.
