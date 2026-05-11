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
