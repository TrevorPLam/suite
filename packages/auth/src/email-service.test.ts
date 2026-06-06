import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendVerificationEmail, sendPasswordResetEmail } from './email-service.js';

describe('Email Service', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should send verification email with correct content', async () => {
    const options = {
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      url: 'https://example.com/verify?token=abc123',
      token: 'abc123',
    };

    await sendVerificationEmail(options);

    expect(console.log).toHaveBeenCalledWith('[Email Service] Email would be sent:', {
      to: 'test@example.com',
      subject: 'Verify your email address',
      text: 'Click the link to verify your email: https://example.com/verify?token=abc123',
      html: expect.stringContaining('Verify your email address'),
    });
  });

  it('should send password reset email with correct content', async () => {
    const options = {
      user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
      url: 'https://example.com/reset?token=xyz789',
      token: 'xyz789',
    };

    await sendPasswordResetEmail(options);

    expect(console.log).toHaveBeenCalledWith('[Email Service] Email would be sent:', {
      to: 'test@example.com',
      subject: 'Reset your password',
      text: 'Click the link to reset your password: https://example.com/reset?token=xyz789',
      html: expect.stringContaining('Reset your password'),
    });
  });

  it('should handle verification email without user name', async () => {
    const options = {
      user: { id: 'user-123', email: 'test@example.com' },
      url: 'https://example.com/verify?token=abc123',
      token: 'abc123',
    };

    await sendVerificationEmail(options);

    expect(console.log).toHaveBeenCalledWith('[Email Service] Email would be sent:', {
      to: 'test@example.com',
      subject: 'Verify your email address',
      text: 'Click the link to verify your email: https://example.com/verify?token=abc123',
      html: expect.stringContaining('Verify your email address'),
    });
  });

  it('should handle password reset email without user name', async () => {
    const options = {
      user: { id: 'user-123', email: 'test@example.com' },
      url: 'https://example.com/reset?token=xyz789',
      token: 'xyz789',
    };

    await sendPasswordResetEmail(options);

    expect(console.log).toHaveBeenCalledWith('[Email Service] Email would be sent:', {
      to: 'test@example.com',
      subject: 'Reset your password',
      text: 'Click the link to reset your password: https://example.com/reset?token=xyz789',
      html: expect.stringContaining('Reset your password'),
    });
  });

  it('should include HTML content in verification email', async () => {
    const options = {
      user: { id: 'user-123', email: 'test@example.com' },
      url: 'https://example.com/verify?token=abc123',
      token: 'abc123',
    };

    await sendVerificationEmail(options);

    const call = vi.mocked(console.log).mock.calls[0];
    if (!call) throw new Error('console.log was not called');
    const emailData = call[1] as { html: string };
    expect(emailData.html).toContain('background-color: #007bff');
    expect(emailData.html).toContain('Verify Email');
    expect(emailData.html).toContain('https://example.com/verify?token=abc123');
  });

  it('should include HTML content in password reset email', async () => {
    const options = {
      user: { id: 'user-123', email: 'test@example.com' },
      url: 'https://example.com/reset?token=xyz789',
      token: 'xyz789',
    };

    await sendPasswordResetEmail(options);

    const call = vi.mocked(console.log).mock.calls[0];
    if (!call) throw new Error('console.log was not called');
    const emailData = call[1] as { html: string };
    expect(emailData.html).toContain('background-color: #007bff');
    expect(emailData.html).toContain('Reset Password');
    expect(emailData.html).toContain('https://example.com/reset?token=xyz789');
  });
});
