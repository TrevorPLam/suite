import type { MiddlewareHandler } from 'hono';
import { generateUUID } from './uuid.js';

/**
 * Request ID middleware for Hono.
 * 
 * Generates a UUID v4 request ID for each incoming request and:
 * - Sets it in the Hono context for use in other middleware/handlers
 * - Adds it to the response header as X-Request-Id
 * - Respects existing X-Request-Id from client for distributed tracing
 * 
 * This middleware should be mounted before the logger middleware to ensure
 * all logs include the request ID.
 * 
 * @returns Hono middleware handler
 */
export function requestId(): MiddlewareHandler {
  return async (c, next) => {
    // Check if client provided a request ID for distributed tracing
    const clientRequestId = c.req.header('X-Request-Id');
    
    // Use client's request ID if present, otherwise generate UUID v4
    const requestId = clientRequestId || generateUUID();
    
    // Set request ID in context for use in other middleware/handlers
    c.set('requestId', requestId);
    
    // Add request ID to response header
    c.header('X-Request-Id', requestId);
    
    await next();
  };
}
