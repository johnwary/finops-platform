import { z } from 'zod';

// NODE_ENV is validated by the schema below (enum, default 'development') —
// we only branch on it here *after* that validation succeeds, so a missing
// or misspelled value can never be mistaken for a safe non-prod environment.
const nodeEnvResult = z
  .enum(['development', 'test', 'production'])
  .default('development')
  .safeParse(process.env.NODE_ENV);

if (!nodeEnvResult.success) {
  throw new Error(`Invalid environment variables:\n  - NODE_ENV: ${nodeEnvResult.error.issues[0].message}`);
}

const isProd = nodeEnvResult.data === 'production';

// In production the secrets/URLs below are required — no fallback. In dev/test
// we fall back to harmless localhost defaults so `pnpm dev` and tests boot
// without a full .env.
const requiredInProd = (devDefault: string) =>
  isProd ? z.string().min(1) : z.string().min(1).default(devDefault);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: isProd ? z.string().url() : z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  DATABASE_URL: requiredInProd('postgresql://localhost:5432/finops'),
  BETTER_AUTH_SECRET: requiredInProd('dev-secret-do-not-use-in-prod'),
  BETTER_AUTH_URL: requiredInProd('http://localhost:3000'),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

  WEB_URL: isProd ? z.string().url() : z.string().url().default('http://localhost:5173'),

  // Parent domain for the session cookie (e.g. ".johwary.cloud") so it's sent
  // from the web app's subdomain to the API's subdomain. Required in prod
  // only when they're split across subdomains; same-origin/dev needs nothing.
  COOKIE_DOMAIN: z.string().optional(),

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
