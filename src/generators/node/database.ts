import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateDatabase(outputDir: string, options: GeneratorOptions): Promise<void> {
	await generateSchema(outputDir, options);
	await generateDbClient(outputDir, options);
	await generateMigrate(outputDir, options);
	await generateMigrationSql(outputDir, options);
	await generateMigrationJournal(outputDir, options);
	await generateDrizzleConfig(outputDir, options);
	if (shouldGenerateDockerCompose(options)) {
		await generateDockerCompose(outputDir, options);
	}
	if (options.appExtensions.length > 0) {
		await generateAppDockerfile(outputDir);
		await generateAppExtensionUiDockerfile(outputDir);
		await generateDockerignore(outputDir);
	}
}

async function generateSchema(outputDir: string, options: GeneratorOptions): Promise<void> {
	const content = schemaContent(options.database);
	await writeFile(join(outputDir, 'src/database/schema.ts'), content);
}

function schemaContent(database: GeneratorOptions['database']): string {
	if (database === 'postgres') {
		return dedent`
			import { integer, pgTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/pg-core';

			export const pipedriveTokens = pgTable(
				'pipedrive_tokens',
				{
					pipedriveCompanyId: integer('pipedrive_company_id').notNull(),
					pipedriveUserId: integer('pipedrive_user_id').notNull(),
					accessToken: varchar('access_token', { length: 768 }).notNull(),
					refreshToken: varchar('refresh_token', { length: 768 }).notNull(),
					tokenType: varchar('token_type', { length: 50 }).notNull().default('bearer'),
					accessTokenExpiresAt: timestamp('access_token_expires_at').notNull(),
					refreshTokenExpiresAt: timestamp('refresh_token_expires_at').notNull(),
					scope: text('scope'),
					apiDomain: varchar('api_domain', { length: 255 }).notNull(),
					createdAt: timestamp('created_at').notNull().defaultNow(),
					updatedAt: timestamp('updated_at').notNull().defaultNow(),
				},
				(table) => ({
					pk: primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] }),
				}),
			);
		`;
	}

	if (database === 'mysql') {
		return dedent`
			import { int, mysqlTable, primaryKey, text, timestamp, varchar } from 'drizzle-orm/mysql-core';

			export const pipedriveTokens = mysqlTable(
				'pipedrive_tokens',
				{
					pipedriveCompanyId: int('pipedrive_company_id').notNull(),
					pipedriveUserId: int('pipedrive_user_id').notNull(),
					accessToken: varchar('access_token', { length: 768 }).notNull(),
					refreshToken: varchar('refresh_token', { length: 768 }).notNull(),
					tokenType: varchar('token_type', { length: 50 }).notNull().default('bearer'),
					accessTokenExpiresAt: timestamp('access_token_expires_at').notNull(),
					refreshTokenExpiresAt: timestamp('refresh_token_expires_at').notNull(),
					scope: text('scope'),
					apiDomain: varchar('api_domain', { length: 255 }).notNull(),
					createdAt: timestamp('created_at').notNull().defaultNow(),
					updatedAt: timestamp('updated_at').notNull().defaultNow(),
				},
				(table) => ({
					pk: primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] }),
				}),
			);
		`;
	}

	return dedent`
		import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

		export const pipedriveTokens = sqliteTable(
			'pipedrive_tokens',
			{
				pipedriveCompanyId: integer('pipedrive_company_id').notNull(),
				pipedriveUserId: integer('pipedrive_user_id').notNull(),
				accessToken: text('access_token').notNull(),
				refreshToken: text('refresh_token').notNull(),
				tokenType: text('token_type').notNull().default('bearer'),
				accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }).notNull(),
				refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }).notNull(),
				scope: text('scope'),
				apiDomain: text('api_domain').notNull(),
				createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
				updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
			},
			(table) => ({
				pk: primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] }),
			}),
		);
	`;
}

async function generateDbClient(outputDir: string, options: GeneratorOptions): Promise<void> {
	const content = dbClientContent(options.database);
	await writeFile(join(outputDir, 'src/database/index.ts'), content);
}

