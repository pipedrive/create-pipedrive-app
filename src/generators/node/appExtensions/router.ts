import dedent from 'dedent';

export function routerContent(): string {
	return dedent`
		import { existsSync } from 'node:fs';
		import { join } from 'node:path';
		import { Router, type RequestHandler } from 'express';

		const router = Router();
		const distPath = join(process.cwd(), 'frontend/app-extension-ui/dist');
		const indexHtmlPath = join(distPath, 'index.html');

		const requireFrontendBuild: RequestHandler = (_req, res, next) => {
			if (!existsSync(indexHtmlPath)) {
				res.status(503).send('App Extension UI has not been built. Run npm run build:frontend before serving this route.');
				return;
			}

			next();
		};

		router.get('*', requireFrontendBuild, (_req, res) => {
			res.sendFile(indexHtmlPath);
		});

		export default router;
	`;
}
