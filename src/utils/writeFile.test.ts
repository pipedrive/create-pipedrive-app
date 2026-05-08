import { afterEach, describe, expect, it } from 'vitest';
import { pathExists, readFile, remove } from 'fs-extra';
import { join } from 'path';
import { tmpdir } from 'os';

const tmpDir = join(tmpdir(), 'cpa-writefile-test');

afterEach(async () => {
  await remove(tmpDir);
});

describe('writeFile', () => {
  it('creates file and all parent directories', async () => {
    const { writeFile } = await import('./writeFile.js');
    const filePath = join(tmpDir, 'nested/dir/file.ts');
    await writeFile(filePath, 'export const x = 1;');
    expect(await pathExists(filePath)).toBe(true);
  });

  it('formats TypeScript content with prettier', async () => {
    const { writeFile } = await import('./writeFile.js');
    const filePath = join(tmpDir, 'test.ts');
    await writeFile(filePath, 'export const x=1');
    const content = await readFile(filePath, 'utf-8');
    expect(content).toContain('export const x = 1;');
  });

  it('writes content unformatted when prettier has no parser for the extension', async () => {
    const { writeFile } = await import('./writeFile.js');
    const filePath = join(tmpDir, '.env.example');
    const raw = 'KEY=value\nOTHER=123';
    await writeFile(filePath, raw);
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(raw);
  });
});
