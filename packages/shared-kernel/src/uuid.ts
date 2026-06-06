/**
 * Cross-platform UUID v4 generation utility
 * 
 * This function provides a consistent UUID generation across different environments:
 * - Modern browsers with Web Crypto API (crypto.randomUUID)
 * - Node.js 18+ with built-in crypto module
 * - Fallback for older environments using Math.random
 * 
 * Note: The fallback is not cryptographically secure and should only be used
 * in non-security-critical contexts or when crypto APIs are unavailable.
 */

export function generateUUID(): string {
  // Try Web Crypto API (browser and Node.js 18+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Try Node.js crypto module (older Node.js versions)
  // @ts-ignore - require is available in Node.js environments
  if (typeof require !== 'undefined') {
    try {
      // @ts-ignore - crypto module is available in Node.js
      const nodeCrypto = require('crypto');
      if (nodeCrypto.randomUUID) {
        return nodeCrypto.randomUUID();
      }
    } catch {
      // Module not available, fall through to fallback
    }
  }

  // Fallback: UUID v4 using Math.random
  // This is NOT cryptographically secure but provides a valid UUID format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
