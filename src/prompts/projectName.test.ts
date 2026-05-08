import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptProjectName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the entered project name', async () => {
    vi.mocked(clack.text).mockResolvedValue('my-app');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptProjectName } = await import('./projectName.js');
    const result = await promptProjectName();
    expect(result).toBe('my-app');
  });

  it('pre-fills with initial value when provided', async () => {
    vi.mocked(clack.text).mockResolvedValue('prefilled-app');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptProjectName } = await import('./projectName.js');
    await promptProjectName('prefilled-app');
    expect(clack.text).toHaveBeenCalledWith(
      expect.objectContaining({ initialValue: 'prefilled-app' }),
    );
  });

  it('calls process.exit(0) on cancel', async () => {
    vi.mocked(clack.text).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptProjectName } = await import('./projectName.js');
    await promptProjectName();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
