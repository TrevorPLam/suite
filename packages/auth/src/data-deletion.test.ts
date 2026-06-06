import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logAuthEvent, createAuthEvent } from './audit-log.js';

describe('Data Deletion (GDPR Compliance)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log user deletion event', () => {
    const mockLogEvent = vi.spyOn(console, 'log');

    const event = createAuthEvent('user_deleted', {
      userId: 'user-123',
      email: 'test@example.com',
      metadata: {
        deletedAt: new Date().toISOString(),
      },
    });

    logAuthEvent(event);

    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringContaining('user_deleted')
    );
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringContaining('user-123')
    );
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringContaining('test@example.com')
    );
  });

  it('should include deletion timestamp in audit log', () => {
    const mockLogEvent = vi.spyOn(console, 'log');
    const deletedAt = new Date().toISOString();

    const event = createAuthEvent('user_deleted', {
      userId: 'user-123',
      email: 'test@example.com',
      metadata: {
        deletedAt,
      },
    });

    logAuthEvent(event);

    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringContaining(deletedAt)
    );
  });

  it('should handle deletion event with minimal context', () => {
    const mockLogEvent = vi.spyOn(console, 'log');

    const event = createAuthEvent('user_deleted', {
      userId: 'user-123',
    });

    logAuthEvent(event);

    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringContaining('user_deleted')
    );
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.stringContaining('user-123')
    );
  });
});
