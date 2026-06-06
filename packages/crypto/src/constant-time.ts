/**
 * Constant-time comparison utilities to prevent timing attacks.
 *
 * Timing attacks exploit the fact that string comparison operations
 * (like ===) return early when a mismatch is found, leaking information
 * about the correct prefix through timing differences.
 *
 * This module provides timing-safe comparison functions for secrets,
 * tokens, and HMAC outputs.
 */

/**
 * Compares two strings or buffers in constant time.
 *
 * This function uses crypto.subtle.timingSafeEqual which guarantees
 * that the comparison takes the same amount of time regardless of
 * whether the inputs match or not, preventing timing attacks.
 *
 * @param a - First string or buffer to compare
 * @param b - Second string or buffer to compare
 * @returns true if inputs are identical, false otherwise
 *
 * @example
 * ```ts
 * import { constantTimeEqual } from '@suite/crypto';
 *
 * const token = 'abc123';
 * const provided = 'abc123';
 *
 * if (constantTimeEqual(token, provided)) {
 *   // Token is valid
 * }
 * ```
 */
export async function constantTimeEqual(
  a: string | Uint8Array,
  b: string | Uint8Array
): Promise<boolean> {
  // Convert strings to Uint8Array
  const bufferA = typeof a === 'string' ? new TextEncoder().encode(a) : a;
  const bufferB = typeof b === 'string' ? new TextEncoder().encode(b) : b;

  // crypto.subtle.timingSafeEqual throws if lengths differ
  // We catch this and return false instead of throwing
  if (bufferA.length !== bufferB.length) {
    return false;
  }

  // Check if crypto.subtle.timingSafeEqual is available
  if (typeof crypto !== 'undefined' && crypto.subtle && 'timingSafeEqual' in crypto.subtle) {
    try {
      // Type assertion for timingSafeEqual as it may not be in all TypeScript definitions
      const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBufferView, b: ArrayBufferView): void };
      subtle.timingSafeEqual(bufferA, bufferB);
      return true;
    } catch {
      return false;
    }
  }

  // Fallback to sync implementation if timingSafeEqual is not available
  return constantTimeEqualSync(bufferA, bufferB);
}

/**
 * Synchronous version of constantTimeEqual for environments where
 * crypto.subtle is not available or async is not desired.
 *
 * This is a fallback implementation that attempts to be constant-time
 * by comparing all bytes even after a mismatch is found.
 *
 * WARNING: This is not guaranteed to be truly constant-time in all
 * JavaScript engines. Use the async version with crypto.subtle.timingSafeEqual
 * when possible (e.g., in Cloudflare Workers, Node.js, modern browsers).
 *
 * @param a - First string or buffer to compare
 * @param b - Second string or buffer to compare
 * @returns true if inputs are identical, false otherwise
 *
 * @example
 * ```ts
 * import { constantTimeEqualSync } from '@suite/crypto';
 *
 * const token = 'abc123';
 * const provided = 'abc123';
 *
 * if (constantTimeEqualSync(token, provided)) {
 *   // Token is valid
 * }
 * ```
 */
export function constantTimeEqualSync(
  a: string | Uint8Array,
  b: string | Uint8Array
): boolean {
  const bufferA = typeof a === 'string' ? new TextEncoder().encode(a) : a;
  const bufferB = typeof b === 'string' ? new TextEncoder().encode(b) : b;

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < bufferA.length; i++) {
    const byteA = bufferA[i] ?? 0;
    const byteB = bufferB[i] ?? 0;
    result |= byteA ^ byteB;
  }

  return result === 0;
}
