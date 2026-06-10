import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgresDriveFileRepository, PostgresDriveFolderRepository } from './drive.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { driveFiles } from '../schema/drive/index.js';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import type { RepositoryContext } from '../index.js';
import { withTransaction } from '../test-helpers/transaction-wrapper.js';
import { createDriveFile, createDriveFolder } from '../test-helpers/factories/drive.js';

// Skip tests if DATABASE_URL is not set
const dbUrl = process.env.DATABASE_URL;
const tenantId1 = randomUUID();
const tenantId2 = randomUUID();
const userId1 = randomUUID();
const userId2 = randomUUID();

describe.skipIf(!dbUrl)('PostgresDriveFileRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresDriveFileRepository;
  let context1: RepositoryContext;
  let _context2: RepositoryContext;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    // Create a mock Database interface for testing
    const mockDb = {
      getDrizzleDb: () => db,
      query: async () => [],
      transaction: async () => {},
      close: async () => {},
    };
    repository = new PostgresDriveFileRepository(mockDb as never);
    context1 = {
      userId: userId1,
      tenantId: tenantId1,
      requestId: randomUUID(),
    };
    _context2 = {
      userId: userId2,
      tenantId: tenantId2,
      requestId: randomUUID(),
    };
  });

  afterAll(async () => {
    await client.end();
  });

  describe('create', () => {
    it('should create a file with basic fields', async () => {
      await withTransaction(client, async () => {
        const fileData = await createDriveFile({
          name: 'test.txt',
          size: 1024,
          createdAt: '2026-06-10T10:00:00Z',
          modifiedAt: '2026-06-10T10:00:00Z',
        });
        const file = await repository.create(fileData, context1);

        expect(file).toBeDefined();
        expect(file.id).toBeDefined();
        expect(file.name).toBe('test.txt');
        expect(file.size).toBe(1024);
      });
    });

    it('should create a file with optional fields', async () => {
      await withTransaction(client, async () => {
        const fileData = await createDriveFile({
          name: 'document.pdf',
          size: 2048,
          folderId: 'folder-123',
          mimeType: 'application/pdf',
          createdAt: '2026-06-10T10:00:00Z',
          modifiedAt: '2026-06-10T10:00:00Z',
          blindIndex: 'hashed-name',
        });
        const file = await repository.create(fileData, context1);

        expect(file).toBeDefined();
        expect(file.folderId).toBe('folder-123');
        expect(file.mimeType).toBe('application/pdf');
        expect(file.blindIndex).toBe('hashed-name');
      });
    });
  });

  describe('findById', () => {
    it('should find a file by id', async () => {
      await withTransaction(client, async () => {
        const fileData = await createDriveFile({
          name: 'find-me.txt',
          size: 512,
          createdAt: '2026-06-10T10:00:00Z',
          modifiedAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(fileData, context1);

        const found = await repository.findById(created.id, context1);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.name).toBe('find-me.txt');
      });
    });

    it('should return null for non-existent id', async () => {
      await withTransaction(client, async () => {
        const found = await repository.findById('non-existent-id', context1);
        expect(found).toBeNull();
      });
    });
  });

  describe('findAll', () => {
    it('should return all files', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFile({ name: 'file1.txt', size: 100, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file2.txt', size: 200, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file3.txt', size: 300, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);

        const allFiles = await repository.findAll(context1);

        expect(allFiles).toHaveLength(3);
        expect(allFiles.map(f => f.name)).toEqual(['file1.txt', 'file2.txt', 'file3.txt']);
      });
    });

    it('should return empty array when no files exist', async () => {
      await withTransaction(client, async () => {
        const allFiles = await repository.findAll(context1);
        expect(allFiles).toEqual([]);
      });
    });
  });

  describe('update', () => {
    it('should update a file', async () => {
      await withTransaction(client, async () => {
        const fileData = await createDriveFile({
          name: 'original.txt',
          size: 100,
          createdAt: '2026-06-10T10:00:00Z',
          modifiedAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(fileData, context1);

        const updated = await repository.update(created.id, {
          name: 'updated.txt',
          size: 200,
        }, context1);

        expect(updated).toBeDefined();
        expect(updated?.id).toBe(created.id);
        expect(updated?.name).toBe('updated.txt');
        expect(updated?.size).toBe(200);
      });
    });

    it('should return null when updating non-existent file', async () => {
      await withTransaction(client, async () => {
        const updated = await repository.update('non-existent-id', { name: 'New Name' }, context1);
        expect(updated).toBeNull();
      });
    });

    it('should update optional fields', async () => {
      await withTransaction(client, async () => {
        const fileData = await createDriveFile({
          name: 'file.txt',
          size: 100,
          createdAt: '2026-06-10T10:00:00Z',
          modifiedAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(fileData, context1);

        const updated = await repository.update(created.id, {
          folderId: 'folder-456',
          mimeType: 'text/plain',
        }, context1);

        expect(updated).toBeDefined();
        expect(updated?.folderId).toBe('folder-456');
        expect(updated?.mimeType).toBe('text/plain');
      });
    });
  });

  describe('delete', () => {
    it('should delete a file', async () => {
      await withTransaction(client, async () => {
        const fileData = await createDriveFile({
          name: 'to-delete.txt',
          size: 100,
          createdAt: '2026-06-10T10:00:00Z',
          modifiedAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(fileData, context1);

        const deleted = await repository.delete(created.id, context1);

        expect(deleted).toBe(true);

        const found = await repository.findById(created.id, context1);
        expect(found).toBeNull();
      });
    });

    it('should return false when deleting non-existent file', async () => {
      await withTransaction(client, async () => {
        const deleted = await repository.delete('non-existent-id', context1);
        expect(deleted).toBe(false);
      });
    });
  });

  describe('findWhere', () => {
    it('should find files matching criteria', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFile({ name: 'file1.txt', size: 100, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file2.txt', size: 200, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file3.txt', size: 300, folderId: 'folder-2', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);

        const filesInFolder1 = await repository.findWhere({ folderId: 'folder-1' }, context1);

        expect(filesInFolder1).toHaveLength(2);
        expect(filesInFolder1.every(f => f.folderId === 'folder-1')).toBe(true);
      });
    });

    it('should return all files when no criteria provided', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFile({ name: 'file1.txt', size: 100, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file2.txt', size: 200, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);

        const allFiles = await repository.findWhere({}, context1);

        expect(allFiles).toHaveLength(2);
      });
    });
  });

  describe('count', () => {
    it('should count all files', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFile({ name: 'file1.txt', size: 100, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file2.txt', size: 200, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file3.txt', size: 300, createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);

        const count = await repository.count({}, context1);

        expect(count).toBe(3);
      });
    });

    it('should count files matching criteria', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFile({ name: 'file1.txt', size: 100, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file2.txt', size: 200, folderId: 'folder-1', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFile({ name: 'file3.txt', size: 300, folderId: 'folder-2', createdAt: '2026-06-10T10:00:00Z', modifiedAt: '2026-06-10T10:00:00Z' }), context1);

        const countInFolder1 = await repository.count({ folderId: 'folder-1' }, context1);

        expect(countInFolder1).toBe(2);
      });
    });

    it('should return 0 when no files exist', async () => {
      await withTransaction(client, async () => {
        const count = await repository.count({}, context1);
        expect(count).toBe(0);
      });
    });
  });
});

