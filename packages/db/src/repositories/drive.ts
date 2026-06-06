import { eq } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { driveFiles, driveFolders, type DriveFileSchema, type NewDriveFileSchema, type DriveFolderSchema, type NewDriveFolderSchema } from '../schema/drive.js';
import type { QueryRepository } from '../index.js';
import { generateUUID } from '@suite/shared-kernel';

// Domain types (from @suite/domain-drive)
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

export type DriveFileRepository = QueryRepository<DriveFile>;
export type DriveFolderRepository = QueryRepository<DriveFolder>;

// Map DB schema to domain type
function mapFileToDomain(schema: DriveFileSchema): DriveFile {
  const result: DriveFile = {
    id: schema.id,
    name: schema.name,
    size: schema.size,
    createdAt: schema.createdAt.toISOString(),
    modifiedAt: schema.modifiedAt.toISOString(),
  };
  if (schema.folderId !== null) {
    result.folderId = schema.folderId;
  }
  if (schema.mimeType !== null) {
    result.mimeType = schema.mimeType;
  }
  return result;
}

function mapFolderToDomain(schema: DriveFolderSchema): DriveFolder {
  const result: DriveFolder = {
    id: schema.id,
    name: schema.name,
    createdAt: schema.createdAt.toISOString(),
  };
  if (schema.parentId !== null) {
    result.parentId = schema.parentId;
  }
  return result;
}

// Map domain type to DB schema (for create/update)
function mapFileToSchema(domain: Omit<DriveFile, 'id'>): Omit<DriveFileSchema, 'id'> {
  return {
    name: domain.name,
    size: domain.size,
    folderId: domain.folderId ?? null,
    mimeType: domain.mimeType ?? null,
    createdAt: new Date(domain.createdAt),
    modifiedAt: new Date(domain.modifiedAt),
  };
}

function mapFolderToSchema(domain: Omit<DriveFolder, 'id'>): Omit<DriveFolderSchema, 'id'> {
  return {
    name: domain.name,
    parentId: domain.parentId ?? null,
    createdAt: new Date(domain.createdAt),
  };
}

export class PostgresDriveFileRepository implements DriveFileRepository {
  private db: ReturnType<typeof getDb>;

  constructor(db?: ReturnType<typeof getDb>) {
    this.db = db ?? getDb();
  }

  async findById(id: string): Promise<DriveFile | null> {
    const results = await this.db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.id, id))
      .limit(1);
    return results[0] ? mapFileToDomain(results[0]) : null;
  }

  async findAll(): Promise<DriveFile[]> {
    const results = await this.db.select().from(driveFiles);
    return results.map(mapFileToDomain);
  }

  async create(entity: Omit<DriveFile, 'id'>): Promise<DriveFile> {
    const schemaEntity = mapFileToSchema(entity);
    const newEntity: NewDriveFileSchema = {
      id: generateUUID(),
      ...schemaEntity,
    };
    const results = await this.db.insert(driveFiles).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create drive file');
    }
    return mapFileToDomain(results[0]);
  }

  async update(id: string, entity: Partial<DriveFile>): Promise<DriveFile | null> {
    const schemaEntity: Partial<DriveFileSchema> = {};
    if (entity.name !== undefined) schemaEntity.name = entity.name;
    if (entity.size !== undefined) schemaEntity.size = entity.size;
    if (entity.folderId !== undefined) schemaEntity.folderId = entity.folderId ?? null;
    if (entity.mimeType !== undefined) schemaEntity.mimeType = entity.mimeType ?? null;
    if (entity.createdAt !== undefined) schemaEntity.createdAt = new Date(entity.createdAt);
    if (entity.modifiedAt !== undefined) schemaEntity.modifiedAt = new Date(entity.modifiedAt);

    const results = await this.db
      .update(driveFiles)
      .set(schemaEntity)
      .where(eq(driveFiles.id, id))
      .returning();
    return results[0] ? mapFileToDomain(results[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(driveFiles)
      .where(eq(driveFiles.id, id))
      .returning();
    return results.length > 0;
  }

  async findWhere(criteria: Partial<DriveFile>): Promise<DriveFile[]> {
    const conditions = Object.entries(criteria).map(([key, value]) => 
      eq(driveFiles[key as keyof DriveFileSchema] as any, value as any)
    );
    
    if (conditions.length === 0) {
      return this.findAll();
    }

    // For now, simple implementation - in production would use and() for multiple conditions
    const results = await this.db.select().from(driveFiles).where(conditions[0]!);
    return results.map(mapFileToDomain);
  }

  async count(criteria?: Partial<DriveFile>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await this.db.select({ count: driveFiles.id }).from(driveFiles);
      return result.length;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }
}

export class PostgresDriveFolderRepository implements DriveFolderRepository {
  private db: ReturnType<typeof getDb>;

  constructor(db?: ReturnType<typeof getDb>) {
    this.db = db ?? getDb();
  }

  async findById(id: string): Promise<DriveFolder | null> {
    const results = await this.db
      .select()
      .from(driveFolders)
      .where(eq(driveFolders.id, id))
      .limit(1);
    return results[0] ? mapFolderToDomain(results[0]) : null;
  }

  async findAll(): Promise<DriveFolder[]> {
    const results = await this.db.select().from(driveFolders);
    return results.map(mapFolderToDomain);
  }

  async create(entity: Omit<DriveFolder, 'id'>): Promise<DriveFolder> {
    const schemaEntity = mapFolderToSchema(entity);
    const newEntity: NewDriveFolderSchema = {
      id: generateUUID(),
      ...schemaEntity,
    };
    const results = await this.db.insert(driveFolders).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create drive folder');
    }
    return mapFolderToDomain(results[0]);
  }

  async update(id: string, entity: Partial<DriveFolder>): Promise<DriveFolder | null> {
    const schemaEntity: Partial<DriveFolderSchema> = {};
    if (entity.name !== undefined) schemaEntity.name = entity.name;
    if (entity.parentId !== undefined) schemaEntity.parentId = entity.parentId ?? null;
    if (entity.createdAt !== undefined) schemaEntity.createdAt = new Date(entity.createdAt);

    const results = await this.db
      .update(driveFolders)
      .set(schemaEntity)
      .where(eq(driveFolders.id, id))
      .returning();
    return results[0] ? mapFolderToDomain(results[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(driveFolders)
      .where(eq(driveFolders.id, id))
      .returning();
    return results.length > 0;
  }

  async findWhere(criteria: Partial<DriveFolder>): Promise<DriveFolder[]> {
    const conditions = Object.entries(criteria).map(([key, value]) => 
      eq(driveFolders[key as keyof DriveFolderSchema] as any, value as any)
    );
    
    if (conditions.length === 0) {
      return this.findAll();
    }

    // For now, simple implementation - in production would use and() for multiple conditions
    const results = await this.db.select().from(driveFolders).where(conditions[0]!);
    return results.map(mapFolderToDomain);
  }

  async count(criteria?: Partial<DriveFolder>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await this.db.select({ count: driveFolders.id }).from(driveFolders);
      return result.length;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }
}