function dbClientContent(database: GeneratorOptions['database']): string {
	if (database === 'postgres') {
		return dedent`
			import { drizzle } from 'drizzle-orm/postgres-js';
			import postgres from 'postgres';
			import * as schema from './schema.js';

			const client = postgres(process.env.DATABASE_URL!, {
				onnotice: (notice) => {
					if (notice.code === '42P06' || notice.code === '42P07') return;
					console.warn(notice);
				},
			});
			export const db = drizzle(client, { schema });
		`;
	}

	if (database === 'mysql') {
		return dedent`
			import { drizzle } from 'drizzle-orm/mysql2';
			import mysql from 'mysql2/promise';
			import * as schema from './schema.js';

			const pool = mysql.createPool(process.env.DATABASE_URL!);
			export const db = drizzle(pool, { schema, mode: 'default' });
		`;
	}

	return dedent`
		import { drizzle } from 'drizzle-orm/libsql';
		import { createClient } from '@libsql/client';
		import * as schema from './schema.js';

		const client = createClient({ url: process.env.DATABASE_URL ?? 'file:./data.db' });
		export const db = drizzle(client, { schema });
	`;
}

async function generateMigrate(outputDir: string, options: GeneratorOptions): Promise<void> {
	const content = migrateContent(options.database);
	await writeFile(join(outputDir, 'src/database/migrate.ts'), content);
}

function migrateContent(database: GeneratorOptions['database']): string {
	if (database === 'postgres') {
		return dedent`
			import { migrate } from 'drizzle-orm/postgres-js/migrator';
			import { db } from './index.js';

			export async function runMigrations(): Promise<void> {
				await migrate(db, { migrationsFolder: 'src/database/migrations' });
			}
		`;
	}

	if (database === 'mysql') {
		return dedent`
			import { migrate } from 'drizzle-orm/mysql2/migrator';
			import { db } from './index.js';

			export async function runMigrations(): Promise<void> {
				await migrate(db, { migrationsFolder: 'src/database/migrations' });
			}
		`;
	}

	return dedent`
		import { migrate } from 'drizzle-orm/libsql/migrator';
		import { db } from './index.js';

		export async function runMigrations(): Promise<void> {
			await migrate(db, { migrationsFolder: 'src/database/migrations' });
		}
	`;
}

async function generateMigrationSql(outputDir: string, options: GeneratorOptions): Promise<void> {
	const content = migrationSqlContent(options.database);
	await writeFile(join(outputDir, 'src/database/migrations/0000_init.sql'), content);
}

function migrationSqlContent(database: GeneratorOptions['database']): string {
	if (database === 'postgres') {
		return dedent`
			CREATE TABLE IF NOT EXISTS "pipedrive_tokens" (
			  "pipedrive_company_id" INTEGER NOT NULL,
			  "pipedrive_user_id" INTEGER NOT NULL,
			  "access_token" VARCHAR(768) NOT NULL,
			  "refresh_token" VARCHAR(768) NOT NULL,
			  "token_type" VARCHAR(50) NOT NULL DEFAULT 'bearer',
			  "access_token_expires_at" TIMESTAMP NOT NULL,
			  "refresh_token_expires_at" TIMESTAMP NOT NULL,
			  "scope" TEXT,
			  "api_domain" VARCHAR(255) NOT NULL,
			  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
			  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
			  PRIMARY KEY ("pipedrive_company_id", "pipedrive_user_id")
			);
		`;
	}

	if (database === 'mysql') {
		return dedent`
			CREATE TABLE IF NOT EXISTS \`pipedrive_tokens\` (
			  \`pipedrive_company_id\` INT NOT NULL,
			  \`pipedrive_user_id\` INT NOT NULL,
			  \`access_token\` VARCHAR(768) NOT NULL,
			  \`refresh_token\` VARCHAR(768) NOT NULL,
			  \`token_type\` VARCHAR(50) NOT NULL DEFAULT 'bearer',
			  \`access_token_expires_at\` TIMESTAMP NOT NULL,
			  \`refresh_token_expires_at\` TIMESTAMP NOT NULL,
			  \`scope\` TEXT,
			  \`api_domain\` VARCHAR(255) NOT NULL,
			  \`created_at\` TIMESTAMP NOT NULL DEFAULT NOW(),
			  \`updated_at\` TIMESTAMP NOT NULL DEFAULT NOW(),
			  PRIMARY KEY (\`pipedrive_company_id\`, \`pipedrive_user_id\`)
			);
		`;
	}

	return dedent`
		CREATE TABLE IF NOT EXISTS "pipedrive_tokens" (
		  "pipedrive_company_id" INTEGER NOT NULL,
		  "pipedrive_user_id" INTEGER NOT NULL,
		  "access_token" TEXT NOT NULL,
		  "refresh_token" TEXT NOT NULL,
		  "token_type" TEXT NOT NULL DEFAULT 'bearer',
		  "access_token_expires_at" INTEGER NOT NULL,
		  "refresh_token_expires_at" INTEGER NOT NULL,
		  "scope" TEXT,
		  "api_domain" TEXT NOT NULL,
		  "created_at" INTEGER NOT NULL DEFAULT (unixepoch()),
		  "updated_at" INTEGER NOT NULL DEFAULT (unixepoch()),
		  PRIMARY KEY ("pipedrive_company_id", "pipedrive_user_id")
		);
	`;
}

