import { outputFile } from 'fs-extra';
import { format, resolveConfig } from 'prettier';

export async function writeFile(filePath: string, content: string): Promise<void> {
  let formatted: string;
  try {
    const config = await resolveConfig(filePath);
    formatted = await format(content, { ...config, filepath: filePath });
  } catch {
    formatted = content;
  }
  await outputFile(filePath, formatted);
}
