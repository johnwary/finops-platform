import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'crypto';
import { toNodeHandler } from 'better-auth/node';
import { logger } from './lib/logger.js';
import { auth } from './lib/auth.js';
import { AppError, error } from './lib/response.js';
import { borrowersRouter } from './features/borrowers/borrowers.router.js';
import { loansRouter } from './features/loans/loans.router.js';
import { reportsRouter } from './features/reports/reports.router.js';
import { invitationsRouter } from './features/invitations/invitations.router.js';
import { startAutoDefaultScheduler } from './jobs/autoDefault.job.js';

const app = express();
const API_PORT = process.env.API_PORT || 3000;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
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
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
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
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/borrowers', borrowersRouter);
app.use('/api/v1/loans', loansRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/invitations', invitationsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.status).json(error(err.code, err.message, err.status));
    return;
  }

  const maybeApiError = err as { status?: number; statusCode?: number; body?: { message?: string }; message?: string };
  const status = maybeApiError.status ?? maybeApiError.statusCode;

  if (typeof status === 'number' && status >= 400 && status < 600) {
    res
      .status(status)
      .json(error('AUTH_ERROR', maybeApiError.body?.message ?? maybeApiError.message ?? 'Authentication error.', status));
    return;
  }

  logger.error({ err }, 'Unhandled API error');
  res.status(500).json(error('INTERNAL_ERROR', 'Unexpected server error.', 500));
});

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

export default app;
