import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: [
    'req.body.password',
    'req.body.idNumber',
    'req.body.accountNumber',
    'req.body.fullName',
    'req.body.phone',
    'req.body.email',
    'req.body.address',
    'req.headers.authorization',
  ],
  transport:
    env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
