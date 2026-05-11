import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-database-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);
const options: GeneratorOptions = {
	projectName: 'test-app',
	database: 'postgres',
	webhooks: false,
	appExtensions: [],
};

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

describe('generateDatabase', () => {
	it('creates src/database/index.ts', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, options);
		expect(await exists(join(tmpDir, 'src/database/index.ts'))).toBe(true);
	});

	it('file is valid TypeScript (exports something)', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/database/index.ts'), 'utf-8');
		expect(content).toContain('export');
	});
});
