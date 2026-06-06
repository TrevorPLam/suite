import { describe, it, expect, beforeEach } from 'vitest';
import {
  uploadDriveFile,
  listDriveFiles,
  getDriveFile,
  renameDriveFile,
  deleteDriveFile,
  resetDriveFiles,
  type UploadDriveFileInput,
  type RenameDriveFileInput,
} from './index.js';

describe('drive - upload', () => {
  beforeEach(() => {
    resetDriveFiles();
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
  });

  it('should trim whitespace from file name', async () => {
    const input: UploadDriveFileInput = {
      name: '  document.pdf  ',
      size: 1024,
    };

    const file = await uploadDriveFile(input);

    expect(file.name).toBe('document.pdf');
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
});

describe('drive - query', () => {
  beforeEach(() => {
    resetDriveFiles();
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
