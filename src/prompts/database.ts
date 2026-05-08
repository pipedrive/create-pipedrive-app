import * as clack from '@clack/prompts';
import type { Database } from '../generators/interface.js';

export async function promptDatabase(): Promise<Database> {
  const value = await clack.select({
    message: 'Database?',
    options: [
      { value: 'postgres' as const, label: 'Postgres' },
      { value: 'mysql' as const, label: 'MySQL' },
      { value: 'sqlite' as const, label: 'SQLite' },
    ],
  });

  if (clack.isCancel(value)) {
    clack.cancel('Operation cancelled');
    process.exit(0);
  }

  return value as Database;
}
