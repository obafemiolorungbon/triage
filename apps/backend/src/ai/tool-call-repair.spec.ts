import { analyzeFeedbackInputSchema } from '../assistant/assistant-tool-schemas';
import { recoverToolArguments } from './tool-call-repair';

describe('tool-call repair', () => {
  it('recovers the last complete schema-valid object from duplicated output', () => {
    const malformed =
      '{"status": "new", "order": "newest, "groupBy": [""]status"}' +
      '{"status": "new", "order": "newest", "groupBy": ["status", "category"], "dateFrom": "2023-10-02T00:00:00Z", "dateTo": "2023-10-09T23:59:59Z"}';

    expect(recoverToolArguments(malformed, analyzeFeedbackInputSchema)).toEqual(
      {
        status: 'new',
        groupBy: ['status', 'category'],
        dateFrom: '2023-10-02T00:00:00Z',
        dateTo: '2023-10-09T23:59:59Z',
      },
    );
  });

  it('returns null when no complete object matches the tool schema', () => {
    expect(
      recoverToolArguments(
        '{"groupBy": ["status", "category", "sentiment"]',
        analyzeFeedbackInputSchema,
      ),
    ).toBeNull();
  });
});
