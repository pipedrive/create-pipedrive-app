# Database Layer Generator — Design Spec

**Jira:** AINATIVEM-43  
**Date:** 2026-05-11  
**Status:** Approved

## Overview

Flesh out `src/generators/node/database.ts` from its current stub into a full database layer generator. The generator produces a working Drizzle ORM setup for the scaffolded app, supporting Postgres, MySQL, and SQLite. Migrations run automatically on server startup (idempotent via Drizzle's migration table) and can also be triggered manually via `npm run db:migrate`.

## Generated File Structure

For all database choices:

```
src/database/
  index.ts           # Drizzle client + driver setup
  schema.ts          # Drizzle table definitions (pipedrive_tokens)
  migrate.ts         # runMigrations() — programmatic Drizzle migrate API
  migrations/
    0000_init.sql    # Pre-generated initial SQL (hardcoded in generator)
drizzle.config.ts    # Drizzle kit config (for npm run db:migrate + drizzle-kit tooling)
```

For Postgres and MySQL only (not SQLite):

```
docker-compose.yml   # Moved from index.ts generator, gains healthchecks
```

## Schema

Table name: `pipedrive_tokens`

| Column | Type | Notes |
|---|---|---|
| `pipedrive_company_id` | integer NOT NULL | from `/users/me`, part of composite PK |
| `pipedrive_user_id` | integer NOT NULL | from `/users/me`, part of composite PK |
| `access_token` | varchar(768) NOT NULL | Pipedrive recommends 768 min |
| `refresh_token` | varchar(768) NOT NULL | |
| `token_type` | varchar(50) NOT NULL DEFAULT 'bearer' | |
| `access_token_expires_at` | timestamp NOT NULL | derived from `expires_in` |
| `refresh_token_expires_at` | timestamp NOT NULL | 60 days from last refresh |
| `scope` | text | nullable |
| `api_domain` | varchar(255) NOT NULL | company-specific Pipedrive API base URL |
| `created_at` | timestamp NOT NULL DEFAULT now() | |
| `updated_at` | timestamp NOT NULL DEFAULT now() | |

**Primary key:** composite on `(pipedrive_company_id, pipedrive_user_id)` — each Pipedrive user within a company gets their own token row.

In Drizzle:
```ts
(table) => [primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] })]
```

### Installation status

No separate installations table. A user+company combination is considered "installed" if a row exists in `pipedrive_tokens` with a non-expired `refresh_token_expires_at`. If the row is absent or the refresh token is expired, the app is not installed for that user.

## Driver Mapping

| Database | Driver | Drizzle adapter |
|---|---|---|
| Postgres | `postgres-js` | `drizzle-orm/postgres-js` |
| MySQL | `mysql2` | `drizzle-orm/mysql2` |
| SQLite | `better-sqlite3` | `drizzle-orm/better-sqlite3` |

`src/database/index.ts` branches on the chosen database to import the correct driver and initialise the Drizzle client. All three use `DATABASE_URL` from env (SQLite treats it as the local file path, e.g. `./data.db`).

## Migration Flow

### On startup (primary path)
`src/index.ts` calls `await runMigrations()` before `app.listen()`. `runMigrations()` is exported from `src/database/migrate.ts` and calls Drizzle's programmatic `migrate(db, { migrationsFolder: 'src/database/migrations' })`. Drizzle tracks applied migrations in `__drizzle_migrations`, making repeated calls safe.

### Standalone / CI (secondary path)
`package.json` includes `"db:migrate": "drizzle-kit migrate"` for deployment pipelines or manual runs.

### Pre-generated migration
`0000_init.sql` is a hardcoded string inside the generator — developers get a working migration immediately without running `drizzle-kit generate`.

## Generator Changes

### `src/generators/node/database.ts` (primary work)
Generates all files above. Branches on `options.database` to produce the correct `src/database/index.ts` driver setup, the correct SQL dialect in `0000_init.sql`, and `docker-compose.yml` (Postgres/MySQL only). Docker Compose gains healthchecks:
- Postgres: `pg_isready -U app`
- MySQL: `mysqladmin ping -h localhost -u app --password=app`

### `src/generators/node/index.ts` (minor changes)
- Remove `generateDockerCompose` function (moved to database module)
- `generateServerEntry` gains `import { runMigrations } from './database/migrate.js'` and `await runMigrations()` before the listen call
- `generatePackageJson` adds: correct DB driver in `dependencies`, `drizzle-kit` in `devDependencies`, `db:migrate` script

### `src/generators/node/database.test.ts` (updated)
Tests per database choice:
- `src/database/index.ts` exists and exports a Drizzle client
- `src/database/schema.ts` exists and references `pipedrive_tokens`
- `src/database/migrate.ts` exists and exports `runMigrations`
- `src/database/migrations/0000_init.sql` exists and contains `CREATE TABLE`
- `drizzle.config.ts` exists
- `docker-compose.yml` is generated for postgres and mysql, not for sqlite
- `docker-compose.yml` contains a healthcheck for postgres and mysql

## Acceptance Criteria

- Generated project connects to the chosen database via the correct Drizzle driver
- `runMigrations()` is called in `src/index.ts` before the server starts listening
- `npm run db:migrate` runs `drizzle-kit migrate` as a standalone command
- SQLite uses a local file (`./data.db`), no Docker required
- Postgres and MySQL include `docker-compose.yml` with healthchecks
- `pipedrive_tokens` table is created by the initial migration with composite PK on `(pipedrive_company_id, pipedrive_user_id)`
- Installation status is determined by the presence of a non-expired `refresh_token_expires_at` row for the given company+user pair — no separate installations table
