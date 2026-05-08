# CLI Tool Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the `create-pipedrive-app` CLI tool — project scaffold, interactive prompts, programmatic code generators, and a CI workflow — so that `npx create-pipedrive-app my-app` generates a valid TypeScript project that passes `tsc --noEmit`.

**Architecture:** CLI entry point (`src/cli.ts`) collects user choices via Clack prompts, builds a `GeneratorOptions` object, and passes it to the Node.js generator (`src/generators/node/index.ts`), which calls individual module generators that programmatically construct and write file content as strings. No template files exist — all generation is TypeScript functions.

**Tech Stack:** Node.js 20, TypeScript 5, `@clack/prompts`, `fs-extra`, `prettier`, Vitest, ESLint (flat config), GitHub Actions.

---

## File Map

**CLI tool source (create in this ticket):**
| File | Responsibility |
|---|---|
| `package.json` | Package metadata, scripts, deps |
| `tsconfig.json` | TypeScript config (ESNext, bundler resolution) |
| `eslint.config.js` | ESLint flat config with TypeScript rules |
| `.prettierrc` | Prettier formatting rules for source |
| `vitest.config.ts` | Vitest test runner config |
| `.github/workflows/ci.yml` | CI: lint + test on push/PR |
| `src/generators/interface.ts` | `GeneratorOptions` type + `Generator` interface |
| `src/utils/writeFile.ts` | `fs-extra outputFile` + `prettier.format()` before write |
| `src/prompts/projectName.ts` | Text prompt — returns project name string |
| `src/prompts/database.ts` | Select prompt — returns `'postgres' \| 'mysql' \| 'sqlite'` |
| `src/prompts/appExtensions.ts` | Confirm + multi-select — returns `AppExtensionType[]` |
| `src/prompts/webhooks.ts` | Confirm prompt — returns `boolean` |
| `src/generators/node/oauth.ts` | Generates `src/oauth/index.ts` stub |
| `src/generators/node/database.ts` | Generates `src/database/index.ts` stub |
| `src/generators/node/webhooks.ts` | Generates `src/webhooks/index.ts` stub (conditional) |
| `src/generators/node/appExtensions.ts` | Generates `src/app-extensions/` stubs (conditional) |
| `src/generators/node/app.ts` | Generates `src/app.ts` with conditional router imports |
| `src/generators/node/index.ts` | Orchestrates all generators + generates root files |
| `src/generators/php/index.ts` | Stub — throws "not yet implemented" |
| `src/cli.ts` | Entry point — wires prompts → generator → next-steps output |

