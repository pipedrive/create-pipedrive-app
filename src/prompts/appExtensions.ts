import * as clack from '@clack/prompts';
import type { AppExtensionType } from '../generators/interface.js';

export async function promptAppExtensions(): Promise<AppExtensionType[]> {
	const include = await clack.confirm({ message: 'Include App Extensions?' });

	if (clack.isCancel(include)) {
		clack.cancel('Operation cancelled');
		process.exit(0);
	}

	if (!include) return [];

	const types = await clack.multiselect({
		message: 'Which type(s)?',
		options: [
			{ value: 'custom-panel' as const, label: 'Custom Panel' },
			{ value: 'custom-modal' as const, label: 'Custom Modal' },
		],
		required: true,
	});

	if (clack.isCancel(types)) {
		clack.cancel('Operation cancelled');
		process.exit(0);
	}

	return types as AppExtensionType[];
}
