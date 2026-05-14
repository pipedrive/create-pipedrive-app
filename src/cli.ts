import * as clack from '@clack/prompts';
import { spawn } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promptAppExtensions } from './prompts/appExtensions.js';
import { promptDatabase } from './prompts/database.js';
import { promptProjectName } from './prompts/projectName.js';
import { promptWebhooks } from './prompts/webhooks.js';
import { nodeGenerator } from './generators/node/index.js';
import type { Database } from './generators/interface.js';

interface NextStepOptions {
	nameOrPath: string;
	database: Database;
	installDeps: boolean;
	hasAppExtensions: boolean;
}

export function nextStepLines(options: NextStepOptions): string[] {
	const needsDocker = options.database === 'postgres' || options.database === 'mysql';
	const runWithCompose = options.hasAppExtensions;

	const steps = [`cd ${options.nameOrPath}`, 'cp .env.example .env'];

	if (runWithCompose) {
		steps.push('docker-compose up --watch');
	} else {
		if (needsDocker) steps.push('docker-compose up -d db');
		if (!options.installDeps) steps.push('npm install');
		steps.push('npm run dev');
	}

	return ['', 'Next steps:', ...steps.map((s) => `  ${s}`)];
}

function printNextSteps(options: NextStepOptions): void {
	for (const line of nextStepLines(options)) {
		console.log(line);
	}
}

type ResolvePath = (path: string) => string;

export function isCliEntrypoint(
	importMetaUrl: string,
	argvPath: string | undefined,
	resolvePath: ResolvePath = realpathSync,
): boolean {
	if (!argvPath) return false;

	try {
		return resolvePath(fileURLToPath(importMetaUrl)) === resolvePath(argvPath);
	} catch {
		return importMetaUrl === pathToFileURL(argvPath).href;
	}
}

async function main(): Promise<void> {
	clack.intro('create-pipedrive-app');

	const nameOrPath = await promptProjectName(process.argv[2]);
	const database = await promptDatabase();
	const appExtensions = await promptAppExtensions();
	const webhooks = await promptWebhooks();

	const outputDir = resolve(process.cwd(), nameOrPath);
	const projectName = basename(outputDir);

	try {
		await nodeGenerator.generate(outputDir, { projectName, database, appExtensions, webhooks });
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

	printNextSteps({
		nameOrPath,
		database,
		installDeps: Boolean(installDeps),
		hasAppExtensions: appExtensions.length > 0,
	});
}

if (isCliEntrypoint(import.meta.url, process.argv[1])) {
	void main();
}
