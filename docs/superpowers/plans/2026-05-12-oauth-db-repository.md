# OAuth + Token Repository Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the generated scaffold produce working OAuth routes and a Drizzle-backed token repository, replacing the empty router and TODO stubs in the current output.

**Architecture:** Four generator-side changes — `database.ts` gains `generateTokenRepository()`, `oauth.ts` expands to generate a full Express router plus an HMAC state module, and `pipedriveClient.ts` is updated to import from the new repository. All changes are TDD: tests are written and confirmed failing before each implementation step.

**Tech Stack:** TypeScript, Vitest, dedent, Drizzle ORM (postgres-js / mysql2 / better-sqlite3), Pipedrive Node SDK v32, Node.js built-in `crypto`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/generators/node/database.ts` | Add `generateTokenRepository()`, call it from `generateDatabase()` |
| Modify | `src/generators/node/database.test.ts` | Tests for generated `tokenRepository.ts` |
| Modify | `src/generators/node/oauth.ts` | Generate `src/oauth/state.ts` + full `src/oauth/index.ts` |
| Modify | `src/generators/node/oauth.test.ts` | Tests for generated state module + route handlers |
| Modify | `src/generators/node/pipedriveClient.ts` | Update template: import tokenRepository, remove TODO stubs |
| Modify | `src/generators/node/pipedriveClient.test.ts` | Replace TODO-stub test, add tokenRepository import test |

---

## Task 1: Token Repository Generator

**Files:**
- Modify: `src/generators/node/database.ts`
- Modify: `src/generators/node/database.test.ts`

- [ ] **Step 1.1: Write failing tests**

Append this `describe` block to `src/generators/node/database.test.ts` (after the last existing `describe`):

```ts
describe('generateDatabase — tokenRepository.ts', () => {
	it('generates src/database/tokenRepository.ts', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'src/database/tokenRepository.ts'))).toBe(true);
	});

	it('exports getToken, getTokenByCompany, upsertToken', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('export async function getToken');
		expect(content).toContain('export async function getTokenByCompany');
		expect(content).toContain('export async function upsertToken');
	});

	it('exports StoredToken type', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('StoredToken');
	});

	it('imports TokenResponse from pipedrive/v2', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain("from 'pipedrive/v2'");
	});

	it('postgres uses onConflictDoUpdate', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('onConflictDoUpdate');
	});

	it('mysql uses onDuplicateKeyUpdate', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('onDuplicateKeyUpdate');
	});

	it('sqlite uses onConflictDoUpdate', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('onConflictDoUpdate');
	});
});
```

- [ ] **Step 1.2: Run tests — confirm they fail**

```bash
npx vitest run src/generators/node/database.test.ts
```

Expected: the new 7 tests fail with "expected false to be true" (file doesn't exist yet).

- [ ] **Step 1.3: Implement `generateTokenRepository` in `database.ts`**

Add these two functions to `src/generators/node/database.ts` (insert before `generateDockerCompose`):

```ts
async function generateTokenRepository(outputDir: string, options: GeneratorOptions): Promise<void> {
	await writeFile(join(outputDir, 'src/database/tokenRepository.ts'), tokenRepositoryContent(options.database));
}