async function generateMigrationJournal(outputDir: string, options: GeneratorOptions): Promise<void> {
	const dialectMap: Record<GeneratorOptions['database'], string> = {
		postgres: 'postgresql',
		mysql: 'mysql',
		sqlite: 'sqlite',
	};
	const journal = {
		version: '6',
		dialect: dialectMap[options.database],
		entries: [{ idx: 0, version: '6', when: 0, tag: '0000_init', breakpoints: true }],
	};
	await writeFile(join(outputDir, 'src/database/migrations/meta/_journal.json'), JSON.stringify(journal, null, 2));
}

function shouldGenerateDockerCompose(options: GeneratorOptions): boolean {
	return options.database === 'postgres' || options.database === 'mysql' || options.appExtensions.length > 0;
}

async function generateDockerCompose(outputDir: string, options: GeneratorOptions): Promise<void> {
	await writeFile(join(outputDir, 'docker-compose.yml'), dockerComposeContent(options));
}

function dockerComposeContent(options: GeneratorOptions): string {
	const services: string[] = [];
	const volumes: string[] = [];
	const hasDatabaseService = options.database === 'postgres' || options.database === 'mysql';

	if (options.database === 'postgres') {
		services.push(postgresComposeService(options.projectName));
		volumes.push('postgres_data:');
	}

	if (options.database === 'mysql') {
		services.push(mysqlComposeService(options.projectName));
		volumes.push('mysql_data:');
	}

	if (options.appExtensions.length > 0) {
		services.push(appComposeService(options, hasDatabaseService));
		services.push(appExtensionUiComposeService());
		volumes.push('app_node_modules:', 'app_extension_ui_node_modules:');
	}

	const lines = ['services:', ...services.map((service) => indent(service, 2)).join('\n\n').split('\n')];

	if (volumes.length > 0) {
		lines.push('', 'volumes:', ...volumes.map((volume) => indent(volume, 2)));
	}

	return `${lines.join('\n')}\n`;
}

function appComposeService(options: GeneratorOptions, hasDatabaseService: boolean): string {
	const databaseUrlOverride = composeDatabaseUrlOverride(options);
	const lines = [
		'app:',
		'  build:',
		'    context: .',
		'    dockerfile: Dockerfile.app',
		'  user: root',
		`  command: ${nodeVolumeCommand(`${quietInstallCommand()} && ./node_modules/.bin/tsx watch src/index.ts`)}`,
		'  env_file:',
		'    - .env',
		'  environment:',
		`    ${databaseUrlOverride}`,
		"    CHOKIDAR_USEPOLLING: 'true'",
		'  ports:',
		"    - '3000:3000'",
		'  volumes:',
		'    - ./package.json:/app/package.json:ro',
		'    - app_node_modules:/app/node_modules',
	];

	if (hasDatabaseService) {
		lines.push('  depends_on:', '    db:', '      condition: service_healthy');
	}

	lines.push(
		'  develop:',
		'    watch:',
		'      - action: sync',
		'        path: ./src',
		'        target: /app/src',
		'        initial_sync: true',
		'      - action: sync+restart',
		'        path: ./tsconfig.json',
		'        target: /app/tsconfig.json',
		'      - action: rebuild',
		'        path: ./package.json',
	);

	return lines.join('\n');
}

function composeDatabaseUrlOverride(options: GeneratorOptions): string {
	if (options.database === 'postgres') {
		return `DATABASE_URL: postgresql://app:app@db:5432/${options.projectName}`;
	}

	if (options.database === 'mysql') {
		return `DATABASE_URL: mysql://app:app@db:3306/${options.projectName}`;
	}

	return 'DATABASE_URL: file:./data.db';
}

function postgresComposeService(projectName: string): string {
	return dedent`
		db:
		  image: postgres:16
		  environment:
		    POSTGRES_USER: app
		    POSTGRES_PASSWORD: app
		    POSTGRES_DB: ${projectName}
		  ports:
		    - '5432:5432'
		  volumes:
		    - postgres_data:/var/lib/postgresql/data
		  healthcheck:
		    test: ['CMD', 'pg_isready', '-U', 'app', '-d', '${projectName}']
		    interval: 5s
		    timeout: 5s
		    retries: 5
	`;
}

