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

	it('adds frontend dependencies and scripts when App Extensions are selected', async () => {
		await rm(tmpDir, { recursive: true, force: true });

		await new NodeProjectBuilder(tmpDir, {
			...options,
			appExtensions: ['custom-panel'],
		})
			.addPackageJson()
			.build();

		const pkg = JSON.parse(await read('package.json')) as {
			scripts: Record<string, string>;
			dependencies: Record<string, string>;
			devDependencies: Record<string, string>;
		};

		expect(pkg.dependencies['@pipedrive/app-extensions-sdk']).toBe('^0.13.1');
		expect(pkg.dependencies.react).toBe('^18.2.0');
		expect(pkg.dependencies['react-dom']).toBe('^18.2.0');
		expect(pkg.dependencies['drizzle-orm']).toBe('^0.45.0');
		expect(pkg.devDependencies.vite).toBe('^5.2.0');
		expect(pkg.devDependencies['@vitejs/plugin-react']).toBe('^4.2.0');
		expect(pkg.devDependencies['@types/react']).toBe('^18.2.0');
		expect(pkg.devDependencies['@types/react-dom']).toBe('^18.2.0');
		expect(pkg.devDependencies.tsx).toBe('^4.21.0');
		expect(pkg.devDependencies['drizzle-kit']).toBe('^0.31.0');
		expect(pkg.devDependencies.concurrently).toBeUndefined();
		expect(pkg.scripts.dev).toBe('tsx watch --env-file=.env src/index.ts');
		expect(pkg.scripts['dev:container']).toBeUndefined();
		expect(pkg.scripts['dev:backend']).toBeUndefined();
		expect(pkg.scripts['dev:frontend']).toBe('vite --config frontend/app-extension-ui/vite.config.ts');
		expect(pkg.scripts['build:frontend']).toBe('vite build --config frontend/app-extension-ui/vite.config.ts');
		expect(pkg.scripts['preview:frontend']).toBe('vite preview --config frontend/app-extension-ui/vite.config.ts');
		expect(pkg.scripts.build).toBe('tsc && vite build --config frontend/app-extension-ui/vite.config.ts');
		expect(pkg.scripts.typecheck).toBe('tsc --noEmit && tsc --noEmit -p frontend/app-extension-ui/tsconfig.json');

		await rm(tmpDir, { recursive: true, force: true });
	});

	it('keeps package scripts backend-only when App Extensions are not selected', async () => {
		await rm(tmpDir, { recursive: true, force: true });

		await new NodeProjectBuilder(tmpDir, options).addPackageJson().build();

		const pkg = JSON.parse(await read('package.json')) as {
			scripts: Record<string, string>;
			dependencies: Record<string, string>;
			devDependencies: Record<string, string>;
		};

		expect(pkg.dependencies['@pipedrive/app-extensions-sdk']).toBeUndefined();
		expect(pkg.dependencies.react).toBeUndefined();
		expect(pkg.devDependencies.concurrently).toBeUndefined();
		expect(pkg.devDependencies.vite).toBeUndefined();
		expect(pkg.scripts.dev).toBe('tsx watch --env-file=.env src/index.ts');
		expect(pkg.scripts['dev:container']).toBeUndefined();
		expect(pkg.scripts['dev:backend']).toBeUndefined();
		expect(pkg.scripts['dev:frontend']).toBeUndefined();
		expect(pkg.scripts['build:frontend']).toBeUndefined();
		expect(pkg.scripts['preview:frontend']).toBeUndefined();
		expect(pkg.scripts.build).toBe('tsc');
		expect(pkg.scripts.typecheck).toBe('tsc --noEmit');

		await rm(tmpDir, { recursive: true, force: true });
	});

	it('documents Compose Watch as the App Extensions dev command', async () => {
		await rm(tmpDir, { recursive: true, force: true });

		await new NodeProjectBuilder(tmpDir, {
			...options,
			appExtensions: ['custom-panel'],
		})
			.addReadme()
			.build();

		const readme = await read('README.md');
		expect(readme).toContain('docker-compose up --watch');
		expect(readme).toContain('starts the backend and Vite dev server in containers');
		expect(readme).not.toContain('npm run dev:frontend');

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
