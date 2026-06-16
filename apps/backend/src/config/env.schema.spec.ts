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
      expect(
        (out as { ASSISTANT_TIMEOUT_MS: number }).ASSISTANT_TIMEOUT_MS,
      ).toBe(120_000);
    }
  });

  it('parses a configured assistant timeout', () => {
    const out = validateEnv({ ...base, ASSISTANT_TIMEOUT_MS: '180000' });
    expect(out).not.toHaveProperty('_INVALID');
    expect((out as { ASSISTANT_TIMEOUT_MS: number }).ASSISTANT_TIMEOUT_MS).toBe(
      180_000,
    );
  });

  it('rejects assistant timeouts longer than 30 minutes', () => {
    const out = validateEnv({
      ...base,
      ASSISTANT_TIMEOUT_MS: 30 * 60_000 + 1,
    });
    expect(out).toMatchObject({ _INVALID: true });
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

  it('requires Bull Board basic auth when enabled in production', () => {
    const out = validateEnv({
      ...base,
      NODE_ENV: 'production',
      BULL_BOARD_ENABLED: 'true',
    });
    expect(out).toMatchObject({ _INVALID: true });
  });

  it('allows Bull Board in production when basic auth is configured', () => {
    const out = validateEnv({
      ...base,
      NODE_ENV: 'production',
      BULL_BOARD_ENABLED: 'true',
      BULL_BOARD_USER: 'ops',
      BULL_BOARD_PASSWORD: 'queue-dashboard-password',
    });
    expect(out).not.toHaveProperty('_INVALID');
  });
});
