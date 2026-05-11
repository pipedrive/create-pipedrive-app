import { afterEach, describe, expect, it } from 'vitest';
import { access, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { nodeGenerator } from './index.js';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-e2e-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
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
			'src/pipedrive/client.ts',
			'package.json',
			'tsconfig.json',
			'.env.example',
			'docker-compose.yml',
		];

		for (const file of expectedFiles) {
			expect(await exists(join(tmpDir, file)), `Missing: ${file}`).toBe(true);
		}
	});

	it('omits conditional files for minimal options', async () => {
		await nodeGenerator.generate(tmpDir, minimalOptions);

		expect(await exists(join(tmpDir, 'src/webhooks/index.ts'))).toBe(false);
		expect(await exists(join(tmpDir, 'src/app-extensions'))).toBe(false);
		expect(await exists(join(tmpDir, 'docker-compose.yml'))).toBe(false);
	});

	it('generated project passes tsc --noEmit', async () => {
		await nodeGenerator.generate(tmpDir, fullOptions);
		execSync('npm install', { cwd: tmpDir, stdio: 'pipe' });
		expect(() => {
			execSync('npx tsc --noEmit', { cwd: tmpDir, stdio: 'pipe' });
		}).not.toThrow();
	}, 60_000);
});
