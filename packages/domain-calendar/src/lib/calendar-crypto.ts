/**
 * Encryption adapter for Calendar domain
 * Handles AES-256-GCM encryption of event titles at the domain boundary
 */

import type { EncryptedData } from '@suite/crypto';
import { decryptItem, encryptItem, generateAESKey } from '@suite/crypto';
import type { CalendarEvent } from './calendar-events.js';

export type EncryptedCalendarEvent = Omit<CalendarEvent, 'title'> & {
  encryptedTitle: EncryptedData;
};

// Key provider function type - allows injection of encryption key
export type KeyProvider = () => Promise<CryptoKey>;

// Default key provider for testing - generates a fixed test key
const defaultKeyProvider: KeyProvider = async () => {
  // For testing, generate a new key each time
  // In production, this would be derived from user master key
  return generateAESKey(false);
};

let currentKeyProvider: KeyProvider = defaultKeyProvider;

/**
 * Sets the key provider for encryption operations
 * @param provider - Function that returns a CryptoKey for AES-GCM
 */
export function setCalendarKeyProvider(provider: KeyProvider): void {
  currentKeyProvider = provider;
}

/**
 * Gets the current key provider
 */
export function getCalendarKeyProvider(): KeyProvider {
  return currentKeyProvider;
}

/**
 * Sets the key provider from ENCRYPTION_KEY environment variable
 * @throws Error if ENCRYPTION_KEY is set but invalid
 */
export async function setCalendarKeyProviderFromEnv(): Promise<void> {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  
  if (!encryptionKey) {
    // No key set, keep default provider (encryption disabled)
    return;
  }
  
  try {
    // Decode base64 key
    const keyData = Uint8Array.from(atob(encryptionKey), c => c.charCodeAt(0));
    
    // Import as AES-GCM key
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Set provider that returns this key
    currentKeyProvider = async () => key;
  } catch (error) {
    throw new Error(`Invalid ENCRYPTION_KEY: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Checks if encryption is enabled (non-default key provider is set)
 */
export function isEncryptionEnabled(): boolean {
  return currentKeyProvider !== defaultKeyProvider;
}

/**
 * Resets the key provider to default (for testing)
 */
export function resetKeyProvider(): void {
  currentKeyProvider = defaultKeyProvider;
}

/**
 * Encrypts an event's title before storage
 * @param event - Event with plaintext title
 * @returns Event with encrypted title
 */
export async function sealEvent(event: CalendarEvent): Promise<EncryptedCalendarEvent> {
  const key = await currentKeyProvider();
  const encryptedTitle = await encryptItem(event.title, key);

  const { title: _title, ...rest } = event;
  return {
    ...rest,
    encryptedTitle,
  };
}

/**
 * Decrypts an event's title after retrieval
 * @param encryptedEvent - Event with encrypted title
 * @returns Event with plaintext title
 */
export async function unsealEvent(encryptedEvent: EncryptedCalendarEvent): Promise<CalendarEvent> {
  const key = await currentKeyProvider();
  const title = await decryptItem(encryptedEvent.encryptedTitle, key);

  const { encryptedTitle: _encryptedTitle, ...rest } = encryptedEvent;
  return {
    ...rest,
    title,
  };
}

/**
 * Batch encrypts multiple events
 * @param events - Events with plaintext titles
 * @returns Events with encrypted titles
 */
export async function sealEvents(events: CalendarEvent[]): Promise<EncryptedCalendarEvent[]> {
  return Promise.all(events.map(sealEvent));
}

/**
 * Batch decrypts multiple events
 * @param encryptedEvents - Events with encrypted titles
 * @returns Events with plaintext titles
 */
export async function unsealEvents(encryptedEvents: EncryptedCalendarEvent[]): Promise<CalendarEvent[]> {
  return Promise.all(encryptedEvents.map(unsealEvent));
}
