import { describe, it, expect } from 'vitest';
import { authClient } from './client.js';

describe('Auth Package', () => {
  describe('Auth Client', () => {
    it('should create auth client with baseURL', () => {
      expect(authClient).toBeDefined();
    });
  });
});
