import { INTAKE_QUEUE, TRIAGE_QUEUE } from './triage.constants';

describe('triage.constants', () => {
  it('exports stable queue names', () => {
    expect(INTAKE_QUEUE).toBe('intake-queue');
    expect(TRIAGE_QUEUE).toBe('triage-queue');
  });
});
