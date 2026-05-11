import * as clack from '@clack/prompts';

export async function promptWebhooks(): Promise<boolean> {
	const value = await clack.confirm({ message: 'Include webhooks?' });

	if (clack.isCancel(value)) {
		clack.cancel('Operation cancelled');
		process.exit(0);
	}

	return value as boolean;
}
