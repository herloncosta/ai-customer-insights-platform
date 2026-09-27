import { describe, expect, it, vi } from 'vitest';

describe('logger env', () => {
  it('usa defaults sem env', async () => {
    const prev = { level: process.env.LOG_LEVEL, file: process.env.LOG_FILE };
    try {
      delete process.env.LOG_LEVEL;
      delete process.env.LOG_FILE;
      vi.resetModules();
      const mod = await import('./logger');
      expect(mod.logger.level).toBe('info');
    } finally {
      if (prev.level !== undefined) process.env.LOG_LEVEL = prev.level;
      if (prev.file !== undefined) process.env.LOG_FILE = prev.file;
      vi.resetModules();
    }
  });
});
