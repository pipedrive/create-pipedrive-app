import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-appext-test');

afterEach(async () => {
  await remove(tmpDir);
});

describe('generateAppExtensions', () => {
  it('creates panel stub when custom-panel is selected', async () => {
    const { generateAppExtensions } = await import('./appExtensions.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-panel'],
    };
    await generateAppExtensions(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(false);
  });

  it('creates modal stub when custom-modal is selected', async () => {
    const { generateAppExtensions } = await import('./appExtensions.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-modal'],
    };
    await generateAppExtensions(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(false);
  });

  it('creates both stubs when both types are selected', async () => {
    const { generateAppExtensions } = await import('./appExtensions.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: false,
      appExtensions: ['custom-panel', 'custom-modal'],
    };
    await generateAppExtensions(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
    expect(await pathExists(join(tmpDir, 'src/app-extensions/modal/index.ts'))).toBe(true);
  });
});
