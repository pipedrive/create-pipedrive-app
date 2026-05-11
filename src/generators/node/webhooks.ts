import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateWebhooks(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await writeFile(
		join(outputDir, 'src/webhooks/index.ts'),
		dedent`
      import { Router } from 'express';
      export default Router();
    `,
	);
}
