export function expressRouterFile(): string {
	return `import { Router } from 'express';\n\nexport default Router();`;
}

export function routerMount(path: string, routerName: string): string {
	return `app.use('${path}', ${routerName});`;
}

export function envVarAccess(key: string, fallback?: string): string {
	return fallback ? `process.env.${key} ?? '${fallback}'` : `process.env.${key}`;
}

export class RouterMountBuilder {
	private mounts: string[] = [];

	add(path: string, routerName: string): this {
		this.mounts.push(routerMount(path, routerName));
		return this;
	}

	addIf(condition: boolean, path: string, routerName: string): this {
		if (condition) this.mounts.push(routerMount(path, routerName));
		return this;
	}

	build(): string {
		return this.mounts.join('\n');
	}
}
