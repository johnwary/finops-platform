import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: [
    'req.body.password',
    'req.body.idNumber',
    'req.body.accountNumber',
    'req.body.fullName',
    'req.headers.authorization',
  ],
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
