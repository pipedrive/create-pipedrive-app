import type { Generator, GeneratorOptions } from '../interface.js';
import { NodeProjectBuilder } from './projectBuilder.js';

export const nodeGenerator: Generator = {
	async generate(outputDir: string, options: GeneratorOptions): Promise<void> {
		await new NodeProjectBuilder(outputDir, options)
			.addDatabase()
			.addOAuth()
			.addApp()
			.when(options.appExtensions.length > 0, (b) => b.addAppExtensions())
			.addPipedriveClient()
			.addServerEntry()
			.addPackageJson()
			.addTsConfig()
			.addEnvExample()
			.build();
	},
};
