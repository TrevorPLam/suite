import { Database } from './database.interface.js';

/**
 * Sets the tenant context for the current database transaction.
 * This uses SET LOCAL to ensure the tenant context is scoped to the transaction
 * and automatically cleared when the transaction ends, preventing tenant leakage
 * in connection poolers like PgBouncer.
 *
 * @param db - Database instance
 * @param tenantId - Tenant UUID to set as current tenant context
 */
export async function setTenantContext(db: Database, tenantId: string): Promise<void> {
  await db.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
}

/**
 * Extracts tenant ID from request headers.
 * This is typically called in API middleware to extract the tenant ID from
 * authentication headers or JWT claims.
 *
 * @param headers - Request headers object
 * @returns Tenant ID string or null if not found
 */
export function getTenantIdFromHeaders(headers: Headers): string | null {
  return headers.get('x-tenant-id') || null;
}

/**
 * Extracts tenant ID from a JWT token payload.
 * This is used when tenant information is embedded in the JWT.
 *
 * @param payload - JWT token payload
 * @returns Tenant ID string or null if not found
 */
export function getTenantIdFromToken(payload: Record<string, unknown>): string | null {
  const tenantId = payload.tenantId as string | undefined;
  return tenantId || null;
}

/**
 * Validates that a tenant ID is a valid UUID format.
 * This prevents SQL injection and ensures data integrity.
 *
 * @param tenantId - Tenant ID to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidTenantId(tenantId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}
