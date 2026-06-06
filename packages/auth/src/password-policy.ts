/**
 * Password policy validation following OWASP 2025 and NIST 800-63b standards
 */

// Top 10,000 most common passwords (abbreviated list for demonstration)
// In production, this should be the full list from https://github.com/danielmiessler/SecLists
const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', '1234', '111111', '12345', 'dragon', '1234567',
  'sunshine', 'qwerty', 'iloveyou', 'princess', 'admin', 'welcome', '666666', 'abc123',
  'football', '123123', 'monkey', '654321', 'superman', '1qaz2wsx', '7777777', 'fuckyou',
  '121212', '000000', 'qazwsx', '123qwe', 'killer', 'trustno1', 'jordan', 'jennifer',
  'zxcvbnm', 'asdfgh', 'hunter', 'buster', 'soccer', 'harley', 'batman', 'andrew',
  'tigger', 'sunshine', 'iloveyou', 'starwars', 'michael', 'ninja', 'mustang', 'password1',
]);

export interface PasswordValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate password strength according to OWASP and NIST standards
 * @param password - The password to validate
 * @returns Validation result with valid flag and optional reason
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  // Check minimum length (NIST 800-63b recommends at least 8 characters)
  if (password.length < 8) {
    return {
      valid: false,
      reason: 'Password must be at least 8 characters long',
    };
  }

  // Check against common passwords (OWASP recommendation)
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return {
      valid: false,
      reason: 'Password is too common. Please choose a more secure password',
    };
  }

  // Check for character variety (NIST 800-63b encourages complexity)
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const varietyCount = [hasLowercase, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;

  if (varietyCount < 2) {
    return {
      valid: false,
      reason: 'Password must contain at least 2 of: lowercase, uppercase, numbers, or special characters',
    };
  }

  return {
    valid: true,
  };
}
