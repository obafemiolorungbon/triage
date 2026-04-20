import { validateEnv } from './env.schema';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://localhost:5432/t',
    REDIS_URL: 'redis://localhost:6379',
    BETTER_AUTH_SECRET: 'x'.repeat(32),
  };

  it('parses valid config', () => {
    const out = validateEnv(base);
    expect(out).not.toHaveProperty('_INVALID');
    if ('PORT' in (out as object)) {
      expect((out as { PORT: number }).PORT).toBe(4200);
    }
  });

  it('parses BULL_BOARD_ENABLED with trimmed yes', () => {
    const out = validateEnv({ ...base, BULL_BOARD_ENABLED: ' YES ' });
    expect((out as { BULL_BOARD_ENABLED: boolean }).BULL_BOARD_ENABLED).toBe(
      true,
    );
  });

  it('returns invalid when secret too short', () => {
    const out = validateEnv({
      ...base,
      BETTER_AUTH_SECRET: 'short',
    });
    expect(out).toMatchObject({ _INVALID: true });
  });

  it('parses BULL_BOARD_ENABLED truthy strings', () => {
    const out = validateEnv({
      ...base,
      BULL_BOARD_ENABLED: 'true',
    });
    expect(out).not.toHaveProperty('_INVALID');
    if (!('error' in (out as object))) {
      expect((out as { BULL_BOARD_ENABLED: boolean }).BULL_BOARD_ENABLED).toBe(
        true,
      );
    }
  });

  it('parses BULL_BOARD_ENABLED as false when absent or other', () => {
    const absent = validateEnv({ ...base });
    expect(absent).not.toHaveProperty('_INVALID');
    expect(
      (absent as { BULL_BOARD_ENABLED?: boolean }).BULL_BOARD_ENABLED,
    ).toBe(false);

    const no = validateEnv({ ...base, BULL_BOARD_ENABLED: '0' });
    expect((no as { BULL_BOARD_ENABLED: boolean }).BULL_BOARD_ENABLED).toBe(
      false,
    );
  });
});
