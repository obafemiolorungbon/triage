import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  /** When empty, triage worker applies a safe fallback without calling OpenRouter. */
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL_FILTER: z.string().default('openai/gpt-4o-mini'),
  OPENROUTER_MODEL_MAIN: z.string().default('openai/gpt-4o'),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().optional(),
  API_PUBLIC_URL: z.string().optional(),
  APP_URL: z.string().default('http://localhost:4200'),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(
  config: Record<string, unknown>,
): Env | { _INVALID: true; error: z.ZodError } {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    return { _INVALID: true, error: parsed.error };
  }
  return parsed.data;
}
