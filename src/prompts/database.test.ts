import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as clack from '@clack/prompts';

vi.mock('@clack/prompts');

describe('promptDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the selected database', async () => {
    vi.mocked(clack.select).mockResolvedValue('postgres');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptDatabase } = await import('./database.js');
    const result = await promptDatabase();
    expect(result).toBe('postgres');
  });

  it('presents all three database options', async () => {
    vi.mocked(clack.select).mockResolvedValue('mysql');
    vi.mocked(clack.isCancel).mockReturnValue(false);
    const { promptDatabase } = await import('./database.js');
    await promptDatabase();
    expect(clack.select).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'postgres' }),
          expect.objectContaining({ value: 'mysql' }),
          expect.objectContaining({ value: 'sqlite' }),
        ]),
      }),
    );
  });

  it('calls process.exit(0) on cancel', async () => {
    vi.mocked(clack.select).mockResolvedValue(Symbol('cancel') as never);
    vi.mocked(clack.isCancel).mockReturnValue(true);
    vi.mocked(clack.cancel).mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const { promptDatabase } = await import('./database.js');
    await promptDatabase();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
