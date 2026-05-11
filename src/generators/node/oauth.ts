import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateOauth(outputDir: string, _options: GeneratorOptions): Promise<void> {
  await writeFile(
    join(outputDir, 'src/oauth/index.ts'),
    `
      import { Router } from 'express';
      export default Router();
    `,
  );
}
