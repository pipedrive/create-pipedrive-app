import * as clack from '@clack/prompts';
import { realpathSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promptAppExtensions } from './prompts/appExtensions.js';
import { promptDatabase } from './prompts/database.js';
import { promptProjectName } from './prompts/projectName.js';
import { nodeGenerator } from './generators/node/index.js';

interface NextStepOptions {
	nameOrPath: string;
}

export function nextStepLines(options: NextStepOptions): string[] {
	const steps = [
		`cd ${options.nameOrPath}`,
		'cp .env.example .env',
		'# fill in PIPEDRIVE_CLIENT_ID and PIPEDRIVE_CLIENT_SECRET',
		'docker-compose up',
	];

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

	const outputDir = resolve(process.cwd(), nameOrPath);
	const projectName = basename(outputDir);

	try {
		await nodeGenerator.generate(outputDir, { projectName, database, appExtensions });
	} catch (error) {
		clack.log.error(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}

	clack.outro(`✓ Created ${projectName}`);

	printNextSteps({ nameOrPath });
}

if (isCliEntrypoint(import.meta.url, process.argv[1])) {
	void main();
}
