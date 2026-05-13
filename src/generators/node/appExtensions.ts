import type { GeneratorOptions } from '../interface.js';
import { generateFrontend } from './appExtensions/frontend.js';
import { generateCustomModalExtension } from './appExtensions/modal.js';
import { generateCustomPanelExtension } from './appExtensions/panel.js';

export async function generateAppExtensions(outputDir: string, options: GeneratorOptions): Promise<void> {
	const hasPanel = options.appExtensions.includes('custom-panel');
	const hasModal = options.appExtensions.includes('custom-modal');

	if (!hasPanel && !hasModal) return;

	if (hasPanel) {
		await generateCustomPanelExtension(outputDir);
	}

	if (hasModal) {
		await generateCustomModalExtension(outputDir);
	}

	await generateFrontend(outputDir, { hasPanel, hasModal });
}
