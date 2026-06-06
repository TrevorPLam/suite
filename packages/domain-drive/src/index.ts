import type { QueryRepository } from '@suite/db';

export type DriveFile = {
  id: string;
  name: string;
  size: number;
};

export type UploadDriveFileInput = {
  name: string;
  size: number;
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

export interface DriveFileRepository extends QueryRepository<DriveFile> {
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

// Default repository (in-memory for backward compatibility)
let defaultRepository: DriveFileRepository = new InMemoryDriveFileRepository();

// Current repository (can be injected)
let currentRepository: DriveFileRepository = defaultRepository;

export function setDriveFileRepository(repository: DriveFileRepository): void {
  currentRepository = repository;
}

export function getDriveFileRepository(): DriveFileRepository {
  return currentRepository;
}

function snapshot(file: DriveFile): DriveFile {
  return {
    ...file,
  };
}

export async function listDriveFiles(): Promise<DriveFile[]> {
  const files = await currentRepository.findAll();
  return files.reverse().map(snapshot);
}

export async function getDriveFile(id: string): Promise<DriveFile | null> {
  const file = await currentRepository.findById(id);
  return file ? snapshot(file) : null;
}

export function resetDriveFiles(): void {
  if (currentRepository instanceof InMemoryDriveFileRepository) {
    (currentRepository as InMemoryDriveFileRepository).clear();
  }
}

export async function resetDriveFilesDB(): Promise<void> {
  // For database repositories, delete all files
  const files = await currentRepository.findAll();
  for (const file of files) {
    await currentRepository.delete(file.id);
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

export async function uploadDriveFile(input: UploadDriveFileInput): Promise<DriveFile> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string');
  }

  if (!Number.isFinite(input.size) || !Number.isInteger(input.size)) {
    throw new DriveError('size must be an integer');
  }

  if (input.size < 0) {
    throw new DriveError('size must be non-negative');
  }

  const created = await currentRepository.create({ name, size: input.size });

  return snapshot(created);
}

export async function renameDriveFile(input: RenameDriveFileInput): Promise<DriveFile | null> {
  const name = input.name.trim();

  if (!isNonEmptyString(name)) {
    throw new DriveError('name must be a non-empty string');
  }

  const updated = await currentRepository.update(input.id, { name });

  return updated ? snapshot(updated) : null;
}

export async function deleteDriveFile(id: string): Promise<boolean> {
  return await currentRepository.delete(id);
}
