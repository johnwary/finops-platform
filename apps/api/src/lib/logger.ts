import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
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
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});
