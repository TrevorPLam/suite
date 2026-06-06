import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  uploadDriveFile,
  listDriveFiles,
  getDriveFile,
  renameDriveFile,
  deleteDriveFile,
  resetDriveFiles,
  resetDriveFilesDB,
  resetDriveFolders,
  resetDriveFoldersDB,
  createFolder,
  listFolders,
  renameFolder,
  deleteFolder,
  moveFile,
  searchFiles,
  getDriveOverview,
  setDriveFileRepository,
  getDriveFileRepository,
  setDriveFolderRepository,
  getDriveFolderRepository,
  setDriveStorage,
  getDriveStorage,
  DriveError,
  resetKeyProvider,
  setDriveKeyProvider,
  type UploadDriveFileInput,
  type RenameDriveFileInput,
  type CreateFolderInput,
} from './index.js';
import { generateAESKey } from '@suite/crypto';

describe('drive - upload', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetKeyProvider();
  });

  it('should upload a file with a stable ID', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input);

    expect(file.id).toBeDefined();
    expect(file.name).toBe('document.pdf');
    expect(file.size).toBe(1024);
    expect(file.createdAt).toBeDefined();
    expect(file.modifiedAt).toBeDefined();
  });

  it('should trim whitespace from file name', async () => {
    const input: UploadDriveFileInput = {
      name: '  document.pdf  ',
      size: 1024,
    };

    const file = await uploadDriveFile(input);

    expect(file.name).toBe('document.pdf');
  });

  it('should reject file name with special characters', async () => {
    const input: UploadDriveFileInput = {
      name: 'document<>.pdf',
      size: 1024,
    };

    await expect(uploadDriveFile(input)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should reject file name exceeding 255 characters', async () => {
    const input: UploadDriveFileInput = {
      name: 'a'.repeat(256),
      size: 1024,
    };

    await expect(uploadDriveFile(input)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should reject file name that is . or ..', async () => {
    const input1: UploadDriveFileInput = { name: '.', size: 1024 };
    await expect(uploadDriveFile(input1)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input1)).rejects.toMatchObject({
      code: 'validation_error',
    });

    const input2: UploadDriveFileInput = { name: '..', size: 1024 };
    await expect(uploadDriveFile(input2)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input2)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should accept file with valid mimeType', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      mimeType: 'application/pdf',
    };

    const file = await uploadDriveFile(input);
    expect(file.mimeType).toBe('application/pdf');
  });

  it('should normalize mimeType to lowercase', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      mimeType: 'Application/PDF',
    };

    const file = await uploadDriveFile(input);
    expect(file.mimeType).toBe('application/pdf');
  });

  it('should reject invalid mimeType', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      mimeType: 'invalid',
    };

    await expect(uploadDriveFile(input)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should set createdAt and modifiedAt on upload', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input);
    expect(file.createdAt).toBeDefined();
    expect(file.modifiedAt).toBeDefined();
    expect(file.createdAt).toBe(file.modifiedAt);
  });

  it('should reject negative file size', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: -1,
    };

    await expect(uploadDriveFile(input)).rejects.toThrow();
  });

  it('should reject non-integer file size', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024.5,
    };

    await expect(uploadDriveFile(input)).rejects.toThrow();
  });

  it('should allow zero file size', async () => {
    const input: UploadDriveFileInput = {
      name: 'empty.txt',
      size: 0,
    };

    const file = await uploadDriveFile(input);

    expect(file.size).toBe(0);
  });

  it('should reject non-existent folder', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      folderId: 'non-existent-folder',
    };

    await expect(uploadDriveFile(input)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input)).rejects.toMatchObject({
      code: 'not_found_error',
    });
  });

  it('should encrypt file name when encryption is enabled', async () => {
    const { setDriveKeyProvider, sealFile, unsealFile } = await import('./drive-crypto.js');
    
    // Enable encryption with a test key provider
    const testKey = await (await import('@suite/crypto')).generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input);
    
    // The returned file should have plaintext name (decrypted by domain)
    expect(file.name).toBe('document.pdf');
    
    // Seal the file to get encrypted version
    const encrypted = await sealFile(file);
    
    // Encrypted name should not equal plaintext
    expect(encrypted.encryptedName).toBeDefined();
    expect(encrypted.encryptedName).not.toEqual(file.name);
    
    // Unseal should restore original
    const decrypted = await unsealFile(encrypted);
    expect(decrypted.name).toBe(file.name);
  });
});

