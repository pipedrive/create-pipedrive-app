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
