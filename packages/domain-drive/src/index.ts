import type { QueryRepository, RepositoryContext } from '@suite/db';
import { generateUUID } from '@suite/shared-kernel';

// Re-export encryption functions
export {
  setDriveKeyProvider,
  getDriveKeyProvider,
  setDriveKeyProviderFromEnv,
  isEncryptionEnabled,
  resetKeyProvider,
  sealFile,
  unsealFile,
  sealFiles,
  unsealFiles,
  sealFolder,
  unsealFolder,
  sealFolders,
  unsealFolders,
  type EncryptedDriveFile,
  type EncryptedDriveFolder,
  type KeyProvider,
} from './drive-crypto.js';

// Import encryption functions for internal use
import { sealFile as _sealFile, unsealFile as _unsealFile, sealFolder as _sealFolder, unsealFolder as _unsealFolder, sealFiles as _sealFiles, unsealFiles as _unsealFiles, sealFolders as _sealFolders, unsealFolders as _unsealFolders, isEncryptionEnabled as _isEncryptionEnabled } from './drive-crypto.js';

export type DriveFile = {
  id: string;
  name: string;
  size: number;
  folderId?: string;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
  blindIndex?: string;
};

export type DriveFolder = {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
};

export type UploadDriveFileInput = {
  name: string;
  size: number;
  folderId?: string;
  mimeType?: string;
  bytes?: ReadableStream | Uint8Array | ArrayBuffer;
};

export type RenameDriveFileInput = {
  id: string;
  name: string;
};

export type DriveErrorCode = 'validation_error' | 'not_found_error';

export class DriveError extends Error {
  constructor(
    message: string,
    public readonly code: DriveErrorCode,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'DriveError';
  }
}

export type CreateFolderInput = {
  name: string;
  parentId?: string;
};

export type RenameFolderInput = {
  id: string;
  name: string;
};

export type MoveFileInput = {
  id: string;
  folderId?: string;
};

export type SearchFilesInput = {
  query?: string;
  blindIndex?: string;
  folderId?: string;
};

export interface DriveFileRepository extends QueryRepository<DriveFile> {
  clear?(): void;
}

export interface DriveFolderRepository extends QueryRepository<DriveFolder> {
  clear?(): void;
}

export interface StorageAdapter {
  put(key: string, data: ReadableStream | Uint8Array | ArrayBuffer): Promise<void>;
  get(key: string): Promise<ReadableStream | null>;
  delete(key: string): Promise<void>;
}

// Factory function to create storage adapter
export function createDriveStorageAdapter(adapter: StorageAdapter): StorageAdapter {
  return adapter;
}

// Set storage adapter globally (for backward compatibility with existing code)
let currentStorageAdapter: StorageAdapter | null = null;

export function setDriveStorage(adapter: StorageAdapter): void {
  currentStorageAdapter = adapter;
}

export function getDriveStorage(): StorageAdapter | null {
  return currentStorageAdapter;
}

// In-memory repository for testing (default)
export class InMemoryDriveFileRepository implements DriveFileRepository {
  private files = new Map<string, DriveFile>();

  async findById(id: string, _context: RepositoryContext): Promise<DriveFile | null> {
    return this.files.get(id) ?? null;
  }

  async findAll(_context: RepositoryContext): Promise<DriveFile[]> {
    return Array.from(this.files.values());
  }

  async create(entity: Omit<DriveFile, 'id'>, _context: RepositoryContext): Promise<DriveFile> {
    const file: DriveFile = {
      id: generateUUID(),
      ...entity,
    };
    this.files.set(file.id, file);
    return file;
  }