describe('drive - query', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetKeyProvider();
  });

  it('should list files in reverse upload order', async () => {
    const firstInput: UploadDriveFileInput = {
      name: 'first.pdf',
      size: 1024,
    };

    const secondInput: UploadDriveFileInput = {
      name: 'second.pdf',
      size: 2048,
    };

    const firstFile = await uploadDriveFile(firstInput);
    const secondFile = await uploadDriveFile(secondInput);

    const files = await listDriveFiles();

    expect(files).toHaveLength(2);
    expect(files[0]?.id).toBe(secondFile.id);
    expect(files[1]?.id).toBe(firstFile.id);
  });

  it('should get file by id', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input);
    const found = await getDriveFile(file.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(file.id);
    expect(found?.name).toBe('document.pdf');
  });

  it('should return null for non-existent file', async () => {
    const found = await getDriveFile('non-existent-id');
    expect(found).toBeNull();
  });

  it('should return empty list when no files exist', async () => {
    const files = await listDriveFiles();
    expect(files).toHaveLength(0);
  });
});

describe('drive - rename', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetKeyProvider();
  });

  it('should rename a file', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = await renameDriveFile(renameInput);

    expect(renamed).not.toBeNull();
    expect(renamed?.id).toBe(file.id);
    expect(renamed?.name).toBe('renamed.pdf');
    expect(renamed?.size).toBe(file.size);
  });

  it('should update modifiedAt on rename', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput);
    const originalModifiedAt = file.modifiedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = await renameDriveFile(renameInput);

    expect(renamed?.modifiedAt).not.toBe(originalModifiedAt);
    expect(renamed?.createdAt).toBe(file.createdAt);
  });

  it('should trim whitespace from new name', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: '  renamed.pdf  ',
    };

    const renamed = await renameDriveFile(renameInput);

    expect(renamed?.name).toBe('renamed.pdf');
  });

  it('should reject invalid name on rename', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'invalid<>.pdf',
    };

    await expect(renameDriveFile(renameInput)).rejects.toThrow(DriveError);
    await expect(renameDriveFile(renameInput)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should return null for non-existent file', async () => {
    const renameInput: RenameDriveFileInput = {
      id: 'non-existent-id',
      name: 'renamed.pdf',
    };

    const result = await renameDriveFile(renameInput);

    expect(result).toBeNull();
  });

  it('should preserve original size on rename', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = await renameDriveFile(renameInput);

    expect(renamed?.size).toBe(1024);
  });
});

describe('drive - delete', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetKeyProvider();
  });

  it('should delete a file', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input);

    const deleted = await deleteDriveFile(file.id);

    expect(deleted).toBe(true);

    const found = await getDriveFile(file.id);
    expect(found).toBeNull();
  });

  it('should return false for non-existent file', async () => {
    const deleted = await deleteDriveFile('non-existent-id');
    expect(deleted).toBe(false);
  });

  it('should remove file from list after deletion', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input);

    await deleteDriveFile(file.id);

    const files = await listDriveFiles();
    expect(files).toHaveLength(0);
  });
});

