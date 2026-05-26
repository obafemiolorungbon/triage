import type { WidgetFeedbackBody } from '@triage/shared-types';

const REDACTED = '[REDACTED]';

const REDACTION_PATTERNS = [
  /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:sk|xoxb|xoxp|ghp|gho|ghu|ghs|pat)-[A-Za-z0-9_=-]{12,}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:\+?\d[\d\s().-]{8,}\d)\b/g,
  /\b(?:\d[ -]*?){13,19}\b/g,
];

export function sanitizeWidgetFeedback(input: WidgetFeedbackBody) {
  let redacted = false;
  const redact = (value: string) => {
    let next = value;
    for (const pattern of REDACTION_PATTERNS) {
      next = next.replace(pattern, REDACTED);
    }
    if (next !== value) redacted = true;
    return next;
  };

  const sanitizeValue = (value: unknown, path: string[] = []): unknown => {
    if (typeof value === 'string') {
      if (path[0] === 'user' && path[1] === 'email') return value;
      return redact(value);
    }
    if (Array.isArray(value)) {
      return value.map((item, index) => sanitizeValue(item, [...path, String(index)]));
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          sanitizeValue(item, [...path, key]),
        ]),
      );
    }
    return value;
  };

  const payload: WidgetFeedbackBody = {
    ...input,
    title: input.title ? redact(input.title) : input.title,
    message: input.message ? redact(input.message) : input.message,
    fields: sanitizeValue(input.fields ?? {}) as Record<string, unknown>,
    user: sanitizeValue(input.user ?? {}, ['user']) as Record<string, unknown>,
    metadata: sanitizeValue(input.metadata ?? {}) as Record<string, unknown>,
  };

  return { payload, redacted };
}