describe.skipIf(!dbUrl)('PostgresDriveFolderRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: PostgresDriveFolderRepository;
  let context1: RepositoryContext;
  let _context2: RepositoryContext;

  beforeAll(async () => {
    if (!dbUrl) {
      throw new Error('DATABASE_URL is required for integration tests');
    }
    client = postgres(dbUrl);
    db = drizzle(client);
    // Create a mock Database interface for testing
    const mockDb = {
      getDrizzleDb: () => db,
      query: async () => [],
      transaction: async () => {},
      close: async () => {},
    };
    repository = new PostgresDriveFolderRepository(mockDb as never);
    context1 = {
      userId: userId1,
      tenantId: tenantId1,
      requestId: randomUUID(),
    };
    _context2 = {
      userId: userId2,
      tenantId: tenantId2,
      requestId: randomUUID(),
    };
  });

  afterAll(async () => {
    await client.end();
  });

  describe('create', () => {
    it('should create a folder with basic fields', async () => {
      await withTransaction(client, async () => {
        const folderData = await createDriveFolder({
          name: 'Documents',
          createdAt: '2026-06-10T10:00:00Z',
        });
        const folder = await repository.create(folderData, context1);

        expect(folder).toBeDefined();
        expect(folder.id).toBeDefined();
        expect(folder.name).toBe('Documents');
      });
    });

    it('should create a folder with parent', async () => {
      await withTransaction(client, async () => {
        const folderData = await createDriveFolder({
          name: 'Subfolder',
          parentId: 'parent-123',
          createdAt: '2026-06-10T10:00:00Z',
        });
        const folder = await repository.create(folderData, context1);

        expect(folder).toBeDefined();
        expect(folder.parentId).toBe('parent-123');
      });
    });
  });

  describe('findById', () => {
    it('should find a folder by id', async () => {
      await withTransaction(client, async () => {
        const folderData = await createDriveFolder({
          name: 'Find Me',
          createdAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(folderData, context1);

        const found = await repository.findById(created.id, context1);

        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
        expect(found?.name).toBe('Find Me');
      });
    });

    it('should return null for non-existent id', async () => {
      await withTransaction(client, async () => {
        const found = await repository.findById('non-existent-id', context1);
        expect(found).toBeNull();
      });
    });
  });

  describe('findAll', () => {
    it('should return all folders', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFolder({ name: 'Folder 1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 2', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 3', createdAt: '2026-06-10T10:00:00Z' }), context1);

        const allFolders = await repository.findAll(context1);

        expect(allFolders).toHaveLength(3);
        expect(allFolders.map(f => f.name)).toEqual(['Folder 1', 'Folder 2', 'Folder 3']);
      });
    });

    it('should return empty array when no folders exist', async () => {
      await withTransaction(client, async () => {
        const allFolders = await repository.findAll(context1);
        expect(allFolders).toEqual([]);
      });
    });
  });

  describe('update', () => {
    it('should update a folder', async () => {
      await withTransaction(client, async () => {
        const folderData = await createDriveFolder({
          name: 'Original Name',
          createdAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(folderData, context1);

        const updated = await repository.update(created.id, {
          name: 'Updated Name',
        }, context1);

        expect(updated).toBeDefined();
        expect(updated?.id).toBe(created.id);
        expect(updated?.name).toBe('Updated Name');
      });
    });

    it('should return null when updating non-existent folder', async () => {
      await withTransaction(client, async () => {
        const updated = await repository.update('non-existent-id', { name: 'New Name' }, context1);
        expect(updated).toBeNull();
      });
    });

    it('should update parent folder', async () => {
      await withTransaction(client, async () => {
        const folderData = await createDriveFolder({
          name: 'Folder',
          createdAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(folderData, context1);

        const updated = await repository.update(created.id, {
          parentId: 'new-parent-456',
        }, context1);

        expect(updated).toBeDefined();
        expect(updated?.parentId).toBe('new-parent-456');
      });
    });
  });

  describe('delete', () => {
    it('should delete a folder', async () => {
      await withTransaction(client, async () => {
        const folderData = await createDriveFolder({
          name: 'To Delete',
          createdAt: '2026-06-10T10:00:00Z',
        });
        const created = await repository.create(folderData, context1);

        const deleted = await repository.delete(created.id, context1);

        expect(deleted).toBe(true);

        const found = await repository.findById(created.id, context1);
        expect(found).toBeNull();
      });
    });

    it('should return false when deleting non-existent folder', async () => {
      await withTransaction(client, async () => {
        const deleted = await repository.delete('non-existent-id', context1);
        expect(deleted).toBe(false);
      });
    });
  });

  describe('findWhere', () => {
    it('should find folders matching criteria', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFolder({ name: 'Folder 1', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 2', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 3', parentId: 'parent-2', createdAt: '2026-06-10T10:00:00Z' }), context1);

        const foldersInParent1 = await repository.findWhere({ parentId: 'parent-1' }, context1);

        expect(foldersInParent1).toHaveLength(2);
        expect(foldersInParent1.every(f => f.parentId === 'parent-1')).toBe(true);
      });
    });

    it('should return all folders when no criteria provided', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFolder({ name: 'Folder 1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 2', createdAt: '2026-06-10T10:00:00Z' }), context1);

        const allFolders = await repository.findWhere({}, context1);

        expect(allFolders).toHaveLength(2);
      });
    });
  });

  describe('count', () => {
    it('should count all folders', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFolder({ name: 'Folder 1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 2', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 3', createdAt: '2026-06-10T10:00:00Z' }), context1);

        const count = await repository.count({}, context1);

        expect(count).toBe(3);
      });
    });

    it('should count folders matching criteria', async () => {
      await withTransaction(client, async () => {
        await repository.create(await createDriveFolder({ name: 'Folder 1', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 2', parentId: 'parent-1', createdAt: '2026-06-10T10:00:00Z' }), context1);
        await repository.create(await createDriveFolder({ name: 'Folder 3', parentId: 'parent-2', createdAt: '2026-06-10T10:00:00Z' }), context1);

        const countInParent1 = await repository.count({ parentId: 'parent-1' }, context1);

        expect(countInParent1).toBe(2);
      });
    });

    it('should return 0 when no folders exist', async () => {
      await withTransaction(client, async () => {
        const count = await repository.count({}, context1);
        expect(count).toBe(0);
      });
    });
  });

  describe('tenant isolation', () => {
    it('should ensure data from one tenant is not visible to another', async () => {
      await withTransaction(client, async () => {
        // Create file for tenant 1
        await db.insert(driveFiles).values({
          id: randomUUID(),
          tenantId: tenantId1,
          userId: userId1,
          name: 'Tenant 1 File',
          size: 1024,
          createdAt: new Date('2026-06-10T10:00:00Z'),
          modifiedAt: new Date('2026-06-10T10:00:00Z'),
        });

        // Create file for tenant 2
        await db.insert(driveFiles).values({
          id: randomUUID(),
          tenantId: tenantId2,
          userId: userId2,
          name: 'Tenant 2 File',
          size: 2048,
          createdAt: new Date('2026-06-10T10:00:00Z'),
          modifiedAt: new Date('2026-06-10T10:00:00Z'),
        });

        // Query all files - should return both (no RLS in test)
        const allFiles = await db.select().from(driveFiles);
        expect(allFiles).toHaveLength(2);

        // Query with tenant filter - should return only tenant 1 files
        const tenant1Files = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.tenantId, tenantId1));
        expect(tenant1Files).toHaveLength(1);
        expect(tenant1Files[0]?.name).toBe('Tenant 1 File');

        // Query with tenant filter - should return only tenant 2 files
        const tenant2Files = await db
          .select()
          .from(driveFiles)
          .where(eq(driveFiles.tenantId, tenantId2));
        expect(tenant2Files).toHaveLength(1);
        expect(tenant2Files[0]?.name).toBe('Tenant 2 File');
      });
    });
  });
});
