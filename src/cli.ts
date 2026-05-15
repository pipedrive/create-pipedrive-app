#!/usr/bin/env node
import * as clack from '@clack/prompts';
import { realpathSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { promptAppExtensions } from './prompts/appExtensions.js';
import { promptDatabase } from './prompts/database.js';
import { promptProjectName } from './prompts/projectName.js';
import { nodeGenerator } from './generators/node/index.js';
import { addAppExtension } from './subcommands/addAppExtension.js';
import type { AppExtensionType, Database } from './generators/interface.js';
import { isAppExtensionType } from './generators/interface.js';

interface NextStepOptions {
	nameOrPath: string;
}

export function nextStepLines(options: NextStepOptions): string[] {
	const steps = [
		`cd ${options.nameOrPath}`,
		'cp .env.example .env',
		'# fill in PIPEDRIVE_CLIENT_ID and PIPEDRIVE_CLIENT_SECRET',
		'docker-compose up --watch',
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

interface ParsedFlags {
	nameOrPath?: string;
	database?: Database;
	appExtensions?: AppExtensionType[];
}

export function parseFlags(argv: string[]): ParsedFlags {
	const { values } = parseArgs({
		args: argv.slice(2),
		options: {
			'project-name': { type: 'string' },
			'database': { type: 'string' },
			'app-extensions': { type: 'string' },
		},
		strict: false,
	});

	const result: ParsedFlags = {};

	if (values['project-name'] !== undefined) {
		const name = values['project-name'] as string;
		if (!name.trim()) throw new Error('--project-name cannot be empty.');
		result.nameOrPath = name.trim();
	}

	if (values['database'] !== undefined) {
		const db = values['database'] as string;
		const valid: Database[] = ['postgres', 'mysql', 'sqlite'];
		if (!valid.includes(db as Database)) {
			throw new Error(`Invalid database "${db}". Choose one of: postgres, mysql, sqlite.`);
		}
		result.database = db as Database;
	}

	if (values['app-extensions'] !== undefined) {
		const raw = values['app-extensions'] as string;
		if (raw === 'none') {
			result.appExtensions = [];
		} else {
			if (raw.includes(',') && raw.split(',').includes('none')) {
				throw new Error('"none" cannot be combined with other extension types.');
			}
			const types = raw.split(',');
			for (const type of types) {
				if (!isAppExtensionType(type)) {
					throw new Error(`Invalid app extension type "${type}". Choose from: custom-panel, custom-modal.`);
				}
			}
			result.appExtensions = types as AppExtensionType[];
		}
	}

	return result;
}

export async function dispatchSubcommand(argv: string[]): Promise<boolean> {
	const subcommand = argv[2];
	const outputDirIdx = argv.indexOf('--output-dir');
	const outputDir = outputDirIdx !== -1 ? argv[outputDirIdx + 1] : undefined;

	if (subcommand === 'add-app-extension') {
		const appExtIdx = argv.indexOf('--app-extensions');
		const appExtValue = appExtIdx !== -1 ? argv[appExtIdx + 1] : undefined;
		let appExtensions: AppExtensionType[] | undefined;
		if (appExtValue !== undefined) {
			if (!isAppExtensionType(appExtValue)) {
				throw new Error(
					`Invalid app extension type "${appExtValue}". Choose from: custom-panel, custom-modal.`,
				);
			}
			appExtensions = [appExtValue];
		}
		await addAppExtension(outputDir, appExtensions);
		return true;
	}

	return false;
}

async function main(): Promise<void> {
	clack.intro('create-pipedrive-app');

	let flags: ReturnType<typeof parseFlags>;
	try {
		flags = parseFlags(process.argv);
	} catch (error) {
		clack.log.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}

	const positional = process.argv[2]?.startsWith('--') ? undefined : process.argv[2];
	const nameOrPath = flags.nameOrPath ?? (await promptProjectName(positional));
	const database = flags.database ?? (await promptDatabase());
	const appExtensions = flags.appExtensions ?? (await promptAppExtensions());

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
	try {
		if (!(await dispatchSubcommand(process.argv))) {
			await main();
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}
