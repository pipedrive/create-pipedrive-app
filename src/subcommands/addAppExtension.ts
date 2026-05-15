import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AppExtensionType } from '../generators/interface.js';
import { NodeProjectBuilder } from '../generators/node/projectBuilder.js';
import { promptAppExtensions } from '../prompts/appExtensions.js';

export async function addAppExtension(
	outputDir: string = process.cwd(),
	appExtensions?: AppExtensionType[],
): Promise<void> {
	const resolved = resolve(outputDir);
	if (!existsSync(join(resolved, 'package.json'))) {
		throw new Error(`No package.json found in ${resolved}. Run this command from your project root.`);
	}
	const extensions = appExtensions ?? (await promptAppExtensions());
	await new NodeProjectBuilder(resolved, { appExtensions: extensions }).addAppExtensions().build();
}
