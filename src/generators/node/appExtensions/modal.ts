import { join } from 'path';
import { writeFile } from '../../../utils/writeFile.js';
import { routerContent } from './router.js';

export async function generateCustomModalExtension(outputDir: string): Promise<void> {
	await writeFile(join(outputDir, 'src/app-extensions/modal/index.ts'), routerContent());
}
