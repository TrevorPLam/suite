export type DriveFile = {
  id: string;
  name: string;
  size: number;
};

export type UploadDriveFileInput = {
  name: string;
  size: number;
};

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

export function getDriveOverview() {
  return {
    name: 'Drive',
    description: 'Starter drive domain package',
    files: listDriveFiles(),
  };
}

export function uploadDriveFile(input: UploadDriveFileInput): DriveFile {
  const file: DriveFile = {
    id: createDriveFileId(),
    ...input,
  };

  driveFiles.push(file);

  return { ...file };
}
