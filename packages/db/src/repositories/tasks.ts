import { eq, and } from 'drizzle-orm';
import { tasks, type TaskSchema, type NewTaskSchema } from '../schema/tasks/index.js';
import type { QueryRepository, Database, RepositoryContext } from '../index.js';
import { generateUUID } from '@suite/shared-kernel';
import { logDataCreated, logDataUpdated, logDataDeleted } from '../security/audit-logger.js';

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
function mapToSchema(domain: Omit<TaskItem, 'id'>, tenantId: string): Omit<TaskSchema, 'id' | 'userId'> {
  const result: Omit<TaskSchema, 'id' | 'userId'> = {
    tenantId,
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
  private database: Database;

  constructor(db: Database) {
    this.database = db;
    this.db = db.getDrizzleDb();
  }

  private async setContext(context: RepositoryContext): Promise<void> {
    await this.database.setTenantContext(context.tenantId, context.userId);
  }

  async findById(id: string, context: RepositoryContext): Promise<TaskItem | null> {
    await this.setContext(context);
    const db = this.db;
    const results = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, context.userId)))
      .limit(1);
    return results[0] ? mapToDomain(results[0]) : null;
  }

  async findAll(context: RepositoryContext): Promise<TaskItem[]> {
    await this.setContext(context);
    const db = this.db;
    const results = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, context.userId));
    return results.map(mapToDomain);
  }

  async create(entity: Omit<TaskItem, 'id'>, context: RepositoryContext): Promise<TaskItem> {
    await this.setContext(context);
    const db = this.db;
    const schemaEntity = mapToSchema(entity, context.tenantId);
    const newEntity: NewTaskSchema = {
      id: generateUUID(),
      tenantId: context.tenantId,
      userId: context.userId,
      title: schemaEntity.title,
      completed: schemaEntity.completed,
      archived: schemaEntity.archived,
      dueDate: schemaEntity.dueDate,
      priority: schemaEntity.priority,
      tags: schemaEntity.tags,
      blindIndex: schemaEntity.blindIndex,
    };
    const results = await db.insert(tasks).values(newEntity).returning();
    if (!results[0]) {
      throw new Error('Failed to create task');
    }
    // Security: audit log data creation
    logDataCreated(context.userId, context.tenantId, 'task', newEntity.id);
    return mapToDomain(results[0]);
  }

  async update(id: string, entity: Partial<TaskItem>, context: RepositoryContext): Promise<TaskItem | null> {
    await this.setContext(context);
    const db = this.db;
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
      .where(and(eq(tasks.id, id), eq(tasks.userId, context.userId)))
      .returning();
    if (results[0]) {
      // Security: audit log data update
      logDataUpdated(context.userId, context.tenantId, 'task', id);
      return mapToDomain(results[0]);
    }
    return null;
  }

  async delete(id: string, context: RepositoryContext): Promise<boolean> {
    await this.setContext(context);
    const db = this.db;
    const results = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, context.userId)))
      .returning();
    if (results.length > 0) {
      // Security: audit log data deletion
      logDataDeleted(context.userId, context.tenantId, 'task', id);
    }
    return results.length > 0;
  }

  async findWhere(criteria: Partial<TaskItem>, context: RepositoryContext, _options?: import('../index.js').QueryOptions): Promise<TaskItem[]> {
    await this.setContext(context);
    const db = this.db;
    const conditions = [eq(tasks.userId, context.userId)];
    Object.entries(criteria).forEach(([key, value]) => 
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(eq(tasks[key as keyof TaskSchema] as any, value as any))
    );
    
    if (conditions.length === 1) {
      return this.findAll(context);
    }

    const whereClause = and(...conditions);
    const results = await db.select().from(tasks).where(whereClause);
    return results.map(mapToDomain);
  }

  async count(criteria: Partial<TaskItem>, context: RepositoryContext): Promise<number> {
    await this.setContext(context);
    const db = this.db;
    if (!criteria || Object.keys(criteria).length === 0) {
      const result = await db.select({ count: tasks.id }).from(tasks).where(eq(tasks.userId, context.userId));
      return result.length;
    }
    const results = await this.findWhere(criteria, context);
    return results.length;
  }
}
