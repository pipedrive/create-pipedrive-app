import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateApp(outputDir: string, options: GeneratorOptions): Promise<void> {
  const webhooksImport = options.webhooks
    ? `import webhooksRouter from './webhooks/index.js';`
    : '';
  const panelImport = options.appExtensions.includes('custom-panel')
    ? `import panelRouter from './app-extensions/panel/index.js';`
    : '';
  const modalImport = options.appExtensions.includes('custom-modal')
    ? `import modalRouter from './app-extensions/modal/index.js';`
    : '';

  const webhooksMount = options.webhooks ? `app.use('/webhooks', webhooksRouter);` : '';
  const panelMount = options.appExtensions.includes('custom-panel')
    ? `app.use('/extensions/panel', panelRouter);`
    : '';
  const modalMount = options.appExtensions.includes('custom-modal')
    ? `app.use('/extensions/modal', modalRouter);`
    : '';

  const content = `import express from 'express';
import oauthRouter from './oauth/index.js';
${webhooksImport}
${panelImport}
${modalImport}

const app = express();

app.use('/oauth', oauthRouter);
${webhooksMount}
${panelMount}
${modalMount}

export default app;
`;

  await writeFile(join(outputDir, 'src/app.ts'), content);
}
