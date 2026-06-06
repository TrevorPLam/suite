import { eq } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { driveFiles, type DriveFileSchema, type NewDriveFileSchema } from '../schema/drive.js';
import type { Repository, QueryRepository } from '../index.js';

export type DriveFileRepository = QueryRepository<DriveFileSchema>;

export class PostgresDriveFileRepository implements DriveFileRepository {
  private db: ReturnType<typeof getDb>;

  constructor(db?: ReturnType<typeof getDb>) {
    this.db = db ?? getDb();
  }

  async findById(id: string): Promise<DriveFileSchema | null> {
    const results = await this.db
      .select()
      .from(driveFiles)
      .where(eq(driveFiles.id, id))
      .limit(1);
    return results[0] ?? null;
  }

  async findAll(): Promise<DriveFileSchema[]> {
    return this.db.select().from(driveFiles);
  }

  async create(entity: Omit<DriveFileSchema, 'id'>): Promise<DriveFileSchema> {
    const newEntity: NewDriveFileSchema = {
      id: crypto.randomUUID(),
      ...entity,
    };
    const results = await this.db.insert(driveFiles).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create drive file');
    }
    return results[0];
  }

  async update(id: string, entity: Partial<DriveFileSchema>): Promise<DriveFileSchema | null> {
    const results = await this.db
      .update(driveFiles)
      .set(entity)
      .where(eq(driveFiles.id, id))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(driveFiles)
      .where(eq(driveFiles.id, id))
      .returning();
    return results.length > 0;
  }

  async findWhere(criteria: Partial<DriveFileSchema>): Promise<DriveFileSchema[]> {
    const conditions = Object.entries(criteria).map(([key, value]) => 
      eq(driveFiles[key as keyof DriveFileSchema] as any, value as any)
    );
    
    if (conditions.length === 0) {
      return this.findAll();
    }

    // For now, simple implementation - in production would use and() for multiple conditions
    return this.db.select().from(driveFiles).where(conditions[0]!);
  }

  async count(criteria?: Partial<DriveFileSchema>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await this.db.select({ count: driveFiles.id }).from(driveFiles);
      return result.length;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }
}
