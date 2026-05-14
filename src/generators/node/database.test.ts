import { afterEach, describe, expect, it } from 'vitest';
import { access, readFile, rm } from 'node:fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { GeneratorOptions } from '../interface.js';

const tmpDir = join(tmpdir(), 'cpa-database-test');
const exists = (p: string) =>
	access(p).then(
		() => true,
		() => false,
	);
const read = (p: string) => readFile(join(tmpDir, p), 'utf-8');

afterEach(async () => {
	await rm(tmpDir, { recursive: true, force: true });
});

const pgOptions: GeneratorOptions = {
	projectName: 'test-app',
	database: 'postgres',
	appExtensions: [],
};

const mysqlOptions: GeneratorOptions = {
	projectName: 'test-app',
	database: 'mysql',
	appExtensions: [],
};

const sqliteOptions: GeneratorOptions = {
	projectName: 'test-app',
	database: 'sqlite',
	appExtensions: [],
};

const sqliteAppExtensionOptions: GeneratorOptions = {
	...sqliteOptions,
	appExtensions: ['custom-panel'],
};

describe('generateDatabase — schema.ts', () => {
	it('generates src/database/schema.ts for postgres', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'src/database/schema.ts'))).toBe(true);
		const content = await read('src/database/schema.ts');
		expect(content).toContain('pipedrive_tokens');
		expect(content).toContain('pipedriveCompanyId');
		expect(content).toContain('pipedriveUserId');
		expect(content).toContain('primaryKey');
		expect(content).toContain('pgTable');
	});

	it('generates src/database/schema.ts for mysql', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('src/database/schema.ts');
		expect(content).toContain('mysqlTable');
	});

	it('generates src/database/schema.ts for sqlite', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('src/database/schema.ts');
		expect(content).toContain('sqliteTable');
	});
});

describe('generateDatabase — src/database/index.ts', () => {
	it('postgres client uses postgres-js', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/index.ts');
		expect(content).toContain('postgres');
		expect(content).toContain('drizzle-orm/postgres-js');
		expect(content).toContain('onnotice');
		expect(content).toContain("'42P06'");
		expect(content).toContain("'42P07'");
		expect(content).toContain('export');
	});

	it('mysql client uses mysql2', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('src/database/index.ts');
		expect(content).toContain('mysql2');
		expect(content).toContain('drizzle-orm/mysql2');
		expect(content).toContain("mode: 'default'");
	});

	it('sqlite client uses @libsql/client', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('src/database/index.ts');
		expect(content).toContain('@libsql/client');
		expect(content).toContain('drizzle-orm/libsql');
	});
});

describe('generateDatabase — migrate.ts', () => {
	it('generates src/database/migrate.ts with runMigrations export', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'src/database/migrate.ts'))).toBe(true);
		const content = await read('src/database/migrate.ts');
		expect(content).toContain('runMigrations');
		expect(content).toContain('export');
	});

	it('postgres migrate imports from drizzle-orm/postgres-js/migrator', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/migrate.ts');
		expect(content).toContain('postgres-js/migrator');
	});

	it('mysql migrate imports from drizzle-orm/mysql2/migrator', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('src/database/migrate.ts');
		expect(content).toContain('mysql2/migrator');
	});

	it('sqlite migrate imports from drizzle-orm/libsql/migrator', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('src/database/migrate.ts');
		expect(content).toContain('libsql/migrator');
	});
});

describe('generateDatabase — 0000_init.sql', () => {
	it('generates migration file with CREATE TABLE', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'src/database/migrations/0000_init.sql'))).toBe(true);
		const content = await read('src/database/migrations/0000_init.sql');
		expect(content).toContain('CREATE TABLE');
		expect(content).toContain('pipedrive_tokens');
		expect(content).toContain('pipedrive_company_id');
		expect(content).toContain('pipedrive_user_id');
	});

	it('postgres migration uses INTEGER and TIMESTAMP', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/migrations/0000_init.sql');
		expect(content).toContain('TIMESTAMP');
		expect(content).toContain('VARCHAR');
	});

	it('sqlite migration uses INTEGER and TEXT', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('src/database/migrations/0000_init.sql');
		expect(content).toContain('INTEGER');
		expect(content).toContain('TEXT');
	});
});

