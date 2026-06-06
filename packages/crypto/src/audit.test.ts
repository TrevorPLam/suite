/**
 * Audit logging tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuditEventType,
  AuditLogger,
  AuditEvent,
  createAuditEvent,
  setAuditLogger,
  getAuditLogger,
  logKeyCreated,
  logKeyUsed,
  logKeyDeleted,
  logKeyRotated,
  logKeyExpired,
  logSecurityEvent,
  createConsoleAuditLogger,
  createCustomAuditLogger,
} from './audit.js';

describe('Audit Logging', () => {
  beforeEach(() => {
    // Reset global audit logger before each test
    setAuditLogger(null);
  });

  describe('createAuditEvent', () => {
    it('should create an audit event with required fields', () => {
      const event = createAuditEvent(
        AuditEventType.KEY_CREATED,
        'key-123',
        'createKey',
        { algorithm: 'AES-256-GCM', keySize: 256 }
      );

      expect(event).toMatchObject({
        eventType: AuditEventType.KEY_CREATED,
        keyId: 'key-123',
        operation: 'createKey',
        metadata: {
          algorithm: 'AES-256-GCM',
          keySize: 256,
          keyId: 'key-123',
          operation: 'createKey',
        },
      });
      expect(typeof event.timestamp).toBe('number');
    });

    it('should create an audit event without optional fields', () => {
      const event = createAuditEvent(AuditEventType.KEY_CREATED);

      expect(event).toMatchObject({
        eventType: AuditEventType.KEY_CREATED,
        metadata: {},
      });
      expect(event.keyId).toBeUndefined();
      expect(event.operation).toBeUndefined();
      expect(typeof event.timestamp).toBe('number');
    });

    it('should not add undefined optional fields to metadata', () => {
      const event = createAuditEvent(AuditEventType.KEY_CREATED, undefined, undefined, {
        algorithm: 'AES-256-GCM',
      });

      expect(event.metadata).not.toHaveProperty('keyId');
      expect(event.metadata).not.toHaveProperty('operation');
      expect(event.metadata).toHaveProperty('algorithm', 'AES-256-GCM');
    });
  });

  describe('setAuditLogger and getAuditLogger', () => {
    it('should set and get the global audit logger', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn(),
        logKeyUsed: vi.fn(),
        logKeyDeleted: vi.fn(),
        logKeyRotated: vi.fn(),
        logKeyExpired: vi.fn(),
        logSecurityEvent: vi.fn(),
      };

      setAuditLogger(mockLogger);
      expect(getAuditLogger()).toBe(mockLogger);
    });

    it('should return null when no logger is set', () => {
      expect(getAuditLogger()).toBeNull();
    });

    it('should allow setting logger to null to disable logging', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn(),
        logKeyUsed: vi.fn(),
        logKeyDeleted: vi.fn(),
        logKeyRotated: vi.fn(),
        logKeyExpired: vi.fn(),
        logSecurityEvent: vi.fn(),
      };

      setAuditLogger(mockLogger);
      expect(getAuditLogger()).toBe(mockLogger);

      setAuditLogger(null);
      expect(getAuditLogger()).toBeNull();
    });
  });

  describe('logKeyCreated', () => {
    it('should call logger when logger is set', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn() as any,
        logKeyUsed: vi.fn() as any,
        logKeyDeleted: vi.fn() as any,
        logKeyRotated: vi.fn() as any,
        logKeyExpired: vi.fn() as any,
        logSecurityEvent: vi.fn() as any,
      };

      setAuditLogger(mockLogger);
      logKeyCreated('key-123', 'AES-256-GCM', 256, { isPostQuantum: false });

      expect(mockLogger.logKeyCreated).toHaveBeenCalledTimes(1);
      const event = (mockLogger.logKeyCreated as any).mock.calls[0][0] as AuditEvent;
      expect(event.eventType).toBe(AuditEventType.KEY_CREATED);
      expect(event.keyId).toBe('key-123');
      expect(event.metadata.algorithm).toBe('AES-256-GCM');
      expect(event.metadata.keySize).toBe(256);
    });

    it('should not call logger when logger is not set', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logKeyCreated('key-123', 'AES-256-GCM', 256);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('logKeyUsed', () => {
    it('should call logger when logger is set', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn() as any,
        logKeyUsed: vi.fn() as any,
        logKeyDeleted: vi.fn() as any,
        logKeyRotated: vi.fn() as any,
        logKeyExpired: vi.fn() as any,
        logSecurityEvent: vi.fn() as any,
      };

      setAuditLogger(mockLogger);
      logKeyUsed('key-123', 'encrypt', 'AES-256-GCM', { status: 'success' });

      expect(mockLogger.logKeyUsed).toHaveBeenCalledTimes(1);
      const event = (mockLogger.logKeyUsed as any).mock.calls[0][0] as AuditEvent;
      expect(event.eventType).toBe(AuditEventType.KEY_USED);
      expect(event.keyId).toBe('key-123');
      expect(event.operation).toBe('encrypt');
      expect(event.metadata.algorithm).toBe('AES-256-GCM');
    });
  });

  describe('logKeyDeleted', () => {
    it('should call logger when logger is set', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn() as any,
        logKeyUsed: vi.fn() as any,
        logKeyDeleted: vi.fn() as any,
        logKeyRotated: vi.fn() as any,
        logKeyExpired: vi.fn() as any,
        logSecurityEvent: vi.fn() as any,
      };

      setAuditLogger(mockLogger);
      logKeyDeleted('key-123', { hadKeyMaterial: true });

      expect(mockLogger.logKeyDeleted).toHaveBeenCalledTimes(1);
      const event = (mockLogger.logKeyDeleted as any).mock.calls[0][0] as AuditEvent;
      expect(event.eventType).toBe(AuditEventType.KEY_DELETED);
      expect(event.keyId).toBe('key-123');
      expect(event.metadata.hadKeyMaterial).toBe(true);
    });
  });

  describe('logKeyRotated', () => {
    it('should call logger when logger is set', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn() as any,
        logKeyUsed: vi.fn() as any,
        logKeyDeleted: vi.fn() as any,
        logKeyRotated: vi.fn() as any,
        logKeyExpired: vi.fn() as any,
        logSecurityEvent: vi.fn() as any,
      };

      setAuditLogger(mockLogger);
      logKeyRotated('key-old', 'key-new', { oldVersion: 1, newVersion: 2 });

      expect(mockLogger.logKeyRotated).toHaveBeenCalledTimes(1);
      const event = (mockLogger.logKeyRotated as any).mock.calls[0][0] as AuditEvent;
      expect(event.eventType).toBe(AuditEventType.KEY_ROTATED);
      expect(event.keyId).toBe('key-new');
      expect(event.metadata.oldKeyId).toBe('key-old');
      expect(event.metadata.oldVersion).toBe(1);
      expect(event.metadata.newVersion).toBe(2);
    });
  });

  describe('logKeyExpired', () => {
    it('should call logger when logger is set', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn() as any,
        logKeyUsed: vi.fn() as any,
        logKeyDeleted: vi.fn() as any,
        logKeyRotated: vi.fn() as any,
        logKeyExpired: vi.fn() as any,
        logSecurityEvent: vi.fn() as any,
      };

      setAuditLogger(mockLogger);
      logKeyExpired('key-123', { expiredAt: '2026-12-31' });

      expect(mockLogger.logKeyExpired).toHaveBeenCalledTimes(1);
      const event = (mockLogger.logKeyExpired as any).mock.calls[0][0] as AuditEvent;
      expect(event.eventType).toBe(AuditEventType.KEY_EXPIRED);
      expect(event.keyId).toBe('key-123');
      expect(event.metadata.expiredAt).toBe('2026-12-31');
    });
  });

  describe('logSecurityEvent', () => {
    it('should call logger when logger is set', () => {
      const mockLogger: AuditLogger = {
        logKeyCreated: vi.fn() as any,
        logKeyUsed: vi.fn() as any,
        logKeyDeleted: vi.fn() as any,
        logKeyRotated: vi.fn() as any,
        logKeyExpired: vi.fn() as any,
        logSecurityEvent: vi.fn() as any,
      };

      setAuditLogger(mockLogger);
      logSecurityEvent(AuditEventType.INVALID_KEY, 'decrypt', { errorCode: 'INVALID_KEY' });

      expect(mockLogger.logSecurityEvent).toHaveBeenCalledTimes(1);
      const event = (mockLogger.logSecurityEvent as any).mock.calls[0][0] as AuditEvent;
      expect(event.eventType).toBe(AuditEventType.INVALID_KEY);
      expect(event.operation).toBe('decrypt');
      expect(event.metadata.errorCode).toBe('INVALID_KEY');
    });
  });

  describe('ConsoleAuditLogger', () => {
    it('should log events to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createConsoleAuditLogger();

      logger.logKeyCreated(
        createAuditEvent(AuditEventType.KEY_CREATED, 'key-123', 'createKey', {
          algorithm: 'AES-256-GCM',
          keySize: 256,
        })
      );

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleSpy.mock.calls[0]?.[0];
      expect(logMessage).toContain('AUDIT:KEY_CREATED');
      consoleSpy.mockRestore();
    });

    it('should redact sensitive data by default', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createConsoleAuditLogger();

      logger.logSecurityEvent(
        createAuditEvent(AuditEventType.INVALID_KEY, undefined, 'decrypt', {
          key: 'secret-key',
          password: 'secret-password',
          token: 'secret-token',
        })
      );

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedData = consoleSpy.mock.calls[0]?.[1];
      expect(loggedData?.metadata.key).toBe('[REDACTED]');
      expect(loggedData?.metadata.password).toBe('[REDACTED]');
      expect(loggedData?.metadata.token).toBe('[REDACTED]');
      consoleSpy.mockRestore();
    });

    it('should not redact when redactSensitive is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createConsoleAuditLogger({ redactSensitive: false });

      logger.logSecurityEvent(
        createAuditEvent(AuditEventType.INVALID_KEY, undefined, 'decrypt', {
          key: 'secret-key',
        })
      );

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      const loggedData = consoleSpy.mock.calls[0]?.[1];
      expect(loggedData?.metadata.key).toBe('secret-key');
      consoleSpy.mockRestore();
    });
  });

  describe('CustomAuditLogger', () => {
    it('should call custom handlers for events', () => {
      const keyCreatedSpy = vi.fn();
      const keyUsedSpy = vi.fn();
      const securityEventSpy = vi.fn();

      const logger = createCustomAuditLogger({
        logKeyCreated: keyCreatedSpy,
        logKeyUsed: keyUsedSpy,
        logSecurityEvent: securityEventSpy,
      });

      const event1 = createAuditEvent(AuditEventType.KEY_CREATED, 'key-123', 'createKey');
      const event2 = createAuditEvent(AuditEventType.KEY_USED, 'key-123', 'encrypt');
      const event3 = createAuditEvent(AuditEventType.INVALID_KEY, undefined, 'decrypt');

      logger.logKeyCreated(event1);
      logger.logKeyUsed(event2);
      logger.logSecurityEvent(event3);

      expect(keyCreatedSpy).toHaveBeenCalledWith(event1);
      expect(keyUsedSpy).toHaveBeenCalledWith(event2);
      expect(securityEventSpy).toHaveBeenCalledWith(event3);
    });

    it('should handle async handlers', async () => {
      const asyncSpy = vi.fn().mockResolvedValue(undefined);

      const logger = createCustomAuditLogger({
        logKeyCreated: asyncSpy,
      });

      const event = createAuditEvent(AuditEventType.KEY_CREATED, 'key-123', 'createKey');
      const result = logger.logKeyCreated(event);

      expect(result).toBeInstanceOf(Promise);
      await result;
      expect(asyncSpy).toHaveBeenCalledWith(event);
    });

    it('should not call handler if not provided', () => {
      const keyCreatedSpy = vi.fn();

      const logger = createCustomAuditLogger({
        logKeyCreated: keyCreatedSpy,
        // logKeyUsed not provided
      });

      const event = createAuditEvent(AuditEventType.KEY_USED, 'key-123', 'encrypt');
      const result = logger.logKeyUsed(event);

      expect(result).toBeUndefined();
      expect(keyCreatedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Async logger error handling', () => {
    it('should handle async logger errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const asyncLogger: AuditLogger = {
        logKeyCreated: async () => {
          throw new Error('Async error');
        },
        logKeyUsed: vi.fn(),
        logKeyDeleted: vi.fn(),
        logKeyRotated: vi.fn(),
        logKeyExpired: vi.fn(),
        logSecurityEvent: vi.fn(),
      };

      setAuditLogger(asyncLogger);
      logKeyCreated('key-123', 'AES-256-GCM', 256);

      // Wait for async error to be caught
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith('Audit logging failed:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
