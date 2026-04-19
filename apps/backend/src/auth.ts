import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@triage/db';

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.API_PUBLIC_URL ??
  `http://127.0.0.1:${process.env.PORT ?? '3000'}`;

const appUrl = process.env.APP_URL ?? 'http://localhost:4200';

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? '',
  baseURL,
  basePath: '/api/v1/auth',
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  trustedOrigins: [appUrl, baseURL],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'agent',
        input: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
