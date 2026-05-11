import { describe, expect, it } from 'vitest';
import { expressRouterFile, routerMount, envVarAccess, RouterMountBuilder } from './templates.js';

describe('expressRouterFile', () => {
	it('returns an express Router import and default export', () => {
		const out = expressRouterFile();
		expect(out).toContain("from 'express'");
		expect(out).toContain('Router()');
		expect(out).toContain('export default');
	});
});

describe('routerMount', () => {
	it('returns an app.use() call with the given path and router name', () => {
		expect(routerMount('/oauth', 'oauthRouter')).toBe("app.use('/oauth', oauthRouter);");
	});
});

describe('envVarAccess', () => {
	it('returns process.env.KEY without fallback', () => {
		expect(envVarAccess('PORT')).toBe('process.env.PORT');
	});

	it('returns process.env.KEY ?? fallback with fallback', () => {
		expect(envVarAccess('PORT', '3000')).toBe("process.env.PORT ?? '3000'");
	});
});

describe('RouterMountBuilder', () => {
	it('builds mount statements in insertion order', () => {
		const out = new RouterMountBuilder().add('/oauth', 'oauthRouter').add('/webhooks', 'webhooksRouter').build();
		expect(out).toBe("app.use('/oauth', oauthRouter);\napp.use('/webhooks', webhooksRouter);");
	});

	it('addIf(true) includes the mount', () => {
		const out = new RouterMountBuilder().addIf(true, '/webhooks', 'webhooksRouter').build();
		expect(out).toContain("app.use('/webhooks', webhooksRouter);");
	});

	it('addIf(false) excludes the mount', () => {
		const out = new RouterMountBuilder().addIf(false, '/webhooks', 'webhooksRouter').build();
		expect(out).toBe('');
	});
});