**Test files:**
| File | Tests |
|---|---|
| `src/utils/writeFile.test.ts` | File creation, prettier formatting, fallback for unknown types |
| `src/prompts/projectName.test.ts` | Return value, cancel exit |
| `src/prompts/database.test.ts` | Return value, cancel exit |
| `src/prompts/appExtensions.test.ts` | No extensions, selected types, cancel exit |
| `src/prompts/webhooks.test.ts` | true/false, cancel exit |
| `src/generators/node/oauth.test.ts` | Creates correct file |
| `src/generators/node/database.test.ts` | Creates correct file |
| `src/generators/node/webhooks.test.ts` | Creates file only when webhooks enabled |
| `src/generators/node/appExtensions.test.ts` | Conditional file creation per type |
| `src/generators/node/app.test.ts` | Conditional imports per options combination |
| `src/generators/node/index.test.ts` | Full generation + `tsc --noEmit` on output |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `.prettierrc`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "create-pipedrive-app",
  "version": "0.1.0",
  "description": "Scaffold a production-ready Pipedrive Marketplace app",
  "type": "module",
  "bin": {
    "create-pipedrive-app": "./dist/cli.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "lint": "eslint src",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@clack/prompts": "^0.9.0",
    "fs-extra": "^11.2.0",
    "prettier": "^3.3.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^20.0.0",
    "eslint": "^9.0.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "typescript-eslint": "^8.0.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

- [ ] **Step 3: Create `eslint.config.js`**

```javascript
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/**'],
  },
);
```

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 6: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 7: Verify tooling works**

```bash
npm run typecheck
npm run lint
```

Expected: no errors (src/ is empty, that's fine).

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json eslint.config.js .prettierrc vitest.config.ts package-lock.json
git commit -m "chore: initialize project scaffold"
```

---

## Task 2: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [master]
  pull_request:
    branches: [master]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow for lint and test"
```

---

## Task 3: Generator interface

**Files:**
- Create: `src/generators/interface.ts`

No tests needed — this file is pure type definitions.

- [ ] **Step 1: Create `src/generators/interface.ts`**

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

- [ ] **Step 2: Verify it type-checks**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/generators/interface.ts
git commit -m "feat: add GeneratorOptions and Generator interface"
```

---

## Task 4: writeFile utility

**Files:**
- Create: `src/utils/writeFile.ts`
- Create: `src/utils/writeFile.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/writeFile.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';

const tmpDir = join(tmpdir(), 'cpa-writefile-test');

afterEach(async () => {
  await remove(tmpDir);
});

describe('writeFile', () => {
  it('creates file and all parent directories', async () => {
    const { writeFile } = await import('./writeFile.js');
    const filePath = join(tmpDir, 'nested/dir/file.ts');
    await writeFile(filePath, 'export const x = 1;');
    expect(await pathExists(filePath)).toBe(true);
  });

  it('formats TypeScript content with prettier', async () => {
    const { writeFile } = await import('./writeFile.js');
    const filePath = join(tmpDir, 'test.ts');
    await writeFile(filePath, 'export const x=1');
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('export const x = 1;');
  });

  it('writes content unformatted when prettier has no parser for the extension', async () => {
    const { writeFile } = await import('./writeFile.js');
    const filePath = join(tmpDir, '.env.example');
    const raw = 'KEY=value\nOTHER=123';
    await writeFile(filePath, raw);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(raw);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/utils/writeFile.test.ts
```

Expected: `FAIL` — `Cannot find module './writeFile.js'`

- [ ] **Step 3: Implement `src/utils/writeFile.ts`**

```typescript
import { outputFile } from 'fs-extra';
import { format, resolveConfig } from 'prettier';

export async function writeFile(filePath: string, content: string): Promise<void> {
  let formatted: string;
  try {
    const config = await resolveConfig(filePath);
    formatted = await format(content, { ...config, filepath: filePath });
  } catch {
    formatted = content;
  }
  await outputFile(filePath, formatted);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/utils/writeFile.test.ts
```

Expected:
```
✓ src/utils/writeFile.test.ts (3)
Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/writeFile.ts src/utils/writeFile.test.ts
git commit -m "feat: add writeFile utility with prettier formatting"
```

---

## Task 5: Prompt — projectName

**Files:**
- Create: `src/prompts/projectName.ts`
- Create: `src/prompts/projectName.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/prompts/projectName.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptProjectName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the entered project name', async () => {
    vi.mocked(clack.text).mockResolvedValue('my-app');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptProjectName } = await import('./projectName.js');
    const result = await promptProjectName();
    expect(result).toBe('my-app');
  });

  it('pre-fills with initial value when provided', async () => {
    vi.mocked(clack.text).mockResolvedValue('prefilled-app');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptProjectName } = await import('./projectName.js');
    await promptProjectName('prefilled-app');
    expect(clack.text).toHaveBeenCalledWith(
      expect.objectContaining({ initialValue: 'prefilled-app' }),
    );
  });

  it('calls process.exit(0) on cancel', async () => {
    vi.mocked(clack.text).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptProjectName } = await import('./projectName.js');
    await promptProjectName();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/prompts/projectName.test.ts
```

Expected: `FAIL` — `Cannot find module './projectName.js'`

- [ ] **Step 3: Implement `src/prompts/projectName.ts`**

```typescript
import * as clack from '@clack/prompts';

export async function promptProjectName(initial?: string): Promise<string> {
  const value = await clack.text({
    message: 'Project name?',
    initialValue: initial,
    validate: (v) => {
      if (!v.trim()) return 'Project name is required';
    },
  });

  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return value as string;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/prompts/projectName.test.ts
```

Expected:
```
✓ src/prompts/projectName.test.ts (3)
Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 5: Commit**

```bash
git add src/prompts/projectName.ts src/prompts/projectName.test.ts
git commit -m "feat: add projectName prompt"
```

---

## Task 6: Prompt — database

**Files:**
- Create: `src/prompts/database.ts`
- Create: `src/prompts/database.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/prompts/database.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the selected database', async () => {
    vi.mocked(clack.select).mockResolvedValue('postgres');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptDatabase } = await import('./database.js');
    const result = await promptDatabase();
    expect(result).toBe('postgres');
  });

  it('presents all three database options', async () => {
    vi.mocked(clack.select).mockResolvedValue('mysql');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptDatabase } = await import('./database.js');
    await promptDatabase();
    expect(clack.select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'postgres' }),
          expect.objectContaining({ value: 'mysql' }),
          expect.objectContaining({ value: 'sqlite' }),
        ]),
      }),
    );
  });

  it('calls process.exit(0) on cancel', async () => {
    vi.mocked(clack.select).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptDatabase } = await import('./database.js');
    await promptDatabase();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/prompts/database.test.ts
```

Expected: `FAIL` — `Cannot find module './database.js'`

- [ ] **Step 3: Implement `src/prompts/database.ts`**

```typescript
import * as clack from '@clack/prompts';
import type { Database } from '../generators/interface.js';

export async function promptDatabase(): Promise<Database> {
  const value = await clack.select({
    message: 'Database?',
    options: [
      { value: 'postgres' as const, label: 'Postgres' },
      { value: 'mysql' as const, label: 'MySQL' },
      { value: 'sqlite' as const, label: 'SQLite' },
    ],
  });

  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return value as Database;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/prompts/database.test.ts
```

Expected:
```
✓ src/prompts/database.test.ts (3)
Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 5: Commit**

```bash
git add src/prompts/database.ts src/prompts/database.test.ts
git commit -m "feat: add database prompt"
```

---

## Task 7: Prompt — appExtensions

**Files:**
- Create: `src/prompts/appExtensions.ts`
- Create: `src/prompts/appExtensions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/prompts/appExtensions.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptAppExtensions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when user declines', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(false);
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptAppExtensions } = await import('./appExtensions.js');
    const result = await promptAppExtensions();
    expect(result).toEqual([]);
    expect(clack.multiselect).not.toHaveBeenCalled();
  });

  it('returns selected extension types', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(true);
    vi.mocked(clack.multiselect).mockResolvedValue(['custom-panel', 'custom-modal'] as never);
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptAppExtensions } = await import('./appExtensions.js');
    const result = await promptAppExtensions();
    expect(result).toEqual(['custom-panel', 'custom-modal']);
  });

  it('calls process.exit(0) on cancel at confirm step', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptAppExtensions } = await import('./appExtensions.js');
    await promptAppExtensions();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('calls process.exit(0) on cancel at multiselect step', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(true);
    vi.mocked(clack.multiselect).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptAppExtensions } = await import('./appExtensions.js');
    await promptAppExtensions();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/prompts/appExtensions.test.ts
