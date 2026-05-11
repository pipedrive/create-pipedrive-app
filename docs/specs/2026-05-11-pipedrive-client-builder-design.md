# Pipedrive Client + Builder Pattern Refactor

**Date:** 2026-05-11
**Jira:** AINATIVEM-44
**Branch:** AINATIVEM-44

## Summary

Two changes in one task:

1. **Refactor the Node.js generator to use a `NodeProjectBuilder` + `BuildStep` pattern** — replaces the imperative function calls in `nodeGenerator/index.ts` with a fluent, extensible builder.
2. **Add a `PipedriveClientStep`** — generates `src/pipedrive/client.ts` in the scaffolded project, wrapping the official `pipedrive` npm SDK with proactive token refresh (Option B).

---

## New Files

| Path | Purpose |
|------|---------|
| `src/utils/sourceFileBuilder.ts` | Fluent builder for TypeScript file content |
| `src/utils/templates.ts` | Pure helper functions for recurring code snippets |
| `src/generators/node/projectBuilder.ts` | `NodeProjectBuilder` + `BuildStep` interface + all step classes |
| `src/generators/node/pipedriveClient.ts` | `PipedriveClientStep` generator |
| `src/utils/sourceFileBuilder.test.ts` | Unit tests for `SourceFileBuilder` |
| `src/generators/node/projectBuilder.test.ts` | Tests for builder and `when()` |
| `src/generators/node/pipedriveClient.test.ts` | Tests for generated client file |

## Modified Files

| Path | Change |
|------|--------|
| `src/generators/node/index.ts` | Replace imperative calls with `NodeProjectBuilder` chain |
| `src/generators/node/app.ts` | Refactor to use `SourceFileBuilder` |
| `src/generators/node/oauth.ts` | Refactor to use `SourceFileBuilder` |

---

## Architecture

### `SourceFileBuilder` (`src/utils/sourceFileBuilder.ts`)

Constructs TypeScript file content declaratively. Eliminates conditional blank lines from string interpolation.

```ts
interface ImportEntry { from: string; names: string[]; isDefault: boolean; }

class SourceFileBuilder {
  import(from: string, names: string[]): this
  importDefault(from: string, name: string): this
  importIf(condition: boolean, from: string, names: string[]): this
  importDefaultIf(condition: boolean, from: string, name: string): this
  addBlock(code: string): this
  addBlockIf(condition: boolean, code: string): this
  exportDefault(name: string): this
  build(): string   // imports (grouped) → blank line → body blocks → export default
}
```

Imports are deduplicated. Named and default imports from the same source are merged. `build()` emits a string ready to pass to `writeFile()`.

### `templates.ts` (`src/utils/templates.ts`)

Pure functions for code snippets shared across generators. No side effects.

```ts
export function expressRouterFile(): string
// → "import { Router } from 'express';\nexport default Router();"

export function routerMount(path: string, routerName: string): string
// → "app.use('${path}', ${routerName});"

export function envVarAccess(key: string, fallback?: string): string
// → "process.env.KEY" or "process.env.KEY ?? 'fallback'"
```

### `BuildStep` + `NodeProjectBuilder` (`src/generators/node/projectBuilder.ts`)

```ts
interface BuildStep {
  execute(outputDir: string, options: GeneratorOptions): Promise<void>;
}
```

Each feature is a `BuildStep` class. The builder accumulates steps and `build()` executes them in sequence:

```ts
class NodeProjectBuilder {
  constructor(outputDir: string, options: GeneratorOptions)

  // Always-add methods (unconditional):
  addOAuth(): this
  addDatabase(): this
  addApp(): this
  addPipedriveClient(): this
  addServerEntry(): this
  addPackageJson(): this
  addTsConfig(): this
  addEnvExample(): this

  // Feature methods (called conditionally by orchestrator via when()):
  addWebhooks(): this
  addPostgres(): this
  addMySQL(): this
  addAppExtensions(): this

  // Conditional combinator:
  when(condition: boolean, fn: (b: this) => void): this

  async build(): Promise<void>
}
```

Orchestrator usage in `index.ts`:

```ts
export const nodeGenerator: Generator = {
  async generate(outputDir, options) {
    await new NodeProjectBuilder(outputDir, options)
      .addOAuth()
      .addDatabase()
      .addApp()
      .when(options.webhooks,                 b => b.addWebhooks())
      .when(options.database === 'postgres',   b => b.addPostgres())
      .when(options.database === 'mysql',      b => b.addMySQL())
      .when(options.appExtensions.length > 0,  b => b.addAppExtensions())
      .addPipedriveClient()
      .addServerEntry()
      .addPackageJson()
      .addTsConfig()
      .addEnvExample()
      .build();
  }
};
```

Adding a new feature = write a `BuildStep` class + one `.when(...)` line in the chain.

---

## Pipedrive Client Generator

### Generated file: `src/pipedrive/client.ts`

Uses Option B: proactive expiry check before every call — no retry needed.

```ts
import { Configuration, DealsApi, PersonsApi, OrganizationsApi } from 'pipedrive';

interface TokenRecord {
  accessToken: string;
  expiresAt: Date;
}

// TODO: replace with database module call
async function getStoredToken(_companyId: number): Promise<TokenRecord> {
  throw new Error('getStoredToken not implemented — wire up database module');
}

// TODO: replace with oauth module call
async function refreshStoredToken(_companyId: number): Promise<TokenRecord> {
  throw new Error('refreshStoredToken not implemented — wire up oauth module');
}

async function getValidToken(companyId: number): Promise<string> {
  let token = await getStoredToken(companyId);
  if (token.expiresAt <= new Date()) {
    token = await refreshStoredToken(companyId);
  }
  return token.accessToken;
}

export async function getClient(companyId: number) {
  const accessToken = await getValidToken(companyId);
  const config = new Configuration({ accessToken });
  return {
    deals: new DealsApi(config),
    persons: new PersonsApi(config),
    organizations: new OrganizationsApi(config),
  };
}
```

**Why placeholder functions instead of imports:** `database/index.ts` and `oauth/index.ts` are stubs being implemented separately (parallel task). The client must compile immediately. Placeholder functions with clear `// TODO` messages give the other developer a typed interface to implement against.

**Why proactive expiry check:** The token record includes `expiresAt`. Checking before the call avoids a round-trip to the Pipedrive API for an expired token. Clock skew is acceptable for a scaffold — production apps can tighten the margin.

### Generated `package.json` additions

`pipedrive` is added to `dependencies` in `generatePackageJson` (inside `PackageJsonStep`).

---

## Error Handling

- Each `BuildStep.execute()` propagates errors — `cli.ts` catches and formats them with `clack.log.error`
- `SourceFileBuilder` throws if `.exportDefault()` is called more than once
- Placeholder functions throw `Error('not implemented')` — visible immediately at runtime, safe at compile time
- No silent failures: if any step throws, `build()` stops

---

## Testing

### `sourceFileBuilder.test.ts`
- Import deduplication (same source, multiple calls)
- Named + default imports from same source are merged
- `addBlockIf(false, ...)` adds nothing
- `build()` output: imports first, blank line, body, export default
- `exportDefault` called twice throws

### `projectBuilder.test.ts`
- `when(true, ...)` adds the step; `when(false, ...)` does not
- Steps execute in insertion order
- Builder is chainable (returns `this`)

### `pipedriveClient.test.ts`
- `src/pipedrive/client.ts` is created
- File exports `getClient`
- File imports `Configuration`, `DealsApi`, `PersonsApi`, `OrganizationsApi` from `'pipedrive'`
- File contains `getStoredToken` and `refreshStoredToken` placeholders
