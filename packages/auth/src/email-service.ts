/**
 * Email Service Interface
 *
 * This module provides a placeholder interface for sending emails.
 * In production, this should be configured with an actual email provider
 * (e.g., Resend, Postmark, SendGrid, or the self-hosted Stalwart Mail Server).
 *
 * For now, this is a no-op implementation that logs email content.
 * TODO: Integrate with actual email provider when Mail app is deployed.
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendVerificationEmailOptions {
  user: { id: string; email: string; name?: string };
  url: string;
  token: string;
}

export interface SendPasswordResetEmailOptions {
  user: { id: string; email: string; name?: string };
  url: string;
  token: string;
}

export interface SendPasswordResetNotificationEmailOptions {
  user: { id: string; email: string; name?: string };
  ip?: string;
  userAgent?: string;
}

export interface SendMagicLinkEmailOptions {
  email: string;
  url: string;
  token: string;
}

export interface SendOTPEmailOptions {
  email: string;
  otp: string;
}

/**
 * Send an email (placeholder implementation)
 *
 * In production, this should integrate with an actual email provider.
 * For now, this logs the email content to console for development.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  // TODO: Integrate with actual email provider
  // Options: Resend, Postmark, SendGrid, or self-hosted Stalwart Mail Server
  console.log('[Email Service] Email would be sent:', {
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

/**
 * Send verification email
 *
 * Called by Better Auth when a user needs to verify their email address.
 */
export async function sendVerificationEmail(
  options: SendVerificationEmailOptions,
  _request?: Request
): Promise<void> {
  const { user, url } = options;

  await sendEmail({
    to: user.email,
    subject: 'Verify your email address',
    text: `Click the link to verify your email: ${url}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email address</h2>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${url}</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send password reset email
 *
 * Called by Better Auth when a user requests a password reset.
 */
export async function sendPasswordResetEmail(
  options: SendPasswordResetEmailOptions,
  _request?: Request
): Promise<void> {
  const { user, url } = options;

  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    text: `Click the link to reset your password: ${url}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href="${url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${url}</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send password reset notification email
 *
 * Called when a user successfully resets their password.
 * Notifies the user that their password was changed for security.
 */
export async function sendPasswordResetNotificationEmail(
  options: SendPasswordResetNotificationEmailOptions
): Promise<void> {
  const { user, ip, userAgent } = options;
  const timestamp = new Date().toLocaleString();

  await sendEmail({
    to: user.email,
    subject: 'Your password has been reset',
    text: `Your password was reset on ${timestamp}${ip ? ` from IP: ${ip}` : ''}. If you didn't make this change, please contact support immediately.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your password has been reset</h2>
        <p>Your password was successfully reset on <strong>${timestamp}</strong>.</p>
        ${ip ? `<p><strong>IP Address:</strong> ${ip}</p>` : ''}
        ${userAgent ? `<p><strong>Device:</strong> ${userAgent}</p>` : ''}
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>For your security, all active sessions have been revoked. You will need to sign in again.</p>
      </div>
    `,
  });
}

/**
 * Send magic link email
 *
 * Called by Better Auth magic link plugin when a user requests a magic link.
 */
export async function sendMagicLinkEmail(
  options: SendMagicLinkEmailOptions
): Promise<void> {
  const { email, url } = options;

  await sendEmail({
    to: email,
    subject: 'Sign in to Suite',
    text: `Click the link to sign in: ${url}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Sign in to Suite</h2>
        <p>Click the link below to sign in to your account:</p>
        <p><a href="${url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Sign In</a></p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${url}</p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Send OTP email
 *
 * Called by OTP module when a user requests an OTP code via email.
 */
export async function sendOTPEmail(
  options: SendOTPEmailOptions
): Promise<void> {
  const { email, otp } = options;

  await sendEmail({
    to: email,
    subject: 'Your verification code',
    text: `Your verification code is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your verification code</h2>
        <p>Use the following code to verify your identity:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 24px 0;">${otp}</p>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
}
