/**
 * One-off: create first staff user then promote to admin.
 * Usage (API must be running):
 *   ADMIN_EMAIL=a@b.com ADMIN_PASSWORD='...' API_URL=http://localhost:4200 pnpm exec tsx apps/backend/src/scripts/create-admin.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const api = process.env.API_URL ?? 'http://localhost:4200';
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
  }
  const res = await fetch(`${api}/api/v1/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Admin' }),
  });
  if (!res.ok && res.status !== 409) {
    const t = await res.text();
    throw new Error(`sign-up failed: ${res.status} ${t}`);
  }
  await prisma.user.updateMany({
    where: { email },
    data: { role: 'admin' },
  });
  // eslint-disable-next-line no-console
  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
