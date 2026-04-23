process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file::memory:?cache=shared';
process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ?? 'test-secret';
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3000';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? 'test-key';
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com';
