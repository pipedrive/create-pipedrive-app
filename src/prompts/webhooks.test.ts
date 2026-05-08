import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when confirmed', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(true);
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptWebhooks } = await import('./webhooks.js');
    const result = await promptWebhooks();
    expect(result).toBe(true);
  });

  it('returns false when declined', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(false);
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptWebhooks } = await import('./webhooks.js');
    const result = await promptWebhooks();
    expect(result).toBe(false);
  });

  it('calls process.exit(0) on cancel', async () => {
    vi.mocked(clack.confirm).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptWebhooks } = await import('./webhooks.js');
    await promptWebhooks();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
