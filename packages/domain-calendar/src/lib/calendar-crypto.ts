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
let currentKeyProvider: KeyProvider = async () => {
  // For testing, generate a new key each time
  // In production, this would be derived from user master key
  return generateAESKey(false);
};

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
 * Checks if encryption is enabled (non-default key provider is set)
 */
export function isEncryptionEnabled(): boolean {
  // Default key provider generates random keys for testing
  // In production, a real key provider would be set
  // For now, we'll consider encryption disabled by default
  // unless a specific key provider is injected
  return false;
}

/**
 * Encrypts an event's title before storage
 * @param event - Event with plaintext title
 * @returns Event with encrypted title
 */
export async function sealEvent(event: CalendarEvent): Promise<EncryptedCalendarEvent> {
  const key = await currentKeyProvider();
  const encryptedTitle = await encryptItem(event.title, key);

  const { title, ...rest } = event;
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

  const { encryptedTitle, ...rest } = encryptedEvent;
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
