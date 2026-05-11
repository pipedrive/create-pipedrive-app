import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptAppExtensions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns empty array when user declines', async () => {
		vi.mocked(clack.confirm).mockResolvedValue(false);
		vi.mocked(clack.isCancel).mockReturnValue(false);
		const { promptAppExtensions } = await import('./appExtensions.js');
		const result = await promptAppExtensions();
		expect(result).toEqual([]);
		expect(clack.multiselect).not.toHaveBeenCalled();
	});

	it('returns selected extension types', async () => {
		vi.mocked(clack.confirm).mockResolvedValue(true);
		vi.mocked(clack.multiselect).mockResolvedValue(['custom-panel', 'custom-modal'] as never);
		vi.mocked(clack.isCancel).mockReturnValue(false);
		const { promptAppExtensions } = await import('./appExtensions.js');
		const result = await promptAppExtensions();
		expect(result).toEqual(['custom-panel', 'custom-modal']);
	});

	it('calls process.exit(0) on cancel at confirm step', async () => {
		vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel') as never);
		vi.mocked(clack.isCancel).mockReturnValue(true);
		vi.mocked(clack.cancel).mockImplementation(() => {});
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const { promptAppExtensions } = await import('./appExtensions.js');
		await promptAppExtensions();
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('calls process.exit(0) on cancel at multiselect step', async () => {
		vi.mocked(clack.confirm).mockResolvedValue(true);
		vi.mocked(clack.multiselect).mockResolvedValue(Symbol('cancel') as never);
		vi.mocked(clack.isCancel).mockReturnValueOnce(false).mockReturnValueOnce(true);
		vi.mocked(clack.cancel).mockImplementation(() => {});
		const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
		const { promptAppExtensions } = await import('./appExtensions.js');
		await promptAppExtensions();
		expect(exitSpy).toHaveBeenCalledWith(0);
	});
});
