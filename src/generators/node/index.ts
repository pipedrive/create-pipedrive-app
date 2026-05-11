import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { Generator, GeneratorOptions } from '../interface.js';
import { generateApp } from './app.js';
import { generateAppExtensions } from './appExtensions.js';
import { generateDatabase } from './database.js';
import { generateOauth } from './oauth.js';
import { generateWebhooks } from './webhooks.js';

export const nodeGenerator: Generator = {
	async generate(outputDir: string, options: GeneratorOptions): Promise<void> {
		await generateOauth(outputDir, options);
		await generateDatabase(outputDir, options);
		await generateApp(outputDir, options);

		if (options.webhooks) {
			await generateWebhooks(outputDir, options);
		}

		if (options.appExtensions.length > 0) {
			await generateAppExtensions(outputDir, options);
		}

		await generateServerEntry(outputDir);
		await generatePackageJson(outputDir, options);
		await generateTsConfig(outputDir);
		await generateEnvExample(outputDir);
	},
};

async function generateServerEntry(outputDir: string): Promise<void> {
	await writeFile(
		join(outputDir, 'src/index.ts'),
		dedent`
      import app from './app.js';

      const PORT = process.env.PORT ?? '3000';
      app.listen(PORT, () => {
        console.log(\`Server running on port \${PORT}\`);
      });
    `,
	);
}

async function generatePackageJson(outputDir: string, options: GeneratorOptions): Promise<void> {
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
			...dbDrivers[options.database],
		},
		devDependencies: {
			typescript: '^5.4.0',
			'@types/express': '^4.17.0',
			'@types/node': '^20.0.0',
			tsx: '^4.7.0',
			'drizzle-kit': '^0.20.0',
			...dbDevDrivers[options.database],
		},
	};
	await writeFile(join(outputDir, 'package.json'), JSON.stringify(pkg, null, 2));
}

async function generateTsConfig(outputDir: string): Promise<void> {
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

async function generateEnvExample(outputDir: string): Promise<void> {
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
