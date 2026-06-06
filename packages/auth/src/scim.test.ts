import { describe, it, expect, beforeEach } from 'vitest';
import { createAuth } from './server.js';

describe('SCIM Integration', () => {
  let auth: ReturnType<typeof createAuth>;

  beforeEach(() => {
    // Create auth instance with SCIM plugin
    auth = createAuth({
      db: null, // Use null for testing without database
      env: {
        BETTER_AUTH_SECRET: 'test-secret-for-testing-purposes-only-32chars',
        BETTER_AUTH_URL: 'http://localhost:3000',
      },
    });
  });

  it('should initialize with SCIM plugin', () => {
    expect(auth).toBeDefined();
    // SCIM plugin adds endpoints to the auth instance
    expect(auth.api).toBeDefined();
  });

  it('should have SCIM endpoints available', () => {
    // Check if SCIM endpoints are registered
    // The SCIM plugin adds these endpoints to the auth API
    expect(auth.api).toHaveProperty('listSCIMUsers');
    expect(auth.api).toHaveProperty('getSCIMUser');
    expect(auth.api).toHaveProperty('createSCIMUser');
    expect(auth.api).toHaveProperty('updateSCIMUser');
  });

  it('should have generateSCIMToken endpoint', () => {
    // SCIM token generation endpoint for provider setup
    expect(auth.api).toHaveProperty('generateSCIMToken');
  });

  it('should have deleteSCIMUser endpoint', () => {
    // SCIM user deletion endpoint
    expect(auth.api).toHaveProperty('deleteSCIMUser');
  });

  it('should have patchSCIMUser endpoint', () => {
    // SCIM partial update endpoint
    expect(auth.api).toHaveProperty('patchSCIMUser');
  });
});
