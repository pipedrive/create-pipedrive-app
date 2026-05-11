# Pipedrive Client + Builder Pattern Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Node.js generator to use a `NodeProjectBuilder` + `BuildStep` pattern and add a `PipedriveClientStep` that generates a preconfigured `src/pipedrive/client.ts` with proactive token refresh.

**Architecture:** Introduce two utilities (`SourceFileBuilder`, `templates.ts`) that generators use to build file content declaratively. Wrap each generator in a `BuildStep` class inside `projectBuilder.ts`. `NodeProjectBuilder` accumulates steps and a `when()` combinator handles conditional inclusion. `index.ts` becomes a clean fluent chain.

**Tech Stack:** TypeScript, Vitest, dedent, Node.js `fs/promises`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/utils/sourceFileBuilder.ts` | Fluent TS file content builder (imports, body, export) |
| Create | `src/utils/sourceFileBuilder.test.ts` | Unit tests for SourceFileBuilder |
| Create | `src/utils/templates.ts` | Pure functions for recurring code snippets |
| Create | `src/utils/templates.test.ts` | Unit tests for template helpers |
| Create | `src/generators/node/pipedriveClient.ts` | Generator for `src/pipedrive/client.ts` |
| Create | `src/generators/node/pipedriveClient.test.ts` | Tests for generated client file |
| Create | `src/generators/node/projectBuilder.ts` | `BuildStep` interface + all step classes + `NodeProjectBuilder` |
| Create | `src/generators/node/projectBuilder.test.ts` | Tests for builder `when()` and step ordering |
| Modify | `src/generators/node/app.ts` | Refactor to use `SourceFileBuilder` + `templates` |
| Modify | `src/generators/node/oauth.ts` | Refactor to use `templates.expressRouterFile()` |
| Modify | `src/generators/node/index.ts` | Replace imperative calls with `NodeProjectBuilder` chain |
| Modify | `src/generators/node/index.test.ts` | Add `src/pipedrive/client.ts` to expected files list |

---

## Task 1: `SourceFileBuilder`

**Files:**
- Create: `src/utils/sourceFileBuilder.ts`
- Create: `src/utils/sourceFileBuilder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/sourceFileBuilder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SourceFileBuilder } from './sourceFileBuilder.js';

