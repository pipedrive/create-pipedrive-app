import { outputFile } from 'fs-extra';
import { format, resolveConfig } from 'prettier';

export async function writeFile(filePath: string, content: string): Promise<void> {
  let formatted: string;
  try {
    const config = await resolveConfig(filePath);
    formatted = await format(content, { singleQuote: true, ...config, filepath: filePath });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No parser could be inferred')) {
      formatted = content;
    } else {
      throw error;
    }
  }
  await outputFile(filePath, formatted);
}
