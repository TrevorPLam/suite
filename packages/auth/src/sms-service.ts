/**
 * SMS Service Interface
 *
 * This module provides a placeholder interface for sending SMS messages.
 * In production, this should be configured with an actual SMS provider
 * (e.g., Twilio, AWS SNS, or Vonage).
 *
 * For now, this is a no-op implementation that logs SMS content.
 * TODO: Integrate with actual SMS provider when credentials are available.
 */

export interface SMSOptions {
  to: string;
  body: string;
}

export interface SendOTPSMSOptions {
  phone: string;
  otp: string;
}

/**
 * Send an SMS message (placeholder implementation)
 *
 * In production, this should integrate with an actual SMS provider.
 * For now, this logs the SMS content to console for development.
 */
export async function sendSMS(options: SMSOptions): Promise<void> {
  // TODO: Integrate with actual SMS provider
  // Options: Twilio, AWS SNS, Vonage
  console.log('[SMS Service] SMS would be sent:', {
    to: options.to,
    body: options.body,
  });
}

/**
 * Send OTP SMS
 *
 * Called by OTP module when a user requests an OTP code via SMS.
 */
export async function sendOTPSMS(
  options: SendOTPSMSOptions
): Promise<void> {
  const { phone, otp } = options;

  await sendSMS({
    to: phone,
    body: `Your verification code is: ${otp}. This code will expire in 10 minutes. If you didn't request this, you can safely ignore this message.`,
  });
}