  async update(id: string, entity: Partial<DriveFile>, _context: RepositoryContext): Promise<DriveFile | null> {
    const existing = this.files.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...entity };
    // Remove properties that are explicitly set to undefined
    for (const key in entity) {
      if (entity[key as keyof DriveFile] === undefined) {
        delete updated[key as keyof DriveFile];
      }
    }
    this.files.set(id, updated);
    return updated;
  }

  async delete(id: string, _context: RepositoryContext): Promise<boolean> {
    return this.files.delete(id);
  }

  async findWhere(criteria: Partial<DriveFile>, _context: RepositoryContext): Promise<DriveFile[]> {
    const allFiles = Array.from(this.files.values());
    return allFiles.filter(file => {
      for (const [key, value] of Object.entries(criteria)) {
        if (file[key as keyof DriveFile] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async count(criteria: Partial<DriveFile>, _context: RepositoryContext): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      return this.files.size;
    }
    const results = await this.findWhere(criteria, _context);
    return results.length;
  }

  clear(): void {
    this.files.clear();
  }
}

// In-memory folder repository for testing
export class InMemoryDriveFolderRepository implements DriveFolderRepository {
  private folders = new Map<string, DriveFolder>();

  async findById(id: string, _context: RepositoryContext): Promise<DriveFolder | null> {
    return this.folders.get(id) ?? null;
  }

  async findAll(_context: RepositoryContext): Promise<DriveFolder[]> {
    return Array.from(this.folders.values());
  }

  async create(entity: Omit<DriveFolder, 'id'>, _context: RepositoryContext): Promise<DriveFolder> {
    const folder: DriveFolder = {
      id: generateUUID(),
      ...entity,
    };
    this.folders.set(folder.id, folder);
    return folder;
  }

  async update(id: string, entity: Partial<DriveFolder>, _context: RepositoryContext): Promise<DriveFolder | null> {
    const existing = this.folders.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...entity };
    this.folders.set(id, updated);
    return updated;
  }

  async delete(id: string, _context: RepositoryContext): Promise<boolean> {
    return this.folders.delete(id);
  }

  async findWhere(criteria: Partial<DriveFolder>, _context: RepositoryContext): Promise<DriveFolder[]> {
    const allFolders = Array.from(this.folders.values());
    return allFolders.filter(folder => {
      for (const [key, value] of Object.entries(criteria)) {
        if (folder[key as keyof DriveFolder] !== value) {
          return false;
        }
      }
      return true;
    });
  }

  async count(criteria: Partial<DriveFolder>, _context: RepositoryContext): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      return this.folders.size;
    }
    const results = await this.findWhere(criteria, _context);
    return results.length;
  }

  clear(): void {
    this.folders.clear();
  }
}

// Factory functions to create repositories
export function createDriveFileRepository(repository: DriveFileRepository): DriveFileRepository {
  return repository;
}

export function createDriveFolderRepository(repository: DriveFolderRepository): DriveFolderRepository {
  return repository;
}

function snapshot(file: DriveFile): DriveFile {
  return {
    ...file,
  };
}

export async function listDriveFiles(fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), context: RepositoryContext): Promise<DriveFile[]> {
  const files = await fileRepository.findAll(context);
  const reversed = [...files].reverse().map(snapshot);
  
  // Decrypt names if encryption is enabled
  if (_isEncryptionEnabled()) {
    // Convert stored encrypted names to EncryptedDriveFile format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFiles = reversed.map(f => ({ ...f, encryptedName: f.name } as any));
    return await _unsealFiles(encryptedFiles);
  }
  
  return reversed;
}

export async function getDriveFile(id: string, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), context: RepositoryContext): Promise<DriveFile | null> {
  const file = await fileRepository.findById(id, context);
  if (!file) return null;
  
  const snapped = snapshot(file);
  
  // Decrypt name if encryption is enabled
  if (_isEncryptionEnabled()) {
    // Convert stored encrypted name to EncryptedDriveFile format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFile = { ...snapped, encryptedName: snapped.name } as any;
    return await _unsealFile(encryptedFile);
  }
  
  return snapped;
}

export function resetDriveFiles(fileRepository: DriveFileRepository = new InMemoryDriveFileRepository()): void {
  if (fileRepository instanceof InMemoryDriveFileRepository) {
    (fileRepository as InMemoryDriveFileRepository).clear();
  }
}

export async function resetDriveFilesDB(fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), context: RepositoryContext): Promise<void> {
  const files = await fileRepository.findAll(context);
  for (const file of files) {
    await fileRepository.delete(file.id, context);
  }
}

export function resetDriveFolders(folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository()): void {
  if (folderRepository instanceof InMemoryDriveFolderRepository) {
    (folderRepository as InMemoryDriveFolderRepository).clear();
  }
}

export async function resetDriveFoldersDB(folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), context: RepositoryContext): Promise<void> {
  const folders = await folderRepository.findAll(context);
  for (const folder of folders) {
    await folderRepository.delete(folder.id, context);
  }
}

