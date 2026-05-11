import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';

export async function generateDatabase(outputDir: string, _options: GeneratorOptions): Promise<void> {
	await writeFile(join(outputDir, 'src/database/index.ts'), `export {};\n`);
}
