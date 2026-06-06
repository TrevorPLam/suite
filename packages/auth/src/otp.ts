import crypto from 'crypto';

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface OTPOptions {
  kv?: KVNamespace;
  otpLength?: number;
  expirationMinutes?: number;
  maxAttempts?: number;
  rateLimitWindow?: number; // seconds
  rateLimitMax?: number;
}

interface OTPConfig {
  emailProvider?: EmailOTPProvider;
  smsProvider?: SMSOTPProvider;
}

interface EmailOTPProvider {
  sendOTP(email: string, otp: string): Promise<void>;
}

interface SMSOTPProvider {
  sendOTP(phone: string, otp: string): Promise<void>;
}

interface OTPResult {
  success: boolean;
  error?: string | undefined;
  rateLimited?: boolean;
}

interface ValidateOTPResult {
  valid: boolean;
  error?: string;
  attemptsRemaining?: number;
}

// Default configuration
const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_EXPIRATION_MINUTES = 10;
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RATE_LIMIT_WINDOW = 900; // 15 minutes
const DEFAULT_RATE_LIMIT_MAX = 3;

/**
 * Generate a cryptographically secure OTP code
 */
function generateOTP(length: number = DEFAULT_OTP_LENGTH): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  const randomBytes = crypto.randomBytes(4);
  const randomValue = randomBytes.readUInt32BE(0) / 0xFFFFFFFF;
  const otp = Math.floor(randomValue * (max - min + 1)) + min;
  return otp.toString().padStart(length, '0');
}

/**
 * Hash OTP for secure storage
 */
function hashOTP(otp: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(otp + salt)
    .digest('hex');
}

/**
 * Check rate limit for OTP requests
 */
async function checkRateLimit(
  kv: KVNamespace | undefined,
  identifier: string,
  window: number,
  max: number
): Promise<{ allowed: boolean; error?: string }> {
  if (!kv) {
    // If KV is not available, allow request but log warning
    console.warn('KV not available for rate limiting - OTP requests not rate limited');
    return { allowed: true };
  }

  const key = `otp_rate_limit:${identifier}`;
  const data = await kv.get(key);

  if (data) {
    const { count, firstRequestTime } = JSON.parse(data);
    const now = Math.floor(Date.now() / 1000);
    const elapsed = now - firstRequestTime;

    if (elapsed < window) {
      if (count >= max) {
        return { allowed: false, error: 'Too many OTP requests. Please try again later.' };
      }
      // Increment count
      await kv.put(key, JSON.stringify({ count: count + 1, firstRequestTime }), {
        expirationTtl: window,
      });
    } else {
      // Reset count
      await kv.put(key, JSON.stringify({ count: 1, firstRequestTime: now }), {
        expirationTtl: window,
      });
    }
  } else {
    // First request
    const now = Math.floor(Date.now() / 1000);
    await kv.put(key, JSON.stringify({ count: 1, firstRequestTime: now }), {
      expirationTtl: window,
    });
  }

  return { allowed: true };
}

/**
 * Store OTP with expiration
 */
