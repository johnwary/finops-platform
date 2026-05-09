import { logger } from './logger.js';
import { resend } from './resend.js';

const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com';
const webUrl = process.env.WEB_URL ?? 'http://localhost:5173';

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  token: string,
  role: string,
  expiresAt: Date,
): Promise<void> {
  const inviteUrl = `${webUrl}/invite/accept?token=${token}`;

  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'You have been invited to FinOps',
      html: `
        <p>${inviterName} invited you to FinOps as ${role}.</p>
        <p><a href="${inviteUrl}">Accept your invitation</a></p>
        <p>This invitation expires on ${expiresAt.toISOString()}.</p>
      `,
      text: `${inviterName} invited you to FinOps as ${role}. Accept your invitation: ${inviteUrl}`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send invite email');
    throw err;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    await resend.emails.send({
      from: fromEmail,
      to,
      subject: 'Welcome to FinOps',
      html: `<p>Welcome to FinOps, ${name}.</p>`,
      text: `Welcome to FinOps, ${name}.`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send welcome email');
    throw err;
  }
}
