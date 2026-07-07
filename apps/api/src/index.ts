import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import type { RequestHandler } from 'express';
import { pathToFileURL } from 'url';
import { toNodeHandler } from 'better-auth/node';
import type { Options as RateLimitOptions } from 'express-rate-limit';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import { auth } from './lib/auth.js';
import { error } from './lib/response.js';
import { errorHandler } from './middleware/error.middleware.js';
import { borrowersRouter } from './features/borrowers/borrowers.router.js';
import { loansRouter } from './features/loans/loans.router.js';
import { reportsRouter } from './features/reports/reports.router.js';
import { invitationsRouter } from './features/invitations/invitations.router.js';
import { activityRouter } from './features/activity/activity.router.js';
import { companyRouter } from './features/company/company.router.js';
import { depositsRouter } from './features/deposits/deposits.router.js';
import { depositorsRouter } from './features/depositors/depositors.router.js';
import { fundsRouter } from './features/funds/funds.router.js';
import { startAutoDefaultScheduler } from './jobs/autoDefault.job.js';

// better-auth URLs can carry live tokens (e.g. reset-password/<token>) — never log them
function redactAuthUrl(url: string) {
  const path = url.split('?')[0];
  return path.replace(/(\/reset-password\/)[^/]+/, '$1[redacted]');
}

type CreateAppOptions = {
  authHandler?: RequestHandler;
  rateLimit?: Partial<RateLimitOptions>;
};

export function createApp(options: CreateAppOptions = {}) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(pinoHttp({
    logger,
    genReqId(req, res) {
      const existing = req.headers['x-request-id'];
      if (existing) return Array.isArray(existing) ? existing[0] : existing;
      const id = randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel(_req, res, err) {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    wrapSerializers: false,
    serializers: {
      req(req) {
        const isAuthRoute = req.url.startsWith('/api/auth/');
        return {
          id: req.id,
          method: req.method,
          url: isAuthRoute ? redactAuthUrl(req.url) : req.url,
          query: isAuthRoute ? undefined : req.query,
          remoteAddress: req.socket?.remoteAddress,
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }));
  // Per-IP abuse guard. Offices share one NAT IP and each page load fires several
  // queries, so this must stay generous — it is not a per-user throttle.
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: error('RATE_LIMITED', 'Too many requests. Please try again later.', 429),
    ...options.rateLimit,
  }));
  app.all('/api/auth/*splat', options.authHandler ?? toNodeHandler(auth));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/v1/borrowers', borrowersRouter);
  app.use('/api/v1/loans', loansRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1/invitations', invitationsRouter);
  app.use('/api/v1/activity', activityRouter);
  app.use('/api/v1/company', companyRouter);
  app.use('/api/v1/deposits', depositsRouter);
  app.use('/api/v1/depositors', depositorsRouter);
  app.use('/api/v1/funds', fundsRouter);

  // Unknown API routes get the standard JSON error shape, not Express HTML.
  app.use('/api', (_req, res) => {
    res.status(404).json(error('NOT_FOUND', 'Route not found.', 404));
  });

  app.use(errorHandler);

  return app;
}

const app = createApp();
const API_PORT = env.API_PORT;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = app.listen(API_PORT, () => {
    logger.info(`API running on port ${API_PORT}`);
    startAutoDefaultScheduler();
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down');
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down');
    server.close(() => process.exit(0));
  });
}

export default app;
