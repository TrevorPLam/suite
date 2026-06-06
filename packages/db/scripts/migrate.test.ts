import { describe, it, expect, vi } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { lockIds, getLockId, getMigrationsFolder } from './migrate.js';

// Mock the migrate function
vi.mock('drizzle-orm/postgres-js/migrator', () => ({
  migrate: vi.fn(),
}));

// Mock postgres
vi.mock('postgres', () => ({
  default: vi.fn(() => ({
    __testClient: true,
    end: vi.fn(),
  })),
}));

// Mock drizzle
vi.mock('drizzle-orm/postgres-js', () => ({
  drizzle: vi.fn(() => ({
    __testDb: true,
  })),
}));

describe('Migration Runner', () => {
  describe('lockIds', () => {
    it('should have lock IDs for known domains', () => {
      expect(lockIds.calendar).toBe(1001);
      expect(lockIds.drive).toBe(1002);
      expect(lockIds.tasks).toBe(1003);
    });
  });

  describe('getLockId', () => {
    it('should return correct lock ID for known domain', () => {
      expect(getLockId('calendar')).toBe(1001);
      expect(getLockId('drive')).toBe(1002);
      expect(getLockId('tasks')).toBe(1003);
    });

    it('should throw error for unknown domain', () => {
      expect(() => getLockId('unknown_domain')).toThrow('Unknown domain: unknown_domain');
    });
  });

  describe('getMigrationsFolder', () => {
    it('should resolve migration folder path correctly', () => {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const domain = 'calendar';
      const migrationsFolder = getMigrationsFolder(domain);

      expect(migrationsFolder).toContain('drizzle');
      expect(migrationsFolder).toContain('calendar');
      expect(migrationsFolder).toContain(__dirname);
    });
  });
});
