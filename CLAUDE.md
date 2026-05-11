# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

`create-pipedrive-app` is a CLI scaffolding tool for external Pipedrive Marketplace developers. It generates a production-ready integration project via `npx create-pipedrive-app <project-name>`.

## Commands

```bash
npm run build       # compile TypeScript to dist/
npm run typecheck   # type-check without emitting
npm run lint        # ESLint
npm run format      # Prettier (120 char width, tabs, trailing commas)
npm test            # Vitest suite
npm run generate        # generate test project in apps/test-app/ (gitignored)
```

## Architecture

The tool is **CLI-first**, with an **AI plugin layer** built on top:

- **CLI core**: Collects user choices via interactive prompts, then generates a project scaffold from templates.
- **AI plugin layer** (secondary): Claude/Codex skills that wrap the CLI — guide developers, modify existing projects, and explain generated code.

### Interactive prompts (CLI)

The CLI asks for:
- Backend: Node.js/Express, Node.js/Fastify, or PHP/Laravel
- Database: Postgres, MySQL, or SQLite
- App Extensions frontend: React, Vanilla JS, or none
- Webhooks: Yes/No

### Generator flow

```
cli.ts (collects prompts)
  → prompts/ (projectName, database, appExtensions, webhooks)
    → nodeGenerator (orchestrates 5 sub-generators)
      → oauth.ts, database.ts, app.ts
      → webhooks.ts (conditional), appExtensions.ts (conditional)
      → serverEntry, packageJson, tsConfig, envExample, dockerCompose
```

**There is no template directory.** Generators build file content as strings using `dedent()`, with conditional string interpolation for optional features (webhooks, app extension types). The `src/utils/writeFile.ts` utility writes files, creates parent directories, and auto-formats output with Prettier — generated code is formatted automatically without an explicit format step.

`app.ts` is the main example of the conditional pattern: imports and router mounts are included only when the relevant features are enabled, and the result is written once.

### Generated project structure

```
<project-name>/
  backend/
    oauth/         # Authorization redirect, callback, token exchange, refresh, state validation
    pipedrive-client/  # Official API client wrapper with preconfigured auth
    database/      # Tenant/account mapping, tokens, scopes, installation status
    webhooks/      # Optional webhook handlers
  frontend/
    app-extension-ui/  # Optional: React or Vanilla iframe UI with App Extensions SDK
  .env.example
  README.md
  docker-compose.yml
  marketplace-checklist.md
```

## Adding features

- **New prompt**: add `src/prompts/<feature>.ts` + `.test.ts`, export from `cli.ts`
- **New generator**: add `src/generators/node/<feature>.ts` + `.test.ts`, call from `nodeGenerator`
- **Modify generated scaffold**: edit template strings in the corresponding generator file

## MVP Scope

The initial implementation targets:
- **Runtime**: Node.js + TypeScript
- **Backend**: Express or Fastify
- **Database**: Postgres via Docker Compose
- **Auth**: Full OAuth 2.0 install/callback/token-refresh flow
- **API client**: Pipedrive Node.js client wrapper
- **Frontend** (optional): React App Extensions UI
- Outputs `.env.example` and a Marketplace readiness checklist

PHP and MySQL/SQLite backends come after MVP. The PHP generator exists but throws "not yet implemented". App Extensions frontend is prompted but not yet generated.

## Core Modules

### OAuth (`backend/oauth/`)
Full OAuth 2.0: app registration guidance, authorization redirect, callback handling, token exchange, token refresh, state validation.

### Database (`backend/database/`)
Uses **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) for schema definition and migrations. Drizzle is chosen because it supports Postgres, MySQL, and SQLite with the same TypeScript API — matching the three database options the CLI offers — and produces readable schema files with no codegen step.

Structure:
- `schema.ts` — Drizzle table definitions (tenants, oauth_tokens, installations)
- `migrations/` — SQL migration files managed by `drizzle-kit`
- `db.ts` — driver setup (selects `postgres-js`, `mysql2`, or `better-sqlite3` based on the chosen DB)

### Pipedrive API client (`backend/pipedrive-client/`)
Wrapper around the official Pipedrive Node.js client with preconfigured authentication and helpers for common API calls.

### App Extensions frontend (`frontend/app-extension-ui/`)
Only generated when the user opts in. Iframe-based UI using the App Extensions SDK, supporting: initialization, resizing, modals, notifications/snackbars, theme handling.

## Tests

Vitest. Tests generate files into a `tmpdir()/cpa-app-test` directory, read them back to verify content, and clean up in `afterEach`. Run a single test file:

```bash
npx vitest run src/generators/node/app.test.ts
```

## AI Plugin Commands (future layer)

```
/pipedrive-new-app
/pipedrive-add-oauth
/pipedrive-add-app-extension
/pipedrive-review-marketplace-readiness
```