describe('generateDatabase — meta/_journal.json', () => {
	it('generates journal with 0000_init entry', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'src/database/migrations/meta/_journal.json'))).toBe(true);
		const content = await read('src/database/migrations/meta/_journal.json');
		const journal = JSON.parse(content);
		expect(journal.entries[0].tag).toBe('0000_init');
		expect(journal.entries[0].breakpoints).toBe(true);
	});

	it('postgres journal uses postgresql dialect', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const journal = JSON.parse(await read('src/database/migrations/meta/_journal.json'));
		expect(journal.dialect).toBe('postgresql');
	});

	it('sqlite journal uses sqlite dialect', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const journal = JSON.parse(await read('src/database/migrations/meta/_journal.json'));
		expect(journal.dialect).toBe('sqlite');
	});
});

describe('generateDatabase — drizzle.config.ts', () => {
	it('generates drizzle.config.ts', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'drizzle.config.ts'))).toBe(true);
		const content = await read('drizzle.config.ts');
		expect(content).toContain('src/database/migrations');
		expect(content).toContain('src/database/schema.ts');
	});

	it('postgres config uses postgresql dialect', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('drizzle.config.ts');
		expect(content).toContain('postgresql');
	});

	it('mysql config uses mysql dialect', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('drizzle.config.ts');
		expect(content).toContain('mysql');
	});

	it('sqlite config uses sqlite dialect', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('drizzle.config.ts');
		expect(content).toContain('sqlite');
	});
});

describe('generateDatabase — docker-compose.yml', () => {
	it('generates docker-compose.yml for postgres with backend and healthcheck', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'docker-compose.yml'))).toBe(true);
		const content = await read('docker-compose.yml');
		expect(content).toContain('postgres:16');
		expect(content).toContain('db_data:/var/lib/postgresql/data');
		expect(content).toContain('pg_isready');
		expect(content).toContain("'-d', 'test-app'");
		expect(content).toContain('healthcheck');
		expect(content).toContain('backend');
		expect(content).toContain('tsx watch src/index.ts');
		expect(content).toContain('./src:/app/src');
		expect(content).toContain('action: rebuild');
	});

	it('generates docker-compose.yml for mysql with backend and healthcheck', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('docker-compose.yml');
		expect(content).toContain('mysql:8');
		expect(content).toContain('127.0.0.1:3307:3306');
		expect(content).not.toContain('3306:3306');
		expect(content).toContain('db_data:/var/lib/mysql');
		expect(content).toContain('mysqladmin');
		expect(content).toContain('healthcheck');
		expect(content).toContain('backend');
		expect(content).toContain('tsx watch src/index.ts');
	});

	it('generates docker-compose.yml for sqlite with backend only', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		expect(await exists(join(tmpDir, 'docker-compose.yml'))).toBe(true);
		const content = await read('docker-compose.yml');
		expect(content).toContain('backend');
		expect(content).toContain('tsx watch src/index.ts');
		expect(content).toContain('sqlite_data');
		expect(content).not.toContain('mysql');
		expect(content).not.toContain('postgres');
	});
});

