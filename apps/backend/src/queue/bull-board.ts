import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { INestApplication } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { Express, NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env.schema';
import { INTAKE_QUEUE, TRIAGE_QUEUE } from './triage.constants';

/** Mounted outside the Nest `api/v1` global prefix. */
export const BULL_BOARD_BASE_PATH = '/admin/queues';

function basicAuthMiddleware(user: string, pass: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
      res.status(401).send('Unauthorized');
      return;
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const u = sep >= 0 ? decoded.slice(0, sep) : '';
    const p = sep >= 0 ? decoded.slice(sep + 1) : '';
    if (u !== user || p !== pass) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
      res.status(401).send('Unauthorized');
      return;
    }
    next();
  };
}

/**
 * Registers the Bull Board UI on the raw Express instance (same Redis as
 * BullModule). Off unless `BULL_BOARD_ENABLED` is truthy in env.
 */
export function mountBullBoard(app: INestApplication, expressApp: Express): void {
  const config = app.get(ConfigService<Env, true>);
  if (!config.get('BULL_BOARD_ENABLED', { infer: true })) {
    return;
  }

  const redisUrl = config.get('REDIS_URL', { infer: true });
  const connection = { url: redisUrl };

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(BULL_BOARD_BASE_PATH);

  const intakeQueue = new Queue(INTAKE_QUEUE, { connection });
  const triageQueue = new Queue(TRIAGE_QUEUE, { connection });

  createBullBoard({
    queues: [new BullMQAdapter(intakeQueue), new BullMQAdapter(triageQueue)],
    serverAdapter,
  });

  const user = config.get('BULL_BOARD_USER', { infer: true });
  const pass = config.get('BULL_BOARD_PASSWORD', { infer: true });
  const authMw =
    user && pass
      ? basicAuthMiddleware(user, pass)
      : (_req: Request, _res: Response, next: NextFunction) => next();

  expressApp.use(BULL_BOARD_BASE_PATH, authMw, serverAdapter.getRouter());

  const port = config.get('PORT', { infer: true });
  Logger.log(`Bull Board UI: http://localhost:${port}${BULL_BOARD_BASE_PATH}`);
}
