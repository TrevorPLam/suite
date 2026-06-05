---
trigger: glob
globs: artifacts/api-server/src/**/*.ts
---

# Authentication System Rules

## Current Implementation Status

**CRITICAL**: No authentication system is currently implemented. This is a high-priority implementation gap.

## Required Authentication Components

### **JWT-Based Authentication**

- **Library**: Use `jsonwebtoken` for token handling
- **Storage**: HTTP-only cookies for session tokens
- **Refresh Tokens**: Implement token rotation for security
- **Middleware**: Express middleware for route protection

### **User Management Schema**

```typescript
// Add to lib/db/src/schema/index.ts
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('client'), // admin, client
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const sessionsTable = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: serial('user_id').references(() => usersTable.id),
  token: text('token').notNull().unique(),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### **Authentication Middleware**

```typescript
// artifacts/api-server/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = decoded as { id: number; email: string; role: string };
    next();
  });
};

export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### **Authentication Routes**

```typescript
// artifacts/api-server/src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@workspace/db';
import { usersTable, sessionsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [user] = await db.insert(usersTable).values({ name, email, passwordHash }).returning();

    // Generate tokens
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '7d',
    });

    // Store session
    await db.insert(sessionsTable).values({
      userId: user.id,
      token,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    });

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 1000, // 1 hour
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens (same as register)
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );

    // Set cookie and respond
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 1000,
    });

    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

export default router;
```

## Security Requirements

### **Environment Variables**

```bash
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
```

### **Password Security**

- Use bcrypt with salt rounds of 10+
- Never store plain text passwords
- Implement password strength requirements
- Consider password reset functionality

### **Token Security**

- Use HTTP-only cookies to prevent XSS attacks
- Implement secure flag in production
- Set appropriate SameSite policy
- Use short access token expiration (1 hour)
- Implement refresh token rotation

### **Session Management**

- Store sessions in database for revocation capability
- Implement session cleanup for expired tokens
- Track login attempts for security monitoring
- Consider multi-factor authentication for admin users

## Frontend Integration

### **Auth Context**

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useReducer(/* auth reducer */, {
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  // Check auth status on mount
  useEffect(() => {
    // Verify token with API
    // Update auth state accordingly
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
};
```

### **Protected Routes**

```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to access this page.</div>;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <div>Insufficient permissions.</div>;
  }

  return <>{children}</>;
};
```

## Implementation Priority

1. **Database Schema**: Add users and sessions tables
2. **Authentication Middleware**: Implement JWT verification
3. **Auth Routes**: Register, login, logout endpoints
4. **Frontend Context**: Auth state management
5. **Protected Routes**: Route-level access control
6. **Security Hardening**: Token rotation, rate limiting

## OpenAPI Specification Updates

Add to `lib/api-spec/openapi.yaml`:

```yaml
# Authentication endpoints
/auth/register:
  post:
    summary: Register new user
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [name, email, password]
            properties:
              name: { type: string }
              email: { type: string, format: email }
              password: { type: string, minLength: 8 }
    responses:
      200:
        description: User registered successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                user: { $ref: '#/components/schemas/User' }

/auth/login:
  post:
    summary: User login
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [email, password]
            properties:
              email: { type: string, format: email }
              password: { type: string }
    responses:
      200:
        description: Login successful
        content:
          application/json:
            schema:
              type: object
              properties:
                user: { $ref: '#/components/schemas/User' }

components:
  schemas:
    User:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, client] }
```

This authentication system provides secure user management with JWT tokens, proper session handling, and frontend integration.