export async function getDriveOverview(fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), context: RepositoryContext) {
  return {
    name: 'Drive',
    description: 'Starter drive domain package',
    files: await listDriveFiles(fileRepository, context),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidFileName(name: string): boolean {
  // No special characters: < > : " / \ | ? *
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    return false;
  }
  // Cannot be . or ..
  if (name === '.' || name === '..') {
    return false;
  }
  // Cannot start or end with space
  if (name.startsWith(' ') || name.endsWith(' ')) {
    return false;
  }
  // Length limit 255
  if (name.length > 255) {
    return false;
  }
  return true;
}

function isValidMimeType(mimeType: string): boolean {
  // MIME type pattern: type/subtype (e.g., application/pdf)
  const pattern = /^[a-z]+\/[a-z0-9\.\-\+]+$/;
  return pattern.test(mimeType.toLowerCase());
}

function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export async function uploadDriveFile(input: UploadDriveFileInput, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), storageAdapter: StorageAdapter | null = null, context: RepositoryContext): Promise<DriveFile> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string', 'validation_error', [
      'name must be a non-empty string',
    ]);
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit', 'validation_error', [
      'name contains invalid characters or exceeds length limit',
    ]);
  }

  if (!Number.isFinite(input.size) || !Number.isInteger(input.size)) {
    throw new DriveError('size must be an integer', 'validation_error', [
      'size must be an integer',
    ]);
  }

  if (input.size < 0) {
    throw new DriveError('size must be non-negative', 'validation_error', [
      'size must be non-negative',
    ]);
  }

  if (input.mimeType && !isValidMimeType(input.mimeType)) {
    throw new DriveError('mimeType must be a valid MIME type (e.g., application/pdf)', 'validation_error', [
      'mimeType must be a valid MIME type (e.g., application/pdf)',
    ]);
  }

  if (input.folderId) {
    const folder = await folderRepository.findById(input.folderId, context);
    if (!folder) {
      throw new DriveError('folder not found', 'not_found_error', [
        `No folder exists for id "${input.folderId}"`,
      ]);
    }
  }

  const now = getCurrentTimestamp();
  const fileId = generateUUID();
  const createData: Omit<DriveFile, 'id'> = {
    name,
    size: input.size,
    createdAt: now,
    modifiedAt: now,
  };
  if (input.folderId !== undefined) {
    createData.folderId = input.folderId;
  }
  if (input.mimeType !== undefined) {
    createData.mimeType = input.mimeType.toLowerCase();
  }

  // Store file bytes in R2 if storage adapter is available and bytes provided
  if (storageAdapter && input.bytes) {
    const storageKey = `files/${fileId}`;
    await storageAdapter.put(storageKey, input.bytes);
  }

  // Encrypt name if encryption is enabled
  let dataToStore = createData;
  if (_isEncryptionEnabled()) {
    const encrypted = await _sealFile({ ...createData, id: fileId } as DriveFile);
    const { encryptedName, ...rest } = encrypted;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataToStore = { ...rest, name: encryptedName as any };
  }

  const created = await fileRepository.create(dataToStore, context);

  // Decrypt name if encryption is enabled before returning
  if (_isEncryptionEnabled()) {
    // The stored name is EncryptedData, convert to EncryptedDriveFile format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFile: any = { ...created, encryptedName: created.name };
    return await _unsealFile(encryptedFile);
  }

  return snapshot(created);
}

export async function renameDriveFile(input: RenameDriveFileInput, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), context: RepositoryContext): Promise<DriveFile | null> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string', 'validation_error', [
      'name must be a non-empty string',
    ]);
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit', 'validation_error', [
      'name contains invalid characters or exceeds length limit',
    ]);
  }

  // Encrypt name if encryption is enabled
  let updateData: Partial<DriveFile> = {
    modifiedAt: getCurrentTimestamp(),
  };
  if (_isEncryptionEnabled()) {
    const encrypted = await _sealFile({ id: input.id, name, size: 0, createdAt: '', modifiedAt: '' } as DriveFile);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData = { ...updateData, name: encrypted.encryptedName as any };
  } else {
    updateData.name = name;
  }

  const updated = await fileRepository.update(input.id, updateData, context);

  // Decrypt name if encryption is enabled before returning
  if (updated && _isEncryptionEnabled()) {
    // The stored name is EncryptedData, convert to EncryptedDriveFile format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFile: any = { ...updated, encryptedName: updated.name };
    return await _unsealFile(encryptedFile);
  }

  return updated ? snapshot(updated) : null;
}

export async function deleteDriveFile(id: string, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), storageAdapter: StorageAdapter | null = null, context: RepositoryContext): Promise<boolean> {
  // Delete from storage if adapter is available
  if (storageAdapter) {
    const storageKey = `files/${id}`;
    await storageAdapter.delete(storageKey);
  }

  return await fileRepository.delete(id, context);
}

// Folder operations
export async function createFolder(input: CreateFolderInput, folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), context: RepositoryContext): Promise<DriveFolder> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string', 'validation_error', [
      'name must be a non-empty string',
    ]);
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit', 'validation_error', [
      'name contains invalid characters or exceeds length limit',
    ]);
  }

  if (input.parentId) {
    const parent = await folderRepository.findById(input.parentId, context);
    if (!parent) {
      throw new DriveError('parent folder not found', 'not_found_error', [
        `No folder exists for id "${input.parentId}"`,
      ]);
    }
  }

  const createData: Omit<DriveFolder, 'id'> = {
    name,
    createdAt: getCurrentTimestamp(),
  };
  if (input.parentId !== undefined) {
    createData.parentId = input.parentId;
  }
  
  // Encrypt name if encryption is enabled
  let dataToStore = createData;
  if (_isEncryptionEnabled()) {
    const encrypted = await _sealFolder({ ...createData, id: 'temp' } as DriveFolder);
    const { encryptedName, ...rest } = encrypted;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataToStore = { ...rest, name: encryptedName as any };
  }
  
  const created = await folderRepository.create(dataToStore, context);

  // Decrypt name if encryption is enabled before returning
  if (_isEncryptionEnabled()) {
    // The stored name is EncryptedData, convert to EncryptedDriveFolder format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFolder: any = { ...created, encryptedName: created.name };
    return await _unsealFolder(encryptedFolder);
  }

  return created;
}

