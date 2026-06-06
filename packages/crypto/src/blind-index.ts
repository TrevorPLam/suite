/**
 * Blind Indexing for Encrypted Search
 * 
 * Blind indexing allows exact-match search over encrypted data without
 * the server seeing plaintext. Uses HMAC-SHA256 to generate searchable tokens.
 * 
 * Security Requirements:
 * - Never use simple SHA-256 (vulnerable to rainbow table attacks)
 * - Use HMAC with secret key (key must never leave the client)
 * - Separate keys: Index key must be different from encryption key
 * - Normalize input: Lowercase, strip punctuation before hashing
 * - Exact match only: Blind indexing supports exact matches, not partial matches
 */

/**
 * Generate a blind index token for searchable encrypted data
 * 
 * @param data - The plaintext data to index (e.g., title, name)
 * @param key - The secret HMAC key (must be kept secret, client-side)
 * @returns Hex-encoded HMAC-SHA256 token for database storage
 * 
 * @example
 * ```ts
 * const indexKey = await deriveIndexKey(masterPassword);
 * const blindIndex = await generateBlindIndex('My Task Title', indexKey);
 * // Store blindIndex in database blind_index column
 * ```
 */
export async function generateBlindIndex(data: string, key: CryptoKey): Promise<string> {
  // Normalize data: lowercase, trim whitespace, remove punctuation
  const normalized = data.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  
  // Sign the normalized data with HMAC-SHA256
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(normalized)
  );
  
  // Convert to hex string for database storage
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive an HMAC key for blind indexing from a master password
 * 
 * This should be called client-side to generate the index key.
 * The key must be kept secret and never sent to the server.
 * 
 * @param masterPassword - The user's master password
 * @param salt - Optional salt for key derivation (use static salt for blind indexing)
 * @returns HMAC-SHA256 key for blind index generation
 * 
 * @example
 * ```ts
 * const indexKey = await deriveIndexKey('user-password', 'static_blind_index_salt');
 * const blindIndex = await generateBlindIndex('search term', indexKey);
 * ```
 */
export async function deriveIndexKey(
  masterPassword: string,
  salt: string = 'static_blind_index_salt'
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Derive an HMAC key, not an AES key
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: 'HMAC',
      hash: 'SHA-256',
      length: 256
    },
    false,
    ['sign']
  );
}