describe('generateDatabase — tokenRepository.ts', () => {
	it('generates src/database/tokenRepository.ts', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		expect(await exists(join(tmpDir, 'src/database/tokenRepository.ts'))).toBe(true);
	});

	it('exports getToken, getTokenByCompany, upsertToken', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('export async function getToken');
		expect(content).toContain('export async function getTokenByCompany');
		expect(content).toContain('export async function upsertToken');
	});

	it('exports StoredToken type', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('StoredToken');
	});

	it('imports TokenResponse from pipedrive/v2', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain("from 'pipedrive/v2'");
	});

	it('postgres uses onConflictDoUpdate', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, pgOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('onConflictDoUpdate');
	});

	it('mysql uses onDuplicateKeyUpdate', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('onDuplicateKeyUpdate');
	});

	it('sqlite uses onConflictDoUpdate', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteOptions);
		const content = await read('src/database/tokenRepository.ts');
		expect(content).toContain('onConflictDoUpdate');
	});

	it('generates Compose Watch frontend service when App Extensions are selected', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, sqliteAppExtensionOptions);
		expect(await exists(join(tmpDir, 'docker-compose.yml'))).toBe(true);
		expect(await exists(join(tmpDir, 'Dockerfile.app'))).toBe(true);
		expect(await exists(join(tmpDir, 'Dockerfile.app-extension-ui'))).toBe(true);
		expect(await exists(join(tmpDir, '.dockerignore'))).toBe(true);

		const compose = await read('docker-compose.yml');
		expect(compose).toContain('app:');
		expect(compose).toContain('dockerfile: Dockerfile.app');
		expect(compose).toContain('user: root');
		expect(compose).toContain(
			'command: sh -c "chown -R node:node /app/node_modules && su-exec node sh -c \'echo Installing dependencies... && npm install --no-package-lock --no-audit --no-fund --loglevel=error && ./node_modules/.bin/tsx watch src/index.ts\'"',
		);
		expect(compose).toContain("'3000:3000'");
		expect(compose).toContain('./package.json:/app/package.json:ro');
		expect(compose).toContain('app_node_modules:/app/node_modules');
		expect(compose).toContain('DATABASE_URL: file:./data.db');
		expect(compose).toContain('path: ./src');
		expect(compose).toContain('target: /app/src');
		expect(compose).toContain('action: sync+restart');
		expect(compose).toContain('path: ./tsconfig.json');
		expect(compose).toContain('app-extension-ui:');
		expect(compose).toContain('dockerfile: Dockerfile.app-extension-ui');
		expect(compose).toContain(
			'command: sh -c "chown -R node:node /app/node_modules && su-exec node sh -c \'echo Installing dependencies... && npm install --no-package-lock --no-audit --no-fund --loglevel=error && npm run dev:frontend\'"',
		);
		expect(compose).toContain("'5173:5173'");
		expect(compose).toContain('./package.json:/app/package.json:ro');
		expect(compose).toContain('app_extension_ui_node_modules:/app/node_modules');
		expect(compose).toContain('develop:');
		expect(compose).toContain('watch:');
		expect(compose).toContain('action: sync');
		expect(compose).toContain('path: ./frontend/app-extension-ui');
		expect(compose).toContain('target: /app/frontend/app-extension-ui');
		expect(compose).toContain('initial_sync: true');
		expect(compose).toContain('action: rebuild');
		expect(compose).toContain('path: ./package.json');
		expect(compose).toContain('app_node_modules:');
		expect(compose).toContain('app_extension_ui_node_modules:');

		const appDockerfile = await read('Dockerfile.app');
		expect(appDockerfile).toContain('FROM node:24-alpine');
		expect(appDockerfile).toContain('ENV NPM_CONFIG_USERCONFIG=/tmp/.npmrc');
		expect(appDockerfile).toContain('RUN mkdir -p /app/node_modules && chown -R node:node /app');
		expect(appDockerfile).toContain('npm config set registry https://registry.npmjs.org/');
		expect(appDockerfile).toContain('COPY --chown=node:node package.json ./');
		expect(appDockerfile).toContain('COPY --chown=node:node src ./src');
		expect(appDockerfile).not.toContain('RUN npm install');
		expect(appDockerfile).toContain('CMD ["npm", "run", "dev"]');

		const dockerfile = await read('Dockerfile.app-extension-ui');
		expect(dockerfile).toContain('FROM node:24-alpine');
		expect(dockerfile).toContain('ENV NPM_CONFIG_USERCONFIG=/tmp/.npmrc');
		expect(dockerfile).toContain('RUN mkdir -p /app/node_modules && chown -R node:node /app');
		expect(dockerfile).toContain('npm config set registry https://registry.npmjs.org/');
		expect(dockerfile).toContain('COPY --chown=node:node package.json ./');
		expect(dockerfile).not.toContain('RUN npm install');
		expect(dockerfile).toContain('CMD ["npm", "run", "dev:frontend"]');

		const dockerignore = await read('.dockerignore');
		expect(dockerignore).toContain('node_modules');
		expect(dockerignore).toContain('frontend/app-extension-ui/dist');
	});

	it('connects the backend container to the Compose database service', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, { ...pgOptions, appExtensions: ['custom-panel'] });

		const compose = await read('docker-compose.yml');
		expect(compose).toContain('DATABASE_URL: postgresql://app:app@db:5432/test-app');
		expect(compose).toContain('depends_on:');
		expect(compose).toContain('condition: service_healthy');
	});
});
