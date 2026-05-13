import * as clack from '@clack/prompts';
import { spawn } from 'node:child_process';
import { basename, resolve } from 'node:path';
import { promptAppExtensions } from './prompts/appExtensions.js';
import { promptDatabase } from './prompts/database.js';
import { promptProjectName } from './prompts/projectName.js';
import { nodeGenerator } from './generators/node/index.js';

async function main(): Promise<void> {
	clack.intro('create-pipedrive-app');

	const nameOrPath = await promptProjectName(process.argv[2]);
	const database = await promptDatabase();
	const appExtensions = await promptAppExtensions();

	const outputDir = resolve(process.cwd(), nameOrPath);
	const projectName = basename(outputDir);

	try {
		await nodeGenerator.generate(outputDir, { projectName, database, appExtensions });
	} catch (error) {
		clack.log.error(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}

	clack.outro(`✓ Created ${projectName}`);

	const installDeps = await clack.confirm({ message: 'Install dependencies now?' });
	if (clack.isCancel(installDeps)) process.exit(0);

	if (installDeps) {
		const spinner = clack.spinner();
		spinner.start('Installing dependencies');
		const ok = await new Promise<boolean>((resolve) => {
			const child = spawn('npm', ['install'], { cwd: outputDir, stdio: 'ignore' });
			child.on('close', (code) => resolve(code === 0));
		});
		spinner.stop(ok ? 'Dependencies installed' : 'npm install failed — run it manually');
	}

	console.log('\nNext steps:');
	console.log(`  cd ${nameOrPath}`);
	console.log('  cp .env.example .env');
	console.log('  # fill in PIPEDRIVE_CLIENT_ID and PIPEDRIVE_CLIENT_SECRET');
	if (!installDeps) console.log('  npm install');
	console.log('  docker compose up');
}

main();
