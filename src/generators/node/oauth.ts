import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { expressRouterFile } from '../../utils/templates.js';

export async function generateOauth(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await writeFile(join(outputDir, 'src/oauth/index.ts'), expressRouterFile());
}
