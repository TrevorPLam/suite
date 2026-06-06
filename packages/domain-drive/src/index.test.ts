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
  setDriveStorage,
  getDriveStorage,
  DriveError,
  resetKeyProvider,
  setDriveKeyProvider,
  InMemoryDriveFileRepository,
  InMemoryDriveFolderRepository,
  type UploadDriveFileInput,
  type RenameDriveFileInput,
  type CreateFolderInput,
} from './index.js';
import { generateAESKey } from '@suite/crypto';

describe('drive - upload', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should upload a file with a stable ID', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);

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

    const file = await uploadDriveFile(input, fileRepository, folderRepository);

    expect(file.name).toBe('document.pdf');
  });

  it('should reject file name with special characters', async () => {
    const input: UploadDriveFileInput = {
      name: 'document<>.pdf',
      size: 1024,
    };

    await expect(uploadDriveFile(input, fileRepository, folderRepository)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input, fileRepository, folderRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should reject file name exceeding 255 characters', async () => {
    const input: UploadDriveFileInput = {
      name: 'a'.repeat(256),
      size: 1024,
    };

    await expect(uploadDriveFile(input, fileRepository, folderRepository)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input, fileRepository, folderRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should reject file name that is . or ..', async () => {
    const input1: UploadDriveFileInput = { name: '.', size: 1024 };
    await expect(uploadDriveFile(input1, fileRepository, folderRepository)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input1, fileRepository, folderRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });

    const input2: UploadDriveFileInput = { name: '..', size: 1024 };
    await expect(uploadDriveFile(input2, fileRepository, folderRepository)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input2, fileRepository, folderRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should accept file with valid mimeType', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      mimeType: 'application/pdf',
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);
    expect(file.mimeType).toBe('application/pdf');
  });

  it('should normalize mimeType to lowercase', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      mimeType: 'Application/PDF',
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);
    expect(file.mimeType).toBe('application/pdf');
  });

  it('should reject invalid mimeType', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
      mimeType: 'invalid',
    };

    await expect(uploadDriveFile(input, fileRepository, folderRepository)).rejects.toThrow(DriveError);
    await expect(uploadDriveFile(input, fileRepository, folderRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should set createdAt and modifiedAt on upload', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);
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

    const file = await uploadDriveFile(input, fileRepository, folderRepository);

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

    const file = await uploadDriveFile(input, fileRepository, folderRepository);
    
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
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
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

    const firstFile = await uploadDriveFile(firstInput, fileRepository, folderRepository);
    const secondFile = await uploadDriveFile(secondInput, fileRepository, folderRepository);

    const files = await listDriveFiles(fileRepository);

    expect(files).toHaveLength(2);
    expect(files[0]?.id).toBe(secondFile.id);
    expect(files[1]?.id).toBe(firstFile.id);
  });

  it('should get file by id', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);
    const found = await getDriveFile(file.id, fileRepository);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(file.id);
    expect(found?.name).toBe('document.pdf');
  });

  it('should return null for non-existent file', async () => {
    const found = await getDriveFile('non-existent-id', fileRepository);
    expect(found).toBeNull();
  });

  it('should return empty list when no files exist', async () => {
    const files = await listDriveFiles(fileRepository);
    expect(files).toHaveLength(0);
  });
});

describe('drive - rename', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should rename a file', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput, fileRepository, folderRepository);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = await renameDriveFile(renameInput, fileRepository);

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

    const file = await uploadDriveFile(uploadInput, fileRepository, folderRepository);
    const originalModifiedAt = file.modifiedAt;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = await renameDriveFile(renameInput, fileRepository);

    expect(renamed?.modifiedAt).not.toBe(originalModifiedAt);
    expect(renamed?.createdAt).toBe(file.createdAt);
  });

  it('should trim whitespace from new name', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput, fileRepository, folderRepository);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: '  renamed.pdf  ',
    };

    const renamed = await renameDriveFile(renameInput, fileRepository);

    expect(renamed?.name).toBe('renamed.pdf');
  });

  it('should reject invalid name on rename', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput, fileRepository, folderRepository);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'invalid<>.pdf',
    };

    await expect(renameDriveFile(renameInput, fileRepository)).rejects.toThrow(DriveError);
    await expect(renameDriveFile(renameInput, fileRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should return null for non-existent file', async () => {
    const renameInput: RenameDriveFileInput = {
      id: 'non-existent-id',
      name: 'renamed.pdf',
    };

    const result = await renameDriveFile(renameInput, fileRepository);

    expect(result).toBeNull();
  });

  it('should preserve original size on rename', async () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(uploadInput, fileRepository, folderRepository);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = await renameDriveFile(renameInput, fileRepository);

    expect(renamed?.size).toBe(1024);
  });
});

