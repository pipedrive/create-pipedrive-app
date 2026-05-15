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
npm run generate    # generate test project in apps/test-app/ (gitignored)
npm run clean       # delete generated apps/ directory
```

Run a single test file:

```bash
npx vitest run src/generators/node/app.test.ts
```

## Architecture

The tool is **CLI-first**, with an **AI plugin layer** built on top:

- **CLI core**: Collects user choices via interactive prompts, then generates a project scaffold from templates.
- **AI plugin layer** (secondary): Claude/Codex skills that wrap the CLI — guide developers, modify existing projects, and explain generated code.

### Interactive prompts (CLI)

The CLI asks for:
- Project name
- Database: Postgres, MySQL, or SQLite
- App Extensions frontend: multi-select of `custom-panel` and/or `custom-modal` (or neither)

`GeneratorOptions.appExtensions` is `AppExtensionType[]` where `AppExtensionType` is derived from the `APP_EXTENSION_TYPES` const (`'custom-panel' | 'custom-modal'`). Use `isAppExtensionType(value)` to validate CLI input. Check membership with `.includes('custom-panel')`, not boolean equality.

### CLI subcommands

Beyond the interactive main flow, the CLI supports subcommands invoked by the AI plugin skills:

```bash
npx create-pipedrive-app add-app-extension --app-extensions custom-panel|custom-modal [--output-dir <dir>]
```

Subcommand dispatch happens in `dispatchSubcommand()` in `cli.ts` before the interactive flow runs.

### Generator flow

```
cli.ts (collects prompts)
  → prompts/ (projectName, database, appExtensions)
    → nodeGenerator (orchestrates sub-generators via NodeProjectBuilder)
      → oauth.ts, database.ts, app.ts, pipedriveClient.ts, crypto.ts
      → appExtensions.ts (conditional)
          → appExtensions/panel.ts   — backend router + React snippet contributions
          → appExtensions/modal.ts   — backend router + React snippet contributions
          → appExtensions/frontend.ts — Vite + React frontend (index.html, App.tsx, etc.)
          → appExtensions/sdk.ts     — usePipedriveSdk hook wrapper
          → appExtensions/router.ts  — shared Express static-file router
      → serverEntry, packageJson, tsConfig, envExample, dockerCompose, readme
```

**There is no template directory.** Generators build file content as strings using `dedent()`, with conditional string interpolation for optional features. The `src/utils/writeFile.ts` utility writes files, creates parent directories, and auto-formats output with Prettier — generated code is formatted automatically without an explicit format step.

### Generated project structure

```
<project-name>/
  src/
    app.ts              # Express app, mounts all routers
    index.ts            # Server entry with DB retry loop
    oauth/              # Authorization redirect, callback, token exchange, refresh
    pipedrive/          # Official API client wrapper (getClient, token refresh via onTokenUpdate)
    database/           # Drizzle schema, migrations, db setup
    app-extensions/
      panel/            # Express router serving built frontend (custom-panel)
      modal/            # Express router serving built frontend (custom-modal)
  frontend/
    app-extension-ui/   # Vite + React iframe UI (only when App Extensions selected)
  .env.example
  README.md
  docker-compose.yml
