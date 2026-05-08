import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-webhooks-test');

afterEach(async () => {
  await remove(tmpDir);
});

describe('generateWebhooks', () => {
  it('creates src/webhooks/index.ts', async () => {
    const { generateWebhooks } = await import('./webhooks.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: true,
      appExtensions: [],
    };
    await generateWebhooks(tmpDir, options);
    expect(await pathExists(join(tmpDir, 'src/webhooks/index.ts'))).toBe(true);
  });

  it('exports a default Express Router', async () => {
    const { generateWebhooks } = await import('./webhooks.js');
    const options: GeneratorOptions = {
      projectName: 'test-app',
      database: 'postgres',
      webhooks: true,
      appExtensions: [],
    };
    await generateWebhooks(tmpDir, options);
    const content = await readFile(join(tmpDir, 'src/webhooks/index.ts'), 'utf-8');
    expect(content).toContain("from 'express'");
    expect(content).toContain('Router()');
    expect(content).toContain('export default');
  });
});
