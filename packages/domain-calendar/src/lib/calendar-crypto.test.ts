import { describe, it, expect, beforeEach } from 'vitest';
import {
  setCalendarKeyProvider,
  setCalendarKeyProviderFromEnv,
  isEncryptionEnabled,
  sealEvent,
  unsealEvent,
  resetKeyProvider,
} from './calendar-crypto.js';
import { generateAESKey } from '@suite/crypto';
import type { CalendarEvent } from './calendar-events.js';

describe('calendar-crypto - encryption activation', () => {
  beforeEach(() => {
    // Reset to default provider (encryption disabled)
    resetKeyProvider();
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
    delete process.env.ENCRYPTION_KEY;
    await setCalendarKeyProviderFromEnv();
    expect(isEncryptionEnabled()).toBe(false);
  });

  it('should return true for isEncryptionEnabled when ENCRYPTION_KEY is set', async () => {
    // Generate a valid base64-encoded 256-bit key with extractable flag
    const key = await generateAESKey(true);
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const base64Key = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
    
    process.env.ENCRYPTION_KEY = base64Key;
    await setCalendarKeyProviderFromEnv();
    expect(isEncryptionEnabled()).toBe(true);
    
    delete process.env.ENCRYPTION_KEY;
  });

  it('should throw error when ENCRYPTION_KEY is invalid', async () => {
    process.env.ENCRYPTION_KEY = 'invalid-key';
    await expect(setCalendarKeyProviderFromEnv()).rejects.toThrow('Invalid ENCRYPTION_KEY');
    delete process.env.ENCRYPTION_KEY;
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
});