```

Expected: `FAIL` — `Cannot find module './appExtensions.js'`

- [ ] **Step 3: Implement `src/prompts/appExtensions.ts`**

```typescript
import * as clack from '@clack/prompts';
import type { AppExtensionType } from '../generators/interface.js';

export async function promptAppExtensions(): Promise<AppExtensionType[]> {
  const include = await clack.confirm({ message: 'Include App Extensions?' });

  if (clack.isCancel(include)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  if (!include) return [];

  const types = await clack.multiselect({
    message: 'Which type(s)?',
    options: [
      { value: 'custom-panel' as const, label: 'Custom Panel' },
      { value: 'custom-modal' as const, label: 'Custom Modal' },
    ],
    required: true,
  });

  if (clack.isCancel(types)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return types as AppExtensionType[];
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/prompts/appExtensions.test.ts
```

Expected:
```
✓ src/prompts/appExtensions.test.ts (4)
Test Files  1 passed (1)
Tests       4 passed (4)
```

- [ ] **Step 5: Commit**

```bash
git add src/prompts/appExtensions.ts src/prompts/appExtensions.test.ts
git commit -m "feat: add appExtensions prompt"
```

---

## Task 8: Prompt — webhooks

**Files:**
- Create: `src/prompts/webhooks.ts`
- Create: `src/prompts/webhooks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/prompts/webhooks.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when confirmed', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(true);
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptWebhooks } = await import('./webhooks.js');
    const result = await promptWebhooks();
    expect(result).toBe(true);
  });

  it('returns false when declined', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(false);
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptWebhooks } = await import('./webhooks.js');
    const result = await promptWebhooks();
    expect(result).toBe(false);
  });

  it('calls process.exit(0) on cancel', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptWebhooks } = await import('./webhooks.js');
    await promptWebhooks();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/prompts/webhooks.test.ts