describe('SourceFileBuilder', () => {
  it('emits a named import', () => {
    const out = new SourceFileBuilder().import('express', ['Router']).build();
    expect(out).toContain("import { Router } from 'express';");
  });

  it('emits a default import', () => {
    const out = new SourceFileBuilder().importDefault('./app.js', 'app').build();
    expect(out).toContain("import app from './app.js';");
  });

  it('deduplicates named imports from the same source', () => {
    const out = new SourceFileBuilder()
      .import('express', ['Router'])
      .import('express', ['Router', 'Request'])
      .build();
    expect((out.match(/from 'express'/g) ?? []).length).toBe(1);
    expect(out).toContain('Router');
    expect(out).toContain('Request');
  });

  it('merges default and named imports from the same source into one line', () => {
    const out = new SourceFileBuilder()
      .importDefault('express', 'express')
      .import('express', ['Router'])
      .build();
    expect((out.match(/from 'express'/g) ?? []).length).toBe(1);
    expect(out).toContain('express');
    expect(out).toContain('Router');
  });

  it('importIf skips when condition is false', () => {
    const out = new SourceFileBuilder().importIf(false, 'express', ['Router']).build();
    expect(out).not.toContain('express');
  });

  it('importDefaultIf skips when condition is false', () => {
    const out = new SourceFileBuilder()
      .importDefaultIf(false, './webhooks.js', 'webhooksRouter')
      .build();
    expect(out).not.toContain('webhooks');
  });

  it('addBlock adds body content', () => {
    const out = new SourceFileBuilder().addBlock('const x = 1;').build();
    expect(out).toContain('const x = 1;');
  });

  it('addBlockIf skips when condition is false', () => {
    const out = new SourceFileBuilder().addBlockIf(false, 'const x = 1;').build();
    expect(out).not.toContain('const x');
  });

  it('exportDefault appends export statement', () => {
    const out = new SourceFileBuilder()
      .addBlock('const app = {};')
      .exportDefault('app')
      .build();
    expect(out).toContain('export default app;');
  });

  it('exportDefault throws if called twice', () => {
    expect(() =>
      new SourceFileBuilder().exportDefault('a').exportDefault('b'),
    ).toThrow('exportDefault called more than once');
  });

  it('build output order: imports → body → export default', () => {
    const out = new SourceFileBuilder()
      .importDefault('express', 'express')
      .addBlock('const app = express();')
      .exportDefault('app')
      .build();
    const importPos = out.indexOf('import express');
    const bodyPos = out.indexOf('const app');
    const exportPos = out.indexOf('export default');
    expect(importPos).toBeLessThan(bodyPos);
    expect(bodyPos).toBeLessThan(exportPos);
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run src/utils/sourceFileBuilder.test.ts
```

Expected: all tests fail with `Cannot find module './sourceFileBuilder.js'`

- [ ] **Step 3: Implement `SourceFileBuilder`**

Create `src/utils/sourceFileBuilder.ts`:

```ts
interface ImportEntry {
  from: string;
  defaultName?: string;
  names: string[];
}

export class SourceFileBuilder {
  private imports: Map<string, ImportEntry> = new Map();
  private blocks: string[] = [];
  private defaultExport?: string;

  import(from: string, names: string[]): this {
    const existing = this.imports.get(from);
    if (existing) {
      existing.names = [...new Set([...existing.names, ...names])];
    } else {
      this.imports.set(from, { from, names });
    }
    return this;
  }

  importDefault(from: string, name: string): this {
    const existing = this.imports.get(from);
    if (existing) {
      existing.defaultName = name;
    } else {
      this.imports.set(from, { from, defaultName: name, names: [] });
    }
    return this;
  }

  importIf(condition: boolean, from: string, names: string[]): this {
    if (condition) this.import(from, names);
    return this;
  }

  importDefaultIf(condition: boolean, from: string, name: string): this {
    if (condition) this.importDefault(from, name);
    return this;
  }

  addBlock(code: string): this {
    this.blocks.push(code);
    return this;
  }

  addBlockIf(condition: boolean, code: string): this {
    if (condition) this.addBlock(code);
    return this;
  }

  exportDefault(name: string): this {
    if (this.defaultExport !== undefined) {
      throw new Error('exportDefault called more than once');
    }
    this.defaultExport = name;
    return this;
  }

  build(): string {
    const importLines = Array.from(this.imports.values()).map((entry) => {
      const parts: string[] = [];
      if (entry.defaultName) parts.push(entry.defaultName);
      if (entry.names.length > 0) parts.push(`{ ${entry.names.join(', ')} }`);
      return `import ${parts.join(', ')} from '${entry.from}';`;
    });

    const sections: string[] = [];
    if (importLines.length > 0) sections.push(importLines.join('\n'));
    sections.push(...this.blocks);
    if (this.defaultExport !== undefined) {
      sections.push(`export default ${this.defaultExport};`);
    }

    return sections.join('\n\n');
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run src/utils/sourceFileBuilder.test.ts
```

Expected: all 11 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/sourceFileBuilder.ts src/utils/sourceFileBuilder.test.ts
git commit -m "AINATIVEM-44 add SourceFileBuilder utility"
```

---

## Task 2: `templates.ts`

**Files:**
- Create: `src/utils/templates.ts`
- Create: `src/utils/templates.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/templates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { expressRouterFile, routerMount, envVarAccess } from './templates.js';

describe('expressRouterFile', () => {
  it('returns an express Router import and default export', () => {
    const out = expressRouterFile();
    expect(out).toContain("from 'express'");
    expect(out).toContain('Router()');
    expect(out).toContain('export default');
  });
});

describe('routerMount', () => {
  it('returns an app.use() call with the given path and router name', () => {
    expect(routerMount('/oauth', 'oauthRouter')).toBe("app.use('/oauth', oauthRouter);");
  });
});

describe('envVarAccess', () => {
  it('returns process.env.KEY without fallback', () => {
    expect(envVarAccess('PORT')).toBe("process.env.PORT");
  });

  it('returns process.env.KEY ?? fallback with fallback', () => {
    expect(envVarAccess('PORT', '3000')).toBe("process.env.PORT ?? '3000'");
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run src/utils/templates.test.ts
```

Expected: all tests fail with `Cannot find module './templates.js'`

- [ ] **Step 3: Implement `templates.ts`**

Create `src/utils/templates.ts`:

```ts
export function expressRouterFile(): string {
  return `import { Router } from 'express';\n\nexport default Router();`;
}

export function routerMount(path: string, routerName: string): string {
  return `app.use('${path}', ${routerName});`;
}

export function envVarAccess(key: string, fallback?: string): string {
  return fallback ? `process.env.${key} ?? '${fallback}'` : `process.env.${key}`;
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run src/utils/templates.test.ts
```

Expected: all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/utils/templates.ts src/utils/templates.test.ts
git commit -m "AINATIVEM-44 add template helper functions"
```

---

## Task 3: `pipedriveClient.ts` generator

**Files:**
- Create: `src/generators/node/pipedriveClient.ts`
- Create: `src/generators/node/pipedriveClient.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/pipedriveClient.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-pipedrive-client-test');
const exists = (p: string) => access(p).then(() => true, () => false);
const options: GeneratorOptions = {
  projectName: 'test-app',
  database: 'postgres',
  webhooks: false,
  appExtensions: [],
};

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('generatePipedriveClient', () => {
  it('creates src/pipedrive/client.ts', async () => {
    const { generatePipedriveClient } = await import('./pipedriveClient.js');
    await generatePipedriveClient(tmpDir, options);
    expect(await exists(join(tmpDir, 'src/pipedrive/client.ts'))).toBe(true);
  });

  it('exports getClient', async () => {
    const { generatePipedriveClient } = await import('./pipedriveClient.js');
    await generatePipedriveClient(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
    expect(content).toContain('export async function getClient');
  });

  it('imports Configuration, DealsApi, PersonsApi, OrganizationsApi from pipedrive', async () => {
    const { generatePipedriveClient } = await import('./pipedriveClient.js');
    await generatePipedriveClient(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
    expect(content).toContain("from 'pipedrive'");
    expect(content).toContain('Configuration');
    expect(content).toContain('DealsApi');
    expect(content).toContain('PersonsApi');
    expect(content).toContain('OrganizationsApi');
  });

  it('contains getStoredToken and refreshStoredToken placeholder functions', async () => {
    const { generatePipedriveClient } = await import('./pipedriveClient.js');
    await generatePipedriveClient(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
    expect(content).toContain('getStoredToken');
    expect(content).toContain('refreshStoredToken');
  });

  it('checks token expiry before returning client', async () => {
    const { generatePipedriveClient } = await import('./pipedriveClient.js');
    await generatePipedriveClient(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
    expect(content).toContain('expiresAt');
    expect(content).toContain('new Date()');
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run src/generators/node/pipedriveClient.test.ts
```

Expected: all tests fail with `Cannot find module './pipedriveClient.js'`

- [ ] **Step 3: Implement `pipedriveClient.ts`**

Create `src/generators/node/pipedriveClient.ts`:

```ts
import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generatePipedriveClient(
  outputDir: string,
  _options: GeneratorOptions,
): Promise<void> {
  await writeFile(
    join(outputDir, 'src/pipedrive/client.ts'),
    dedent`
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
    `,
  );
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run src/generators/node/pipedriveClient.test.ts
```

Expected: all 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/pipedriveClient.ts src/generators/node/pipedriveClient.test.ts
git commit -m "AINATIVEM-44 add pipedriveClient generator"
```

---

## Task 4: Refactor `oauth.ts` to use `templates`

**Files:**
- Modify: `src/generators/node/oauth.ts`

The existing `oauth.test.ts` assertions must still pass after this refactor.

- [ ] **Step 1: Run existing tests to establish baseline**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: 2 tests pass

- [ ] **Step 2: Refactor `oauth.ts`**

Replace the contents of `src/generators/node/oauth.ts`:

```ts
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { expressRouterFile } from '../../utils/templates.js';

export async function generateOauth(outputDir: string, _options: GeneratorOptions): Promise<void> {
  await writeFile(join(outputDir, 'src/oauth/index.ts'), expressRouterFile());
}
```

- [ ] **Step 3: Run tests and confirm they still pass**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: 2 tests pass (same as before)

- [ ] **Step 4: Commit**

```bash
git add src/generators/node/oauth.ts
git commit -m "AINATIVEM-44 refactor oauth generator to use templates"
```

---

## Task 5: Refactor `app.ts` to use `SourceFileBuilder` + `templates`

**Files:**
- Modify: `src/generators/node/app.ts`

All 6 existing `app.test.ts` assertions must still pass.

- [ ] **Step 1: Run existing tests to establish baseline**

```bash
npx vitest run src/generators/node/app.test.ts
```

Expected: 6 tests pass

- [ ] **Step 2: Refactor `app.ts`**

Replace the contents of `src/generators/node/app.ts`:

```ts
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { SourceFileBuilder } from '../../utils/sourceFileBuilder.js';
import { routerMount } from '../../utils/templates.js';

export async function generateApp(outputDir: string, options: GeneratorOptions): Promise<void> {
  const hasPanel = options.appExtensions.includes('custom-panel');
  const hasModal = options.appExtensions.includes('custom-modal');

  const mounts = [
    routerMount('/oauth', 'oauthRouter'),
    ...(options.webhooks ? [routerMount('/webhooks', 'webhooksRouter')] : []),
    ...(hasPanel ? [routerMount('/extensions/panel', 'panelRouter')] : []),
    ...(hasModal ? [routerMount('/extensions/modal', 'modalRouter')] : []),
  ].join('\n');

  const content = new SourceFileBuilder()
    .importDefault('express', 'express')
    .importDefault('./oauth/index.js', 'oauthRouter')
    .importDefaultIf(options.webhooks, './webhooks/index.js', 'webhooksRouter')
    .importDefaultIf(hasPanel, './app-extensions/panel/index.js', 'panelRouter')
    .importDefaultIf(hasModal, './app-extensions/modal/index.js', 'modalRouter')
    .addBlock(`const app = express();\n\n${mounts}`)
    .exportDefault('app')
    .build();

  await writeFile(join(outputDir, 'src/app.ts'), content);
}
```

- [ ] **Step 3: Run tests and confirm they still pass**

```bash
npx vitest run src/generators/node/app.test.ts
```

Expected: 6 tests pass (same as before)

- [ ] **Step 4: Commit**

```bash
git add src/generators/node/app.ts
git commit -m "AINATIVEM-44 refactor app generator to use SourceFileBuilder"
```

---

## Task 6: `projectBuilder.ts`

**Files:**
- Create: `src/generators/node/projectBuilder.ts`
- Create: `src/generators/node/projectBuilder.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/generators/node/projectBuilder.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { GeneratorOptions } from '../interface.js';
import { NodeProjectBuilder } from './projectBuilder.js';
import type { BuildStep } from './projectBuilder.js';

const options: GeneratorOptions = {
  projectName: 'test-app',
  database: 'postgres',
  webhooks: false,
  appExtensions: [],
};

function spyStep(tracker: string[], label: string): BuildStep {
  return { execute: async () => { tracker.push(label); } };
}

describe('NodeProjectBuilder', () => {
  it('when(true) executes the added step', async () => {
    const executed: string[] = [];
    await new NodeProjectBuilder('/tmp', options)
      .when(true, b => b.addStep(spyStep(executed, 'webhooks')))
      .build();
    expect(executed).toContain('webhooks');
  });

  it('when(false) skips the step', async () => {
    const executed: string[] = [];
    await new NodeProjectBuilder('/tmp', options)
      .when(false, b => b.addStep(spyStep(executed, 'webhooks')))
      .build();
    expect(executed).toHaveLength(0);
  });

  it('executes steps in insertion order', async () => {
    const order: string[] = [];
    await new NodeProjectBuilder('/tmp', options)
      .addStep(spyStep(order, 'first'))
      .addStep(spyStep(order, 'second'))
      .addStep(spyStep(order, 'third'))
      .build();
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('addOAuth returns the builder instance for chaining', () => {
    const builder = new NodeProjectBuilder('/tmp', options);
    expect(builder.addStep(spyStep([], 'x'))).toBe(builder);
    expect(builder.when(false, () => {})).toBe(builder);
  });
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npx vitest run src/generators/node/projectBuilder.test.ts
```

Expected: all tests fail with `Cannot find module './projectBuilder.js'`

- [ ] **Step 3: Implement `projectBuilder.ts`**

Create `src/generators/node/projectBuilder.ts`:

```ts
import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { generateApp } from './app.js';
import { generateAppExtensions } from './appExtensions.js';
import { generateDatabase } from './database.js';
import { generateOauth } from './oauth.js';
import { generatePipedriveClient } from './pipedriveClient.js';
import { generateWebhooks } from './webhooks.js';
import { envVarAccess } from '../../utils/templates.js';

export interface BuildStep {
  execute(outputDir: string, options: GeneratorOptions): Promise<void>;
}

class OAuthStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generateOauth(outputDir, options);
  }
}

class DatabaseStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generateDatabase(outputDir, options);
  }
}

class AppStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generateApp(outputDir, options);
  }
}

class WebhooksStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generateWebhooks(outputDir, options);
  }
}

class AppExtensionsStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generateAppExtensions(outputDir, options);
  }
}

class PipedriveClientStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await generatePipedriveClient(outputDir, options);
  }
}

class ServerEntryStep implements BuildStep {
  async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
    await writeFile(
      join(outputDir, 'src/index.ts'),
      dedent`
        import app from './app.js';

        const PORT = ${envVarAccess('PORT', '3000')};
        app.listen(PORT, () => {
          console.log(\`Server running on port \${PORT}\`);
        });
      `,
    );
  }
}

class PackageJsonStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
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
        pipedrive: '^21.0.0',
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
}

class TsConfigStep implements BuildStep {
  async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
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
}

class EnvExampleStep implements BuildStep {
  async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
    await writeFile(
      join(outputDir, '.env.example'),
      dedent`
        PIPEDRIVE_CLIENT_ID=
        PIPEDRIVE_CLIENT_SECRET=
        PIPEDRIVE_REDIRECT_URI=http://localhost:3000/oauth/callback
        DATABASE_URL=
        PORT=3000
      `,
    );
  }
}

class PostgresDockerStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await writeFile(
      join(outputDir, 'docker-compose.yml'),
      dedent`
        services:
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
      `,
    );
  }
}

class MySQLDockerStep implements BuildStep {
  async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
    await writeFile(
      join(outputDir, 'docker-compose.yml'),
      dedent`
        services:
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
      `,
    );
  }
}

export class NodeProjectBuilder {
  private steps: BuildStep[] = [];

  constructor(
    private outputDir: string,
    private options: GeneratorOptions,
  ) {}

  addStep(step: BuildStep): this {
    this.steps.push(step);
    return this;
  }

  addOAuth(): this          { return this.addStep(new OAuthStep()); }
  addDatabase(): this       { return this.addStep(new DatabaseStep()); }
  addApp(): this            { return this.addStep(new AppStep()); }
  addWebhooks(): this       { return this.addStep(new WebhooksStep()); }
  addPostgres(): this       { return this.addStep(new PostgresDockerStep()); }
  addMySQL(): this          { return this.addStep(new MySQLDockerStep()); }
  addAppExtensions(): this  { return this.addStep(new AppExtensionsStep()); }
  addPipedriveClient(): this { return this.addStep(new PipedriveClientStep()); }
  addServerEntry(): this    { return this.addStep(new ServerEntryStep()); }
  addPackageJson(): this    { return this.addStep(new PackageJsonStep()); }
  addTsConfig(): this       { return this.addStep(new TsConfigStep()); }
  addEnvExample(): this     { return this.addStep(new EnvExampleStep()); }

  when(condition: boolean, fn: (b: this) => void): this {
    if (condition) fn(this);
    return this;
  }

  async build(): Promise<void> {
    for (const step of this.steps) {
      await step.execute(this.outputDir, this.options);
    }
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npx vitest run src/generators/node/projectBuilder.test.ts
```

Expected: all 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/generators/node/projectBuilder.ts src/generators/node/projectBuilder.test.ts
git commit -m "AINATIVEM-44 add NodeProjectBuilder with BuildStep pattern"
```

---

## Task 7: Refactor `index.ts` + update integration test

**Files:**
- Modify: `src/generators/node/index.ts`
- Modify: `src/generators/node/index.test.ts`

- [ ] **Step 1: Run existing integration tests to establish baseline**

```bash
npx vitest run src/generators/node/index.test.ts
```

Expected: 2 tests pass (the `tsc --noEmit` test is skipped here — it runs separately)

- [ ] **Step 2: Update `index.test.ts` to expect `src/pipedrive/client.ts`**

In `src/generators/node/index.test.ts`, add `'src/pipedrive/client.ts'` to the `expectedFiles` array:

```ts
const expectedFiles = [
  'src/index.ts',
  'src/app.ts',
  'src/oauth/index.ts',
  'src/database/index.ts',
  'src/webhooks/index.ts',
  'src/app-extensions/panel/index.ts',
  'src/app-extensions/modal/index.ts',
  'src/pipedrive/client.ts',     // ← add this line
  'package.json',
  'tsconfig.json',
  '.env.example',
  'docker-compose.yml',
];
```

- [ ] **Step 3: Run tests to confirm the new assertion fails**

```bash
npx vitest run src/generators/node/index.test.ts
```

Expected: `generates all expected files for full options` fails with `Missing: src/pipedrive/client.ts`

- [ ] **Step 4: Replace `index.ts` with `NodeProjectBuilder` chain**

Replace the entire contents of `src/generators/node/index.ts`:

```ts
import type { Generator, GeneratorOptions } from '../interface.js';
import { NodeProjectBuilder } from './projectBuilder.js';

export const nodeGenerator: Generator = {
  async generate(outputDir: string, options: GeneratorOptions): Promise<void> {
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
  },
};
```

- [ ] **Step 5: Run all tests and confirm they pass**

```bash
npx vitest run
```

Expected: all tests pass across all test files. Output similar to:

```
✓ src/utils/sourceFileBuilder.test.ts (11)
✓ src/utils/templates.test.ts (4)
✓ src/utils/writeFile.test.ts
✓ src/generators/node/oauth.test.ts (2)
✓ src/generators/node/database.test.ts (2)
✓ src/generators/node/app.test.ts (6)
✓ src/generators/node/webhooks.test.ts
✓ src/generators/node/appExtensions.test.ts
✓ src/generators/node/pipedriveClient.test.ts (5)
✓ src/generators/node/projectBuilder.test.ts (4)
✓ src/generators/node/index.test.ts (2)
✓ src/prompts/...
```

- [ ] **Step 6: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add src/generators/node/index.ts src/generators/node/index.test.ts
git commit -m "AINATIVEM-44 refactor index to use NodeProjectBuilder"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `SourceFileBuilder` with import deduplication, `addBlockIf`, `exportDefault` | Task 1 |
| `templates.ts` — `expressRouterFile`, `routerMount`, `envVarAccess` | Task 2 |
| `generatePipedriveClient` → `src/pipedrive/client.ts` | Task 3 |
| `pipedrive` added to generated `package.json` | Task 6 (`PackageJsonStep`) |
| `getClient(companyId)` with proactive expiry check | Task 3 |
| `getStoredToken` / `refreshStoredToken` placeholders | Task 3 |
| `BuildStep` interface + all step classes | Task 6 |
| `NodeProjectBuilder` with named `.add*()` methods | Task 6 |
| `when(condition, fn)` combinator | Task 6 |
| `app.ts` refactored to use `SourceFileBuilder` | Task 5 |
| `oauth.ts` refactored to use `templates` | Task 4 |
| `index.ts` replaced with builder chain | Task 7 |
| `exportDefault` guard throws if called twice | Task 1 |
| All existing tests continue to pass | Tasks 4, 5, 7 |

**Placeholder scan:** No TBDs or incomplete steps. All code blocks are complete.

**Type consistency:**
- `BuildStep` exported from `projectBuilder.ts`, used in `projectBuilder.test.ts` ✓
- `generatePipedriveClient` matches import in `projectBuilder.ts` ✓
- `envVarAccess` from `templates.ts` used in `ServerEntryStep` ✓
- `addStep(step: BuildStep)` exposed on builder, used in tests ✓