describe('drive - delete', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should delete a file', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);

    const deleted = await deleteDriveFile(file.id, fileRepository);

    expect(deleted).toBe(true);

    const found = await getDriveFile(file.id, fileRepository);
    expect(found).toBeNull();
  });

  it('should return false for non-existent file', async () => {
    const deleted = await deleteDriveFile('non-existent-id', fileRepository);
    expect(deleted).toBe(false);
  });

  it('should remove file from list after deletion', async () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = await uploadDriveFile(input, fileRepository, folderRepository);

    await deleteDriveFile(file.id, fileRepository);

    const files = await listDriveFiles(fileRepository);
    expect(files).toHaveLength(0);
  });
});

describe('drive - folders', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should create a folder in root', async () => {
    const input: CreateFolderInput = {
      name: 'Documents',
    };

    const folder = await createFolder(input, folderRepository);

    expect(folder.id).toBeDefined();
    expect(folder.name).toBe('Documents');
    expect(folder.parentId).toBeUndefined();
    expect(folder.createdAt).toBeDefined();
  });

  it('should create a folder with parent', async () => {
    const parentInput: CreateFolderInput = { name: 'Parent' };
    const parent = await createFolder(parentInput, folderRepository);

    const childInput: CreateFolderInput = {
      name: 'Child',
      parentId: parent.id,
    };

    const child = await createFolder(childInput, folderRepository);

    expect(child.parentId).toBe(parent.id);
  });

  it('should reject non-existent parent folder', async () => {
    const input: CreateFolderInput = {
      name: 'Child',
      parentId: 'non-existent',
    };

    await expect(createFolder(input, folderRepository)).rejects.toThrow(DriveError);
    await expect(createFolder(input, folderRepository)).rejects.toMatchObject({
      code: 'not_found_error',
    });
  });

  it('should reject invalid folder name', async () => {
    const input: CreateFolderInput = { name: 'invalid<>' };
    await expect(createFolder(input, folderRepository)).rejects.toThrow(DriveError);
    await expect(createFolder(input, folderRepository)).rejects.toMatchObject({
      code: 'validation_error',
    });
  });

  it('should list all folders', async () => {
    await createFolder({ name: 'Folder1' }, folderRepository);
    await createFolder({ name: 'Folder2' }, folderRepository);

    const folders = await listFolders(undefined, folderRepository);
    expect(folders).toHaveLength(2);
  });

  it('should list folders by parent', async () => {
    const parent = await createFolder({ name: 'Parent' }, folderRepository);
    await createFolder({ name: 'Child1', parentId: parent.id }, folderRepository);
    await createFolder({ name: 'Child2', parentId: parent.id }, folderRepository);
    await createFolder({ name: 'Other' }, folderRepository);

    const childFolders = await listFolders(parent.id, folderRepository);
    expect(childFolders).toHaveLength(2);
  });

  it('should rename a folder', async () => {
    const folder = await createFolder({ name: 'OldName' }, folderRepository);

    const renamed = await renameFolder({ id: folder.id, name: 'NewName' }, folderRepository);

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('NewName');
  });

  it('should return null when renaming non-existent folder', async () => {
    const result = await renameFolder({ id: 'non-existent', name: 'Name' }, folderRepository);
    expect(result).toBeNull();
  });

  it('should delete empty folder', async () => {
    const folder = await createFolder({ name: 'ToDelete' }, folderRepository);

    const deleted = await deleteFolder(folder.id, fileRepository, folderRepository);
    expect(deleted).toBe(true);
  });

  it('should not delete folder with files', async () => {
    const folder = await createFolder({ name: 'WithFiles' }, folderRepository);
    await uploadDriveFile({ name: 'file.txt', size: 100, folderId: folder.id }, fileRepository, folderRepository);

    const deleted = await deleteFolder(folder.id, fileRepository, folderRepository);
    expect(deleted).toBe(false);
  });

  it('should not delete folder with subfolders', async () => {
    const parent = await createFolder({ name: 'Parent' }, folderRepository);
    await createFolder({ name: 'Child', parentId: parent.id }, folderRepository);

    const deleted = await deleteFolder(parent.id, fileRepository, folderRepository);
    expect(deleted).toBe(false);
  });
});

