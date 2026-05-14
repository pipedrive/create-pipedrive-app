import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import { isCliEntrypoint, nextStepLines } from './cli.js';

describe('nextStepLines', () => {
	it('prints backend-only next steps for apps without App Extensions', () => {
		expect(nextStepLines({ nameOrPath: 'test-app', database: 'sqlite', installDeps: false, hasAppExtensions: false }).join('\n')).toBe(`
Next steps:
  cd test-app
  cp .env.example .env
  npm install
  npm run dev`);
	});

	it('prints the Compose Watch command when App Extensions are selected', () => {
		expect(nextStepLines({ nameOrPath: 'test-app', database: 'postgres', installDeps: true, hasAppExtensions: true }).join('\n')).toBe(`
Next steps:
  cd test-app
  cp .env.example .env
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
