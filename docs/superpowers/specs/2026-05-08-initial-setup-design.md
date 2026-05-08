# CLI Tool Foundation — create-pipedrive-app scaffold

**Jira:** AINATIVEM-41  
**Date:** 2026-05-08  
**Status:** Approved

## Overview

Set up the `create-pipedrive-app` CLI tool repository and project scaffold. The tool is invoked via `npx create-pipedrive-app <project-name>`, collects user choices through interactive prompts, and generates a production-ready Pipedrive Marketplace app project with stub modules for OAuth, database, webhooks, and App Extensions.

The repository is currently internal. It will be made public and published to npm once the tool is complete and approved.

## Project Setup & Tooling

**Package:** `create-pipedrive-app` — unscoped, public npm (publishing deferred until approved).

```json
{
  "name": "create-pipedrive-app",
  "bin": { "create-pipedrive-app": "./dist/cli.js" },
  "type": "module"
}
```

**Runtime dependencies:** `@clack/prompts` (interactive prompt UI), `fs-extra` (file system helpers — replaces raw `fs`, provides `ensureDir` and `outputFile`), `prettier` (formats generated string content before writing to disk, ensuring clean output regardless of how strings are constructed).

**Dev dependencies:** `typescript`, `@types/node`, `@types/fs-extra`, `vitest`, `eslint` (flat config).

**TypeScript:** targets `ESNext`, `moduleResolution: bundler`, emits to `dist/`.

**CI (GitHub Actions):** `.github/workflows/ci.yml` runs on every push and PR to `master`. Steps: `npm ci` → `npm run lint` → `npm test`. No separate build step — `tsc --noEmit` is covered by the test suite's end-to-end check.

> Note: CI was struck through in the Jira ticket but added back by explicit decision — an open-source CLI with no gate on PRs is a real risk.

## Source Structure

```
src/
  cli.ts                      # entry point: runs prompts → selects generator → runs it → prints summary
  prompts/
    projectName.ts            # text input
    database.ts               # select: postgres | mysql | sqlite
    appExtensions.ts          # confirm + conditional multi-select
    webhooks.ts               # confirm
  generators/
    interface.ts              # GeneratorOptions + Generator interface (language-agnostic)
    node/
      index.ts                # implements Generator for Node.js — orchestrates all module generators
      app.ts                  # generates src/app.ts with conditional router imports
      oauth.ts                # generates src/oauth/ stub
      database.ts             # generates src/database/ stub
      webhooks.ts             # generates src/webhooks/ stub
      appExtensions.ts        # generates src/app-extensions/ stubs
    php/
      index.ts                # stub — throws "not yet implemented", not reachable from CLI
  utils/
    writeFile.ts              # fs-extra outputFile + prettier.format() before writing
```

`cli.ts` is the only file with side effects. All generator functions and prompt modules are pure and importable in isolation. The `php/` directory is created now so the slot is visible; the PHP generator is a future ticket.

## CLI Prompts

Exact prompt sequence (matches Jira spec):

```
◆  Project name?
◆  Database?              Postgres / MySQL / SQLite
◆  Include App Extensions?  Yes / No
◆  [if Yes] Which type(s)?  Custom Panel / Custom Modal  (multi-select)
◆  Include webhooks?      Yes / No
```

## GeneratorOptions + Generator Interface

`src/generators/interface.ts` — shared contract for all generators:

```typescript
export type Database = 'postgres' | 'mysql' | 'sqlite';
export type AppExtensionType = 'custom-panel' | 'custom-modal';

export interface GeneratorOptions {
  projectName: string;
  database: Database;
  webhooks: boolean;
  appExtensions: AppExtensionType[];
}

export interface Generator {
  generate(outputDir: string, options: GeneratorOptions): Promise<void>;
}
```

`cli.ts` constructs one `GeneratorOptions` from prompt results and passes it unchanged. No transformation at the call site — each generator interprets only what it needs.

## Generated Project Output

The Node generator writes this structure to `<outputDir>/`:

```
<project-name>/
  src/
    index.ts                  # server entry — imports and starts app
    app.ts                    # express app with conditional router imports
    oauth/
      index.ts                # stub
    database/
      index.ts                # stub
    webhooks/                 # only if options.webhooks === true
      index.ts                # stub
    app-extensions/           # only if options.appExtensions.length > 0
      panel/                  # only if 'custom-panel' selected
        index.ts              # stub
      modal/                  # only if 'custom-modal' selected
        index.ts              # stub
  package.json                # express + drizzle-orm deps pre-filled
  tsconfig.json
  .env.example                # PIPEDRIVE_CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, DATABASE_URL
  docker-compose.yml          # only if database is postgres or mysql
```

Module stubs export a minimal Express router so `app.ts` can import and mount them and `tsc --noEmit` passes cleanly:

```typescript
// oauth/index.ts — generated by create-pipedrive-app
import { Router } from 'express';
export default Router();
```

`app.ts` is the one file with real conditional logic — imports and mounts routers based on options, following the pattern from the ticket's architecture comment.

The generated `package.json` includes:
- `dependencies`: `express`, `drizzle-orm`
- `devDependencies`: `typescript`, `@types/express`, `@types/node`, `tsx`
- `scripts`: `dev: tsx src/index.ts`, `build: tsc`, `typecheck: tsc --noEmit`

The CLI tool's own `package.json` includes:
- `dependencies`: `@clack/prompts`, `fs-extra`, `prettier`
- `devDependencies`: `typescript`, `@types/node`, `@types/fs-extra`, `vitest`, `eslint`

## Code Generation Approach

Programmatic — no `templates/` folder. Each generator module constructs file content as TypeScript strings with `if/else` for conditional logic. This keeps files as valid TypeScript (IDE autocomplete, refactoring, type-checking all work) and allows the future AI plugin layer to call generator functions directly without spawning a subprocess.

## Next-Steps Summary

Printed to stdout after generation:

```
✓ Created my-app

Next steps:
  cd my-app
  cp .env.example .env
  docker-compose up -d        ← only printed for postgres or mysql
  npm install
  npm run dev
```

## Error Handling

- **User cancels (Ctrl+C):** Clack emits a cancel symbol — `cli.ts` checks after each prompt, prints a cancellation message, and calls `process.exit(0)`.
- **File write failure:** `utils/writeFile.ts` lets the error propagate; `cli.ts` catches at the top level, prints the error message, and exits with code 1.
- No silent failures.

## Testing

All tests use Vitest.

- **Prompt modules:** Unit-tested by mocking `@clack/prompts` — verify return types and cancellation handling.
- **Generator functions:** Called with a temp dir (`os.tmpdir()`) and a fixed `GeneratorOptions` — assert expected files exist and unexpected ones don't.
- **`app.ts` generator:** Separate test cases for each combination of `webhooks`/`appExtensions` to verify correct conditional imports.
- **End-to-end:** Run `generators/node/index.ts` against a temp dir, then shell out `tsc --noEmit` on the output — directly validates the AC from the Jira ticket.

## Acceptance Criteria

From AINATIVEM-41:

- `npx create-pipedrive-app my-app` runs end-to-end without error
- All prompts appear in correct order with correct conditional logic
- Generated files pass `tsc --noEmit`
