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
	webhooks: false,
	appExtensions: [],
};

const mysqlOptions: GeneratorOptions = {
	projectName: 'test-app',
	database: 'mysql',
	webhooks: false,
	appExtensions: [],
};

const sqliteOptions: GeneratorOptions = {
	projectName: 'test-app',
	database: 'sqlite',
	webhooks: false,
	appExtensions: [],
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
		expect(content).toContain('export');
	});

	it('mysql client uses mysql2', async () => {
		const { generateDatabase } = await import('./database.js');
		await generateDatabase(tmpDir, mysqlOptions);
		const content = await read('src/database/index.ts');
		expect(content).toContain('mysql2');
		expect(content).toContain('drizzle-orm/mysql2');
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
