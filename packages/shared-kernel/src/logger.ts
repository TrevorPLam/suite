import type { MiddlewareHandler } from 'hono';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  level?: LogLevel;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  userId?: string;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  };
  context?: Record<string, unknown>;
}

/**
 * Get log level from environment variable.
 * Defaults to 'info' in production, 'debug' in development.
 */
function getLogLevel(): LogLevel {
  // Cloudflare Workers uses env, Node.js uses process.env
  const envLevel = (typeof process !== 'undefined' ? process.env.LOG_LEVEL : undefined)?.toLowerCase() as LogLevel;
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  
  if (envLevel && validLevels.includes(envLevel)) {
    return envLevel;
  }
  
  const isProduction = typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : false;
  return isProduction ? 'info' : 'debug';
}

/**
 * Check if a log level should be logged based on configured level.
 */
function shouldLog(level: LogLevel, configuredLevel: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const levelIndex = levels.indexOf(level);
  const configuredIndex = levels.indexOf(configuredLevel);
  
  return levelIndex >= configuredIndex;
}

/**
 * Generate a unique request ID for correlation.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Structured JSON logger utility.
 * Outputs logs as JSON for log aggregation systems.
 */
export const logger = {
  debug: (entry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'>) => {
    const configuredLevel = getLogLevel();
    if (!shouldLog('debug', configuredLevel)) return;
    
    const logEntry: LogEntry = {
      ...entry,
      level: 'debug',
      timestamp: new Date().toISOString(),
    };
    
    console.log(JSON.stringify(logEntry));
  },
  
  info: (entry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'>) => {
    const configuredLevel = getLogLevel();
    if (!shouldLog('info', configuredLevel)) return;
    
    const logEntry: LogEntry = {
      ...entry,
      level: 'info',
      timestamp: new Date().toISOString(),
    };
    
    console.log(JSON.stringify(logEntry));
  },
  
  warn: (entry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'>) => {
    const configuredLevel = getLogLevel();
    if (!shouldLog('warn', configuredLevel)) return;
    
    const logEntry: LogEntry = {
      ...entry,
      level: 'warn',
      timestamp: new Date().toISOString(),
    };
    
    console.warn(JSON.stringify(logEntry));
  },
  
  error: (entry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'>) => {
    const configuredLevel = getLogLevel();
    if (!shouldLog('error', configuredLevel)) return;
    
    const logEntry: LogEntry = {
      ...entry,
      level: 'error',
      timestamp: new Date().toISOString(),
    };
    
    console.error(JSON.stringify(logEntry));
  },
};

/**
 * Structured logging middleware for Hono.
 * Logs all requests with structured JSON format including:
 * - timestamp, level, requestId, userId, method, path, status, duration
 * - Error logs include stack trace and context
 * 
 * This middleware should be mounted before routes to capture all requests.
 * 
 * @param options - Configuration for logger
 * @returns Hono middleware handler
 */
export function structuredLogger(options: LoggerOptions = {}): MiddlewareHandler {
  const configuredLevel = options.level || getLogLevel();
  
  return async (c, next) => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const userId = c.get('userId') as string | undefined;
    
    // Add requestId to context for use in other middleware/handlers
    c.set('requestId', requestId);
    
    // Log incoming request
    if (shouldLog('debug', configuredLevel)) {
      const debugEntry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'> = {
        requestId,
        method: c.req.method,
        path: c.req.path,
      };
      
      if (userId) {
        debugEntry.userId = userId;
      }
      
      debugEntry.context = {
        query: c.req.query(),
        headers: {
          'user-agent': c.req.header('user-agent'),
          'content-type': c.req.header('content-type'),
        },
      };
      
      logger.debug(debugEntry);
    }
    
    try {
      await next();
      
      const duration = Date.now() - startTime;
      const status = c.res.status;
      
      // Determine log level based on status code
      let logLevel: LogLevel = 'info';
      if (status >= 500) {
        logLevel = 'error';
      } else if (status >= 400) {
        logLevel = 'warn';
      } else if (status >= 300) {
        logLevel = 'debug';
      }
      
      if (shouldLog(logLevel, configuredLevel)) {
        const logEntry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'> = {
          requestId,
          method: c.req.method,
          path: c.req.path,
          status,
          duration,
        };
        
        if (userId) {
          logEntry.userId = userId;
        }
        
        logger[logLevel](logEntry);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error with stack trace
      const errorEntry: Partial<LogEntry> & Pick<LogEntry, 'requestId' | 'method' | 'path'> = {
        requestId,
        method: c.req.method,
        path: c.req.path,
        status: 500,
        duration,
      };
      
      if (userId) {
        errorEntry.userId = userId;
      }
      
      const errorObj: {
        message: string;
        stack?: string;
        context?: Record<string, unknown>;
      } = {
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      
      if (error instanceof Error && error.stack) {
        errorObj.stack = error.stack;
      }
      
      errorObj.context = {
        error,
      };
      
      errorEntry.error = errorObj;
      
      logger.error(errorEntry);
      
      // Re-throw the error for Hono's error handling
      throw error;
    }
  };
}
