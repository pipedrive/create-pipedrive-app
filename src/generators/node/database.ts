import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateDatabase(outputDir: string, options: GeneratorOptions): Promise<void> {
	await generateSchema(outputDir, options);
	await generateDbClient(outputDir, options);
	await generateMigrate(outputDir, options);
	await generateMigrationSql(outputDir, options);
	await generateDrizzleConfig(outputDir, options);
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

			const client = postgres(process.env.DATABASE_URL!);
			export const db = drizzle(client, { schema });
		`;
	}

	if (database === 'mysql') {
		return dedent`
			import { drizzle } from 'drizzle-orm/mysql2';
			import mysql from 'mysql2/promise';
			import * as schema from './schema.js';

			const pool = mysql.createPool(process.env.DATABASE_URL!);
			export const db = drizzle(pool, { schema });
		`;
	}

	return dedent`
		import { drizzle } from 'drizzle-orm/better-sqlite3';
		import Database from 'better-sqlite3';
		import * as schema from './schema.js';

		const sqlite = new Database(process.env.DATABASE_URL ?? './data.db');
		export const db = drizzle(sqlite, { schema });
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
		import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
		import { db } from './index.js';

		export async function runMigrations(): Promise<void> {
			migrate(db, { migrationsFolder: 'src/database/migrations' });
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

async function generateDrizzleConfig(outputDir: string, options: GeneratorOptions): Promise<void> {
	const dialectMap: Record<GeneratorOptions['database'], string> = {
		postgres: 'postgresql',
		mysql: 'mysql',
		sqlite: 'sqlite',
	};
	const dialect = dialectMap[options.database];
	const url = options.database === 'sqlite' ? `process.env.DATABASE_URL ?? './data.db'` : `process.env.DATABASE_URL!`;

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
