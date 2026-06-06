import type { QueryRepository } from '@suite/db';

export type DriveFile = {
  id: string;
  name: string;
  size: number;
  folderId?: string;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
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
};

export type RenameDriveFileInput = {
  id: string;
  name: string;
};

export class DriveError extends Error {
  constructor(message: string) {
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
  query: string;
  folderId?: string;
};

export interface DriveFileRepository extends QueryRepository<DriveFile> {
  clear?(): void;
}

export interface DriveFolderRepository extends QueryRepository<DriveFolder> {
  clear?(): void;
}

// In-memory repository for testing (default)
class InMemoryDriveFileRepository implements DriveFileRepository {
  private files = new Map<string, DriveFile>();

  async findById(id: string): Promise<DriveFile | null> {
    return this.files.get(id) ?? null;
  }

  async findAll(): Promise<DriveFile[]> {
    return Array.from(this.files.values());
  }

  async create(entity: Omit<DriveFile, 'id'>): Promise<DriveFile> {
    const file: DriveFile = {
      id: crypto.randomUUID(),
      ...entity,
    };
    this.files.set(file.id, file);
    return file;
  }

  async update(id: string, entity: Partial<DriveFile>): Promise<DriveFile | null> {
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

  async delete(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  async findWhere(criteria: Partial<DriveFile>): Promise<DriveFile[]> {
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

  async count(criteria?: Partial<DriveFile>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      return this.files.size;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }

  clear(): void {
    this.files.clear();
  }
}

// In-memory folder repository for testing
class InMemoryDriveFolderRepository implements DriveFolderRepository {
  private folders = new Map<string, DriveFolder>();

  async findById(id: string): Promise<DriveFolder | null> {
    return this.folders.get(id) ?? null;
  }

  async findAll(): Promise<DriveFolder[]> {
    return Array.from(this.folders.values());
  }

  async create(entity: Omit<DriveFolder, 'id'>): Promise<DriveFolder> {
    const folder: DriveFolder = {
      id: crypto.randomUUID(),
      ...entity,
    };
    this.folders.set(folder.id, folder);
    return folder;
  }

  async update(id: string, entity: Partial<DriveFolder>): Promise<DriveFolder | null> {
    const existing = this.folders.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...entity };
    this.folders.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.folders.delete(id);
  }

  async findWhere(criteria: Partial<DriveFolder>): Promise<DriveFolder[]> {
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

  async count(criteria?: Partial<DriveFolder>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      return this.folders.size;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }

  clear(): void {
    this.folders.clear();
  }
}

// Default repository (in-memory for backward compatibility)
let defaultFileRepository: DriveFileRepository = new InMemoryDriveFileRepository();
let defaultFolderRepository: DriveFolderRepository = new InMemoryDriveFolderRepository();

// Current repository (can be injected)
let currentFileRepository: DriveFileRepository = defaultFileRepository;
let currentFolderRepository: DriveFolderRepository = defaultFolderRepository;

export function setDriveFileRepository(repository: DriveFileRepository): void {
  currentFileRepository = repository;
}

export function getDriveFileRepository(): DriveFileRepository {
  return currentFileRepository;
}

export function setDriveFolderRepository(repository: DriveFolderRepository): void {
  currentFolderRepository = repository;
}

export function getDriveFolderRepository(): DriveFolderRepository {
  return currentFolderRepository;
}

function snapshot(file: DriveFile): DriveFile {
  return {
    ...file,
  };
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  const files = await currentFileRepository.findAll();
  return files.reverse().map(snapshot);
}

export async function getDriveFile(id: string): Promise<DriveFile | null> {
  const file = await currentFileRepository.findById(id);
  return file ? snapshot(file) : null;
}

export function resetDriveFiles(): void {
  if (currentFileRepository instanceof InMemoryDriveFileRepository) {
    (currentFileRepository as InMemoryDriveFileRepository).clear();
  }
}

export async function resetDriveFilesDB(): Promise<void> {
  const files = await currentFileRepository.findAll();
  for (const file of files) {
    await currentFileRepository.delete(file.id);
  }
}

export function resetDriveFolders(): void {
  if (currentFolderRepository instanceof InMemoryDriveFolderRepository) {
    (currentFolderRepository as InMemoryDriveFolderRepository).clear();
  }
}

export async function resetDriveFoldersDB(): Promise<void> {
  const folders = await currentFolderRepository.findAll();
  for (const folder of folders) {
    await currentFolderRepository.delete(folder.id);
  }
}

export async function getDriveOverview() {
  return {
    name: 'Drive',
    description: 'Starter drive domain package',
    files: await listDriveFiles(),
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

export async function uploadDriveFile(input: UploadDriveFileInput): Promise<DriveFile> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string');
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit');
  }

  if (!Number.isFinite(input.size) || !Number.isInteger(input.size)) {
    throw new DriveError('size must be an integer');
  }

  if (input.size < 0) {
    throw new DriveError('size must be non-negative');
  }

  if (input.mimeType && !isValidMimeType(input.mimeType)) {
    throw new DriveError('mimeType must be a valid MIME type (e.g., application/pdf)');
  }

  if (input.folderId) {
    const folder = await currentFolderRepository.findById(input.folderId);
    if (!folder) {
      throw new DriveError('folder not found');
    }
  }

  const now = getCurrentTimestamp();
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
  const created = await currentFileRepository.create(createData);

  return snapshot(created);
}

export async function renameDriveFile(input: RenameDriveFileInput): Promise<DriveFile | null> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string');
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit');
  }

  const updated = await currentFileRepository.update(input.id, {
    name,
    modifiedAt: getCurrentTimestamp(),
  });

  return updated ? snapshot(updated) : null;
}

export async function deleteDriveFile(id: string): Promise<boolean> {
  return await currentFileRepository.delete(id);
}

// Folder operations
export async function createFolder(input: CreateFolderInput): Promise<DriveFolder> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string');
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit');
  }

