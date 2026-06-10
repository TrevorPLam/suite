import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setCalendarKeyProvider,
  getCalendarKeyProvider,
  setCalendarKeyProviderFromEnv,
  isEncryptionEnabled,
  sealEvent,
  unsealEvent,
  sealEvents,
  unsealEvents,
  resetKeyProvider,
  resetInitialized,
} from './calendar-crypto.js';
import { generateAESKey } from '@suite/crypto';
import type { CalendarEvent } from './calendar-events.js';

describe('calendar-crypto - encryption activation', () => {
  beforeEach(() => {
    // Reset to default provider (encryption disabled)
    resetKeyProvider();
  });

  afterEach(() => {
    // Reset initialized flag for test isolation
    resetInitialized();
  });

  it('should return false for isEncryptionEnabled by default', () => {
    expect(isEncryptionEnabled()).toBe(false);
  });

  it('should return true for isEncryptionEnabled after setting custom provider', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);
    expect(isEncryptionEnabled()).toBe(true);
  });

  it('should return false for isEncryptionEnabled when ENCRYPTION_KEY is not set', async () => {
    await setCalendarKeyProviderFromEnv(undefined);
    expect(isEncryptionEnabled()).toBe(false);
  });

  it('should return true for isEncryptionEnabled when ENCRYPTION_KEY is set', async () => {
    // Generate a valid base64-encoded 256-bit key with extractable flag
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    await setCalendarKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
  });

  it('should throw error when ENCRYPTION_KEY is invalid', async () => {
    await expect(setCalendarKeyProviderFromEnv('invalid-key')).rejects.toThrow('Invalid ENCRYPTION_KEY');
  });

  it('should throw error when ENCRYPTION_KEY is invalid base64', async () => {
    await expect(setCalendarKeyProviderFromEnv('not-valid-base64!!!')).rejects.toThrow('Invalid ENCRYPTION_KEY');
  });

  it('should throw error when ENCRYPTION_KEY is wrong length', async () => {
    // Too short for AES-256 (needs 32 bytes)
    await expect(setCalendarKeyProviderFromEnv(btoa('short'))).rejects.toThrow('Invalid ENCRYPTION_KEY');
  });

  it('should actually encrypt when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const event: CalendarEvent = {
      id: 'test-id',
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const encrypted = await sealEvent(event);

    // Encrypted title should not equal plaintext
    expect(encrypted.encryptedTitle).toBeDefined();
    expect(encrypted.encryptedTitle.ciphertext).not.toBe(event.title);
    expect(encrypted.encryptedTitle.iv).toBeDefined();
  });

  it('should actually decrypt when encryption is enabled', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const event: CalendarEvent = {
      id: 'test-id',
      title: 'Team Meeting',
      startAt: '2025-01-15T10:00:00Z',
      endAt: '2025-01-15T11:00:00Z',
    };

    const encrypted = await sealEvent(event);
    const decrypted = await unsealEvent(encrypted);

    expect(decrypted.title).toBe(event.title);
    expect(decrypted.id).toBe(event.id);
    expect(decrypted.startAt).toBe(event.startAt);
    expect(decrypted.endAt).toBe(event.endAt);
  });

  it('should return the current key provider', () => {
    const provider = getCalendarKeyProvider();
    expect(provider).toBeDefined();
    expect(typeof provider).toBe('function');
  });

  it('should batch encrypt multiple events', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const events: CalendarEvent[] = [
      {
        id: 'test-id-1',
        title: 'Team Meeting',
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      },
      {
        id: 'test-id-2',
        title: 'Code Review',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      },
    ];

    const encrypted = await sealEvents(events);

    expect(encrypted).toHaveLength(2);
    expect(encrypted[0]?.encryptedTitle).toBeDefined();
    expect(encrypted[1]?.encryptedTitle).toBeDefined();
    expect(encrypted[0]?.encryptedTitle.ciphertext).not.toBe(events[0]?.title);
    expect(encrypted[1]?.encryptedTitle.ciphertext).not.toBe(events[1]?.title);
  });

  it('should batch decrypt multiple events', async () => {
    const testKey = await generateAESKey(false);
    setCalendarKeyProvider(async () => testKey);

    const events: CalendarEvent[] = [
      {
        id: 'test-id-1',
        title: 'Team Meeting',
        startAt: '2025-01-15T10:00:00Z',
        endAt: '2025-01-15T11:00:00Z',
      },
      {
        id: 'test-id-2',
        title: 'Code Review',
        startAt: '2025-01-15T14:00:00Z',
        endAt: '2025-01-15T15:00:00Z',
      },
    ];

    const encrypted = await sealEvents(events);
    const decrypted = await unsealEvents(encrypted);

    expect(decrypted).toHaveLength(2);
    expect(decrypted[0]?.title).toBe(events[0]?.title);
    expect(decrypted[1]?.title).toBe(events[1]?.title);
    expect(decrypted[0]?.id).toBe(events[0]?.id);
    expect(decrypted[1]?.id).toBe(events[1]?.id);
  });

  it('should handle empty array for batch operations', async () => {
    const encrypted = await sealEvents([]);
    const decrypted = await unsealEvents([]);

    expect(encrypted).toHaveLength(0);
    expect(decrypted).toHaveLength(0);
  });

  it('should not re-import key when called twice with same key', async () => {
    // Generate a valid base64-encoded 256-bit key
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    // First call - should import the key
    await setCalendarKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
    
    // Second call with same key - should be no-op due to initialized guard
    await setCalendarKeyProviderFromEnv(base64Key);
    expect(isEncryptionEnabled()).toBe(true);
  });
});
