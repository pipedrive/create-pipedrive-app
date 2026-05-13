import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../../utils/writeFile.js';
import type { ReactSnippetContribution } from './panel.js';
import { routerContent } from './router.js';

export async function generateCustomModalExtension(outputDir: string): Promise<void> {
	await writeFile(join(outputDir, 'src/app-extensions/modal/index.ts'), routerContent());
}

export function modalReactSnippets(): ReactSnippetContribution {
	return {
		sdkImports: ['Command'],
		handlers: [
			dedent`
				async function closeModal(): Promise<void> {
					await runSdkAction('Modal close requested', (client) => client.execute(Command.CLOSE_MODAL));
				}
			`,
		],
		buttons: [
			dedent`
				{surface === 'modal' && (
					<button type="button" disabled={!isReady} onClick={closeModal}>
						Close modal
					</button>
				)}
			`,
		],
	};
}
