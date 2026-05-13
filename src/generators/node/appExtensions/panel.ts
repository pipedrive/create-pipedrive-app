import dedent from 'dedent';
import { join } from 'path';
import { writeFile } from '../../../utils/writeFile.js';
import { routerContent } from './router.js';

export interface ReactSnippetContribution {
	sdkImports: string[];
	handlers: string[];
	buttons: string[];
}

export async function generateCustomPanelExtension(outputDir: string): Promise<void> {
	await writeFile(join(outputDir, 'src/app-extensions/panel/index.ts'), routerContent());
}

export function panelReactSnippets(hasModal: boolean): ReactSnippetContribution {
	if (!hasModal) {
		return {
			sdkImports: [],
			handlers: [],
			buttons: [],
		};
	}

	return {
		sdkImports: ['Command', 'Modal'],
		handlers: [
			dedent`
				async function openCustomModal(): Promise<void> {
					await runSdkAction('Custom modal opened', (client) =>
						client.execute(Command.OPEN_MODAL, {
							type: Modal.CUSTOM_MODAL,
							action_id: EXTENSION_CONFIG.modalActionId,
							data: {
								source: 'panel',
							},
						}),
					);
				}
			`,
		],
		buttons: [
			dedent`
				{surface === 'panel' && (
					<button type="button" disabled={!isReady} onClick={openCustomModal}>
						Open modal
					</button>
				)}
			`,
		],
	};
}
