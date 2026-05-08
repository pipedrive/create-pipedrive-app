import * as clack from '@clack/prompts';
import { join } from 'path';
import { promptAppExtensions } from './prompts/appExtensions.js';
import { promptDatabase } from './prompts/database.js';
import { promptProjectName } from './prompts/projectName.js';
import { promptWebhooks } from './prompts/webhooks.js';
import { nodeGenerator } from './generators/node/index.js';

async function main(): Promise<void> {
  clack.intro('create-pipedrive-app');

  const projectName = await promptProjectName(process.argv[2]);
  const database = await promptDatabase();
  const appExtensions = await promptAppExtensions();
  const webhooks = await promptWebhooks();

  const outputDir = join(process.cwd(), projectName);

  try {
    await nodeGenerator.generate(outputDir, { projectName, database, appExtensions, webhooks });
  } catch (error) {
    clack.log.error(
      `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }

  clack.outro(`✓ Created ${projectName}`);

  const needsDocker = database === 'postgres' || database === 'mysql';
  console.log('\nNext steps:');
  console.log(`  cd ${projectName}`);
  console.log('  cp .env.example .env');
  if (needsDocker) console.log('  docker-compose up -d');
  console.log('  npm install');
  console.log('  npm run dev');
}

main();
