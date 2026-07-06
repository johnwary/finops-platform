import { logger } from './logger.js';
import { getResend } from './resend.js';
import { env } from './env.js';

const fromEmail = env.RESEND_FROM_EMAIL;
const webUrl = env.WEB_URL;

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  token: string,
  role: string,
  expiresAt: Date,
): Promise<void> {
  const inviteUrl = `${webUrl}/invite/accept?token=${token}`;

  try {
    await getResend().emails.send({
      from: fromEmail,
      to,
      subject: 'You have been invited to Lending Management System',
      html: `
        <p>${inviterName} invited you to Lending Management System as ${role}.</p>
        <p><a href="${inviteUrl}">Accept your invitation</a></p>
        <p>This invitation expires on ${expiresAt.toISOString()}.</p>
      `,
      text: `${inviterName} invited you to Lending Management System as ${role}. Accept your invitation: ${inviteUrl}`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send invite email');
    throw err;
  }
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, expiresAt: Date): Promise<void> {
  try {
    await getResend().emails.send({
      from: fromEmail,
      to,
      subject: 'Reset your password',
      html: `
        <p>You requested a password reset for your Lending Management System account.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires at ${expiresAt.toLocaleString()}. If you did not request this, you can ignore this email.</p>
      `,
      text: `Reset your password: ${resetUrl}\nExpires: ${expiresAt.toLocaleString()}`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send password reset email');
    throw err;
  }
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  try {
    await getResend().emails.send({
      from: fromEmail,
      to,
      subject: 'Welcome to Lending Management System',
      html: `<p>Welcome to Lending Management System, ${name}.</p>`,
      text: `Welcome to Lending Management System, ${name}.`,
    });
  } catch (err) {
    logger.error({ err, to }, 'Failed to send welcome email');
    throw err;
  }
}
