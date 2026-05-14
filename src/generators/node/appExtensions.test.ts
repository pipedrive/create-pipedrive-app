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
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'))).toBe(false);

		const router = await readFile(join(tmpDir, 'src/app-extensions/panel/index.ts'), 'utf-8');
		expect(router).toContain("router.get('*'");
		expect(router).not.toContain('dist/panel');
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
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'))).toBe(false);

		const router = await readFile(join(tmpDir, 'src/app-extensions/modal/index.ts'), 'utf-8');
		expect(router).not.toContain('dist/modal');
	});

	it('creates both routers and shared frontend when both types are selected', async () => {
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
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/tsconfig.json'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/index.html'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/main.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/shared/pipedriveSdk.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/shared/styles.css'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/config.ts'))).toBe(false);

		const viteConfig = await readFile(join(tmpDir, 'frontend/app-extension-ui/vite.config.ts'), 'utf-8');
		expect(viteConfig).toContain("base: '/extensions/'");
		expect(viteConfig).not.toContain("appType: 'mpa'");
		expect(viteConfig).not.toContain('trailingSlashRedirect');

		const panelApp = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'), 'utf-8');
		expect(panelApp).toContain("import { Command, Modal } from '@pipedrive/app-extensions-sdk'");
		expect(panelApp).toContain('OPEN_MODAL');

		const modalApp = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'), 'utf-8');
		expect(modalApp).toContain('CLOSE_MODAL');

		const mainTsx = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/main.tsx'), 'utf-8');
		expect(mainTsx).toContain('Panel');
		expect(mainTsx).toContain('Modal');
		expect(mainTsx).toContain('BrowserRouter');
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

		const sdkWrapper = await readFile(join(tmpDir, 'frontend/app-extension-ui/shared/pipedriveSdk.ts'), 'utf-8');
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

		const app = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'), 'utf-8');
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

		const app = await readFile(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'), 'utf-8');
		expect(app).not.toContain('@pipedrive/app-extensions-sdk');
		expect(app).not.toContain('OPEN_MODAL');
		expect(app).not.toContain('CLOSE_MODAL');
		expect(app).not.toContain('Open modal');
		expect(app).not.toContain('Close modal');
	});

	it('vite config has no mpa mode and tsconfig includes src and shared', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-panel'],
		};
		await generateAppExtensions(tmpDir, options);

		const viteConfig = await readFile(join(tmpDir, 'frontend/app-extension-ui/vite.config.ts'), 'utf-8');
		expect(viteConfig).not.toContain("appType: 'mpa'");

		const tsconfig = JSON.parse(await readFile(join(tmpDir, 'frontend/app-extension-ui/tsconfig.json'), 'utf-8'));
		expect(tsconfig.include).toContain('src');
		expect(tsconfig.include).not.toContain('panel/src');
		expect(tsconfig.include).not.toContain('modal/src');
		expect(tsconfig.include).toContain('shared');
	});

	it('generates puco-react design tokens in styles', async () => {
		const { generateAppExtensions } = await import('./appExtensions.js');
		const options: GeneratorOptions = {
			projectName: 'test-app',
			database: 'postgres',
			webhooks: false,
			appExtensions: ['custom-panel'],
		};
		await generateAppExtensions(tmpDir, options);

		const styles = await readFile(join(tmpDir, 'frontend/app-extension-ui/shared/styles.css'), 'utf-8');
		expect(styles).toContain('#6861f2');
		expect(styles).toContain('#192435');
		expect(styles).toContain('#f4f5f6');
		expect(styles).toContain("[data-theme='dark']");
		expect(styles).toContain('.secondary');
		expect(styles).toContain('.ghost');
		expect(styles).toContain('.danger');
		expect(styles).toContain('.status--ready');
	});
});
