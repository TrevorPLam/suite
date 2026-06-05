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

  it('should upload a file with a stable ID', () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(input);

    expect(file.id).toBeDefined();
    expect(file.name).toBe('document.pdf');
    expect(file.size).toBe(1024);
  });

  it('should trim whitespace from file name', () => {
    const input: UploadDriveFileInput = {
      name: '  document.pdf  ',
      size: 1024,
    };

    const file = uploadDriveFile(input);

    expect(file.name).toBe('document.pdf');
  });

  it('should reject negative file size', () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: -1,
    };

    expect(() => uploadDriveFile(input)).toThrow();
  });

  it('should reject non-integer file size', () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024.5,
    };

    expect(() => uploadDriveFile(input)).toThrow();
  });

  it('should allow zero file size', () => {
    const input: UploadDriveFileInput = {
      name: 'empty.txt',
      size: 0,
    };

    const file = uploadDriveFile(input);

    expect(file.size).toBe(0);
  });
});

describe('drive - query', () => {
  beforeEach(() => {
    resetDriveFiles();
  });

  it('should list files in reverse upload order', () => {
    const firstInput: UploadDriveFileInput = {
      name: 'first.pdf',
      size: 1024,
    };

    const secondInput: UploadDriveFileInput = {
      name: 'second.pdf',
      size: 2048,
    };

    const firstFile = uploadDriveFile(firstInput);
    const secondFile = uploadDriveFile(secondInput);

    const files = listDriveFiles();

    expect(files).toHaveLength(2);
    expect(files[0]?.id).toBe(secondFile.id);
    expect(files[1]?.id).toBe(firstFile.id);
  });

  it('should get file by id', () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(input);
    const found = getDriveFile(file.id);

    expect(found).not.toBeNull();
    expect(found?.id).toBe(file.id);
    expect(found?.name).toBe('document.pdf');
  });

  it('should return null for non-existent file', () => {
    const found = getDriveFile('non-existent-id');
    expect(found).toBeNull();
  });

  it('should return empty list when no files exist', () => {
    const files = listDriveFiles();
    expect(files).toHaveLength(0);
  });
});

describe('drive - rename', () => {
  beforeEach(() => {
    resetDriveFiles();
  });

  it('should rename a file', () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = renameDriveFile(renameInput);

    expect(renamed).not.toBeNull();
    expect(renamed?.id).toBe(file.id);
    expect(renamed?.name).toBe('renamed.pdf');
    expect(renamed?.size).toBe(file.size);
  });

  it('should trim whitespace from new name', () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: '  renamed.pdf  ',
    };

    const renamed = renameDriveFile(renameInput);

    expect(renamed?.name).toBe('renamed.pdf');
  });

  it('should return null for non-existent file', () => {
    const renameInput: RenameDriveFileInput = {
      id: 'non-existent-id',
      name: 'renamed.pdf',
    };

    const result = renameDriveFile(renameInput);

    expect(result).toBeNull();
  });

  it('should preserve original size on rename', () => {
    const uploadInput: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(uploadInput);

    const renameInput: RenameDriveFileInput = {
      id: file.id,
      name: 'renamed.pdf',
    };

    const renamed = renameDriveFile(renameInput);

    expect(renamed?.size).toBe(1024);
  });
});

describe('drive - delete', () => {
  beforeEach(() => {
    resetDriveFiles();
  });

  it('should delete a file', () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(input);

    const deleted = deleteDriveFile(file.id);

    expect(deleted).toBe(true);

    const found = getDriveFile(file.id);
    expect(found).toBeNull();
  });

  it('should return false for non-existent file', () => {
    const deleted = deleteDriveFile('non-existent-id');
    expect(deleted).toBe(false);
  });

  it('should remove file from list after deletion', () => {
    const input: UploadDriveFileInput = {
      name: 'document.pdf',
      size: 1024,
    };

    const file = uploadDriveFile(input);

    deleteDriveFile(file.id);

    const files = listDriveFiles();
    expect(files).toHaveLength(0);
  });
});
