import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import express from 'express';
import { errorHandler } from './error.middleware.js';
import { AppError } from '../lib/response.js';

// Proves Express 5 forwards a rejected async-handler promise to the global
// error middleware without any try/catch in the route — the guarantee that
// lets controllers drop their wrappers.
describe('errorHandler (Express 5 async error handling)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.get('/throws', async () => {
      throw new AppError('LOAN_NOT_FOUND', 'Loan not found.', 404);
    });
    app.use(errorHandler);

    await new Promise<void>((resolve) => {
      server = app.listen(0, resolve);
    });
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('routes a thrown AppError to the error response shape', async () => {
    const res = await fetch(`${baseUrl}/throws`);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'LOAN_NOT_FOUND', message: 'Loan not found.', status: 404 },
    });
  });
});
