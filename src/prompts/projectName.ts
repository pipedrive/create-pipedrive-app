import * as clack from '@clack/prompts';
import { basename } from 'path';

export async function promptProjectName(initial?: string): Promise<string> {
	const value = await clack.text({
		message: 'Project name or path?',
		initialValue: initial,
		validate: (v) => {
			const trimmed = v.trim();
			if (!trimmed) return 'Project name is required';
			if (!basename(trimmed)) return 'Path must include a directory name';
		},
	});

	if (clack.isCancel(value)) {
		clack.cancel('Operation cancelled');
		process.exit(0);
	}

	return (value as string).trim();
}
