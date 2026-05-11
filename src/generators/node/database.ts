import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateDatabase(outputDir: string, options: GeneratorOptions): Promise<void> {
	await generateSchema(outputDir, options);
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
				(table) => [primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] })],
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
				(table) => [primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] })],
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
			(table) => [primaryKey({ columns: [table.pipedriveCompanyId, table.pipedriveUserId] })],
		);
	`;
}
