import type { CalendarEvent } from '../../repositories/calendar.js';
import { encryptItem } from '@suite/crypto';

/**
 * Factory function for creating calendar event test data.
 * Provides sensible defaults with support for field overrides.
 *
 * @param overrides - Optional partial calendar event to override defaults
 * @param encryptionKey - Optional CryptoKey for encrypting the title
 * @returns A calendar event object suitable for testing
 *
 * @example
 * ```ts
 * const event = createCalendarEvent({ title: 'Custom Event' });
 * ```
 *
 * @example with encryption
 * ```ts
 * const key = await generateAESKey(false);
 * const event = await createCalendarEvent({ title: 'Secret Event' }, key);
 * ```
 */
export async function createCalendarEvent(
  overrides: Partial<Omit<CalendarEvent, 'id'>> = {},
  encryptionKey?: CryptoKey
): Promise<Omit<CalendarEvent, 'id'>> {
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  let title = overrides.title ?? 'Test Event';

  // Encrypt title if encryption key is provided
  if (encryptionKey) {
    const encrypted = await encryptItem(title, encryptionKey);
    title = JSON.stringify(encrypted);
  }

  return {
    title,
    startAt: overrides.startAt ?? now.toISOString(),
    endAt: overrides.endAt ?? oneHourLater.toISOString(),
  };
}
