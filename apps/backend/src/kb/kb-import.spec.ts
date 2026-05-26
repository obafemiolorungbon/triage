import { normalizeKbImport } from './kb-import';

describe('normalizeKbImport', () => {
  it('normalizes Zendesk Guide articles and converts HTML to Markdown', () => {
    const result = normalizeKbImport('zendesk', {
      articles: [
        {
          id: 123,
          title: 'Reset your password',
          body: '<h2>Steps</h2><p>Open <a href="https://app.test/settings">settings</a>.</p><ul><li>Choose security</li></ul>',
          draft: false,
          locale: 'en-us',
          html_url: 'https://help.test/hc/articles/123',
          updated_at: '2026-05-01T10:00:00Z',
          section_id: 44,
        },
      ],
    });

    expect(result.errors).toEqual([]);
    expect(result.articles[0]).toMatchObject({
      provider: 'zendesk',
      sourceId: '123',
      title: 'Reset your password',
      slug: 'reset-your-password',
      published: true,
      sourceLocale: 'en-us',
      sourceUrl: 'https://help.test/hc/articles/123',
      sourcePath: 'section:44',
    });
    expect(result.articles[0].body).toContain('## Steps');
    expect(result.articles[0].body).toContain(
      '[settings](https://app.test/settings)',
    );
    expect(result.articles[0].body).toContain('Choose security');
  });

  it('normalizes Intercom article arrays and maps draft state', () => {
    const result = normalizeKbImport('intercom', {
      data: [
        {
          id: '6871119',
          title: 'Billing basics',
          body: '<p>Invoices are available from the billing workspace settings page.</p>',
          state: 'draft',
          url: 'https://intercom.test/articles/6871119',
          default_locale: 'en',
          updated_at: 1770000000,
          parent_ids: [18, 19],
        },
      ],
    });

    expect(result.articles[0]).toMatchObject({
      provider: 'intercom',
      sourceId: '6871119',
      published: false,
      sourceLocale: 'en',
      sourcePath: '18 / 19',
    });
    expect(result.articles[0].sourceUpdatedAt).toBeInstanceOf(Date);
  });

  it('normalizes Freshdesk solutions and skips invalid rows', () => {
    const result = normalizeKbImport('freshdesk', [
      {
        id: 2,
        title: 'Install the widget',
        description: '<p>Paste the loader script before the closing body tag.</p>',
        status: 2,
        hierarchy: [
          { data: { name: 'Setup', language: 'en' } },
          { data: { name: 'Widget' } },
        ],
      },
      {
        id: 3,
        title: 'Empty',
        description: '<p>Short</p>',
        status: 1,
      },
    ]);

    expect(result.total).toBe(2);
    expect(result.articles[0]).toMatchObject({
      provider: 'freshdesk',
      sourceId: '2',
      published: true,
      sourceLocale: 'en',
      sourcePath: 'Setup / Widget',
    });
    expect(result.errors).toEqual([
      { index: 1, error: 'Body is missing or too short' },
    ]);
  });
});
