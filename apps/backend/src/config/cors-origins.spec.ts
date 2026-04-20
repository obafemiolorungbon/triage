import { getCorsOrigins } from './cors-origins';

describe('getCorsOrigins', () => {
  const orig = { ...process.env };

  afterEach(() => {
    process.env = { ...orig };
  });

  it('uses comma-separated CORS_ORIGINS when set', () => {
    process.env.CORS_ORIGINS = ' https://a.com ,https://b.com ';
    expect(getCorsOrigins()).toEqual(['https://a.com', 'https://b.com']);
  });

  it('dedupes explicit origins', () => {
    process.env.CORS_ORIGINS = 'https://x.com,https://x.com';
    expect(getCorsOrigins()).toEqual(['https://x.com']);
  });

  it('handles single explicit origin', () => {
    process.env.CORS_ORIGINS = 'https://only.one';
    expect(getCorsOrigins()).toEqual(['https://only.one']);
  });

  it('defaults to APP_URL and dev hosts when unset', () => {
    delete process.env.CORS_ORIGINS;
    process.env.APP_URL = 'https://app.example';
    process.env.NODE_ENV = 'development';
    expect(getCorsOrigins()).toEqual(
      expect.arrayContaining([
        'https://app.example',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ]),
    );
  });

  it('production omits extra localhost origins', () => {
    delete process.env.CORS_ORIGINS;
    process.env.APP_URL = 'https://prod.app';
    process.env.NODE_ENV = 'production';
    expect(getCorsOrigins()).toEqual(['https://prod.app']);
  });
});
