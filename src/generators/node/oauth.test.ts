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
		expect(content).toContain('timingSafeEqual');
		expect(content).toContain('CLIENT_SECRET');
	});
});

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
