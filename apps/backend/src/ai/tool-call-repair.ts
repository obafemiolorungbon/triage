type SafeParseSchema = {
  safeParse(
    value: unknown,
  ): { success: true; data: unknown } | { success: false };
};

export function recoverToolArguments(
  text: string,
  parameters: unknown,
): unknown | null {
  const candidates = extractJsonObjects(text);
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    try {
      const value = JSON.parse(candidates[index]);
      if (isSafeParseSchema(parameters)) {
        const parsed = parameters.safeParse(value);
        if (parsed.success) return parsed.data;
        continue;
      }
      return value;
    } catch {
      // Try an earlier complete object from the malformed provider output.
    }
  }
  return null;
}

function extractJsonObjects(text: string) {
  const objects: string[] = [];
  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index += 1) {
      const character = text[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          objects.push(text.slice(start, index + 1));
          break;
        }
      }
    }
  }
  return objects;
}

function isSafeParseSchema(value: unknown): value is SafeParseSchema {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'safeParse' in value &&
      typeof (value as SafeParseSchema).safeParse === 'function',
  );
}
