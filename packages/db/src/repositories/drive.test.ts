import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository } from './drive.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { driveFiles, driveFolders } from '../schema/drive.js';

// Skip tests if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL;
describe.skipIf(!dbUrl)('PostgresDriveFileRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresDriveFileRepository;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    repository = new PostgresDriveFileRepository('test-user-id', db);
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    // Clean up drive files table before each test
    await db.delete(driveFiles);
  });

  describe('create', () => {
    it('should create a file with basic fields', async () => {
      const file = await repository.create({
        name: 'test.txt',
        size: 1024,
        createdAt: '2026-06-10T10:00:00Z',
        modifiedAt: '2026-06-10T10:00:00Z',
      });

      expect(file).toBeDefined();
      expect(file.id).toBeDefined();
      expect(file.name).toBe('test.txt');
      expect(file.size).toBe(1024);
    });

    it('should create a file with optional fields', async () => {
      const file = await repository.create({
        name: 'document.pdf',
        size: 2048,
        folderId: 'folder-123',
        mimeType: 'application/pdf',
        createdAt: '2026-06-10T10:00:00Z',
        modifiedAt: '2026-06-10T10:00:00Z',
        blindIndex: 'hashed-name',
      });

      expect(file).toBeDefined();
      expect(file.folderId).toBe('folder-123');
      expect(file.mimeType).toBe('application/pdf');
      expect(file.blindIndex).toBe('hashed-name');
    });
  });

  describe('findById', () => {
    it('should find a file by id', async () => {
      const created = await repository.create({
        name: 'find-me.txt',
        size: 512,
        createdAt: '2026-06-10T10:00:00Z',
        modifiedAt: '2026-06-10T10:00:00Z',
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('find-me.txt');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all files', async () => {
      await repository.create({ name: 'file1.txt', size: 100, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file2.txt', size: 200, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file3.txt', size: 300, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });

      const allFiles = await repository.findAll();

      expect(allFiles).toHaveLength(3);
      expect(allFiles.map(f => f.name)).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
    });

    it('should return empty array when no files exist', async () => {
      const allFiles = await repository.findAll();
      expect(allFiles).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a file', async () => {
      const created = await repository.create({
        name: 'original.txt',
        size: 100,
        createdAt: '2026-06-10T10:00:00Z',
        modifiedAt: '2026-06-10T10:00:00Z',
      });

      const updated = await repository.update(created.id, {
        name: 'updated.txt',
        size: 200,
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe('updated.txt');
      expect(updated?.size).toBe(200);
    });

    it('should return null when updating non-existent file', async () => {
      const updated = await repository.update('non-existent-id', { name: 'New Name' });
      expect(updated).toBeNull();
    });

    it('should update optional fields', async () => {
      const created = await repository.create({
        name: 'file.txt',
        size: 100,
        createdAt: '2026-06-10T10:00:00Z',
        modifiedAt: '2026-06-10T10:00:00Z',
      });

      const updated = await repository.update(created.id, {
        folderId: 'folder-456',
        mimeType: 'text/plain',
      });

      expect(updated).toBeDefined();
      expect(updated?.folderId).toBe('folder-456');
      expect(updated?.mimeType).toBe('text/plain');
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      const created = await repository.create({
        name: 'to-delete.txt',
        size: 100,
        createdAt: '2026-06-10T10:00:00Z',
        modifiedAt: '2026-06-10T10:00:00Z',
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent file', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('findWhere', () => {
    it('should find files matching criteria', async () => {
      await repository.create({ name: 'file1.txt', size: 100, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file2.txt', size: 200, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file3.txt', size: 300, folderId: 'folder-2', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });

      const filesInFolder1 = await repository.findWhere({ folderId: 'folder-1' });

      expect(filesInFolder1).toHaveLength(2);
      expect(filesInFolder1.every(f => f.folderId === 'folder-1')).toBe(true);
    });

    it('should return all files when no criteria provided', async () => {
      await repository.create({ name: 'file1.txt', size: 100, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file2.txt', size: 200, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });

      const allFiles = await repository.findWhere({});

      expect(allFiles).toHaveLength(2);
    });
  });

  describe('count', () => {
    it('should count all files', async () => {
      await repository.create({ name: 'file1.txt', size: 100, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file2.txt', size: 200, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file3.txt', size: 300, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });

      const count = await repository.count();

      expect(count).toBe(3);
    });

    it('should count files matching criteria', async () => {
      await repository.create({ name: 'file1.txt', size: 100, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file2.txt', size: 200, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'file3.txt', size: 300, folderId: 'folder-2', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' });

      const countInFolder1 = await repository.count({ folderId: 'folder-1' });

      expect(countInFolder1).toBe(2);
    });

    it('should return 0 when no files exist', async () => {
      const count = await repository.count();
      expect(count).toBe(0);
    });
  });
});

describe.skipIf(!dbUrl)('PostgresDriveFolderRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresDriveFolderRepository;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    repository = new PostgresDriveFolderRepository('test-user-id', db);
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    // Clean up drive folders table before each test
    await db.delete(driveFolders);
  });

  describe('create', () => {
    it('should create a folder with basic fields', async () => {
      const folder = await repository.create({
        name: 'Documents',
        createdAt: '2026-06-10T10:00:00Z',
      });

      expect(folder).toBeDefined();
      expect(folder.id).toBeDefined();
      expect(folder.name).toBe('Documents');
    });

    it('should create a folder with parent', async () => {
      const folder = await repository.create({
        name: 'Subfolder',
        parentId: 'parent-123',
        createdAt: '2026-06-10T10:00:00Z',
      });

      expect(folder).toBeDefined();
      expect(folder.parentId).toBe('parent-123');
    });
  });

  describe('findById', () => {
    it('should find a folder by id', async () => {
      const created = await repository.create({
        name: 'Find Me',
        createdAt: '2026-06-10T10:00:00Z',
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Find Me');
    });

    it('should return null for non-existent id', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all folders', async () => {
      await repository.create({ name: 'Folder 1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 2', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 3', createdAt: '2026-06-10T10:00:00Z' });

      const allFolders = await repository.findAll();

      expect(allFolders).toHaveLength(3);
      expect(allFolders.map(f => f.name)).toEqual(['Folder 1', 'Folder 2', 'Folder 3']);
    });

    it('should return empty array when no folders exist', async () => {
      const allFolders = await repository.findAll();
      expect(allFolders).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a folder', async () => {
      const created = await repository.create({
        name: 'Original Name',
        createdAt: '2026-06-10T10:00:00Z',
      });

      const updated = await repository.update(created.id, {
        name: 'Updated Name',
      });

      expect(updated).toBeDefined();
      expect(updated?.id).toBe(created.id);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should return null when updating non-existent folder', async () => {
      const updated = await repository.update('non-existent-id', { name: 'New Name' });
      expect(updated).toBeNull();
    });

    it('should update parent folder', async () => {
      const created = await repository.create({
        name: 'Folder',
        createdAt: '2026-06-10T10:00:00Z',
      });

      const updated = await repository.update(created.id, {
        parentId: 'new-parent-456',
      });

      expect(updated).toBeDefined();
      expect(updated?.parentId).toBe('new-parent-456');
    });
  });

  describe('delete', () => {
    it('should delete a folder', async () => {
      const created = await repository.create({
        name: 'To Delete',
        createdAt: '2026-06-10T10:00:00Z',
      });

      const deleted = await repository.delete(created.id);

      expect(deleted).toBe(true);

      const found = await repository.findById(created.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent folder', async () => {
      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('findWhere', () => {
    it('should find folders matching criteria', async () => {
      await repository.create({ name: 'Folder 1', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 2', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 3', parentId: 'parent-2', createdAt: '2026-06-10T10:00:00Z' });

      const foldersInParent1 = await repository.findWhere({ parentId: 'parent-1' });

      expect(foldersInParent1).toHaveLength(2);
      expect(foldersInParent1.every(f => f.parentId === 'parent-1')).toBe(true);
    });

    it('should return all folders when no criteria provided', async () => {
      await repository.create({ name: 'Folder 1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 2', createdAt: '2026-06-10T10:00:00Z' });

      const allFolders = await repository.findWhere({});

      expect(allFolders).toHaveLength(2);
    });
  });

  describe('count', () => {
    it('should count all folders', async () => {
      await repository.create({ name: 'Folder 1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 2', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 3', createdAt: '2026-06-10T10:00:00Z' });

      const count = await repository.count();

      expect(count).toBe(3);
    });

    it('should count folders matching criteria', async () => {
      await repository.create({ name: 'Folder 1', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 2', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' });
      await repository.create({ name: 'Folder 3', parentId: 'parent-2', createdAt: '2026-06-10T10:00:00Z' });

      const countInParent1 = await repository.count({ parentId: 'parent-1' });

      expect(countInParent1).toBe(2);
    });

    it('should return 0 when no folders exist', async () => {
      const count = await repository.count();
      expect(count).toBe(0);
    });
  });
});