describe('drive - folders', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetDriveFolders();
    resetKeyProvider();
  });

  it('should create a folder in root', async () => {
    const input: CreateFolderInput = {
      name: 'Documents',
    };

    const folder = await createFolder(input);

    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('Documents');
    expect(folder.parentId).toBeUndefined();
    expect(folder.createdAt).toBeDefined();
  });

  it('should create a folder with parent', async () => {
    const parentInput: CreateFolderInput = { name: 'Parent' };
    const parent = await createFolder(parentInput);

    const childInput: CreateFolderInput = {
      name: 'Child',
      parentId: parent.id,
    };

    const child = await createFolder(childInput);

    expect(child.parentId).toBe(parent.id);
  });

  it('should reject non-existent parent folder', async () => {
    const input: CreateFolderInput = {
      name: 'Child',
      parentId: 'non-existent',
    };

    await expect(createFolder(input)).rejects.toThrow(DriveError);
    await expect(createFolder(input)).rejects.toMatchObject({
      code: 'not_found_error',
    });
  });

  it('should reject invalid folder name', async () => {
    const input: CreateFolderInput = { name: 'invalid<>' };
    await expect(createFolder(input)).rejects.toThrow(DriveError);
    await expect(createFolder(input)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should list all folders', async () => {
    await createFolder({ name: 'Folder1' });
    await createFolder({ name: 'Folder2' });

    const folders = await listFolders();
    expect(folders).toHaveLength(2);
  });

  it('should list folders by parent', async () => {
    const parent = await createFolder({ name: 'Parent' });
    await createFolder({ name: 'Child1', parentId: parent.id });
    await createFolder({ name: 'Child2', parentId: parent.id });
    await createFolder({ name: 'Other' });

    const childFolders = await listFolders(parent.id);
    expect(childFolders).toHaveLength(2);
  });

  it('should rename a folder', async () => {
    const folder = await createFolder({ name: 'OldName' });

    const renamed = await renameFolder({ id: folder.id, name: 'NewName' });

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('NewName');
  });

  it('should return null when renaming non-existent folder', async () => {
    const result = await renameFolder({ id: 'non-existent', name: 'Name' });
    expect(result).toBeNull();
  });

  it('should delete empty folder', async () => {
    const folder = await createFolder({ name: 'ToDelete' });

    const deleted = await deleteFolder(folder.id);
    expect(deleted).toBe(true);
  });

  it('should not delete folder with files', async () => {
    const folder = await createFolder({ name: 'WithFiles' });
    await uploadDriveFile({ name: 'file.txt', size: 100, folderId: folder.id });

    const deleted = await deleteFolder(folder.id);
    expect(deleted).toBe(false);
  });

  it('should not delete folder with subfolders', async () => {
    const parent = await createFolder({ name: 'Parent' });
    await createFolder({ name: 'Child', parentId: parent.id });

    const deleted = await deleteFolder(parent.id);
    expect(deleted).toBe(false);
  });
});

describe('drive - move file', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetDriveFolders();
    resetKeyProvider();
  });

  it('should move file to folder', async () => {
    const folder = await createFolder({ name: 'Documents' });
    const file = await uploadDriveFile({ name: 'file.txt', size: 100 });

    const moved = await moveFile({ id: file.id, folderId: folder.id });

    expect(moved).not.toBeNull();
    expect(moved?.folderId).toBe(folder.id);
  });

  it('should move file to root', async () => {
    const folder = await createFolder({ name: 'Documents' });
    const file = await uploadDriveFile({ name: 'file.txt', size: 100, folderId: folder.id });

    const moved = await moveFile({ id: file.id });

    expect(moved).not.toBeNull();
    expect(moved?.folderId).toBeUndefined();
  });

  it('should reject non-existent folder', async () => {
    const file = await uploadDriveFile({ name: 'file.txt', size: 100 });

    await expect(moveFile({ id: file.id, folderId: 'non-existent' })).rejects.toThrow(DriveError);
    await expect(moveFile({ id: file.id, folderId: 'non-existent' })).rejects.toMatchObject({
      code: 'not_found_error',
    });
  });

  it('should return null for non-existent file', async () => {
    const moved = await moveFile({ id: 'non-existent' });
    expect(moved).toBeNull();
  });

  it('should update modifiedAt on move', async () => {
    const folder = await createFolder({ name: 'Documents' });
    const file = await uploadDriveFile({ name: 'file.txt', size: 100 });
    const originalModifiedAt = file.modifiedAt;

    await new Promise(resolve => setTimeout(resolve, 10));

    const moved = await moveFile({ id: file.id, folderId: folder.id });

    expect(moved?.modifiedAt).not.toBe(originalModifiedAt);
  });
});

