export type Database = 'postgres' | 'mysql' | 'sqlite';
export type AppExtensionType = 'custom-panel' | 'custom-modal';

export interface GeneratorOptions {
	projectName: string;
	database: Database;
	webhooks: boolean;
	appExtensions: AppExtensionType[];
}

export interface Generator {
	generate(outputDir: string, options: GeneratorOptions): Promise<void>;
}
