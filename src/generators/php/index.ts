import type { Generator, GeneratorOptions } from '../interface.js';

export const phpGenerator: Generator = {
  async generate(_outputDir: string, _options: GeneratorOptions): Promise<void> {
    throw new Error('PHP generator is not yet implemented');
  },
};
