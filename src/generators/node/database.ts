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
	await generateTokenRepository(outputDir, options);
	await generateDockerCompose(outputDir, options);
	await generateDockerfile(outputDir);
	await generateDockerignore(outputDir);
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

async function generateTokenRepository(outputDir: string, options: GeneratorOptions): Promise<void> {
	await writeFile(join(outputDir, 'src/database/tokenRepository.ts'), tokenRepositoryContent(options.database));
}

function tokenRepositoryContent(database: GeneratorOptions['database']): string {
	if (database === 'mysql') {
		return dedent`
			import { and, desc, eq } from 'drizzle-orm';
			import type { TokenResponse } from 'pipedrive/v2';
			import { db } from './index.js';
			import { pipedriveTokens } from './schema.js';

			const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

			export type StoredToken = { companyId: number; userId: number; token: TokenResponse };

			function toTokenResponse(row: typeof pipedriveTokens.$inferSelect): TokenResponse {
				return {
					access_token: row.accessToken,
					refresh_token: row.refreshToken,
					token_type: row.tokenType,
					expires_in: Math.max(0, Math.floor((row.accessTokenExpiresAt.getTime() - Date.now()) / 1000)),
					scope: row.scope ?? '',
					api_domain: row.apiDomain,
				};
			}

			export async function getToken(companyId: number, userId: number): Promise<StoredToken | null> {
				const rows = await db
					.select()
					.from(pipedriveTokens)
					.where(and(eq(pipedriveTokens.pipedriveCompanyId, companyId), eq(pipedriveTokens.pipedriveUserId, userId)))
					.limit(1);
				if (!rows[0]) return null;
				return { companyId, userId, token: toTokenResponse(rows[0]) };
			}

			export async function getTokenByCompany(companyId: number): Promise<StoredToken | null> {
				const rows = await db
					.select()
					.from(pipedriveTokens)
					.where(eq(pipedriveTokens.pipedriveCompanyId, companyId))
					.orderBy(desc(pipedriveTokens.updatedAt))
					.limit(1);
				if (!rows[0]) return null;
				return { companyId, userId: rows[0].pipedriveUserId, token: toTokenResponse(rows[0]) };
			}

			export async function upsertToken(companyId: number, userId: number, token: TokenResponse): Promise<void> {
				const now = new Date();
				const accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
				const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
				await db
					.insert(pipedriveTokens)
					.values({
						pipedriveCompanyId: companyId,
						pipedriveUserId: userId,
						accessToken: token.access_token,
						refreshToken: token.refresh_token,
						tokenType: token.token_type,
						accessTokenExpiresAt,
						refreshTokenExpiresAt,
						scope: token.scope,
						apiDomain: token.api_domain,
						createdAt: now,
						updatedAt: now,
					})
					.onDuplicateKeyUpdate({
						set: {
							accessToken: token.access_token,
							refreshToken: token.refresh_token,
							tokenType: token.token_type,
							accessTokenExpiresAt,
							refreshTokenExpiresAt,
							scope: token.scope,
							apiDomain: token.api_domain,
							updatedAt: now,
						},
					});
			}
		`;
	}

	return dedent`
		import { and, desc, eq } from 'drizzle-orm';
		import type { TokenResponse } from 'pipedrive/v2';
		import { db } from './index.js';
		import { pipedriveTokens } from './schema.js';

		const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

		export type StoredToken = { companyId: number; userId: number; token: TokenResponse };

		function toTokenResponse(row: typeof pipedriveTokens.$inferSelect): TokenResponse {
			return {
				access_token: row.accessToken,
				refresh_token: row.refreshToken,
				token_type: row.tokenType,
				expires_in: Math.max(0, Math.floor((row.accessTokenExpiresAt.getTime() - Date.now()) / 1000)),
				scope: row.scope ?? '',
				api_domain: row.apiDomain,
			};
		}

		export async function getToken(companyId: number, userId: number): Promise<StoredToken | null> {
			const rows = await db
				.select()
				.from(pipedriveTokens)
				.where(and(eq(pipedriveTokens.pipedriveCompanyId, companyId), eq(pipedriveTokens.pipedriveUserId, userId)))
				.limit(1);
			if (!rows[0]) return null;
			return { companyId, userId, token: toTokenResponse(rows[0]) };
		}

		export async function getTokenByCompany(companyId: number): Promise<StoredToken | null> {
			const rows = await db
				.select()
				.from(pipedriveTokens)
				.where(eq(pipedriveTokens.pipedriveCompanyId, companyId))
				.orderBy(desc(pipedriveTokens.updatedAt))
				.limit(1);
			if (!rows[0]) return null;
			return { companyId, userId: rows[0].pipedriveUserId, token: toTokenResponse(rows[0]) };
		}

		export async function upsertToken(companyId: number, userId: number, token: TokenResponse): Promise<void> {
			const now = new Date();
			const accessTokenExpiresAt = new Date(Date.now() + token.expires_in * 1000);
			const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
			await db
				.insert(pipedriveTokens)
				.values({
					pipedriveCompanyId: companyId,
					pipedriveUserId: userId,
					accessToken: token.access_token,
					refreshToken: token.refresh_token,
					tokenType: token.token_type,
					accessTokenExpiresAt,
					refreshTokenExpiresAt,
					scope: token.scope,
					apiDomain: token.api_domain,
					createdAt: now,
					updatedAt: now,
				})
				.onConflictDoUpdate({
					target: [pipedriveTokens.pipedriveCompanyId, pipedriveTokens.pipedriveUserId],
					set: {
						accessToken: token.access_token,
						refreshToken: token.refresh_token,
						tokenType: token.token_type,
						accessTokenExpiresAt,
						refreshTokenExpiresAt,
						scope: token.scope,
						apiDomain: token.api_domain,
						updatedAt: now,
					},
				});
		}
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

async function generateDockerCompose(outputDir: string, options: GeneratorOptions): Promise<void> {
	const { database, projectName } = options;

	if (database === 'sqlite') {
		const content = dedent`
			services:
			  backend:
			    build: .
			    command: node_modules/.bin/tsx watch src/index.ts
			    ports:
			      - '\${PORT:-3000}:3000'
			    env_file: .env
			    environment:
			      DATABASE_URL: file:/app/data/data.db
			    volumes:
			      - sqlite_data:/app/data
			    develop:
			      watch:
			        - action: sync
			          path: ./src
			          target: /app/src
			        - action: rebuild
			          path: package.json

			volumes:
			  sqlite_data:
		`;
		await writeFile(join(outputDir, 'docker-compose.yml'), content);
		return;
	}

	const dbUrl =
		database === 'postgres'
			? `postgresql://app:app@db:5432/${projectName}`
			: `mysql://app:app@db:3306/${projectName}`;

	const dbService =
		database === 'postgres'
			? dedent`
				db:
				    image: postgres:16
				    environment:
				      POSTGRES_USER: app
				      POSTGRES_PASSWORD: app
				      POSTGRES_DB: ${projectName}
				    ports:
				      - '5432:5432'
				    volumes:
				      - db_data:/var/lib/postgresql/data
				    healthcheck:
				      test: ['CMD', 'pg_isready', '-U', 'app']
				      interval: 5s
				      timeout: 5s
				      retries: 5
			`
			: dedent`
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
				      - db_data:/var/lib/mysql
				    healthcheck:
				      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'app', '--password=app']
				      interval: 5s
				      timeout: 5s
				      retries: 5
			`;

	const content = dedent`
		services:
		  backend:
		    build: .
		    command: node_modules/.bin/tsx watch src/index.ts
		    ports:
		      - '\${PORT:-3000}:3000'
		    env_file: .env
		    environment:
		      DATABASE_URL: ${dbUrl}
		    depends_on:
		      db:
		        condition: service_healthy
		    develop:
		      watch:
		        - action: sync
		          path: ./src
		          target: /app/src
		        - action: rebuild
		          path: package.json

		  ${dbService}

		volumes:
		  db_data:
	`;
	await writeFile(join(outputDir, 'docker-compose.yml'), content);
}

async function generateDockerfile(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'Dockerfile'),
		dedent`
			FROM node:22-alpine
			WORKDIR /app
			COPY package*.json ./
			RUN npm ci
			COPY . .
		`,
	);
}

async function generateDockerignore(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, '.dockerignore'),
		dedent`
			node_modules
			dist
			.env
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