describe('drive - move file', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should move file to folder', async () => {
    const folder = await createFolder({ name: 'Documents' }, folderRepository);
    const file = await uploadDriveFile({ name: 'file.txt', size: 100 }, fileRepository, folderRepository);

    const moved = await moveFile({ id: file.id, folderId: folder.id }, fileRepository, folderRepository);

    expect(moved).not.toBeNull();
    expect(moved?.folderId).toBe(folder.id);
  });

  it('should move file to root', async () => {
    const folder = await createFolder({ name: 'Documents' }, folderRepository);
    const file = await uploadDriveFile({ name: 'file.txt', size: 100, folderId: folder.id }, fileRepository, folderRepository);

    const moved = await moveFile({ id: file.id }, fileRepository, folderRepository);

    expect(moved).not.toBeNull();
    expect(moved?.folderId).toBeUndefined();
  });

  it('should reject non-existent folder', async () => {
    const file = await uploadDriveFile({ name: 'file.txt', size: 100 }, fileRepository, folderRepository);

    await expect(moveFile({ id: file.id, folderId: 'non-existent' }, fileRepository, folderRepository)).rejects.toThrow(DriveError);
    await expect(moveFile({ id: file.id, folderId: 'non-existent' }, fileRepository, folderRepository)).rejects.toMatchObject({
      code: 'not_found_error',
    });
  });

  it('should return null for non-existent file', async () => {
    const moved = await moveFile({ id: 'non-existent' }, fileRepository, folderRepository);
    expect(moved).toBeNull();
  });

  it('should update modifiedAt on move', async () => {
    const folder = await createFolder({ name: 'Documents' }, folderRepository);
    const file = await uploadDriveFile({ name: 'file.txt', size: 100 }, fileRepository, folderRepository);
    const originalModifiedAt = file.modifiedAt;

    await new Promise(resolve => setTimeout(resolve, 10));

    const moved = await moveFile({ id: file.id, folderId: folder.id }, fileRepository, folderRepository);

    expect(moved?.modifiedAt).not.toBe(originalModifiedAt);
  });
});

describe('drive - search', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should search files by name', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 100 }, fileRepository, folderRepository);
    await uploadDriveFile({ name: 'image.png', size: 200 }, fileRepository, folderRepository);
    await uploadDriveFile({ name: 'notes.txt', size: 50 }, fileRepository, folderRepository);

    const results = await searchFiles({ query: 'doc' }, fileRepository);
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('document.pdf');
  });

  it('should search case-insensitively', async () => {
    await uploadDriveFile({ name: 'Document.pdf', size: 100 }, fileRepository, folderRepository);

    const results = await searchFiles({ query: 'document' }, fileRepository);
    expect(results).toHaveLength(1);
  });

  it('should return empty array for no matches', async () => {
    await uploadDriveFile({ name: 'file.txt', size: 100 }, fileRepository, folderRepository);

    const results = await searchFiles({ query: 'nonexistent' }, fileRepository);
    expect(results).toHaveLength(0);
  });

  it('should search within specific folder', async () => {
    const folder = await createFolder({ name: 'Documents' }, folderRepository);
    await uploadDriveFile({ name: 'document.pdf', size: 100, folderId: folder.id }, fileRepository, folderRepository);
    await uploadDriveFile({ name: 'document.pdf', size: 100 }, fileRepository, folderRepository); // Another file in root

    const results = await searchFiles({ query: 'doc', folderId: folder.id }, fileRepository);
    expect(results).toHaveLength(1);
    expect(results[0]?.folderId).toBe(folder.id);
  });

  it('should return all files when query matches all', async () => {
    await uploadDriveFile({ name: 'file1.txt', size: 100 }, fileRepository, folderRepository);
    await uploadDriveFile({ name: 'file2.txt', size: 200 }, fileRepository, folderRepository);

    const results = await searchFiles({ query: 'file' }, fileRepository);
    expect(results).toHaveLength(2);
  });
});

