import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { generateApp } from './app.js';
import { generateAppExtensions } from './appExtensions.js';
import { generateCrypto } from './crypto.js';
import { generateDatabase } from './database.js';
import { generateOauth } from './oauth.js';
import { generatePipedriveClient } from './pipedriveClient.js';
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

class CryptoStep implements BuildStep {
	async execute(outputDir: string, _options: GeneratorOptions): Promise<void> {
		await generateCrypto(outputDir);
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
				const STARTUP_RETRY_ATTEMPTS = 60;
				const STARTUP_RETRY_DELAY_MS = 1000;

				async function waitForDatabase(): Promise<void> {
					for (let attempt = 1; attempt <= STARTUP_RETRY_ATTEMPTS; attempt++) {
						try {
							await runMigrations();
							return;
						} catch (error) {
							if (attempt === STARTUP_RETRY_ATTEMPTS) throw error;

							const message = error instanceof Error ? error.message : String(error);
							console.warn(
								\`Database is not ready yet (\${attempt}/\${STARTUP_RETRY_ATTEMPTS}): \${message}\`,
							);
							await new Promise<void>((resolve) => setTimeout(resolve, STARTUP_RETRY_DELAY_MS));
						}
					}
				}

				await waitForDatabase();
				app.listen(PORT, () => {
					console.log(\`Server running at http://localhost:\${PORT}\`);
				});
			`,
		);
	}
}

class PackageJsonStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		const hasAppExtensions = options.appExtensions.length > 0;
		const dbDrivers: Record<GeneratorOptions['database'], Record<string, string>> = {
			postgres: { postgres: '^3.4.0' },
			mysql: { mysql2: '^3.9.0' },
			sqlite: { '@libsql/client': '^0.14.0' },
		};

		const dbDevDrivers: Record<GeneratorOptions['database'], Record<string, string>> = {
			postgres: {},
			mysql: {},
			sqlite: {},
		};

		const pkg = {
			name: options.projectName,
			version: '0.1.0',
			type: 'module',
			scripts: {
				'dev': 'tsx watch --env-file=.env src/index.ts',
				...(hasAppExtensions
					? {
							'dev:frontend': 'vite --config frontend/app-extension-ui/vite.config.ts',
							'build:frontend': 'vite build --config frontend/app-extension-ui/vite.config.ts',
							'preview:frontend': 'vite preview --config frontend/app-extension-ui/vite.config.ts',
						}
					: {}),
				'build': hasAppExtensions
					? 'tsc && vite build --config frontend/app-extension-ui/vite.config.ts'
					: 'tsc',
				'start': 'node --env-file=.env dist/index.js',
				'typecheck': hasAppExtensions
					? 'tsc --noEmit && tsc --noEmit -p frontend/app-extension-ui/tsconfig.json'
					: 'tsc --noEmit',
				'db:migrate': 'drizzle-kit migrate',
			},
			dependencies: {
				'express': '^4.19.0',
				'drizzle-orm': '^0.45.0',
				'pipedrive': '^32.0.0',
				...(hasAppExtensions
					? {
							'@pipedrive/app-extensions-sdk': '^0.13.1',
							'react': '^18.2.0',
							'react-dom': '^18.2.0',
							'react-router-dom': '^6.22.0',
						}
					: {}),
				...dbDrivers[options.database],
			},
			devDependencies: {
				'typescript': '^5.4.0',
				'@types/express': '^4.17.0',
				'@types/node': '^20.0.0',
				'tsx': '^4.21.0',
				'drizzle-kit': '^0.31.0',
				...(hasAppExtensions
					? {
							'@types/react': '^18.2.0',
							'@types/react-dom': '^18.2.0',
							'@vitejs/plugin-react': '^4.2.0',
							'vite': '^5.2.0',
						}
					: {}),
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
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		const databaseUrlExample: Record<GeneratorOptions['database'], string> = {
			postgres: `postgresql://app:app@localhost:5432/${options.projectName}`,
			mysql: `mysql://app:app@localhost:3307/${options.projectName}`,
			sqlite: 'file:./data.db',
		};
		const extensionUrls = appExtensionEnvExample(options);

		await writeFile(
			join(outputDir, '.env.example'),
			dedent`
				PIPEDRIVE_CLIENT_ID=
				PIPEDRIVE_CLIENT_SECRET=
				PIPEDRIVE_REDIRECT_URI=http://localhost:3000/oauth/callback
				DATABASE_URL=${databaseUrlExample[options.database]}
				PORT=3000
				ENCRYPTION_KEY=
				# generate with: openssl rand -hex 32
				${extensionUrls}
			`,
		);
	}
}

class ReadmeStep implements BuildStep {
	async execute(outputDir: string, options: GeneratorOptions): Promise<void> {
		await writeFile(join(outputDir, 'README.md'), readmeContent(options));
	}
}

function appExtensionEnvExample(options: GeneratorOptions): string {
	const lines: string[] = [];

	if (options.appExtensions.includes('custom-panel')) {
		lines.push(
			'# Custom panel iframe URLs:',
			'# Local: https://<your-vite-tunnel>/extensions/panel',
			'# Production: https://<your-backend-domain>/extensions/panel',
		);
	}

	if (options.appExtensions.includes('custom-modal')) {
		lines.push(
			'# Custom modal iframe URLs:',
			'# Local: https://<your-vite-tunnel>/extensions/modal',
			'# Production: https://<your-backend-domain>/extensions/modal',
			'VITE_CUSTOM_MODAL_ACTION_ID=',
			'# Paste the "Extension identifier" from Marketplace Developer Hub → App Extensions',
		);
	}

	return lines.length > 0 ? `\n${lines.join('\n')}` : '';
}

function readmeContent(options: GeneratorOptions): string {
	const needsDocker = options.database === 'postgres' || options.database === 'mysql';
	const setupCommands =
		options.appExtensions.length > 0
			? ['cp .env.example .env', 'docker-compose up --watch']
			: [
					'cp .env.example .env',
					...(needsDocker ? ['docker-compose up -d db'] : []),
					'npm install',
					'npm run dev',
				];
	const appExtensionsSection =
		options.appExtensions.length > 0
			? dedent`
				## App Extensions

				This project includes a React + Vite custom UI extension under \`frontend/app-extension-ui\`. It initializes \`@pipedrive/app-extensions-sdk\`, reads iframe query params, follows the user's light or dark theme, and exposes example SDK actions.

				For local development, run \`docker-compose up --watch\`. It starts the backend and Vite dev server in containers, then syncs code changes into both services. Expose the Vite server through a public HTTPS tunnel and configure Developer Hub iframe URLs to use the tunnel:

				${options.appExtensions.includes('custom-panel') ? '- Custom panel: `https://<your-vite-tunnel>/extensions/panel`' : ''}
				${options.appExtensions.includes('custom-modal') ? '- Custom modal: `https://<your-vite-tunnel>/extensions/modal`' : ''}

				For production, run \`npm run build\` and point Developer Hub to your backend-hosted URLs:

				${options.appExtensions.includes('custom-panel') ? '- Custom panel: `https://<your-backend-domain>/extensions/panel`' : ''}
				${options.appExtensions.includes('custom-modal') ? '- Custom modal: `https://<your-backend-domain>/extensions/modal`' : ''}
			`
			: '';

	return dedent`
		# ${options.projectName}

		Generated Pipedrive Marketplace app using Express, TypeScript, and Drizzle ORM.

		## Setup

		\`\`\`bash
		${setupCommands.join('\n')}
		\`\`\`

		Fill in \`PIPEDRIVE_CLIENT_ID\`, \`PIPEDRIVE_CLIENT_SECRET\`, \`PIPEDRIVE_REDIRECT_URI\`, and \`DATABASE_URL\` in \`.env\`.

		## Scripts

		- \`npm run dev\` starts the backend server locally.
		- \`npm run typecheck\` checks TypeScript.
		- \`npm run build\` builds the generated project.
		${options.appExtensions.length > 0 ? '- `docker-compose up --watch` starts the backend and App Extensions Vite server in containers with Compose Watch.' : ''}

		${appExtensionsSection}
	`;
}

export class NodeProjectBuilder {
	private steps: BuildStep[] = [];
	private options: GeneratorOptions;

	constructor(
		private outputDir: string,
		options: Partial<GeneratorOptions> = {},
	) {
		this.options = {
			projectName: options.projectName ?? '',
			database: options.database ?? 'postgres',
			appExtensions: options.appExtensions ?? [],
		};
	}

	addStep(step: BuildStep): this {
		this.steps.push(step);
		return this;
	}

	addOAuth(): this {
		return this.addStep(new OAuthStep());
	}
	addDatabase(): this {
		return this.addStep(new DatabaseStep());
	}
	addApp(): this {
		return this.addStep(new AppStep());
	}
	addAppExtensions(): this {
		return this.addStep(new AppExtensionsStep());
	}
	addPipedriveClient(): this {
		return this.addStep(new PipedriveClientStep());
	}
	addCrypto(): this {
		return this.addStep(new CryptoStep());
	}
	addServerEntry(): this {
		return this.addStep(new ServerEntryStep());
	}
	addPackageJson(): this {
		return this.addStep(new PackageJsonStep());
	}
	addTsConfig(): this {
		return this.addStep(new TsConfigStep());
	}
	addEnvExample(): this {
		return this.addStep(new EnvExampleStep());
	}
	addReadme(): this {
		return this.addStep(new ReadmeStep());
	}

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
