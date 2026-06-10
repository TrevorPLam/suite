/**
 * Factory function for creating user test data.
 * Provides sensible defaults with support for field overrides.
 *
 * @param overrides - Optional partial user to override defaults
 * @returns A user object suitable for testing
 *
 * @example
 * ```ts
 * const user = createUser({ email: 'test@example.com', name: 'Test User' });
 * ```
 */
export function createUser(overrides: { email?: string; name?: string } = {}): { email: string; name: string } {
  return {
    email: overrides.email ?? 'test@example.com',
    name: overrides.name ?? 'Test User',
  };
}
