import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().default(4200),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    /** When empty, triage worker applies a safe fallback without calling OpenRouter. */
    OPENROUTER_API_KEY: z.string().optional().default(''),
    OPENROUTER_MODEL_FILTER: z.string().default('openai/gpt-4o-mini'),
    OPENROUTER_MODEL_MAIN: z.string().default('openai/gpt-4o'),
    OPENROUTER_MODEL_EMBEDDING: z
      .string()
      .default('openai/text-embedding-3-small'),
    ASSISTANT_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(10_000)
      .max(30 * 60_000)
      .default(120_000),
    /** Short description of the product domain used to ground the triage prompt. */
    OPENROUTER_INDUSTRY_CONTEXT: z.string().optional().default(''),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().optional(),
    API_PUBLIC_URL: z.string().optional(),
    APP_URL: z.string().default('http://localhost:3000'),
    /** Comma-separated origins; when empty, see `getCorsOrigins()` in `cors-origins.ts`. */
    CORS_ORIGINS: z.string().optional().default(''),
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z.string().optional(),
    SLACK_WEBHOOK_URL: z.string().optional(),
    LINEAR_API_KEY: z.string().optional().default(''),
    LINEAR_TEAM_ID: z.string().optional().default(''),
    LINEAR_PROJECT_ID: z.string().optional().default(''),
    JIRA_BASE_URL: z.string().optional().default(''),
    JIRA_EMAIL: z.string().optional().default(''),
    JIRA_API_TOKEN: z.string().optional().default(''),
    JIRA_PROJECT_KEY: z.string().optional().default(''),
    JIRA_ISSUE_TYPE: z.string().optional().default('Task'),
    S3_ENDPOINT: z.string().optional().default('http://localhost:9000'),
    S3_REGION: z.string().optional().default('us-east-1'),
    S3_ACCESS_KEY_ID: z.string().optional().default('minioadmin'),
    S3_SECRET_ACCESS_KEY: z.string().optional().default('minioadmin'),
    S3_BUCKET: z.string().optional().default('triage-uploads'),
    S3_FORCE_PATH_STYLE: z
      .string()
      .optional()
      .default('true')
      .transform((s) => ['true', '1', 'yes'].includes(s.trim().toLowerCase())),
    /**
     * When true / 1 / yes, mounts Bull Board on `/admin/queues` (same process as
     * the HTTP API; read-only queue inspection). Prefer off in production unless
     * protected with `BULL_BOARD_USER` + `BULL_BOARD_PASSWORD`.
     */
    BULL_BOARD_ENABLED: z
      .string()
      .optional()
      .transform((s) =>
        Boolean(s && ['true', '1', 'yes'].includes(s.trim().toLowerCase())),
      ),
    /** Optional HTTP Basic user for Bull Board (both user and password required). */
    BULL_BOARD_USER: z.string().optional().default(''),
    BULL_BOARD_PASSWORD: z.string().optional().default(''),
  })
  .superRefine((env, ctx) => {
    if (
      env.NODE_ENV === 'production' &&
      env.BULL_BOARD_ENABLED &&
      (!env.BULL_BOARD_USER || !env.BULL_BOARD_PASSWORD)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['BULL_BOARD_PASSWORD'],
        message:
          'BULL_BOARD_USER and BULL_BOARD_PASSWORD are required when Bull Board is enabled in production.',
      });
    }
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
