import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../utils/writeFile.js';
import type { GeneratorOptions } from '../interface.js';
import { SourceFileBuilder } from '../../utils/sourceFileBuilder.js';
import { RouterMountBuilder } from '../../utils/templates.js';

export async function generateApp(outputDir: string, options: GeneratorOptions): Promise<void> {
	const hasPanel = options.appExtensions.includes('custom-panel');
	const hasModal = options.appExtensions.includes('custom-modal');
	const hasAppExtensions = hasPanel || hasModal;

	const mounts = new RouterMountBuilder()
		.add('/oauth', 'oauthRouter')
		.addIf(hasPanel, '/extensions/panel', 'panelRouter')
		.addIf(hasModal, '/extensions/modal', 'modalRouter')
		.build();

	const rootRoute = dedent`
		app.get('/', async (_req, res, next) => {
			try {
				const rows = await db.select().from(pipedriveTokens).orderBy(desc(pipedriveTokens.updatedAt)).limit(1);
				if (!rows[0]) {
					res.redirect(createAuthRedirect());
					return;
				}
				const client = await getClient(rows[0].pipedriveCompanyId);
				const deals = await client.deals.getDeals();
				res.json(deals);
			} catch (err) {
				next(err);
			}
		});
	`;

	const errorHandler = dedent`
		app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
			console.error(err);
			res.status(500).send(err.message);
		});
	`;

	const content = new SourceFileBuilder()
		.importDefault('express', 'express')
		.import('express', ['NextFunction', 'Request', 'Response'])
		.importIf(hasAppExtensions, 'node:path', ['join'])
		.importDefault('./oauth/index.js', 'oauthRouter')
		.import('./oauth/index.js', ['createAuthRedirect'])
		.import('./pipedrive/client.js', ['getClient'])
		.import('./database/index.js', ['db'])
		.import('./database/schema.js', ['pipedriveTokens'])
		.import('drizzle-orm', ['desc'])
		.importDefaultIf(hasPanel, './app-extensions/panel/index.js', 'panelRouter')
		.importDefaultIf(hasModal, './app-extensions/modal/index.js', 'modalRouter')
		.addBlock('const app = express();')
		.addBlock(rootRoute)
		.addBlockIf(
			hasAppExtensions,
			"const appExtensionAssetsPath = join(process.cwd(), 'frontend/app-extension-ui/dist/assets');",
		)
		.addBlockIf(hasAppExtensions, "app.use('/extensions/assets', express.static(appExtensionAssetsPath));")
		.addBlock(mounts)
		.addBlock(errorHandler)
		.exportDefault('app')
		.build();

	await writeFile(join(outputDir, 'src/app.ts'), content);
}
