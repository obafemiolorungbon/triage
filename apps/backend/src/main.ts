import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { AppModule } from './app/app.module';
import { getCorsOrigins } from './config/cors-origins';
import { mountBullBoard } from './queue/bull-board';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableCors({ origin: getCorsOrigins(), credentials: true });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/api/v1/auth', toNodeHandler(auth));
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true }));
  expressApp.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (
        err &&
        typeof err === 'object' &&
        'type' in err &&
        err.type === 'entity.too.large'
      ) {
        res.status(413).json({
          statusCode: 413,
          message: 'JSON request body is too large. Limit is 10mb.',
        });
        return;
      }
      next(err);
    },
  );

  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  mountBullBoard(app, expressApp);

  const port = process.env.PORT || 4200;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `Application is running on: http://localhost:${port}/${globalPrefix}`,
  );
}

bootstrap();
