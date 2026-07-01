import type { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger.js';
import { AppError, error } from '../lib/response.js';

// Global error handler. Express 5 forwards rejected async-handler promises here
// automatically, so controllers no longer need try/catch wrappers.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
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
};
