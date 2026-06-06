import { eq, and } from 'drizzle-orm';
import { tasks, type TaskSchema, type NewTaskSchema } from '../schema/tasks.js';
import type { QueryRepository, Database, TransactionScope } from '../index.js';
import { generateUUID } from '@suite/shared-kernel';

// Domain type (from @suite/domain-tasks)
export type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  blindIndex?: string;
};

export interface TaskRepository extends QueryRepository<TaskItem> {
  clear?(): void;
}

// Map DB schema to domain type
function mapToDomain(schema: TaskSchema): TaskItem {
  const result: TaskItem = {
    id: schema.id,
    title: schema.title,
    completed: schema.completed,
    archived: schema.archived,
    dueDate: schema.dueDate ? schema.dueDate.toISOString() : null,
    priority: schema.priority ?? 'medium',
    tags: schema.tags ?? [],
  };
  if (schema.blindIndex !== null) {
    result.blindIndex = schema.blindIndex;
  }
  return result;
}

// Map domain type to DB schema (for create/update)
function mapToSchema(domain: Omit<TaskItem, 'id'>): Omit<TaskSchema, 'id' | 'userId'> {
  const result: Omit<TaskSchema, 'id' | 'userId'> = {
    title: domain.title,
    completed: domain.completed,
    archived: domain.archived,
    dueDate: domain.dueDate ? new Date(domain.dueDate) : null,
    priority: domain.priority,
    tags: domain.tags,
    blindIndex: domain.blindIndex ?? null,
  };
  return result;
}

export class PostgresTaskRepository implements TaskRepository {
  private db: ReturnType<Database['getDrizzleDb']>;
  private userId: string;

  constructor(db: Database, userId: string) {
    this.db = db.getDrizzleDb();
    this.userId = userId;
  }

  async findById(id: string, tx?: TransactionScope): Promise<TaskItem | null> {
    const db = tx ?? this.db;
    const results = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, this.userId)))
      .limit(1);
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async findAll(tx?: TransactionScope): Promise<TaskItem[]> {
    const db = tx ?? this.db;
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, this.userId));
    return results.map(mapToDomain);
  }

  async create(entity: Omit<TaskItem, 'id'>, tx?: TransactionScope): Promise<TaskItem> {
    const db = tx ?? this.db;
    const schemaEntity = mapToSchema(entity);
    const newEntity: NewTaskSchema = {
      id: generateUUID(),
      userId: this.userId,
      title: schemaEntity.title,
      completed: schemaEntity.completed,
      archived: schemaEntity.archived,
      dueDate: schemaEntity.dueDate,
      priority: schemaEntity.priority,
      tags: schemaEntity.tags,
    };
    const results = await db.insert(tasks).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create task');
    }
    return mapToDomain(results[0]);
  }

  async update(id: string, entity: Partial<TaskItem>, tx?: TransactionScope): Promise<TaskItem | null> {
    const db = tx ?? this.db;
    const schemaEntity: Partial<TaskSchema> = {};
    if (entity.title !== undefined) schemaEntity.title = entity.title;
    if (entity.completed !== undefined) schemaEntity.completed = entity.completed;
    if (entity.archived !== undefined) schemaEntity.archived = entity.archived;
    if (entity.dueDate !== undefined) schemaEntity.dueDate = entity.dueDate ? new Date(entity.dueDate) : null;
    if (entity.priority !== undefined) schemaEntity.priority = entity.priority;
    if (entity.tags !== undefined) schemaEntity.tags = entity.tags;

    const results = await db
      .update(tasks)
      .set(schemaEntity)
      .where(and(eq(tasks.id, id), eq(tasks.userId, this.userId)))
      .returning();
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async delete(id: string, tx?: TransactionScope): Promise<boolean> {
    const db = tx ?? this.db;
    const results = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, this.userId)))
      .returning();
    return results.length > 0;
  }

  async findWhere(criteria: Partial<TaskItem>, options?: import('../index.js').QueryOptions, tx?: TransactionScope): Promise<TaskItem[]> {
    const db = tx ?? this.db;
    const conditions = [eq(tasks.userId, this.userId)];
    Object.entries(criteria).forEach(([key, value]) => 
      conditions.push(eq(tasks[key as keyof TaskSchema] as any, value as any))
    );
    
    if (conditions.length === 1) {
      return this.findAll(tx);
    }

    const whereClause = and(...conditions);
    const results = await db.select().from(tasks).where(whereClause);
    return results.map(mapToDomain);
  }

  async count(criteria?: Partial<TaskItem>, tx?: TransactionScope): Promise<number> {
    const db = tx ?? this.db;
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await db.select({ count: tasks.id }).from(tasks).where(eq(tasks.userId, this.userId));
      return result.length;
    }
    const results = await this.findWhere(criteria, undefined, tx);
    return results.length;
  }
}