```

## App Extensions pattern

Each extension type (panel, modal) contributes a `ReactSnippetContribution` — an object with `{ sdkImports, handlers, buttons }` — that gets merged into the generated `App.tsx`. This lets panel.ts and modal.ts independently declare what SDK imports and JSX they need without knowing about each other.

When App Extensions are enabled, `docker-compose up --watch` starts both the Express backend and the Vite dev server in containers with Compose Watch for live code sync. The Vite server must be exposed via a public HTTPS tunnel and configured in Developer Hub as the iframe URL.

The backend serves the built frontend at `/extensions/panel` and `/extensions/modal` via Express static routing (using the shared `routerContent()` from `appExtensions/router.ts`). In production, `npm run build` builds both backend TypeScript and the Vite bundle.

## Builder Pattern

The scaffold generator uses `NodeProjectBuilder` + `BuildStep` (`src/generators/node/projectBuilder.ts`) to compose features without scattering conditional logic across generators.

**How it works:**
- `BuildStep` interface: `execute(outputDir: string, options: GeneratorOptions): Promise<void>`
- Each feature is a private class implementing `BuildStep` (e.g. `OAuthStep`, `DatabaseStep`)
- `NodeProjectBuilder` queues steps and runs them in order via `.build()`
- Named methods like `.addOAuth()`, `.addDatabase()` push steps unconditionally
- `when(condition, fn)` adds steps conditionally at the call site in `index.ts` — never inside `execute()`

**Adding a new feature:**
1. Create a private `BuildStep` class in `projectBuilder.ts`
2. Add a named method to `NodeProjectBuilder`: `addMyFeature(): this { return this.addStep(new MyFeatureStep()); }`
3. Call it in `index.ts`, via `when()` if conditional:
   ```ts
   .when(options.appExtensions.length > 0, b => b.addAppExtensions())
   ```

**Rule: never put conditional logic inside `execute()`** — use `when()` at the call site. Steps must be unconditional internally; the builder chain controls what runs.

**File content helpers:**
- Use `SourceFileBuilder` (`src/utils/sourceFileBuilder.ts`) for TypeScript files with conditional imports or blocks — handles deduplication and formatting automatically
- Use `RouterMountBuilder` (`src/utils/templates.ts`) to accumulate `app.use()` calls conditionally
- Use plain `dedent` for static content (YAML, JSON, `.env`, SQL)

## Adding features

- **New prompt**: add `src/prompts/<feature>.ts` + `.test.ts`, export from `cli.ts`
- **New generator**: add `src/generators/node/<feature>.ts` + `.test.ts`, call from `nodeGenerator`
- **New App Extension type**: add a file under `src/generators/node/appExtensions/` that exports an `async generate*` function and a `*ReactSnippets()` function returning `ReactSnippetContribution`, then wire it in `appExtensions.ts` and `frontend.ts`
- **Modify generated scaffold**: edit template strings in the corresponding generator file

## Generated Project Modules

### OAuth (`src/oauth/`)
Full OAuth 2.0: authorization redirect, callback handling, token exchange, HMAC-signed state parameter with TTL validation.

### Database (`src/database/`)
Uses **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`) for schema definition and migrations. Supports Postgres, MySQL, and SQLite with the same TypeScript API.

- `schema.ts` — Drizzle table definitions (tenants, oauth_tokens, installations)
- `migrations/` — SQL migration files managed by `drizzle-kit`
- `db.ts` — driver setup (selects `postgres-js`, `mysql2`, or `better-sqlite3` based on chosen DB)

### Pipedrive API client (`src/pipedrive/`)
Wraps the official Pipedrive Node.js SDK. `getClient(companyId)` loads the stored OAuth token and configures `onTokenUpdate` so the SDK handles token refresh automatically.

### App Extensions frontend (`frontend/app-extension-ui/`)
Generated when the user selects `custom-panel` and/or `custom-modal`. Iframe-based React + Vite UI using the App Extensions SDK (`usePipedriveSdk` hook), with: SDK initialization, theme handling, resize, snackbar, confirmation dialog, signed token, and extension-type-specific actions (open modal from panel, close modal).

## Tests

Vitest. Tests generate files into a `tmpdir()/cpa-app-test` directory, read them back to verify content, and clean up in `afterEach`.

## AI Plugin Layer

The `plugin/` directory is shipped with the npm package (`"files": ["dist", "plugin"]`) and contains Claude Code skills that wrap the CLI for AI-assisted development. Each skill is a markdown instruction document in `plugin/skills/<name>/SKILL.md`.

| Skill | Purpose |
|-------|---------|
| `pipedrive-new-app` | Scaffold a new app interactively via `npx create-pipedrive-app` |
| `pipedrive-add-app-extension` | Add a panel or modal extension via the `add-app-extension` subcommand |
| `pipedrive-api` | Guide on using the Pipedrive REST API and SDK within a generated project |
| `pipedrive-review-marketplace-readiness` | Gap analysis before marketplace submission: checks token refresh, HTTPS, error handling, and rate limit handling |

Skills use `allowed-tools` frontmatter to restrict which Claude tools they can invoke. Adding a new skill means creating a `SKILL.md` in a new subdirectory under `plugin/skills/`.
