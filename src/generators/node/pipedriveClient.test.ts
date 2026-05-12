import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-pipedrive-client-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);
const options: GeneratorOptions = {
	projectName: 'test-app',
	database: 'postgres',
	webhooks: false,
	appExtensions: [],
};

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

describe('generatePipedriveClient', () => {
	it('creates src/pipedrive/client.ts', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		expect(await exists(join(tmpDir, 'src/pipedrive/client.ts'))).toBe(true);
	});

	it('exports getClient', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain('export async function getClient');
	});

	it('imports v2 and v1 namespaces from pipedrive', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain("from 'pipedrive/v2'");
		expect(content).toContain("from 'pipedrive/v1'");
		expect(content).toContain('v2.DealsApi');
		expect(content).toContain('v2.PersonsApi');
		expect(content).toContain('v2.OrganizationsApi');
		expect(content).toContain('v1.NotesApi');
	});

	it('imports getTokenByCompany and upsertToken from tokenRepository', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain("from '../database/tokenRepository.js'");
		expect(content).toContain('getTokenByCompany');
		expect(content).toContain('upsertToken');
	});

	it('does not contain TODO stubs', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).not.toContain('TODO');
		expect(content).not.toContain('throw new Error');
	});

	it('uses OAuth2Configuration with updateToken and onTokenUpdate', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain('oauth2.updateToken');
		expect(content).toContain('oauth2.onTokenUpdate');
		expect(content).toContain('oauth2.getAccessToken');
	});
});
