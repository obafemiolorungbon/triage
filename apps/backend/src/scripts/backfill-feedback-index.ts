import { NestFactory } from '@nestjs/core';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { FeedbackIndexService } from '../retrieval/feedback-index.service';

async function main() {
  const app = await NestFactory.createApplicationContext(RetrievalModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const results = await app.get(FeedbackIndexService).backfill();
    console.log(
      JSON.stringify(
        {
          indexed: results.length,
          embedded: results.filter((item) => item.embedded).length,
          reused: results.filter((item) => item.reusedEmbedding).length,
          failed: results.filter((item) => 'error' in item).length,
        },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
