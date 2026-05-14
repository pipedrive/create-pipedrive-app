import { describe, expect, it } from 'vitest';
import { pathToFileURL } from 'node:url';
import { isCliEntrypoint, nextStepLines } from './cli.js';

describe('nextStepLines', () => {
	it('outputs the four next steps', () => {
		expect(nextStepLines({ nameOrPath: 'test-app' }).join('\n')).toBe(`
Next steps:
  cd test-app
  cp .env.example .env
  # fill in PIPEDRIVE_CLIENT_ID and PIPEDRIVE_CLIENT_SECRET
  docker-compose up`);
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
