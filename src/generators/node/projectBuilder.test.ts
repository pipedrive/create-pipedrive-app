import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { GeneratorOptions } from '../interface.js';
import { NodeProjectBuilder } from './projectBuilder.js';
import type { BuildStep } from './projectBuilder.js';

const tmpDir = join(tmpdir(), 'cpa-projectbuilder-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);
const read = (p: string) => readFile(join(tmpDir, p), 'utf-8');

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

const options: GeneratorOptions = {
	projectName: 'test-app',
	database: 'postgres',
	webhooks: false,
	appExtensions: [],
};

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
});
