import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.feedback.count();
  if (count > 0) {
    return;
  }
  await prisma.feedback.create({
    data: {
      submitterEmail: 'demo.customer@example.com',
      rawText:
        'The checkout page crashes when I apply a discount code on mobile Safari.',
      status: 'new',
      isNoise: false,
      knowledgeGap: false,
    },
  });
  await prisma.feedback.create({
    data: {
      submitterEmail: 'spam@example.com',
      rawText: 'buy cheap watches click here http://spam.example',
      status: 'rejected',
      isNoise: true,
      knowledgeGap: false,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
