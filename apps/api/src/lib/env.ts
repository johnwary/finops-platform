import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

// In production the three secrets are required. In dev/test we fall back to
// harmless localhost defaults so `pnpm dev` and tests boot without a full .env.
const requiredInProd = (devDefault: string) =>
  isProd ? z.string().min(1) : z.string().min(1).default(devDefault);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: requiredInProd('postgresql://localhost:5432/finops'),
  BETTER_AUTH_SECRET: requiredInProd('dev-secret-do-not-use-in-prod'),
  BETTER_AUTH_URL: requiredInProd('http://localhost:3000'),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

  WEB_URL: z.string().default('http://localhost:5173'),

  // Email sends fail lazily if unset (see resend.ts), so these are optional.
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('noreply@example.com'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
