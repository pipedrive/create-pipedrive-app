import * as clack from '@clack/prompts';

export async function promptProjectName(initial?: string): Promise<string> {
  const value = await clack.text({
    message: 'Project name?',
    initialValue: initial,
    validate: (v) => {
      if (!v.trim()) return 'Project name is required';
    },
  });

  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return value as string;
}
