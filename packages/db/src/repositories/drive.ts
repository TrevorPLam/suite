import { eq, and, sql } from 'drizzle-orm';
import { driveFiles, driveFolders, type DriveFileSchema, type NewDriveFileSchema, type DriveFolderSchema, type NewDriveFolderSchema } from '../schema/drive/index.js';
import type { QueryRepository, Database, RepositoryContext } from '../index.js';
import { generateUUID } from '@suite/shared-kernel';
import { logDataCreated, logDataUpdated, logDataDeleted } from '../security/audit-logger.js';

// Domain types (from @suite/domain-drive)
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
  if (schema.blindIndex !== null) {
    result.blindIndex = schema.blindIndex;
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
function mapFileToSchema(domain: Omit<DriveFile, 'id'>, tenantId: string): Omit<DriveFileSchema, 'id' | 'userId'> {
  const result: Omit<DriveFileSchema, 'id' | 'userId'> = {
    tenantId,
    name: domain.name,
    size: domain.size,
    folderId: domain.folderId ?? null,
    mimeType: domain.mimeType ?? null,
    createdAt: new Date(domain.createdAt),
    modifiedAt: new Date(domain.modifiedAt),
    blindIndex: domain.blindIndex ?? null,
  };
  return result;
}

function mapFolderToSchema(domain: Omit<DriveFolder, 'id'>, tenantId: string): Omit<DriveFolderSchema, 'id' | 'userId'> {
  return {
    tenantId,
    name: domain.name,
    parentId: domain.parentId ?? null,
    createdAt: new Date(domain.createdAt),
  };
}

export class PostgresDriveFileRepository implements DriveFileRepository {
  private db: ReturnType<Database['getDrizzleDb']>;
  private database: Database;

  constructor(db: Database) {
    this.database = db;
    this.db = db.getDrizzleDb();
  }

  private async setContext(context: RepositoryContext): Promise<void> {
    await this.database.setTenantContext(context.tenantId, context.userId);
  }

  async findById(id: string, context: RepositoryContext): Promise<DriveFile | null> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const results = await tx
        .select()
        .from(driveFiles)
        .where(and(eq(driveFiles.id, id), eq(driveFiles.userId, context.userId)))
        .limit(1);
      return results[0] ? mapFileToDomain(results[0]) : null;
    });
  }

  async findAll(context: RepositoryContext): Promise<DriveFile[]> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const results = await tx
        .select()
        .from(driveFiles)
        .where(eq(driveFiles.userId, context.userId));
      return results.map(mapFileToDomain);
    });
  }

  async create(entity: Omit<DriveFile, 'id'>, context: RepositoryContext): Promise<DriveFile> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const schemaEntity = mapFileToSchema(entity, context.tenantId);
      const newEntity: NewDriveFileSchema = {
        id: generateUUID(),
        tenantId: context.tenantId,
        userId: context.userId,
        name: schemaEntity.name,
        size: schemaEntity.size,
        folderId: schemaEntity.folderId,
        mimeType: schemaEntity.mimeType,
        createdAt: schemaEntity.createdAt,
        modifiedAt: schemaEntity.modifiedAt,
        blindIndex: schemaEntity.blindIndex,
      };
      const results = await tx.insert(driveFiles).values(newEntity).returning();
      if (!results[0]) {
        throw new Error('Failed to create drive file');
      }
      // Security: audit log data creation
      logDataCreated(context.userId, context.tenantId, 'drive_file', newEntity.id);
      return mapFileToDomain(results[0]);
    });
  }

  async update(id: string, entity: Partial<DriveFile>, context: RepositoryContext): Promise<DriveFile | null> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const schemaEntity: Partial<DriveFileSchema> = {};
      if (entity.name !== undefined) schemaEntity.name = entity.name;
      if (entity.size !== undefined) schemaEntity.size = entity.size;
      if (entity.folderId !== undefined) schemaEntity.folderId = entity.folderId ?? null;
      if (entity.mimeType !== undefined) schemaEntity.mimeType = entity.mimeType ?? null;
      if (entity.createdAt !== undefined) schemaEntity.createdAt = new Date(entity.createdAt);
      if (entity.modifiedAt !== undefined) schemaEntity.modifiedAt = new Date(entity.modifiedAt);

      const results = await tx
        .update(driveFiles)
        .set(schemaEntity)
        .where(and(eq(driveFiles.id, id), eq(driveFiles.userId, context.userId)))
        .returning();
      if (results[0]) {
        // Security: audit log data update
        logDataUpdated(context.userId, context.tenantId, 'drive_file', id);
        return mapFileToDomain(results[0]);
      }
      return null;
    });
  }

  async delete(id: string, context: RepositoryContext): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const results = await tx
        .delete(driveFiles)
        .where(and(eq(driveFiles.id, id), eq(driveFiles.userId, context.userId)))
        .returning();
      if (results.length > 0) {
        // Security: audit log data deletion
        logDataDeleted(context.userId, context.tenantId, 'drive_file', id);
      }
      return results.length > 0;
    });
  }

  async findWhere(criteria: Partial<DriveFile>, context: RepositoryContext, _options?: import('../index.js').QueryOptions): Promise<DriveFile[]> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const conditions = [eq(driveFiles.userId, context.userId)];
      Object.entries(criteria).forEach(([key, value]) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(driveFiles[key as keyof DriveFileSchema] as any, value as any))
      );
      
      if (conditions.length === 1) {
        const results = await tx.select().from(driveFiles).where(eq(driveFiles.userId, context.userId));
        return results.map(mapFileToDomain);
      }

      const whereClause = and(...conditions);
      const results = await tx.select().from(driveFiles).where(whereClause);
      return results.map(mapFileToDomain);
    });
  }

  async count(criteria: Partial<DriveFile>, context: RepositoryContext): Promise<number> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      if (!criteria || Object.keys(criteria).length === 0) {
        const result = await tx.select({ count: sql<number>`count(*)` }).from(driveFiles).where(eq(driveFiles.userId, context.userId));
        return Number(result[0]?.count ?? 0);
      }
      const conditions = [eq(driveFiles.userId, context.userId)];
      Object.entries(criteria).forEach(([key, value]) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(driveFiles[key as keyof DriveFileSchema] as any, value as any))
      );
      const whereClause = and(...conditions);
      const result = await tx.select({ count: sql<number>`count(*)` }).from(driveFiles).where(whereClause);
      return Number(result[0]?.count ?? 0);
    });
  }
}

