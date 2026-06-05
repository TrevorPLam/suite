export type DriveFile = {
  id: string;
  name: string;
  size: number;
};

export type UploadDriveFileInput = {
  name: string;
  size: number;
};

export function getDriveOverview() {
  return {
    name: 'Drive',
    description: 'Starter drive domain package',
    files: [] as DriveFile[],
  };
}

export function uploadDriveFile(input: UploadDriveFileInput): DriveFile {
  return {
    id: crypto.randomUUID(),
    ...input,
  };
}
