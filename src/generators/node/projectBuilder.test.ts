import { describe, expect, it } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GeneratorOptions } from '../interface.js';
import { NodeProjectBuilder } from './projectBuilder.js';
import type { BuildStep } from './projectBuilder.js';

const options: GeneratorOptions = {
	projectName: 'test-app',
	database: 'postgres',
	webhooks: false,
	appExtensions: [],
};

const tmpDir = join(tmpdir(), 'cpa-project-builder-test');
const read = (p: string) => readFile(join(tmpDir, p), 'utf-8');

function spyStep(tracker: string[], label: string): BuildStep {
	return {
		execute: async () => {
			tracker.push(label);
		},
	};
}

describe('NodeProjectBuilder', () => {
	it('when(true) executes the added step', async () => {
		const executed: string[] = [];
		await new NodeProjectBuilder('/tmp', options)
			.when(true, (b) => b.addStep(spyStep(executed, 'webhooks')))
			.build();
		expect(executed).toContain('webhooks');
	});

	it('when(false) skips the step', async () => {
		const executed: string[] = [];
		await new NodeProjectBuilder('/tmp', options)
			.when(false, (b) => b.addStep(spyStep(executed, 'webhooks')))
			.build();
		expect(executed).toHaveLength(0);
	});

	it('executes steps in insertion order', async () => {
		const order: string[] = [];
		await new NodeProjectBuilder('/tmp', options)
			.addStep(spyStep(order, 'first'))
			.addStep(spyStep(order, 'second'))
			.addStep(spyStep(order, 'third'))
			.build();
		expect(order).toEqual(['first', 'second', 'third']);
	});

	it('addStep and when return the builder instance for chaining', () => {
		const builder = new NodeProjectBuilder('/tmp', options);
		expect(builder.addStep(spyStep([], 'x'))).toBe(builder);
		expect(builder.when(false, () => {})).toBe(builder);
	});

	it('generates MySQL env example with the non-default host port', async () => {
		await rm(tmpDir, { recursive: true, force: true });

		await new NodeProjectBuilder(tmpDir, { ...options, database: 'mysql' }).addEnvExample().build();

		const content = await read('.env.example');
		expect(content).toContain('DATABASE_URL=mysql://app:app@localhost:3307/test-app');
		expect(content).not.toContain('DATABASE_URL=mysql://app:app@localhost:3306/test-app');

		await rm(tmpDir, { recursive: true, force: true });
	});

	it('generates server entry that retries database startup', async () => {
		await rm(tmpDir, { recursive: true, force: true });

		await new NodeProjectBuilder(tmpDir, options).addServerEntry().build();

		const content = await read('src/index.ts');
		expect(content).toContain('STARTUP_RETRY_ATTEMPTS = 60');
		expect(content).toContain('STARTUP_RETRY_DELAY_MS = 1000');
		expect(content).toContain('async function waitForDatabase()');
		expect(content).toContain('await waitForDatabase()');
		expect(content).toContain('Database is not ready yet');

		await rm(tmpDir, { recursive: true, force: true });
	});
});
