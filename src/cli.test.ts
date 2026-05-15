import { describe, expect, it, afterEach } from 'vitest';
import { pathToFileURL } from 'node:url';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isCliEntrypoint, nextStepLines } from './cli.js';

describe('nextStepLines', () => {
	it('outputs the four next steps', () => {
		expect(nextStepLines({ nameOrPath: 'test-app' }).join('\n')).toBe(`
Next steps:
  cd test-app
  cp .env.example .env
  # fill in PIPEDRIVE_CLIENT_ID and PIPEDRIVE_CLIENT_SECRET
  docker-compose up --watch`);
	});
});

describe('isCliEntrypoint', () => {
	it('treats npm bin symlinks as the CLI entrypoint', () => {
		const realCliPath = '/package/dist/cli.js';
		const binSymlinkPath = '/npm-cache/.bin/create-pipedrive-app';
		const importMetaUrl = pathToFileURL(realCliPath).href;

		expect(
			isCliEntrypoint(importMetaUrl, binSymlinkPath, (path) => (path === binSymlinkPath ? realCliPath : path)),
		).toBe(true);
	});

	it('does not treat unrelated files as the CLI entrypoint', () => {
		const importMetaUrl = pathToFileURL('/package/dist/cli.js').href;

		expect(isCliEntrypoint(importMetaUrl, '/other/tool.js', (path) => path)).toBe(false);
	});
});

const dispatchTmpDir = join(tmpdir(), 'cpa-dispatch-test');
const dispatchExists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);

afterEach(async () => {
	await rm(dispatchTmpDir, { recursive: true, force: true });
});

describe('dispatchSubcommand', () => {
	it('returns false for unknown subcommand', async () => {
		const { dispatchSubcommand } = await import('./cli.js');
		expect(await dispatchSubcommand(['node', 'cli.js', 'unknown'])).toBe(false);
	});

	it('returns true and runs add-app-extension for matching subcommand', async () => {
		const { dispatchSubcommand } = await import('./cli.js');
		await mkdir(dispatchTmpDir, { recursive: true });
		await writeFile(join(dispatchTmpDir, 'package.json'), '{}');

		const result = await dispatchSubcommand([
			'node',
			'cli.js',
			'add-app-extension',
			'--output-dir',
			dispatchTmpDir,
			'--app-extensions',
			'custom-panel',
		]);

		expect(result).toBe(true);
		expect(await dispatchExists(join(dispatchTmpDir, 'src/app-extensions/panel/index.ts'))).toBe(true);
	});
});

describe('parseFlags', () => {
	it('returns empty partial when no flags are present', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js'])).toEqual({});
	});

	it('parses --project-name', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--project-name', 'my-app'])).toMatchObject({ nameOrPath: 'my-app' });
	});

	it('parses --database postgres', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--database', 'postgres'])).toMatchObject({ database: 'postgres' });
	});

	it('parses --database mysql', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--database', 'mysql'])).toMatchObject({ database: 'mysql' });
	});

	it('parses --database sqlite', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--database', 'sqlite'])).toMatchObject({ database: 'sqlite' });
	});

	it('throws on invalid --database', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(() => parseFlags(['node', 'cli.js', '--database', 'oracle'])).toThrow(
			'Invalid database "oracle". Choose one of: postgres, mysql, sqlite.',
		);
	});

	it('parses --app-extensions none as empty array', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--app-extensions', 'none'])).toMatchObject({ appExtensions: [] });
	});

	it('throws when --app-extensions combines none with extension types', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(() => parseFlags(['node', 'cli.js', '--app-extensions', 'none,custom-panel'])).toThrow(
			'"none" cannot be combined with other extension types.',
		);
	});

	it('parses --app-extensions custom-panel', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--app-extensions', 'custom-panel'])).toMatchObject({
			appExtensions: ['custom-panel'],
		});
	});

	it('parses --app-extensions custom-panel,custom-modal', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(parseFlags(['node', 'cli.js', '--app-extensions', 'custom-panel,custom-modal'])).toMatchObject({
			appExtensions: ['custom-panel', 'custom-modal'],
		});
	});

	it('throws on invalid --app-extensions value', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(() => parseFlags(['node', 'cli.js', '--app-extensions', 'custom-widget'])).toThrow(
			'Invalid app extension type "custom-widget". Choose from: custom-panel, custom-modal.',
		);
	});

	it('throws on --project-name with empty value', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(() => parseFlags(['node', 'cli.js', '--project-name', '   '])).toThrow(
			'--project-name cannot be empty.',
		);
	});

	it('parses all three flags together', async () => {
		const { parseFlags } = await import('./cli.js');
		expect(
			parseFlags([
				'node',
				'cli.js',
				'--project-name',
				'my-app',
				'--database',
				'sqlite',
				'--app-extensions',
				'none',
			]),
		).toEqual({ nameOrPath: 'my-app', database: 'sqlite', appExtensions: [] });
	});
});