async function storeOTP(
  kv: KVNamespace | undefined,
  identifier: string,
  otp: string,
  expirationMinutes: number
): Promise<void> {
  if (!kv) {
    console.warn('KV not available - OTP will not be stored for validation');
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hashedOTP = hashOTP(otp, salt);
  const expirationSeconds = expirationMinutes * 60;

  const key = `otp:${identifier}`;
  const value = JSON.stringify({
    hash: hashedOTP,
    salt,
    attempts: 0,
    createdAt: Date.now(),
  });

  await kv.put(key, value, { expirationTtl: expirationSeconds });
}

/**
 * Validate OTP against stored value
 */
async function validateStoredOTP(
  kv: KVNamespace | undefined,
  identifier: string,
  otp: string,
  maxAttempts: number
): Promise<ValidateOTPResult> {
  if (!kv) {
    console.warn('KV not available - OTP validation will always fail');
    return { valid: false, error: 'OTP validation service unavailable' };
  }

  const key = `otp:${identifier}`;
  const data = await kv.get(key);

  if (!data) {
    return { valid: false, error: 'Invalid or expired OTP' };
  }

  const { hash, salt, attempts, createdAt } = JSON.parse(data);

  // Check if OTP has expired (KV TTL should handle this, but double-check)
  const expirationMs = DEFAULT_EXPIRATION_MINUTES * 60 * 1000;
  if (Date.now() - createdAt > expirationMs) {
    await kv.delete(key);
    return { valid: false, error: 'Invalid or expired OTP' };
  }

  // Check attempt limit
  if (attempts >= maxAttempts) {
    await kv.delete(key);
    return { valid: false, error: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  // Validate OTP
  const hashedInput = hashOTP(otp, salt);
  if (hashedInput !== hash) {
    // Increment attempt counter
    const newValue = JSON.stringify({ hash, salt, attempts: attempts + 1, createdAt });
    await kv.put(key, newValue, { expirationTtl: DEFAULT_EXPIRATION_MINUTES * 60 });
    return {
      valid: false,
      error: 'Invalid OTP',
      attemptsRemaining: maxAttempts - attempts - 1,
    };
  }

  // Valid OTP - delete it to prevent reuse
  await kv.delete(key);
  return { valid: true };
}

/**
 * Configure OTP functionality
 */
export function configureOTP(options: OTPOptions = {}, config: OTPConfig = {}) {
  const {
    kv,
    otpLength = DEFAULT_OTP_LENGTH,
    expirationMinutes = DEFAULT_EXPIRATION_MINUTES,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    rateLimitWindow = DEFAULT_RATE_LIMIT_WINDOW,
    rateLimitMax = DEFAULT_RATE_LIMIT_MAX,
  } = options;

  const { emailProvider, smsProvider } = config;

  return {
    /**
     * Send OTP via email
     */
    async sendEmailOTP(email: string): Promise<OTPResult> {
      // Check rate limit
      const rateLimitResult = await checkRateLimit(kv, email, rateLimitWindow, rateLimitMax);
      if (!rateLimitResult.allowed) {
        return { success: false, ...(rateLimitResult.error && { error: rateLimitResult.error }), rateLimited: true };
      }

      // Generate OTP
      const otp = generateOTP(otpLength);

      // Store OTP
      await storeOTP(kv, email, otp, expirationMinutes);

      // Send via email provider
      if (emailProvider) {
        try {
          await emailProvider.sendOTP(email, otp);
        } catch (error) {
          console.error('Failed to send email OTP:', error);
          return { success: false, error: 'Failed to send OTP. Please try again.' };
        }
      } else {
        console.warn('No email provider configured - OTP not sent');
        return { success: false, error: 'Email OTP not configured' };
      }

      return { success: true };
    },

    /**
     * Send OTP via SMS
     */
    async sendSMSOTP(phone: string): Promise<OTPResult> {
      // Check rate limit
      const rateLimitResult = await checkRateLimit(kv, phone, rateLimitWindow, rateLimitMax);
      if (!rateLimitResult.allowed) {
        return { success: false, ...(rateLimitResult.error && { error: rateLimitResult.error }), rateLimited: true };
      }

      // Generate OTP
      const otp = generateOTP(otpLength);

      // Store OTP
      await storeOTP(kv, phone, otp, expirationMinutes);

      // Send via SMS provider
      if (smsProvider) {
        try {
          await smsProvider.sendOTP(phone, otp);
        } catch (error) {
          console.error('Failed to send SMS OTP:', error);
          return { success: false, error: 'Failed to send OTP. Please try again.' };
        }
      } else {
        console.warn('No SMS provider configured - OTP not sent');
        return { success: false, error: 'SMS OTP not configured' };
      }

      return { success: true };
    },

    /**
     * Validate OTP
     */
    async validateOTP(identifier: string, otp: string): Promise<ValidateOTPResult> {
      return validateStoredOTP(kv, identifier, otp, maxAttempts);
    },
  };
}

export type { OTPOptions, OTPConfig, EmailOTPProvider, SMSOTPProvider, OTPResult, ValidateOTPResult };