describe('drive - encryption', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('should list files with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    const files = await listDriveFiles(fileRepository);

    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('document.pdf');
  });

  it('should get file by id with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const file = await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    const found = await getDriveFile(file.id, fileRepository);

    expect(found).not.toBeNull();
    expect(found?.name).toBe('document.pdf');
  });

  it('should rename file with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const file = await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    const renamed = await renameDriveFile({ id: file.id, name: 'renamed.pdf' }, fileRepository);

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('renamed.pdf');
  });

  it('should create folder with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folder = await createFolder({ name: 'Documents' }, folderRepository);
    expect(folder.name).toBe('Documents');
  });

  it('should list folders with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    await createFolder({ name: 'Documents' }, folderRepository);
    const folders = await listFolders(undefined, folderRepository);

    expect(folders).toHaveLength(1);
    expect(folders[0]?.name).toBe('Documents');
  });

  it('should rename folder with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    const folder = await createFolder({ name: 'OldName' }, folderRepository);
    const renamed = await renameFolder({ id: folder.id, name: 'NewName' }, folderRepository);

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('NewName');
  });

  it('should search files with encryption enabled', async () => {
    const testKey = await generateAESKey(false);
    setDriveKeyProvider(async () => testKey);

    await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    const results = await searchFiles({ query: 'doc' }, fileRepository);

    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('document.pdf');
  });

  it('should reset files DB', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    await resetDriveFilesDB(fileRepository);

    const files = await listDriveFiles(fileRepository);
    expect(files).toHaveLength(0);
  });

  it('should reset folders DB', async () => {
    await createFolder({ name: 'Documents' }, folderRepository);
    await resetDriveFoldersDB(folderRepository);

    const folders = await listFolders(undefined, folderRepository);
    expect(folders).toHaveLength(0);
  });

  it('should search files by blind index', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    const results = await searchFiles({ blindIndex: 'some-blind-index' }, fileRepository);

    // No files have blind index set, so should return empty
    expect(results).toHaveLength(0);
  });

  it('should get drive overview', async () => {
    await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository);
    const overview = await getDriveOverview(fileRepository);

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

    const file = await uploadDriveFile({ name: 'document.pdf', size: 1024 }, fileRepository, folderRepository, mockAdapter);
    await deleteDriveFile(file.id, fileRepository, mockAdapter);

    expect(deleteCalled).toBe(true);
  });

  it('should store file bytes when adapter is set', async () => {
    let putCalled = false;
    const mockAdapter = {
      delete: async () => {},
      get: async () => null,
      put: async () => {
        putCalled = true;
      },
    };

    await uploadDriveFile({ name: 'document.pdf', size: 1024, bytes: new Uint8Array([1, 2, 3]) }, fileRepository, folderRepository, mockAdapter);

    expect(putCalled).toBe(true);
  });
});

describe('drive - property-based tests', () => {
  let fileRepository: InMemoryDriveFileRepository;
  let folderRepository: InMemoryDriveFolderRepository;

  beforeEach(() => {
    fileRepository = new InMemoryDriveFileRepository();
    folderRepository = new InMemoryDriveFolderRepository();
    resetKeyProvider();
  });

  it('property: file name trimming preserves non-empty content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constantFrom('a', 'b', 'c', '1', '2'), { minLength: 1, maxLength: 20 }).map((arr) => arr.join('')),
        fc.array(fc.constantFrom(' ', '\t'), { minLength: 1, maxLength: 5 }).map((arr) => arr.join('')),
        fc.integer({ min: 0, max: 10485760 }),
        async (name: string, whitespace: string, size: number) => {
          resetDriveFiles(fileRepository);
          const nameWithWhitespace = whitespace + name + whitespace;

          const input: UploadDriveFileInput = {
            name: nameWithWhitespace,
            size,
          };

          const file = await uploadDriveFile(input, fileRepository, folderRepository);
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
          resetDriveFiles(fileRepository);

          const input: UploadDriveFileInput = {
            name,
            size,
          };

          const file = await uploadDriveFile(input, fileRepository, folderRepository);
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
          resetDriveFolders(folderRepository);
          const nameWithWhitespace = whitespace + name + whitespace;

          const input: CreateFolderInput = {
            name: nameWithWhitespace,
          };

          const folder = await createFolder(input, folderRepository);
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
          resetDriveFiles(fileRepository);
          const fileName = name.toLowerCase();

          await uploadDriveFile({ name: fileName, size: 100 }, fileRepository, folderRepository);

          const results = await searchFiles({ query: query.toLowerCase() }, fileRepository);
          if (fileName.includes(query.toLowerCase())) {
            expect(results.length).toBeGreaterThan(0);
          }
        }
      )
    );
  });
});