export class PostgresDriveFolderRepository implements DriveFolderRepository {
  private db: ReturnType<Database['getDrizzleDb']>;
  private database: Database;

  constructor(db: Database) {
    this.database = db;
    this.db = db.getDrizzleDb();
  }

  private async setContext(context: RepositoryContext): Promise<void> {
    await this.database.setTenantContext(context.tenantId, context.userId);
  }

  async findById(id: string, context: RepositoryContext): Promise<DriveFolder | null> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const results = await tx
        .select()
        .from(driveFolders)
        .where(and(eq(driveFolders.id, id), eq(driveFolders.userId, context.userId)))
        .limit(1);
      return results[0] ? mapFolderToDomain(results[0]) : null;
    });
  }

  async findAll(context: RepositoryContext): Promise<DriveFolder[]> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const results = await tx
        .select()
        .from(driveFolders)
        .where(eq(driveFolders.userId, context.userId));
      return results.map(mapFolderToDomain);
    });
  }

  async create(entity: Omit<DriveFolder, 'id'>, context: RepositoryContext): Promise<DriveFolder> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const schemaEntity = mapFolderToSchema(entity, context.tenantId);
      const newEntity: NewDriveFolderSchema = {
        id: generateUUID(),
        tenantId: context.tenantId,
        userId: context.userId,
        name: schemaEntity.name,
        parentId: schemaEntity.parentId,
        createdAt: schemaEntity.createdAt,
      };
      const results = await tx.insert(driveFolders).values(newEntity).returning();
      if (!results[0]) {
        throw new Error('Failed to create drive folder');
      }
      return mapFolderToDomain(results[0]);
    });
  }

  async update(id: string, entity: Partial<DriveFolder>, context: RepositoryContext): Promise<DriveFolder | null> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const schemaEntity: Partial<DriveFolderSchema> = {};
      if (entity.name !== undefined) schemaEntity.name = entity.name;
      if (entity.parentId !== undefined) schemaEntity.parentId = entity.parentId ?? null;
      if (entity.createdAt !== undefined) schemaEntity.createdAt = new Date(entity.createdAt);

      const results = await tx
        .update(driveFolders)
        .set(schemaEntity)
        .where(and(eq(driveFolders.id, id), eq(driveFolders.userId, context.userId)))
        .returning();
      return results[0] ? mapFolderToDomain(results[0]) : null;
    });
  }

  async delete(id: string, context: RepositoryContext): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const results = await tx
        .delete(driveFolders)
        .where(and(eq(driveFolders.id, id), eq(driveFolders.userId, context.userId)))
        .returning();
      return results.length > 0;
    });
  }

  async findWhere(criteria: Partial<DriveFolder>, context: RepositoryContext, _options?: import('../index.js').QueryOptions): Promise<DriveFolder[]> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      const conditions = [eq(driveFolders.userId, context.userId)];
      Object.entries(criteria).forEach(([key, value]) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(driveFolders[key as keyof DriveFolderSchema] as any, value as any))
      );
      
      if (conditions.length === 1) {
        const results = await tx.select().from(driveFolders).where(eq(driveFolders.userId, context.userId));
        return results.map(mapFolderToDomain);
      }

      const whereClause = and(...conditions);
      const results = await tx.select().from(driveFolders).where(whereClause);
      return results.map(mapFolderToDomain);
    });
  }

  async count(criteria: Partial<DriveFolder>, context: RepositoryContext): Promise<number> {
    return this.db.transaction(async (tx) => {
      await this.setContext(context);
      if (!criteria || Object.keys(criteria).length === 0) {
        const result = await tx.select({ count: sql<number>`count(*)` }).from(driveFolders).where(eq(driveFolders.userId, context.userId));
        return Number(result[0]?.count ?? 0);
      }
      const conditions = [eq(driveFolders.userId, context.userId)];
      Object.entries(criteria).forEach(([key, value]) => 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(driveFolders[key as keyof DriveFolderSchema] as any, value as any))
      );
      const whereClause = and(...conditions);
      const result = await tx.select({ count: sql<number>`count(*)` }).from(driveFolders).where(whereClause);
      return Number(result[0]?.count ?? 0);
    });
  }
}
