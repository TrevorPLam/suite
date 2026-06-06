import { z } from 'zod';
import type {
  UploadDriveFileInput,
  CreateFolderInput,
  SearchFilesInput,
} from '@suite/domain-drive';

// Schema for uploading a file
const uploadFileBodySchemaBase = z.object({
  name: z.string().min(1).transform((val: string) => val.trim()),
  size: z.number().int().nonnegative(),
  folderId: z.string().min(1).optional(),
  mimeType: z.string().min(1).optional(),
});

export const uploadFileBodySchema = uploadFileBodySchemaBase.transform((data): UploadDriveFileInput => {
  const result: UploadDriveFileInput = {
    name: data.name,
    size: data.size,
  };
  if (data.folderId !== undefined) result.folderId = data.folderId;
  if (data.mimeType !== undefined) result.mimeType = data.mimeType;
  return result;
});

export type UploadFileBody = z.infer<typeof uploadFileBodySchemaBase>;

// Schema for renaming a file
export const renameFileBodySchema = z.object({
  name: z.string().min(1).transform((val: string) => val.trim()),
});

export type RenameFileBody = z.infer<typeof renameFileBodySchema>;

// Schema for creating a folder
const createFolderBodySchemaBase = z.object({
  name: z.string().min(1).transform((val: string) => val.trim()),
  parentId: z.string().min(1).optional(),
});

export const createFolderBodySchema = createFolderBodySchemaBase.transform((data): CreateFolderInput => {
  const result: CreateFolderInput = {
    name: data.name,
  };
  if (data.parentId !== undefined) result.parentId = data.parentId;
  return result;
});

export type CreateFolderBody = z.infer<typeof createFolderBodySchemaBase>;

// Schema for renaming a folder
export const renameFolderBodySchema = z.object({
  name: z.string().min(1).transform((val: string) => val.trim()),
});

export type RenameFolderBody = z.infer<typeof renameFolderBodySchema>;

// Schema for moving a file
export const moveFileBodySchema = z.object({
  folderId: z.string().min(1).optional(),
});

export type MoveFileBody = z.infer<typeof moveFileBodySchema>;

// Schema for searching files (query params)
const searchFilesQuerySchemaBase = z.object({
  q: z.string().min(1).optional(),
  folderId: z.string().min(1).optional(),
});

export const searchFilesQuerySchema = searchFilesQuerySchemaBase.transform((data): SearchFilesInput => {
  const result: SearchFilesInput = {};
  if (data.q !== undefined) result.query = data.q;
  if (data.folderId !== undefined) result.folderId = data.folderId;
  return result;
});

export type SearchFilesQuery = z.infer<typeof searchFilesQuerySchemaBase>;
