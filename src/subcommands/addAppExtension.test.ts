import { afterEach, describe, expect, it } from 'vitest';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const tmpDir = join(tmpdir(), 'cpa-add-appext-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

describe('addAppExtension', () => {
	it('generates panel files when custom-panel is passed', async () => {
		const { addAppExtension } = await import('./addAppExtension.js');
		await mkdir(tmpDir, { recursive: true });
		await writeFile(join(tmpDir, 'package.json'), '{}');

		await addAppExtension(tmpDir, ['custom-panel']);

		expect(await exists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(false);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'))).toBe(false);
	});

	it('generates modal files when custom-modal is passed', async () => {
		const { addAppExtension } = await import('./addAppExtension.js');
		await mkdir(tmpDir, { recursive: true });
		await writeFile(join(tmpDir, 'package.json'), '{}');

		await addAppExtension(tmpDir, ['custom-modal']);

		expect(await exists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
		expect(await exists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(false);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Modal.tsx'))).toBe(true);
		expect(await exists(join(tmpDir, 'frontend/app-extension-ui/src/Panel.tsx'))).toBe(false);
	});

	it('throws when no package.json is present', async () => {
		const { addAppExtension } = await import('./addAppExtension.js');
		await mkdir(tmpDir, { recursive: true });

		await expect(addAppExtension(tmpDir, ['custom-panel'])).rejects.toThrow('No package.json found');
	});
});
