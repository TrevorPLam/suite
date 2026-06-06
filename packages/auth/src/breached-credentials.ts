/**
 * Breached credential checking using haveibeenpwned.com API
 * Follows OWASP recommendations for password breach detection
 */

import { createHash } from 'crypto';

/**
 * Check if credentials have been breached using haveibeenpwned.com API
 * @param email - The email address to check (optional, for future use)
 * @param password - The password to check
 * @returns Promise<boolean> - true if credentials are breached, false otherwise
 */
export async function checkBreachedCredentials(email: string, password: string): Promise<boolean> {
  try {
    // SHA-1 hash the password (uppercase as required by HIBP API)
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query haveibeenpwned.com API with k-anonymity model
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'User-Agent': 'Suite-Auth-Check',
      },
    });

    if (!response.ok) {
      // If API is unavailable, fail open (allow the password)
      // This is a security decision to prevent blocking legitimate signups
      console.warn('HaveIBeenPwned API unavailable, skipping breach check');
      return false;
    }

    const data = await response.text();
    const lines = data.split('\n');

    // Check if our hash suffix is in the response
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix && hashSuffix === suffix) {
        // Password found in breach database
        const breachCount = parseInt(count || '0', 10);
        console.warn(`Password found in ${breachCount} data breaches`);
        return true;
      }
    }

    // Password not found in breach database
    return false;
  } catch (error) {
    // If network error or other issue, fail open
    console.warn('Error checking breached credentials:', error);
    return false;
  }
}