function tokenRepositoryContent(database: GeneratorOptions['database']): string {
	if (database === 'mysql') {
		return dedent`
			import { and, desc, eq } from 'drizzle-orm';
			import type { TokenResponse } from 'pipedrive/v2';
			import { db } from './index.js';
			import { pipedriveTokens } from './schema.js';

			const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

			export type StoredToken = { companyId: number; userId: number; token: TokenResponse };

			function toTokenResponse(row: typeof pipedriveTokens.$inferSelect): TokenResponse {
				return {
					access_token: row.accessToken,
					refresh_token: row.refreshToken,
					token_type: row.tokenType,
					expires_in: Math.max(0, Math.floor((row.accessTokenExpiresAt.getTime() - Date.now()) / 1000)),
					scope: row.scope ?? '',
					api_domain: row.apiDomain,
				};
			}

			export async function getToken(companyId: number, userId: number): Promise<StoredToken | null> {
				const rows = await db
					.select()
					.from(pipedriveTokens)
					.where(and(eq(pipedriveTokens.pipedriveCompanyId, companyId), eq(pipedriveTokens.pipedriveUserId, userId)))
					.limit(1);
				if (!rows[0]) return null;
				return { companyId, userId, token: toTokenResponse(rows[0]) };
			}

			export async function getTokenByCompany(companyId: number): Promise<StoredToken | null> {
				const rows = await db
					.select()
					.from(pipedriveTokens)
					.where(eq(pipedriveTokens.pipedriveCompanyId, companyId))
					.orderBy(desc(pipedriveTokens.updatedAt))
					.limit(1);
				if (!rows[0]) return null;
				return { companyId, userId: rows[0].pipedriveUserId, token: toTokenResponse(rows[0]) };
			}

			export async function upsertToken(companyId: number, userId: number, token: TokenResponse): Promise<void> {
				const now = new Date();
				const accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
				const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
				await db
					.insert(pipedriveTokens)
					.values({
						pipedriveCompanyId: companyId,
						pipedriveUserId: userId,
						accessToken: token.access_token,
						refreshToken: token.refresh_token,
						tokenType: token.token_type,
						accessTokenExpiresAt,
						refreshTokenExpiresAt,
						scope: token.scope,
						apiDomain: token.api_domain,
						createdAt: now,
						updatedAt: now,
					})
					.onDuplicateKeyUpdate({
						set: {
							accessToken: token.access_token,
							refreshToken: token.refresh_token,
							tokenType: token.token_type,
							accessTokenExpiresAt,
							refreshTokenExpiresAt,
							scope: token.scope,
							apiDomain: token.api_domain,
							updatedAt: now,
						},
					});
			}
		`;
	}

	return dedent`
		import { and, desc, eq } from 'drizzle-orm';
		import type { TokenResponse } from 'pipedrive/v2';
		import { db } from './index.js';
		import { pipedriveTokens } from './schema.js';

		const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

		export type StoredToken = { companyId: number; userId: number; token: TokenResponse };

		function toTokenResponse(row: typeof pipedriveTokens.$inferSelect): TokenResponse {
			return {
				access_token: row.accessToken,
				refresh_token: row.refreshToken,
				token_type: row.tokenType,
				expires_in: Math.max(0, Math.floor((row.accessTokenExpiresAt.getTime() - Date.now()) / 1000)),
				scope: row.scope ?? '',
				api_domain: row.apiDomain,
			};
		}

		export async function getToken(companyId: number, userId: number): Promise<StoredToken | null> {
			const rows = await db
				.select()
				.from(pipedriveTokens)
				.where(and(eq(pipedriveTokens.pipedriveCompanyId, companyId), eq(pipedriveTokens.pipedriveUserId, userId)))
				.limit(1);
			if (!rows[0]) return null;
			return { companyId, userId, token: toTokenResponse(rows[0]) };
		}

		export async function getTokenByCompany(companyId: number): Promise<StoredToken | null> {
			const rows = await db
				.select()
				.from(pipedriveTokens)
				.where(eq(pipedriveTokens.pipedriveCompanyId, companyId))
				.orderBy(desc(pipedriveTokens.updatedAt))
				.limit(1);
			if (!rows[0]) return null;
			return { companyId, userId: rows[0].pipedriveUserId, token: toTokenResponse(rows[0]) };
		}

		export async function upsertToken(companyId: number, userId: number, token: TokenResponse): Promise<void> {
			const now = new Date();
			const accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
			const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
			await db
				.insert(pipedriveTokens)
				.values({
					pipedriveCompanyId: companyId,
					pipedriveUserId: userId,
					accessToken: token.access_token,
					refreshToken: token.refresh_token,
					tokenType: token.token_type,
					accessTokenExpiresAt,
					refreshTokenExpiresAt,
					scope: token.scope,
					apiDomain: token.api_domain,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [pipedriveTokens.pipedriveCompanyId, pipedriveTokens.pipedriveUserId],
					set: {
						accessToken: token.access_token,
						refreshToken: token.refresh_token,
						tokenType: token.token_type,
						accessTokenExpiresAt,
						refreshTokenExpiresAt,
						scope: token.scope,
						apiDomain: token.api_domain,
						updatedAt: now,
					},
				});
		}
	`;
}
```

- [ ] **Step 1.4: Call `generateTokenRepository` from `generateDatabase`**

In `src/generators/node/database.ts`, add the call inside the `generateDatabase` function, after `generateDrizzleConfig`:

```ts
export async function generateDatabase(outputDir: string, options: GeneratorOptions): Promise<void> {
	await generateSchema(outputDir, options);
	await generateDbClient(outputDir, options);
	await generateMigrate(outputDir, options);
	await generateMigrationSql(outputDir, options);
	await generateDrizzleConfig(outputDir, options);
	await generateTokenRepository(outputDir, options);
	if (options.database === 'postgres' || options.database === 'mysql') {
		await generateDockerCompose(outputDir, options);
	}
}
```

- [ ] **Step 1.5: Run tests — confirm they pass**

```bash
npx vitest run src/generators/node/database.test.ts
```

Expected: all tests pass, including the 7 new ones.

- [ ] **Step 1.6: Commit**

```bash
git add src/generators/node/database.ts src/generators/node/database.test.ts
git commit -m "AINATIVEM-44 generate token repository with drizzle upsert per dialect"
```

---

## Task 2: OAuth State Generator

**Files:**
- Modify: `src/generators/node/oauth.ts`
- Modify: `src/generators/node/oauth.test.ts`

- [ ] **Step 2.1: Write failing tests**

Replace the contents of `src/generators/node/oauth.test.ts` with:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
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
	await rm(tmpDir, { recursive: true, force: true });
});

describe('generateOauth — src/oauth/index.ts', () => {
	it('creates src/oauth/index.ts', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		expect(
			await access(join(tmpDir, 'src/oauth/index.ts')).then(
				() => true,
				() => false,
			),
		).toBe(true);
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

describe('generateOauth — src/oauth/state.ts', () => {
	it('creates src/oauth/state.ts', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		expect(
			await access(join(tmpDir, 'src/oauth/state.ts')).then(
				() => true,
				() => false,
			),
		).toBe(true);
	});

	it('exports createState and verifyState', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/state.ts'), 'utf-8');
		expect(content).toContain('export function createState');
		expect(content).toContain('export function verifyState');
	});

	it('uses HMAC-SHA256 for state signing', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/state.ts'), 'utf-8');
		expect(content).toContain('createHmac');
		expect(content).toContain("'sha256'");
	});
});
```