export async function listFolders(folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), context: RepositoryContext, parentId?: string): Promise<DriveFolder[]> {
  let folders: DriveFolder[];
  if (parentId) {
    folders = await folderRepository.findWhere({ parentId }, context);
  } else {
    folders = await folderRepository.findAll(context);
  }
  
  // Decrypt names if encryption is enabled
  if (_isEncryptionEnabled()) {
    // Convert stored encrypted names to EncryptedDriveFolder format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFolders = folders.map((f: DriveFolder) => ({ ...f, encryptedName: f.name } as any));
    return await _unsealFolders(encryptedFolders);
  }
  
  return folders;
}

export async function renameFolder(input: RenameFolderInput, folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), context: RepositoryContext): Promise<DriveFolder | null> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string', 'validation_error', [
      'name must be a non-empty string',
    ]);
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit', 'validation_error', [
      'name contains invalid characters or exceeds length limit',
    ]);
  }

  // Encrypt name if encryption is enabled
  let updateData: Partial<DriveFolder> = {};
  if (_isEncryptionEnabled()) {
    const encrypted = await _sealFolder({ id: input.id, name, createdAt: '' } as DriveFolder);
    const { encryptedName, ...rest } = encrypted;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateData = { ...rest, name: encryptedName as any };
  } else {
    updateData.name = name;
  }

  const updated = await folderRepository.update(input.id, updateData, context);

  // Decrypt name if encryption is enabled before returning
  if (updated && _isEncryptionEnabled()) {
    // The stored name is EncryptedData, convert to EncryptedDriveFolder format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFolder: any = { ...updated, encryptedName: updated.name };
    return await _unsealFolder(encryptedFolder);
  }

  return updated;
}

export async function deleteFolder(id: string, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), context: RepositoryContext): Promise<boolean> {
  // Check if folder has files
  const filesWithFolder = await fileRepository.findWhere({ folderId: id }, context);
  if (filesWithFolder.length > 0) {
    return false;
  }

  // Check if folder has subfolders
  const subfolders = await folderRepository.findWhere({ parentId: id }, context);
  if (subfolders.length > 0) {
    return false;
  }

  return await folderRepository.delete(id, context);
}

export async function moveFile(input: MoveFileInput, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), folderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository(), context: RepositoryContext): Promise<DriveFile | null> {
  if (input.folderId) {
    const folder = await folderRepository.findById(input.folderId, context);
    if (!folder) {
      throw new DriveError('folder not found', 'not_found_error', [
        `No folder exists for id "${input.folderId}"`,
      ]);
    }
  }

  const updateData: Partial<DriveFile> = {
    modifiedAt: getCurrentTimestamp(),
  };
  if (input.folderId !== undefined) {
    updateData.folderId = input.folderId;
  } else {
    // Explicitly set to undefined to remove folderId (type assertion for exactOptionalPropertyTypes)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updateData as any).folderId = undefined;
  }
  const updated = await fileRepository.update(input.id, updateData, context);

  return updated ? snapshot(updated) : null;
}

export async function searchFiles(input: SearchFilesInput, fileRepository: DriveFileRepository = new InMemoryDriveFileRepository(), context: RepositoryContext): Promise<DriveFile[]> {
  const allFiles = await fileRepository.findAll(context);
  
  // Decrypt names if encryption is enabled before searching
  let filesToSearch = allFiles;
  if (_isEncryptionEnabled()) {
    // Convert stored encrypted names to EncryptedDriveFile format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const encryptedFiles = allFiles.map((f: DriveFile) => ({ ...f, encryptedName: f.name } as any));
    filesToSearch = await _unsealFiles(encryptedFiles);
  }
  
  return filesToSearch.filter((file: DriveFile) => {
    // Filter by blind index (exact match search for encrypted data)
    if (input.blindIndex) {
      const blindIndexMatch = file.blindIndex === input.blindIndex;
      if (!blindIndexMatch) {
        return false;
      }
    }
    
    // Fallback to plaintext query for non-encrypted data (legacy support)
    if (input.query && !input.blindIndex) {
      const query = input.query.toLowerCase();
      const nameMatch = file.name.toLowerCase().includes(query);
      if (!nameMatch) {
        return false;
      }
    }
    
    // Filter by folder if specified
    if (input.folderId && file.folderId !== input.folderId) {
      return false;
    }
    
    return true;
  });
}
