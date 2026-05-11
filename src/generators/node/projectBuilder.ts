import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { generateApp } from './app.js';
import { generateAppExtensions } from './appExtensions.js';
import { generateDatabase } from './database.js';
import { generateOauth } from './oauth.js';
import { generatePipedriveClient } from './pipedriveClient.js';
import { generateWebhooks } from './webhooks.js';
import { envVarAccess } from '../../utils/templates.js';

export interface BuildStep {
	execute(outputDir: string, options: GeneratorOptions): Promise<void>;
}

class OAuthStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generateOauth(outputDir, options);
	}
}

class DatabaseStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generateDatabase(outputDir, options);
	}
}

class AppStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generateApp(outputDir, options);
	}
}

class WebhooksStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generateWebhooks(outputDir, options);
	}
}

class AppExtensionsStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generateAppExtensions(outputDir, options);
	}
}

class PipedriveClientStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generatePipedriveClient(outputDir, options);
	}
}

class ServerEntryStep implements BuildStep {
	async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
		await writeFile(
			join(outputDir, 'src/index.ts'),
			dedent`
				import { runMigrations } from './database/migrate.js';
				import app from './app.js';

				const PORT = ${envVarAccess('PORT', '3000')};

				await runMigrations();
				app.listen(PORT, () => {
					console.log(\`Server running on port \${PORT}\`);
				});
			`,
		);
	}
}

class PackageJsonStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		const dbDrivers: Record<GeneratorOptions['database'], Record<string, string>> = {
			postgres: { postgres: '^3.4.0' },
			mysql: { mysql2: '^3.9.0' },
			sqlite: { 'better-sqlite3': '^9.4.0' },
		};

		const dbDevDrivers: Record<GeneratorOptions['database'], Record<string, string>> = {
			postgres: {},
			mysql: {},
			sqlite: { '@types/better-sqlite3': '^7.6.0' },
		};

		const pkg = {
			name: options.projectName,
			version: '0.1.0',
			type: 'module',
			scripts: {
				dev: 'tsx src/index.ts',
				build: 'tsc',
				typecheck: 'tsc --noEmit',
				'db:migrate': 'drizzle-kit migrate',
			},
			dependencies: {
				express: '^4.19.0',
				'drizzle-orm': '^0.30.0',
				pipedrive: '^21.0.0',
				...dbDrivers[options.database],
			},
			devDependencies: {
				typescript: '^5.4.0',
				'@types/express': '^4.17.0',
				'@types/node': '^20.0.0',
				tsx: '^4.7.0',
				'drizzle-kit': '^0.21.0',
				...dbDevDrivers[options.database],
			},
		};
		await writeFile(join(outputDir, 'package.json'), JSON.stringify(pkg, null, 2));
	}
}

class TsConfigStep implements BuildStep {
	async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
		const tsconfig = {
			compilerOptions: {
				target: 'ESNext',
				module: 'ESNext',
				moduleResolution: 'bundler',
				outDir: 'dist',
				rootDir: 'src',
				strict: true,
				esModuleInterop: true,
				skipLibCheck: true,
			},
			include: ['src'],
		};
		await writeFile(join(outputDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2));
	}
}

class EnvExampleStep implements BuildStep {
	async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
		await writeFile(
			join(outputDir, '.env.example'),
			dedent`
				PIPEDRIVE_CLIENT_ID=
				PIPEDRIVE_CLIENT_SECRET=
				PIPEDRIVE_REDIRECT_URI=http://localhost:3000/oauth/callback
				DATABASE_URL=
				PORT=3000
			`,
		);
	}
}

class PostgresDockerStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await writeFile(
			join(outputDir, 'docker-compose.yml'),
			dedent`
				services:
				  db:
				    image: postgres:16
				    environment:
				      POSTGRES_USER: app
				      POSTGRES_PASSWORD: app
				      POSTGRES_DB: ${options.projectName}
				    ports:
				      - '5432:5432'
				    volumes:
				      - db_data:/var/lib/postgresql/data
				    healthcheck:
				      test: ['CMD', 'pg_isready', '-U', 'app']
				      interval: 5s
				      timeout: 5s
				      retries: 5

				volumes:
				  db_data:
			`,
		);
	}
}

class MySQLDockerStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await writeFile(
			join(outputDir, 'docker-compose.yml'),
			dedent`
				services:
				  db:
				    image: mysql:8
				    environment:
				      MYSQL_ROOT_PASSWORD: app
				      MYSQL_DATABASE: ${options.projectName}
				      MYSQL_USER: app
				      MYSQL_PASSWORD: app
				    ports:
				      - '3306:3306'
				    volumes:
				      - db_data:/var/lib/mysql
				    healthcheck:
				      test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost', '-u', 'app', '--password=app']
				      interval: 5s
				      timeout: 5s
				      retries: 5

				volumes:
				  db_data:
			`,
		);
	}
}

export class NodeProjectBuilder {
	private steps: BuildStep[] = [];

	constructor(
		private outputDir: string,
		private options: GeneratorOptions,
	) {}

	addStep(step: BuildStep): this {
		this.steps.push(step);
		return this;
	}

	addOAuth(): this          { return this.addStep(new OAuthStep()); }
	addDatabase(): this       { return this.addStep(new DatabaseStep()); }
	addApp(): this            { return this.addStep(new AppStep()); }
	addWebhooks(): this       { return this.addStep(new WebhooksStep()); }
	addPostgres(): this       { return this.addStep(new PostgresDockerStep()); }
	addMySQL(): this          { return this.addStep(new MySQLDockerStep()); }
	addAppExtensions(): this  { return this.addStep(new AppExtensionsStep()); }
	addPipedriveClient(): this { return this.addStep(new PipedriveClientStep()); }
	addServerEntry(): this    { return this.addStep(new ServerEntryStep()); }
	addPackageJson(): this    { return this.addStep(new PackageJsonStep()); }
	addTsConfig(): this       { return this.addStep(new TsConfigStep()); }
	addEnvExample(): this     { return this.addStep(new EnvExampleStep()); }

	when(condition: boolean, fn: (b: this) => void): this {
		if (condition) fn(this);
		return this;
	}

	async build(): Promise<void> {
		for (const step of this.steps) {
			await step.execute(this.outputDir, this.options);
		}
	}
}
