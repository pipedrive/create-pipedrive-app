export type Database = 'postgres' | 'mysql' | 'sqlite';

export const APP_EXTENSION_TYPES = ['custom-panel', 'custom-modal'] as const;
export type AppExtensionType = (typeof APP_EXTENSION_TYPES)[number];

export function isAppExtensionType(value: string): value is AppExtensionType {
	return (APP_EXTENSION_TYPES as readonly string[]).includes(value);
}

export interface GeneratorOptions {
	projectName: string;
	database: Database;
	appExtensions: AppExtensionType[];
}

export interface Generator {
	generate(outputDir: string, options: GeneratorOptions): Promise<void>;
}
