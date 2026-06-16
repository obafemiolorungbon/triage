import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { TriageWorkerModule } from './triage/triage-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(TriageWorkerModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.init();
  Logger.log('Triage worker consuming queues...');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
