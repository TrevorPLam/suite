import { eq, and } from 'drizzle-orm';
import { getDb } from '../connection.js';
import { tasks, type TaskSchema, type NewTaskSchema } from '../schema/tasks.js';
import type { Repository, QueryRepository } from '../index.js';

export type TaskRepository = QueryRepository<TaskSchema>;

export class PostgresTaskRepository implements TaskRepository {
  private db: ReturnType<typeof getDb>;

  constructor(db?: ReturnType<typeof getDb>) {
    this.db = db ?? getDb();
  }

  async findById(id: string): Promise<TaskSchema | null> {
    const results = await this.db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);
    return results[0] ?? null;
  }

  async findAll(): Promise<TaskSchema[]> {
    return this.db.select().from(tasks);
  }

  async create(entity: Omit<TaskSchema, 'id'>): Promise<TaskSchema> {
    const newEntity: NewTaskSchema = {
      id: crypto.randomUUID(),
      ...entity,
    };
    const results = await this.db.insert(tasks).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create task');
    }
    return results[0];
  }

  async update(id: string, entity: Partial<TaskSchema>): Promise<TaskSchema | null> {
    const results = await this.db
      .update(tasks)
      .set(entity)
      .where(eq(tasks.id, id))
      .returning();
    return results[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const results = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    return results.length > 0;
  }

  async findWhere(criteria: Partial<TaskSchema>): Promise<TaskSchema[]> {
    const conditions = Object.entries(criteria).map(([key, value]) => 
      eq(tasks[key as keyof TaskSchema] as any, value as any)
    );
    
    if (conditions.length === 0) {
      return this.findAll();
    }

    // Use and() for multiple conditions
    const whereClause = conditions.length === 1 
      ? conditions[0]! 
      : and(...conditions);
    
    return this.db.select().from(tasks).where(whereClause);
  }

  async count(criteria?: Partial<TaskSchema>): Promise<number> {
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await this.db.select({ count: tasks.id }).from(tasks);
      return result.length;
    }
    const results = await this.findWhere(criteria);
    return results.length;
  }
}
