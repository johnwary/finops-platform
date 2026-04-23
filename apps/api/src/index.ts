import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { logger } from './lib/logger';
import { auth } from './lib/auth';
import { AppError, error } from './lib/response';
import { invitationsRouter } from './features/invitations/invitations.router';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.all('/api/auth/*splat', toNodeHandler(auth));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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

const server = app.listen(PORT, () => {
  logger.info(`API running on port ${PORT}`);
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
