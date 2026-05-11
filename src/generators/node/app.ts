import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { SourceFileBuilder } from '../../utils/sourceFileBuilder.js';
import { RouterMountBuilder } from '../../utils/templates.js';

export async function generateApp(outputDir: string, options: GeneratorOptions): Promise<void> {
	const hasPanel = options.appExtensions.includes('custom-panel');
	const hasModal = options.appExtensions.includes('custom-modal');

	const mounts = new RouterMountBuilder()
		.add('/oauth', 'oauthRouter')
		.addIf(options.webhooks, '/webhooks', 'webhooksRouter')
		.addIf(hasPanel, '/extensions/panel', 'panelRouter')
		.addIf(hasModal, '/extensions/modal', 'modalRouter')
		.build();

	const content = new SourceFileBuilder()
		.importDefault('express', 'express')
		.importDefault('./oauth/index.js', 'oauthRouter')
		.importDefaultIf(options.webhooks, './webhooks/index.js', 'webhooksRouter')
		.importDefaultIf(hasPanel, './app-extensions/panel/index.js', 'panelRouter')
		.importDefaultIf(hasModal, './app-extensions/modal/index.js', 'modalRouter')
		.addBlock('const app = express();')
		.addBlock(mounts)
		.exportDefault('app')
		.build();

	await writeFile(join(outputDir, 'src/app.ts'), content);
}