describe('drive - search', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetKeyProvider();
  });

  it('should search files by name', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 100 });
    await uploadDriveFile({ name: 'image.png', size: 200 });
    await uploadDriveFile({ name: 'notes.txt', size: 50 });

    const results = await searchFiles({ query: 'doc' });
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('document.pdf');
  });

  it('should search case-insensitively', async () => {
    await uploadDriveFile({ name: 'Document.pdf', size: 100 });

    const results = await searchFiles({ query: 'document' });
    expect(results).toHaveLength(1);
  });

  it('should return empty array for no matches', async () => {
    await uploadDriveFile({ name: 'file.txt', size: 100 });

    const results = await searchFiles({ query: 'nonexistent' });
    expect(results).toHaveLength(0);
  });

  it('should search within specific folder', async () => {
    resetDriveFolders();
    const folder = await createFolder({ name: 'Documents' });
    await uploadDriveFile({ name: 'document.pdf', size: 100, folderId: folder.id });
    await uploadDriveFile({ name: 'document.pdf', size: 100 }); // Another file in root

    const results = await searchFiles({ query: 'doc', folderId: folder.id });
    expect(results).toHaveLength(1);
    expect(results[0]?.folderId).toBe(folder.id);
  });

  it('should return all files when query matches all', async () => {
    await uploadDriveFile({ name: 'file1.txt', size: 100 });
    await uploadDriveFile({ name: 'file2.txt', size: 200 });

    const results = await searchFiles({ query: 'file' });
    expect(results).toHaveLength(2);
  });
});

describe('drive - encryption', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetDriveFolders();
    resetKeyProvider();
  });

  it('should list files with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    const files = await listDriveFiles();

    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('document.pdf');
  });

  it('should get file by id with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const file = await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    const found = await getDriveFile(file.id);

    expect(found).not.toBeNull();
    expect(found?.name).toBe('document.pdf');
  });

  it('should rename file with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const file = await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    const renamed = await renameDriveFile({ id: file.id, name: 'renamed.pdf' });

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('renamed.pdf');
  });

  it('should create folder with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folder = await createFolder({ name: 'Documents' });
    expect(folder.name).toBe('Documents');
  });

  it('should list folders with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    await createFolder({ name: 'Documents' });
    const folders = await listFolders();

    expect(folders).toHaveLength(1);
    expect(folders[0]?.name).toBe('Documents');
  });

  it('should rename folder with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folder = await createFolder({ name: 'OldName' });
    const renamed = await renameFolder({ id: folder.id, name: 'NewName' });

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('NewName');
  });

  it('should search files with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    const results = await searchFiles({ query: 'doc' });

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('document.pdf');
  });

  it('should reset files DB', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    await resetDriveFilesDB();

    const files = await listDriveFiles();
    expect(files).toHaveLength(0);
  });

  it('should reset folders DB', async () => {
    await createFolder({ name: 'Documents' });
    await resetDriveFoldersDB();

    const folders = await listFolders();
    expect(folders).toHaveLength(0);
  });

  it('should search files by blind index', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    const results = await searchFiles({ blindIndex: 'some-blind-index' });

    // No files have blind index set, so should return empty
    expect(results).toHaveLength(0);
  });

  it('should get drive overview', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    const overview = await getDriveOverview();

    expect(overview.name).toBe('Drive');
    expect(overview.description).toBe('Starter drive domain package');
    expect(overview.files).toHaveLength(1);
  });

  it('should set and get storage adapter', () => {
    const mockAdapter = {
      put: async () => {},
      get: async () => null,
      delete: async () => {},
    };

    setDriveStorage(mockAdapter);
    const retrieved = getDriveStorage();

    expect(retrieved).toBe(mockAdapter);
  });

  it('should delete file from storage when adapter is set', async () => {
    let deleteCalled = false;
    const mockAdapter = {
      put: async () => {},
      get: async () => null,
      delete: async () => {
        deleteCalled = true;
      },
    };

    setDriveStorage(mockAdapter);
    const file = await uploadDriveFile({ name: 'document.pdf', size: 1024 });
    await deleteDriveFile(file.id);

    expect(deleteCalled).toBe(true);
  });

  it('should store file bytes when adapter is set', async () => {
    let putCalled = false;
    const mockAdapter = {
      put: async () => {
        putCalled = true;
      },
      get: async () => null,
      delete: async () => {},
    };

    setDriveStorage(mockAdapter);
    await uploadDriveFile({ name: 'document.pdf', size: 1024, bytes: new Uint8Array([1, 2, 3]) });

    expect(putCalled).toBe(true);
  });

  it('should set and get file repository', () => {
    const originalRepo = getDriveFileRepository();
    const mockRepo = {
      findById: async () => null,
      findAll: async () => [],
      create: async () => ({ id: 'test', name: 'test', size: 0, createdAt: '', modifiedAt: '' }),
      update: async () => null,
      delete: async () => false,
      findWhere: async () => [],
      count: async () => 0,
    };

    setDriveFileRepository(mockRepo);
    const retrieved = getDriveFileRepository();

    expect(retrieved).toBe(mockRepo);
    setDriveFileRepository(originalRepo);
  });

  it('should set and get folder repository', () => {
    const originalRepo = getDriveFolderRepository();
    const mockRepo = {
      findById: async () => null,
      findAll: async () => [],
      create: async () => ({ id: 'test', name: 'test', createdAt: '' }),
      update: async () => null,
      delete: async () => false,
      findWhere: async () => [],
      count: async () => 0,
    };

    setDriveFolderRepository(mockRepo);
    const retrieved = getDriveFolderRepository();

    expect(retrieved).toBe(mockRepo);
    setDriveFolderRepository(originalRepo);
  });
});