  if (input.parentId) {
    const parent = await currentFolderRepository.findById(input.parentId);
    if (!parent) {
      throw new DriveError('parent folder not found');
    }
  }

  const createData: Omit<DriveFolder, 'id'> = {
    name,
    createdAt: getCurrentTimestamp(),
  };
  if (input.parentId !== undefined) {
    createData.parentId = input.parentId;
  }
  const created = await currentFolderRepository.create(createData);

  return created;
}

export async function listFolders(parentId?: string): Promise<DriveFolder[]> {
  if (parentId) {
    return await currentFolderRepository.findWhere({ parentId });
  }
  return await currentFolderRepository.findAll();
}

export async function renameFolder(input: RenameFolderInput): Promise<DriveFolder | null> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string');
  }

  if (!isValidFileName(name)) {
    throw new DriveError('name contains invalid characters or exceeds length limit');
  }

  const updated = await currentFolderRepository.update(input.id, { name });

  return updated;
}

export async function deleteFolder(id: string): Promise<boolean> {
  // Check if folder has files
  const filesWithFolder = await currentFileRepository.findWhere({ folderId: id });
  if (filesWithFolder.length > 0) {
    return false;
  }

  // Check if folder has subfolders
  const subfolders = await currentFolderRepository.findWhere({ parentId: id });
  if (subfolders.length > 0) {
    return false;
  }

  return await currentFolderRepository.delete(id);
}

export async function moveFile(input: MoveFileInput): Promise<DriveFile | null> {
  if (input.folderId) {
    const folder = await currentFolderRepository.findById(input.folderId);
    if (!folder) {
      throw new DriveError('folder not found');
    }
  }

  const updateData: Partial<DriveFile> = {
    modifiedAt: getCurrentTimestamp(),
  };
  if (input.folderId !== undefined) {
    updateData.folderId = input.folderId;
  } else {
    // Explicitly set to undefined to remove folderId (type assertion for exactOptionalPropertyTypes)
    (updateData as any).folderId = undefined;
  }
  const updated = await currentFileRepository.update(input.id, updateData);

  return updated ? snapshot(updated) : null;
}

export async function searchFiles(input: SearchFilesInput): Promise<DriveFile[]> {
  const allFiles = await currentFileRepository.findAll();
  const query = input.query.toLowerCase();

  return allFiles.filter(file => {
    // Filter by folder if specified
    if (input.folderId && file.folderId !== input.folderId) {
      return false;
    }
    // Filter by name (case-insensitive partial match)
    return file.name.toLowerCase().includes(query);
  });
}
