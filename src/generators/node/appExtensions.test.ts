import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-appext-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

describe('generateAppExtensions', () => {
	it('creates panel router and frontend when custom-panel is selected', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-panel'],
		};
		await generateAppExtensions(tmpDir, options);
		expect(await exists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(false);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/App.tsx'))).toBe(true);

		const router = await readFile(join(tmpDir, 'src/app-extensions/panel/index.ts'), 'utf-8');
		expect(router).toContain('express.static(uiDistPath)');
		expect(router).toContain("router.get('*'");
	});

	it('creates modal router and frontend when custom-modal is selected', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-modal'],
		};
		await generateAppExtensions(tmpDir, options);
		expect(await exists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(false);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/App.tsx'))).toBe(true);
	});

	it('creates both routers and a single shared frontend when both types are selected', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-panel', 'custom-modal'],
		};
		await generateAppExtensions(tmpDir, options);
		expect(await exists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/vite.config.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/index.html'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/tsconfig.json'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/config.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/main.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/App.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/pipedriveSdk.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/styles.css'))).toBe(true);

		const viteConfig = await readFile(join(tmpDir, 'frontend/app-extension-ui/vite.config.ts'), 'utf-8');
		expect(viteConfig).toContain("base: '/extensions/'");
		expect(viteConfig).not.toContain('customLogger');
		expect(viteConfig).toContain('postcss: {}');

		const app = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/App.tsx'), 'utf-8');
		expect(app).toContain("import { Command, Modal } from '@pipedrive/app-extensions-sdk'");
		expect(app).toContain('OPEN_MODAL');
		expect(app).toContain('CLOSE_MODAL');
	});

	it('does not generate frontend files when no App Extensions are selected', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: [],
		};
		await generateAppExtensions(tmpDir, options);
		expect(await exists(join(tmpDir, 'src/app-extensions'))).toBe(false);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui'))).toBe(false);
	});

	it('generates frontend code that initializes the App Extensions SDK', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-panel'],
		};
		await generateAppExtensions(tmpDir, options);

		const sdkWrapper = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/pipedriveSdk.ts'), 'utf-8');
		expect(sdkWrapper).toContain('@pipedrive/app-extensions-sdk');
		expect(sdkWrapper).toContain('new AppExtensionsSDK');
		expect(sdkWrapper).toContain('if (!context.identifier)');
		expect(sdkWrapper).toContain('Local preview');
		expect(sdkWrapper).toContain('Open this URL from Pipedrive to use SDK actions');
		expect(sdkWrapper).toContain('Event.USER_SETTINGS_CHANGE');
		expect(sdkWrapper).toContain('Event.VISIBILITY');
		expect(sdkWrapper).toContain('Event.PAGE_VISIBILITY_STATE');
	});

	it('omits modal-opening actions from modal-only output', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-modal'],
		};
		await generateAppExtensions(tmpDir, options);

		const app = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/App.tsx'), 'utf-8');
		expect(app).toContain("import { Command } from '@pipedrive/app-extensions-sdk'");
		expect(app).not.toContain('Modal } from');
		expect(app).not.toContain('OPEN_MODAL');
		expect(app).not.toContain('Open modal');
		expect(app).toContain('CLOSE_MODAL');
	});

	it('omits modal close/open actions from panel-only output', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-panel'],
		};
		await generateAppExtensions(tmpDir, options);

		const app = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/App.tsx'), 'utf-8');
		expect(app).not.toContain('@pipedrive/app-extensions-sdk');
		expect(app).not.toContain('OPEN_MODAL');
		expect(app).not.toContain('CLOSE_MODAL');
		expect(app).not.toContain('Open modal');
		expect(app).not.toContain('Close modal');
	});
});
