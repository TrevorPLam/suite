import { describe, it, expect } from 'vitest';
import { authClient, signIn, signUp, signOut, useSession } from './client.js';

describe('Auth Package', () => {
  describe('Auth Client', () => {
    it('should create auth client with baseURL', () => {
      expect(authClient).toBeDefined();
      expect(typeof authClient).toBe('object');
    });

    describe('signIn export', () => {
      it('should export signIn function', () => {
        expect(signIn).toBeDefined();
        expect(typeof signIn).toBe('object');
        expect(signIn.email).toBeDefined();
        expect(typeof signIn.email).toBe('function');
      });

      it('should have signIn.email method with correct structure', () => {
        expect(signIn.email).toBeDefined();
        expect(typeof signIn.email).toBe('function');
      });
    });

    describe('signUp export', () => {
      it('should export signUp function', () => {
        expect(signUp).toBeDefined();
        expect(typeof signUp).toBe('object');
        expect(signUp.email).toBeDefined();
        expect(typeof signUp.email).toBe('function');
      });

      it('should have signUp.email method with correct structure', () => {
        expect(signUp.email).toBeDefined();
        expect(typeof signUp.email).toBe('function');
      });
    });

    describe('signOut export', () => {
      it('should export signOut function', () => {
        expect(signOut).toBeDefined();
        expect(typeof signOut).toBe('function');
      });
    });

    describe('useSession export', () => {
      it('should export useSession hook', () => {
        expect(useSession).toBeDefined();
        expect(typeof useSession).toBe('function');
      });
    });

    describe('client structure', () => {
      it('should have all required client methods', () => {
        expect(authClient).toHaveProperty('signIn');
        expect(authClient).toHaveProperty('signUp');
        expect(authClient).toHaveProperty('signOut');
        expect(authClient).toHaveProperty('useSession');
      });

      it('should have nested email methods for signIn and signUp', () => {
        expect(authClient.signIn).toHaveProperty('email');
        expect(authClient.signUp).toHaveProperty('email');
      });
    });
  });
});