function mysqlComposeService(projectName: string): string {
	return dedent`
		db:
		  image: mysql:8
		  environment:
		    MYSQL_ROOT_PASSWORD: app
		    MYSQL_DATABASE: ${projectName}
		    MYSQL_USER: app
		    MYSQL_PASSWORD: app
		  ports:
		    - '127.0.0.1:3307:3306'
		  volumes:
		    - mysql_data:/var/lib/mysql
		  healthcheck:
		    test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'app', '--password=app']
		    interval: 5s
		    timeout: 5s
		    retries: 5
	`;
}

function appExtensionUiComposeService(): string {
	return dedent`
		app-extension-ui:
		  build:
		    context: .
		    dockerfile: Dockerfile.app-extension-ui
		  user: root
		  command: ${nodeVolumeCommand(`${quietInstallCommand()} && npm run dev:frontend`)}
		  environment:
		    CHOKIDAR_USEPOLLING: 'true'
		  ports:
		    - '5173:5173'
		  volumes:
		    - ./package.json:/app/package.json:ro
		    - app_extension_ui_node_modules:/app/node_modules
		  develop:
		    watch:
		      - action: sync
		        path: ./frontend/app-extension-ui
		        target: /app/frontend/app-extension-ui
		        initial_sync: true
		        ignore:
		          - node_modules/
		          - dist/
		      - action: rebuild
		        path: ./package.json
	`;
}

function indent(value: string, spaces: number): string {
	const prefix = ' '.repeat(spaces);
	return value
		.split('\n')
		.map((line) => (line.length > 0 ? `${prefix}${line}` : line))
		.join('\n');
}

function nodeVolumeCommand(command: string): string {
	return `sh -c "chown -R node:node /app/node_modules && runuser -u node -- sh -c '${command}'"`;
}

function quietInstallCommand(): string {
	return 'echo Installing dependencies... && npm install --no-package-lock --no-audit --no-fund --loglevel=error';
}

async function generateAppExtensionUiDockerfile(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'Dockerfile.app-extension-ui'),
		dedent`
			FROM node:20-bookworm-slim

			WORKDIR /app
			ENV NPM_CONFIG_USERCONFIG=/tmp/.npmrc
			RUN mkdir -p /app/node_modules && chown -R node:node /app
			USER node
			RUN npm config set registry https://registry.npmjs.org/

			COPY --chown=node:node package.json ./
			COPY --chown=node:node frontend/app-extension-ui ./frontend/app-extension-ui

			EXPOSE 5173
			CMD ["npm", "run", "dev:frontend"]
		`,
	);
}

async function generateAppDockerfile(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'Dockerfile.app'),
		dedent`
			FROM node:20-bookworm-slim

			WORKDIR /app
			ENV NPM_CONFIG_USERCONFIG=/tmp/.npmrc
			RUN mkdir -p /app/node_modules && chown -R node:node /app
			USER node
			RUN npm config set registry https://registry.npmjs.org/

			COPY --chown=node:node package.json ./
			COPY --chown=node:node tsconfig.json ./
			COPY --chown=node:node src ./src

			EXPOSE 3000
			CMD ["npm", "run", "dev"]
		`,
	);
}

async function generateDockerignore(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, '.dockerignore'),
		dedent`
			.git
			node_modules
			dist
			.env
			frontend/app-extension-ui/dist
			frontend/app-extension-ui/node_modules
		`,
	);
}

async function generateDrizzleConfig(outputDir: string, options: GeneratorOptions): Promise<void> {
	const dialectMap: Record<GeneratorOptions['database'], string> = {
		postgres: 'postgresql',
		mysql: 'mysql',
		sqlite: 'sqlite',
	};
	const dialect = dialectMap[options.database];
	const url =
		options.database === 'sqlite' ? `process.env.DATABASE_URL ?? 'file:./data.db'` : `process.env.DATABASE_URL!`;

	const content = dedent`
		import { defineConfig } from 'drizzle-kit';

		export default defineConfig({
			dialect: '${dialect}',
			schema: './src/database/schema.ts',
			out: './src/database/migrations',
			dbCredentials: {
				url: ${url},
			},
		});
	`;
	await writeFile(join(outputDir, 'drizzle.config.ts'), content);
}
