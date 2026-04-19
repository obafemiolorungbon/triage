import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { AppModule } from './app/app.module';
import { getCorsOrigins } from './config/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({ origin: getCorsOrigins(), credentials: true });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/api/v1/auth', toNodeHandler(auth));
  expressApp.use(express.json({ limit: '2mb' }));
  expressApp.use(express.urlencoded({ extended: true }));

  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  const port = process.env.PORT || 4200;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