describe('drive - property-based tests', () => {
  beforeEach(() => {
    resetDriveFiles();
    resetDriveFolders();
    resetKeyProvider();
  });

  it('property: file name trimming preserves non-empty content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('a', 'b', 'c', '1', '2'), { minLength: 1, maxLength: 20 }).map((arr) => arr.join('')),
        fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 5 }).map((arr) => arr.join('')),
        fc.integer({ min: 0, max: 10485760 }),
        async (name: string, whitespace: string, size: number) => {
          resetDriveFiles();
          const nameWithWhitespace = whitespace + name + whitespace;

          const input: UploadDriveFileInput = {
            name: nameWithWhitespace,
            size,
          };

          const file = await uploadDriveFile(input);
          expect(file.name).toBe(nameWithWhitespace.trim());
          expect(file.name.length).toBeGreaterThan(0);
        }
      )
    );
  });

  it('property: file size is non-negative', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('a', 'b', 'c', '1', '2'), { minLength: 1, maxLength: 20 }).map((arr) => arr.join('')),
        fc.integer({ min: 0, max: 104857600 }),
        async (name: string, size: number) => {
          resetDriveFiles();

          const input: UploadDriveFileInput = {
            name,
            size,
          };

          const file = await uploadDriveFile(input);
          expect(file.size).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it('property: file names with special characters are rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('<', '>', ':', '"', '|', '?', '*'),
        fc.integer({ min: 0, max: 1000 }),
        async (specialChar: string, size: number) => {
          resetDriveFiles();

          const input: UploadDriveFileInput = {
            name: `file${specialChar}name`,
            size,
          };

          await expect(uploadDriveFile(input)).rejects.toThrow(DriveError);
        }
      )
    );
  });

  it('property: folder name trimming preserves non-empty content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('a', 'b', 'c', '1', '2'), { minLength: 1, maxLength: 20 }).map((arr) => arr.join('')),
        fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 5 }).map((arr) => arr.join('')),
        async (name: string, whitespace: string) => {
          resetDriveFolders();
          const nameWithWhitespace = whitespace + name + whitespace;

          const input: CreateFolderInput = {
            name: nameWithWhitespace,
          };

          const folder = await createFolder(input);
          expect(folder.name).toBe(nameWithWhitespace.trim());
          expect(folder.name.length).toBeGreaterThan(0);
        }
      )
    );
  });

  it('property: search is case-insensitive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('a', 'b', 'c', '1', '2'), { minLength: 1, maxLength: 20 }).map((arr) => arr.join('')),
        fc.array(fc.constantFrom('a', 'b', 'c', '1', '2'), { minLength: 1, maxLength: 10 }).map((arr) => arr.join('')),
        async (name: string, query: string) => {
          resetDriveFiles();
          const fileName = name.toLowerCase();

          await uploadDriveFile({ name: fileName, size: 100 });

          const results = await searchFiles({ query: query.toLowerCase() });
          if (fileName.includes(query.toLowerCase())) {
            expect(results.length).toBeGreaterThan(0);
          }
        }
      )
    );
  });
});