```

Expected: `FAIL` — `Cannot find module './webhooks.js'`

- [ ] **Step 3: Implement `src/prompts/webhooks.ts`**

```typescript
import * as clack from '@clack/prompts';

export async function promptWebhooks(): Promise<boolean> {
  const value = await clack.confirm({ message: 'Include webhooks?' });

  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return value as boolean;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/prompts/webhooks.test.ts
```

Expected:
```
✓ src/prompts/webhooks.test.ts (3)
Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 5: Commit**

```bash
git add src/prompts/webhooks.ts src/prompts/webhooks.test.ts
git commit -m "feat: add webhooks prompt"
```

---

## Task 9: Generator — oauth stub

**Files:**
- Create: `src/generators/node/oauth.ts`
- Create: `src/generators/node/oauth.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/oauth.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-oauth-test');
const options: GeneratorOptions = {
  projectName: 'test-app',
  database: 'postgres',
  webhooks: false,
  appExtensions: [],
};

afterEach(async () => {
  await remove(tmpDir);
});

describe('generateOauth', () => {
  it('creates src/oauth/index.ts', async () => {
    const { generateOauth } = await import('./oauth.js');
    await generateOauth(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/oauth/index.ts'))).toBe(true);
  });

  it('exports a default Express Router', async () => {
    const { generateOauth } = await import('./oauth.js');
    await generateOauth(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
    expect(content).toContain("from 'express'");
    expect(content).toContain('Router()');
    expect(content).toContain('export default');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: `FAIL` — `Cannot find module './oauth.js'`

- [ ] **Step 3: Implement `src/generators/node/oauth.ts`**

```typescript
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateOauth(outputDir: string, _options: GeneratorOptions): Promise<void> {
  await writeFile(
    join(outputDir, 'src/oauth/index.ts'),
    `import { Router } from 'express';
export default Router();
`,
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected:
```
✓ src/generators/node/oauth.test.ts (2)
Test Files  1 passed (1)
Tests       2 passed (2)
```

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/oauth.ts src/generators/node/oauth.test.ts
git commit -m "feat: add oauth stub generator"
```

---

## Task 10: Generator — database stub

**Files:**
- Create: `src/generators/node/database.ts`
- Create: `src/generators/node/database.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/database.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-database-test');
const options: GeneratorOptions = {
  projectName: 'test-app',
  database: 'postgres',
  webhooks: false,
  appExtensions: [],
};

afterEach(async () => {
  await remove(tmpDir);
});

describe('generateDatabase', () => {
  it('creates src/database/index.ts', async () => {
    const { generateDatabase } = await import('./database.js');
    await generateDatabase(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/database/index.ts'))).toBe(true);
  });

  it('file is valid TypeScript (exports something)', async () => {
    const { generateDatabase } = await import('./database.js');
    await generateDatabase(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/database/index.ts'), 'utf-8');
    expect(content).toContain('export');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/generators/node/database.test.ts
```

Expected: `FAIL` — `Cannot find module './database.js'`

- [ ] **Step 3: Implement `src/generators/node/database.ts`**

```typescript
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateDatabase(
  outputDir: string,
  _options: GeneratorOptions,
): Promise<void> {
  await writeFile(join(outputDir, 'src/database/index.ts'), `export {};\n`);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/generators/node/database.test.ts
```

Expected:
```
✓ src/generators/node/database.test.ts (2)
Test Files  1 passed (1)
Tests       2 passed (2)
```

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/database.ts src/generators/node/database.test.ts
git commit -m "feat: add database stub generator"
```

---

## Task 11: Generator — webhooks stub

**Files:**
- Create: `src/generators/node/webhooks.ts`
- Create: `src/generators/node/webhooks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/webhooks.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-webhooks-test');

afterEach(async () => {
  await remove(tmpDir);
});

describe('generateWebhooks', () => {
  it('creates src/webhooks/index.ts', async () => {
    const { generateWebhooks } = await import('./webhooks.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: true,
      appExtensions: [],
    };
    await generateWebhooks(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/webhooks/index.ts'))).toBe(true);
  });

  it('exports a default Express Router', async () => {
    const { generateWebhooks } = await import('./webhooks.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: true,
      appExtensions: [],
    };
    await generateWebhooks(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/webhooks/index.ts'), 'utf-8');
    expect(content).toContain("from 'express'");
    expect(content).toContain('Router()');
    expect(content).toContain('export default');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/generators/node/webhooks.test.ts
```

Expected: `FAIL` — `Cannot find module './webhooks.js'`

- [ ] **Step 3: Implement `src/generators/node/webhooks.ts`**

```typescript
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateWebhooks(
  outputDir: string,
  _options: GeneratorOptions,
): Promise<void> {
  await writeFile(
    join(outputDir, 'src/webhooks/index.ts'),
    `import { Router } from 'express';
export default Router();
`,
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/generators/node/webhooks.test.ts
```

Expected:
```
✓ src/generators/node/webhooks.test.ts (2)
Test Files  1 passed (1)
Tests       2 passed (2)
```

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/webhooks.ts src/generators/node/webhooks.test.ts
git commit -m "feat: add webhooks stub generator"
```

---

## Task 12: Generator — appExtensions stubs

**Files:**
- Create: `src/generators/node/appExtensions.ts`
- Create: `src/generators/node/appExtensions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/appExtensions.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-appext-test');

afterEach(async () => {
  await remove(tmpDir);
});

describe('generateAppExtensions', () => {
  it('creates panel stub when custom-panel is selected', async () => {
    const { generateAppExtensions } = await import('./appExtensions.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-panel'],
    };
    await generateAppExtensions(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(false);
  });

  it('creates modal stub when custom-modal is selected', async () => {
    const { generateAppExtensions } = await import('./appExtensions.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-modal'],
    };
    await generateAppExtensions(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(false);
  });

  it('creates both stubs when both types are selected', async () => {
    const { generateAppExtensions } = await import('./appExtensions.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-panel', 'custom-modal'],
    };
    await generateAppExtensions(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/generators/node/appExtensions.test.ts
```

Expected: `FAIL` — `Cannot find module './appExtensions.js'`

- [ ] **Step 3: Implement `src/generators/node/appExtensions.ts`**

```typescript
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

const routerStub = `import { Router } from 'express';
export default Router();
`;

export async function generateAppExtensions(
  outputDir: string,
  options: GeneratorOptions,
): Promise<void> {
  if (options.appExtensions.includes('custom-panel')) {
    await writeFile(join(outputDir, 'src/app-extensions/panel/index.ts'), routerStub);
  }
  if (options.appExtensions.includes('custom-modal')) {
    await writeFile(join(outputDir, 'src/app-extensions/modal/index.ts'), routerStub);
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/generators/node/appExtensions.test.ts
```

Expected:
```
✓ src/generators/node/appExtensions.test.ts (3)
Test Files  1 passed (1)
Tests       3 passed (3)
```

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/appExtensions.ts src/generators/node/appExtensions.test.ts
git commit -m "feat: add appExtensions stub generator"
```

---

## Task 13: Generator — app.ts with conditional logic

**Files:**
- Create: `src/generators/node/app.ts`
- Create: `src/generators/node/app.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/app.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-app-test');

afterEach(async () => {
  await remove(tmpDir);
});

async function getAppContent(options: GeneratorOptions): Promise<string> {
  const { generateApp } = await import('./app.js');
  await generateApp(tmpDir, options);
  return readFile(join(tmpDir, 'src/app.ts'), 'utf-8');
}

describe('generateApp', () => {
  it('always imports express and oauthRouter', async () => {
    const content = await getAppContent({
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: [],
    });
    expect(content).toContain("from 'express'");
    expect(content).toContain("from './oauth/index.js'");
    expect(content).toContain("app.use('/oauth'");
  });

  it('includes webhooks import and mount when webhooks is true', async () => {
    const content = await getAppContent({
      projectName: 'test-app',
      database: 'postgres',
      webhooks: true,
      appExtensions: [],
    });
    expect(content).toContain("from './webhooks/index.js'");
    expect(content).toContain("app.use('/webhooks'");
  });

  it('excludes webhooks when webhooks is false', async () => {
    const content = await getAppContent({
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: [],
    });
    expect(content).not.toContain('./webhooks/index.js');
  });

  it('includes panel import and mount when custom-panel is selected', async () => {
    const content = await getAppContent({
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-panel'],
    });
    expect(content).toContain("from './app-extensions/panel/index.js'");
    expect(content).toContain("app.use('/extensions/panel'");
  });

  it('includes modal import and mount when custom-modal is selected', async () => {
    const content = await getAppContent({
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-modal'],
    });
    expect(content).toContain("from './app-extensions/modal/index.js'");
    expect(content).toContain("app.use('/extensions/modal'");
  });

  it('excludes extension imports when appExtensions is empty', async () => {
    const content = await getAppContent({
      projectName: 'test-app',
      database: 'sqlite',
      webhooks: false,
      appExtensions: [],
    });
    expect(content).not.toContain('./app-extensions');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/generators/node/app.test.ts
```

Expected: `FAIL` — `Cannot find module './app.js'`

- [ ] **Step 3: Implement `src/generators/node/app.ts`**

```typescript
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateApp(outputDir: string, options: GeneratorOptions): Promise<void> {
  const webhooksImport = options.webhooks
    ? `import webhooksRouter from './webhooks/index.js';`
    : '';
  const panelImport = options.appExtensions.includes('custom-panel')
    ? `import panelRouter from './app-extensions/panel/index.js';`
    : '';
  const modalImport = options.appExtensions.includes('custom-modal')
    ? `import modalRouter from './app-extensions/modal/index.js';`
    : '';

  const webhooksMount = options.webhooks ? `app.use('/webhooks', webhooksRouter);` : '';
  const panelMount = options.appExtensions.includes('custom-panel')
    ? `app.use('/extensions/panel', panelRouter);`
    : '';
  const modalMount = options.appExtensions.includes('custom-modal')
    ? `app.use('/extensions/modal', modalRouter);`
    : '';

  const content = `import express from 'express';
import oauthRouter from './oauth/index.js';
${webhooksImport}
${panelImport}
${modalImport}

const app = express();

app.use('/oauth', oauthRouter);
${webhooksMount}
${panelMount}
${modalMount}

export default app;
`;

  await writeFile(join(outputDir, 'src/app.ts'), content);
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/generators/node/app.test.ts
```

Expected:
```
✓ src/generators/node/app.test.ts (6)
Test Files  1 passed (1)
Tests       6 passed (6)
```

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/app.ts src/generators/node/app.test.ts
git commit -m "feat: add app.ts generator with conditional router logic"
```

---

## Task 14: Generator — node/index.ts orchestrator + root project files

**Files:**
- Create: `src/generators/node/index.ts`

Tests are covered by the end-to-end test in Task 17. This task focuses on wiring.

- [ ] **Step 1: Implement `src/generators/node/index.ts`**

```typescript
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { Generator, GeneratorOptions } from '../interface.js';
import { generateApp } from './app.js';
import { generateAppExtensions } from './appExtensions.js';
import { generateDatabase } from './database.js';
import { generateOauth } from './oauth.js';
import { generateWebhooks } from './webhooks.js';

export const nodeGenerator: Generator = {
  async generate(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generateOauth(outputDir, options);
    await generateDatabase(outputDir, options);
    await generateApp(outputDir, options);

    if (options.webhooks) {
      await generateWebhooks(outputDir, options);
    }

    if (options.appExtensions.length > 0) {
      await generateAppExtensions(outputDir, options);
    }

    await generateServerEntry(outputDir);
    await generatePackageJson(outputDir, options);
    await generateTsConfig(outputDir);
    await generateEnvExample(outputDir);

    if (options.database === 'postgres' || options.database === 'mysql') {
      await generateDockerCompose(outputDir, options);
    }
  },
};

async function generateServerEntry(outputDir: string): Promise<void> {
  await writeFile(
    join(outputDir, 'src/index.ts'),
    `import app from './app.js';

const PORT = process.env.PORT ?? '3000';
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`,
  );
}

async function generatePackageJson(outputDir: string, options: GeneratorOptions): Promise<void> {
  const pkg = {
    name: options.projectName,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'tsx src/index.ts',
      build: 'tsc',
      typecheck: 'tsc --noEmit',
    },
    dependencies: {
      express: '^4.19.0',
      'drizzle-orm': '^0.30.0',
    },
    devDependencies: {
      typescript: '^5.4.0',
      '@types/express': '^4.17.0',
      '@types/node': '^20.0.0',
      tsx: '^4.7.0',
    },
  };
  await writeFile(join(outputDir, 'package.json'), JSON.stringify(pkg, null, 2));
}

async function generateTsConfig(outputDir: string): Promise<void> {
  const tsconfig = {
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      outDir: 'dist',
      rootDir: 'src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ['src'],
  };
  await writeFile(join(outputDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
}

async function generateEnvExample(outputDir: string): Promise<void> {
  await writeFile(
    join(outputDir, '.env.example'),
    `PIPEDRIVE_CLIENT_ID=
PIPEDRIVE_CLIENT_SECRET=
PIPEDRIVE_REDIRECT_URI=http://localhost:3000/oauth/callback
DATABASE_URL=
PORT=3000
`,
  );
}

async function generateDockerCompose(outputDir: string, options: GeneratorOptions): Promise<void> {
  const isPostgres = options.database === 'postgres';
  const content = isPostgres
    ? `services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: ${options.projectName}
    ports:
      - '5432:5432'
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
`
    : `services:
  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: app
      MYSQL_DATABASE: ${options.projectName}
      MYSQL_USER: app
      MYSQL_PASSWORD: app
    ports:
      - '3306:3306'
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
`;
  await writeFile(join(outputDir, 'docker-compose.yml'), content);
}
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/generators/node/index.ts
git commit -m "feat: add node generator orchestrator with root project file generators"
```

---

## Task 15: Generator — PHP stub

**Files:**
- Create: `src/generators/php/index.ts`

- [ ] **Step 1: Implement `src/generators/php/index.ts`**

```typescript
import type { Generator, GeneratorOptions } from '../interface.js';

export const phpGenerator: Generator = {
  async generate(_outputDir: string, _options: GeneratorOptions): Promise<void> {
    throw new Error('PHP generator is not yet implemented');
  },
};
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/generators/php/index.ts
git commit -m "feat: add php generator stub"
```

---

## Task 16: CLI entry point

**Files:**
- Create: `src/cli.ts`

No unit tests — `cli.ts` is the side-effect orchestrator; the end-to-end test in Task 17 covers it via `nodeGenerator` directly.

- [ ] **Step 1: Implement `src/cli.ts`**

```typescript
import * as clack from '@clack/prompts';
import { join } from 'path';
import { promptAppExtensions } from './prompts/appExtensions.js';
import { promptDatabase } from './prompts/database.js';
import { promptProjectName } from './prompts/projectName.js';
import { promptWebhooks } from './prompts/webhooks.js';
import { nodeGenerator } from './generators/node/index.js';

async function main(): Promise<void> {
  clack.intro('create-pipedrive-app');

  const projectName = await promptProjectName(process.argv[2]);
  const database = await promptDatabase();
  const appExtensions = await promptAppExtensions();
  const webhooks = await promptWebhooks();

  const outputDir = join(process.cwd(), projectName);

  try {
    await nodeGenerator.generate(outputDir, { projectName, database, appExtensions, webhooks });
  } catch (error) {
    clack.log.error(
      `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  clack.outro(`✓ Created ${projectName}`);

  const needsDocker = database === 'postgres' || database === 'mysql';
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log('  cp .env.example .env');
  if (needsDocker) console.log('  docker-compose up -d');
  console.log('  npm install');
  console.log('  npm run dev');
}

main();
```

- [ ] **Step 2: Verify it type-checks**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/cli.ts
git commit -m "feat: add CLI entry point"
```

---

## Task 17: End-to-end test

**Files:**
- Create: `src/generators/node/index.test.ts`

This test runs `nodeGenerator.generate()` against a real temp directory and then shells out `tsc --noEmit` on the generated output. It directly validates the acceptance criteria from AINATIVEM-41. It requires network access to run `npm install` in the generated project.

- [ ] **Step 1: Write the end-to-end tests**

Create `src/generators/node/index.test.ts`:

```typescript
import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { nodeGenerator } from './index.js';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-e2e-test');

afterEach(async () => {
  await remove(tmpDir);
});

const fullOptions: GeneratorOptions = {
  projectName: 'test-app',
  database: 'postgres',
  webhooks: true,
  appExtensions: ['custom-panel', 'custom-modal'],
};

const minimalOptions: GeneratorOptions = {
  projectName: 'test-app',
  database: 'sqlite',
  webhooks: false,
  appExtensions: [],
};

describe('nodeGenerator', () => {
  it('generates all expected files for full options', async () => {
    await nodeGenerator.generate(tmpDir, fullOptions);

    const expectedFiles = [
      'src/index.ts',
      'src/app.ts',
      'src/oauth/index.ts',
      'src/database/index.ts',
      'src/webhooks/index.ts',
      'src/app-extensions/panel/index.ts',
      'src/app-extensions/modal/index.ts',
      'package.json',
      'tsconfig.json',
      '.env.example',
      'docker-compose.yml',
    ];

    for (const file of expectedFiles) {
      expect(await pathExists(join(tmpDir, file)), `Missing: ${file}`).toBe(true);
    }
  });

  it('omits conditional files for minimal options', async () => {
    await nodeGenerator.generate(tmpDir, minimalOptions);

    expect(await pathExists(join(tmpDir, 'src/webhooks/index.ts'))).toBe(false);
    expect(await pathExists(join(tmpDir, 'src/app-extensions'))).toBe(false);
    expect(await pathExists(join(tmpDir, 'docker-compose.yml'))).toBe(false);
  });

  it('generated project passes tsc --noEmit', async () => {
    await nodeGenerator.generate(tmpDir, fullOptions);
    execSync('npm install', { cwd: tmpDir, stdio: 'pipe' });
    expect(() => {
      execSync('npx tsc --noEmit', { cwd: tmpDir, stdio: 'pipe' });
    }).not.toThrow();
  }, 60_000);
});
```

- [ ] **Step 2: Run tests — verify file existence tests pass, tsc test fails**

```bash
npx vitest run src/generators/node/index.test.ts
```

Expected: first two tests pass, third test fails (no `node_modules` yet in temp dir).

- [ ] **Step 3: Run all tests to confirm nothing regressed**

```bash
npm test
```

Expected: all tests pass except the `tsc --noEmit` end-to-end test (which needs `npm install` in a temp dir — confirm it passes with the 60s timeout).

- [ ] **Step 4: Run the full test suite and confirm green**

```bash
npm test
```

Expected:
```
Test Files  11 passed (11)
Tests       xx passed (xx)
```

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/index.test.ts
git commit -m "test: add end-to-end generator test with tsc --noEmit validation"
```

---

## Final check

- [ ] **Run full test suite**

```bash
npm test
```

Expected: all tests green.

- [ ] **Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Run lint**

```bash
npm run lint
```

Expected: no errors.
