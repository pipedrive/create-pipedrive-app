import { afterEach, describe, expect, it } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-app-test');

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
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
			appExtensions: [],
		});
		expect(content).toContain("from 'express'");
		expect(content).toContain("from './oauth/index.js'");
		expect(content).toContain('createAuthRedirect');
		expect(content).toContain("app.use('/oauth'");
	});

	it('has root route that redirects to oauth when not installed', async () => {
		const content = await getAppContent({
			projectName: 'test-app',
			database: 'postgres',
			appExtensions: [],
		});
		expect(content).toContain("app.get('/'");
		expect(content).toContain('createAuthRedirect()');
		expect(content).toContain('client.deals.getDeals()');
	});

	it('has global error handler', async () => {
		const content = await getAppContent({
			projectName: 'test-app',
			database: 'postgres',
			appExtensions: [],
		});
		expect(content).toContain('NextFunction');
		expect(content).toContain('res.status(500)');
	});

	it('includes panel import and mount when custom-panel is selected', async () => {
		const content = await getAppContent({
			projectName: 'test-app',
			database: 'postgres',
			appExtensions: ['custom-panel'],
		});
		expect(content).toContain("from './app-extensions/panel/index.js'");
		expect(content).toContain("import { join } from 'node:path';");
		expect(content).toContain("app.use('/extensions/assets', express.static(appExtensionAssetsPath));");
		expect(content).toContain("app.use('/extensions/panel'");
	});

	it('includes modal import and mount when custom-modal is selected', async () => {
		const content = await getAppContent({
			projectName: 'test-app',
			database: 'postgres',
			appExtensions: ['custom-modal'],
		});
		expect(content).toContain("from './app-extensions/modal/index.js'");
		expect(content).toContain("app.use('/extensions/modal'");
	});

	it('excludes extension imports when appExtensions is empty', async () => {
		const content = await getAppContent({
			projectName: 'test-app',
			database: 'sqlite',
			appExtensions: [],
		});
		expect(content).not.toContain('./app-extensions');
		expect(content).not.toContain('/extensions/assets');
	});
});
