import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import type { RequestHandler } from 'express';

process.env.LOG_LEVEL = 'silent';

const { createApp } = await import('./index.js');

describe('auth rate limiting', () => {
  let server: Server;
  let baseUrl: string;
  const authHits: string[] = [];

  beforeAll(async () => {
    const authHandler: RequestHandler = (req, res) => {
      authHits.push(req.path);
      res.status(204).end();
    };

    const app = createApp({
      authHandler,
      rateLimit: { limit: 0, validate: false, windowMs: 60_000 },
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('runs the global rate limiter before better-auth routes', async () => {
    const res = await fetch(`${baseUrl}/api/auth/session`);

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        status: 429,
      },
    });
    expect(authHits).toEqual([]);
  });
});
