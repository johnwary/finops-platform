import { Resend } from 'resend';

// Lazy so a missing RESEND_API_KEY fails the email send (caught + surfaced by
// callers), not the whole API at boot.
let client: Resend | null = null;

export function getResend(): Resend {
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}