- [ ] **Step 2.2: Run tests — confirm the state.ts tests fail**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: the 3 tests under `generateOauth — src/oauth/state.ts` fail. The `index.ts` tests still pass (they match the existing empty router).

- [ ] **Step 2.3: Implement `generateOauthState` in `oauth.ts`**

Replace the contents of `src/generators/node/oauth.ts` with:

```ts
import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateOauth(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await generateOauthState(outputDir);
	await generateOauthRouter(outputDir);
}

async function generateOauthState(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/oauth/state.ts'),
		dedent`
			import { createHmac, randomBytes } from 'node:crypto';

			const STATE_TTL_MS = 5 * 60 * 1000;

			function base64url(data: string): string {
				return Buffer.from(data).toString('base64url');
			}

			export function createState(): string {
				const payload = JSON.stringify({ nonce: randomBytes(16).toString('hex'), exp: Date.now() + STATE_TTL_MS });
				const encoded = base64url(payload);
				const sig = createHmac('sha256', process.env.PIPEDRIVE_CLIENT_SECRET ?? '').update(encoded).digest('base64url');
				return \`\${encoded}.\${sig}\`;
			}

			export function verifyState(state: string): boolean {
				const dot = state.lastIndexOf('.');
				if (dot === -1) return false;
				const encoded = state.slice(0, dot);
				const sig = state.slice(dot + 1);
				const expected = createHmac('sha256', process.env.PIPEDRIVE_CLIENT_SECRET ?? '').update(encoded).digest('base64url');
				if (sig !== expected) return false;
				try {
					const { exp } = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as { exp: number };
					return Date.now() < exp;
				} catch {
					return false;
				}
			}
		`,
	);
}

