import type { TaskItem } from '../../repositories/tasks.js';
import { encryptItem } from '@suite/crypto';

/**
 * Factory function for creating task test data.
 * Provides sensible defaults with support for field overrides.
 *
 * @param overrides - Optional partial task to override defaults
 * @param encryptionKey - Optional CryptoKey for encrypting the title
 * @returns A task object suitable for testing
 *
 * @example
 * ```ts
 * const task = createTask({ title: 'Custom Task', priority: 'high' });
 * ```
 *
 * @example with encryption
 * ```ts
 * const key = await generateAESKey(false);
 * const task = await createTask({ title: 'Secret Task' }, key);
 * ```
 */
export async function createTask(
  overrides: Partial<Omit<TaskItem, 'id'>> = {},
  encryptionKey?: CryptoKey
): Promise<Omit<TaskItem, 'id'>> {
  let title = overrides.title ?? 'Test Task';

  // Encrypt title if encryption key is provided
  if (encryptionKey) {
    const encrypted = await encryptItem(title, encryptionKey);
    title = JSON.stringify(encrypted);
  }

  const result: Omit<TaskItem, 'id'> = {
    title,
    completed: overrides.completed ?? false,
    archived: overrides.archived ?? false,
    dueDate: overrides.dueDate ?? null,
    priority: overrides.priority ?? 'medium',
    tags: overrides.tags ?? [],
  };

  // Only include blindIndex if explicitly provided
  if (overrides.blindIndex !== undefined) {
    result.blindIndex = overrides.blindIndex;
  }

  return result;
}
