export function expressRouterFile(): string {
	return `import { Router } from 'express';\n\nexport default Router();`;
}

export function routerMount(path: string, routerName: string): string {
	return `app.use('${path}', ${routerName});`;
}

export function envVarAccess(key: string, fallback?: string): string {
	return fallback ? `process.env.${key} ?? '${fallback}'` : `process.env.${key}`;
}