async function generateOauthRouter(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/oauth/index.ts'),
		`import { Router } from 'express';\n\nexport default Router();`,
	);
}
```

- [ ] **Step 2.4: Run tests — confirm they pass**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 2.5: Commit**

```bash
git add src/generators/node/oauth.ts src/generators/node/oauth.test.ts
git commit -m "AINATIVEM-44 generate oauth state module with hmac-signed state"
```

---

## Task 3: Full OAuth Routes Generator

**Files:**
- Modify: `src/generators/node/oauth.ts`
- Modify: `src/generators/node/oauth.test.ts`

- [ ] **Step 3.1: Add failing tests for route content**

Add this `describe` block to `src/generators/node/oauth.test.ts` (after the last existing `describe`):

```ts
describe('generateOauth — src/oauth/index.ts routes', () => {
	it('has /redirect route', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
		expect(content).toContain("'/redirect'");
	});

	it('has /callback route', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
		expect(content).toContain("'/callback'");
	});

	it('imports createState and verifyState from state.js', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
		expect(content).toContain("from './state.js'");
		expect(content).toContain('createState');
		expect(content).toContain('verifyState');
	});

	it('imports upsertToken from tokenRepository', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
		expect(content).toContain("from '../database/tokenRepository.js'");
		expect(content).toContain('upsertToken');
	});

	it('calls oauth2.authorize to exchange code', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
		expect(content).toContain('oauth2.authorize');
	});

	it('fetches /v1/users/me to resolve company and user ID', async () => {
		const { generateOauth } = await import('./oauth.js');
		await generateOauth(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/oauth/index.ts'), 'utf-8');
		expect(content).toContain('/v1/users/me');
		expect(content).toContain('company_id');
	});
});
```

- [ ] **Step 3.2: Run tests — confirm they fail**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: the 6 new route tests fail (the empty router doesn't have routes or those imports).

- [ ] **Step 3.3: Implement full router in `generateOauthRouter`**

Replace the `generateOauthRouter` function in `src/generators/node/oauth.ts`:

```ts
async function generateOauthRouter(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/oauth/index.ts'),
		dedent`
			import { Router } from 'express';
			import * as v2 from 'pipedrive/v2';
			import { upsertToken } from '../database/tokenRepository.js';
			import { createState, verifyState } from './state.js';

			const oauth2 = new v2.OAuth2Configuration({
				clientId: process.env.PIPEDRIVE_CLIENT_ID ?? '',
				clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET ?? '',
				redirectUri: process.env.PIPEDRIVE_REDIRECT_URI ?? '',
			});

			const router = Router();

			router.get('/redirect', (_req, res) => {
				const state = createState();
				res.redirect(\`\${oauth2.authorizationUrl}&state=\${encodeURIComponent(state)}\`);
			});

			router.get('/callback', async (req, res) => {
				const { code, state } = req.query as { code?: string; state?: string };

				if (!state || !verifyState(state)) {
					res.status(400).send('Invalid state parameter');
					return;
				}

				if (!code) {
					res.status(400).send('Missing authorization code');
					return;
				}

				try {
					const token = await oauth2.authorize(code);

					const response = await fetch(\`https://\${token.api_domain}/v1/users/me\`, {
						headers: { Authorization: \`Bearer \${token.access_token}\` },
					});
					const { data } = (await response.json()) as { data: { id: number; company_id: number } };

					await upsertToken(data.company_id, data.id, token);
					res.redirect('/');
				} catch (err) {
					const message = err instanceof Error ? err.message : 'OAuth error';
					res.status(500).send(message);
				}
			});

			export default router;
		`,
	);
}
```

- [ ] **Step 3.4: Run tests — confirm they pass**

```bash
npx vitest run src/generators/node/oauth.test.ts
```

Expected: all 12 tests pass.

- [ ] **Step 3.5: Commit**

```bash
git add src/generators/node/oauth.ts src/generators/node/oauth.test.ts
git commit -m "AINATIVEM-44 generate full oauth redirect and callback routes"
```

---

## Task 4: Wire Pipedrive Client to Token Repository

**Files:**
- Modify: `src/generators/node/pipedriveClient.ts`
- Modify: `src/generators/node/pipedriveClient.test.ts`

- [ ] **Step 4.1: Update tests**

In `src/generators/node/pipedriveClient.test.ts`, find the test named `'contains getStoredToken and saveToken placeholder functions'` inside the `describe('generatePipedriveClient', ...)` block and replace just that test (keep all other tests in the block) with these two tests:

```ts
	it('imports getTokenByCompany and upsertToken from tokenRepository', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain("from '../database/tokenRepository.js'");
		expect(content).toContain('getTokenByCompany');
		expect(content).toContain('upsertToken');
	});

	it('does not contain TODO stubs', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).not.toContain('TODO');
		expect(content).not.toContain('throw new Error');
	});
