/**
 * Memory zeroization utilities for secure key material cleanup
 * 
 * IMPORTANT: Web Environment Limitations
 * 
 * This module provides best-effort memory zeroization for JavaScript/TypeScript
 * applications running in web browsers and Node.js. However, there are significant
 * limitations due to the Web environment:
 * 
 * 1. **No Memory Locking**: JavaScript does not provide mlock() or VirtualLock()
 *    equivalents. Memory can be swapped to disk at any time by the OS or browser.
 * 
 * 2. **Garbage Collector Behavior**: The JavaScript garbage collector may copy
 *    memory during compaction, potentially leaving key material in unreferenced
 *    memory regions that are not immediately zeroized.
 * 
 * 3. **Memory Dumps**: Browser sandbox restrictions prevent access to process
 *    memory, but memory dumps (core dumps, browser crash reports) may still
 *    contain sensitive data. In Node.js environments, core dumps are a concern.
 * 
 * 4. **JIT Optimizations**: JavaScript engines may optimize away memory writes
 *    if they determine the writes have no observable effect. We use volatile
 *    patterns where possible, but guarantees are limited.
 * 
 * 5. **CryptoKey Objects**: Web Crypto API CryptoKey objects are managed by
 *    the browser/engine and cannot be directly zeroized by JavaScript. This
 *    function only works on raw byte arrays (Uint8Array, ArrayBuffer).
 * 
 * **Recommendations for Sensitive Applications:**
 * - Use envelope encryption with KMS (AWS KMS, Azure Key Vault, GCP KMS)
 * - Implement key rotation to limit exposure time
 * - Consider native/WebAssembly solutions for stronger memory guarantees
 * - For regulated industries, use FIPS-validated HSMs for key storage
 * 
 * This is a defense-in-depth measure, not a complete solution for memory security.
 */

/**
 * Securely zeroes out a Uint8Array or ArrayBuffer by overwriting with zeros
 * 
 * This is a best-effort protection in JavaScript environments. Due to JIT
 * optimizations and garbage collector behavior, we cannot guarantee that
 * all copies of the data are zeroized.
 * 
 * @param data - Uint8Array or ArrayBuffer to zeroize
 * @throws Error if input is not a Uint8Array or ArrayBuffer
 * 
 * @example
 * ```ts
 * const password = new TextEncoder().encode('secret');
 * // ... use password ...
 * secureZeroize(password); // Clear from memory
 * ```
 */
export function secureZeroize(data: Uint8Array | ArrayBuffer): void {
  if (!(data instanceof Uint8Array) && !(data instanceof ArrayBuffer)) {
    throw new Error('secureZeroize requires Uint8Array or ArrayBuffer');
  }

  // Convert ArrayBuffer to Uint8Array for uniform handling
  const view = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  // Overwrite with zeros using a volatile pattern to prevent optimization
  // Note: JavaScript has limited volatile support, this is best-effort
  for (let i = 0; i < view.length; i++) {
    view[i] = 0;
  }

  // Additional pass with different pattern to ensure clearing
  for (let i = 0; i < view.length; i++) {
    view[i] = 0xFF;
  }

  // Final zero pass
  for (let i = 0; i < view.length; i++) {
    view[i] = 0;
  }
}
