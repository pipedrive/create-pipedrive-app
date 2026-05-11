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

	it('imports Configuration, DealsApi, PersonsApi, OrganizationsApi from pipedrive', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain("from 'pipedrive'");
		expect(content).toContain('Configuration');
		expect(content).toContain('DealsApi');
		expect(content).toContain('PersonsApi');
		expect(content).toContain('OrganizationsApi');
	});

	it('contains getStoredToken and refreshStoredToken placeholder functions', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain('getStoredToken');
		expect(content).toContain('refreshStoredToken');
	});

	it('checks token expiry before returning client', async () => {
		const { generatePipedriveClient } = await import('./pipedriveClient.js');
		await generatePipedriveClient(tmpDir, options);
		const content = await readFile(join(tmpDir, 'src/pipedrive/client.ts'), 'utf-8');
		expect(content).toContain('expiresAt');
		expect(content).toContain('new Date()');
	});
});
