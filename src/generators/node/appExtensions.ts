import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

const routerStub = dedent`
  import { Router } from 'express';
  export default Router();
`;

export async function generateAppExtensions(outputDir: string, options: GeneratorOptions): Promise<void> {
	if (options.appExtensions.includes('custom-panel')) {
		await writeFile(join(outputDir, 'src/app-extensions/panel/index.ts'), routerStub);
	}
	if (options.appExtensions.includes('custom-modal')) {
		await writeFile(join(outputDir, 'src/app-extensions/modal/index.ts'), routerStub);
	}
}
