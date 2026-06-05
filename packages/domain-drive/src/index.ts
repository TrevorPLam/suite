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

const driveFiles: DriveFile[] = [];

function createDriveFileId() {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  return `drive_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function listDriveFiles(): DriveFile[] {
  return [...driveFiles]
    .reverse()
    .map((file) => ({ ...file }));
}

export function getDriveFile(id: string): DriveFile | null {
  const file = driveFiles.find((f) => f.id === id);
  return file ? { ...file } : null;
}

export function resetDriveFiles(): void {
  driveFiles.length = 0;
}

export function getDriveOverview() {
  return {
    name: 'Drive',
    description: 'Starter drive domain package',
    files: listDriveFiles(),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function uploadDriveFile(input: UploadDriveFileInput): DriveFile {
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

  const file: DriveFile = {
    id: createDriveFileId(),
    name,
    size: input.size,
  };

  driveFiles.push(file);

  return { ...file };
}

export function renameDriveFile(input: RenameDriveFileInput): DriveFile | null {
  const index = driveFiles.findIndex((f) => f.id === input.id);

  if (index === -1) {
    return null;
  }

  const existingFile = driveFiles[index]!;
  const updatedFile: DriveFile = {
    id: existingFile.id,
    name: input.name.trim(),
    size: existingFile.size,
  };

  driveFiles[index] = updatedFile;

  return { ...updatedFile };
}

export function deleteDriveFile(id: string): boolean {
  const index = driveFiles.findIndex((f) => f.id === id);

  if (index === -1) {
    return false;
  }

  driveFiles.splice(index, 1);
  return true;
}