```

- [ ] **Step 4.2: Run tests — confirm they fail**

```bash
npx vitest run src/generators/node/pipedriveClient.test.ts
```

Expected: the two new tests fail (generated file still has TODO and no tokenRepository import). The old "placeholder functions" test is removed so it no longer runs.

- [ ] **Step 4.3: Replace template in `pipedriveClient.ts`**

Replace the entire contents of `src/generators/node/pipedriveClient.ts` with:

```ts
import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generatePipedriveClient(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await writeFile(
		join(outputDir, 'src/pipedrive/client.ts'),
		dedent`
			import * as v2 from 'pipedrive/v2';
			import * as v1 from 'pipedrive/v1';
			import { getTokenByCompany, upsertToken } from '../database/tokenRepository.js';

			const oauth2 = new v2.OAuth2Configuration({
				clientId: process.env.PIPEDRIVE_CLIENT_ID ?? '',
				clientSecret: process.env.PIPEDRIVE_CLIENT_SECRET ?? '',
				redirectUri: process.env.PIPEDRIVE_REDIRECT_URI ?? '',
			});

			export async function getClient(companyId: number) {
				const stored = await getTokenByCompany(companyId);
				oauth2.updateToken(stored?.token ?? null);
				// For multi-user access, accept userId as a second parameter and use getToken(companyId, userId).
				oauth2.onTokenUpdate = (token) => {
					if (stored) upsertToken(stored.companyId, stored.userId, token);
				};

				const accessToken = oauth2.getAccessToken;
				const basePath = oauth2.basePath;

				return {
					deals: new v2.DealsApi(new v2.Configuration({ accessToken, basePath })),
					persons: new v2.PersonsApi(new v2.Configuration({ accessToken, basePath })),
					organizations: new v2.OrganizationsApi(new v2.Configuration({ accessToken, basePath })),
					notes: new v1.NotesApi(new v1.Configuration({ accessToken, basePath })),
				};
			}
		`,
	);
}
```

- [ ] **Step 4.4: Run tests — confirm they pass**

```bash
npx vitest run src/generators/node/pipedriveClient.test.ts
```

Expected: all 6 tests pass (original 5, minus the removed placeholder test, plus 2 new ones).

- [ ] **Step 4.5: Run the full test suite**

```bash
npm test
```

Expected: all tests pass. If any pre-existing tests fail, investigate before committing.

- [ ] **Step 4.6: Commit**

```bash
git add src/generators/node/pipedriveClient.ts src/generators/node/pipedriveClient.test.ts
git commit -m "AINATIVEM-44 wire pipedrive client to token repository, remove todo stubs"
```
