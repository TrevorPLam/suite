---
name: implement-authentication
description: Complete guide for implementing JWT-based authentication system from scratch in the YDM project (currently no authentication exists)
---

# Authentication System Implementation Skill

## Current State Assessment

**CRITICAL**: No authentication system exists. This is a high-priority security and business requirement.

### **What's Missing**

- No authentication middleware
- No user registration/login endpoints
- No JWT token handling
- No session management
- No protected routes
- Frontend has no auth context or state management

## Implementation Workflow

### **Phase 1: Backend Authentication Setup**

#### **1. Install Required Dependencies**

```bash
# Add to api-server package.json
pnpm --filter @workspace/api-server add jsonwebtoken bcrypt
pnpm --filter @workspace/api-server add -D @types/jsonwebtoken @types/bcrypt
```

#### **2. Environment Variables**

```bash
# Add to platform environment variables
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
NODE_ENV=development
```

#### **3. Authentication Middleware**

```typescript
// artifacts/api-server/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '@workspace/db';
import { sessionsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

interface AuthenticatedRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
      role: string;
    };

    // Check if session exists and is valid
    const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

export const requireRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
```

#### **4. Authentication Routes**

```typescript
// artifacts/api-server/src/routes/auth.ts
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@workspace/db';
import { usersTable, sessionsTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { insertUserSchema } from '@workspace/api-zod';

const router = express.Router();

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const validated = insertUserSchema.parse(req.body);

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, validated.email));

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create user
    const [user] = await db
      .insert(usersTable)
      .values({
        name: validated.name,
        email: validated.email,
        passwordHash,
        role: 'client',
      })
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
      });

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

    res.status(201).json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);

    // Find user
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, validated.email));

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(validated.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

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
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 * 1000,
    });

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (token) {
      // Remove session from database
      await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    }

    // Clear cookie
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
      role: string;
    };

    // Get user from database
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, decoded.id));

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
```

#### **5. Update Main Router**

```typescript
// artifacts/api-server/src/routes/index.ts
import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
// Import other routers as they're created

const router = Router();

// Health check (no auth required)
router.use('/healthz', healthRouter);

// Authentication routes (no auth required)
router.use('/auth', authRouter);

// Protected routes (add auth middleware)
// router.use('/users', authenticateToken, usersRouter);
// router.use('/leads', authenticateToken, leadsRouter);

export default router;
```

### **Phase 2: Frontend Authentication Setup**

#### **1. Auth Context Implementation**

```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { useMeQuery, useLoginMutation, useLogoutMutation } from '@workspace/api-client-react';

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
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false,
      };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false, loading: false };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthState | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { data: user, isLoading, error } = useMeQuery();

  useEffect(() => {
    if (isLoading) return;

    if (user?.user) {
      dispatch({ type: 'SET_USER', payload: user.user });
    } else if (error) {
      dispatch({ type: 'SET_USER', payload: null });
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, isLoading, error]);

  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const result = await loginMutation.mutateAsync({ email, password });
      dispatch({ type: 'SET_USER', payload: result.user });
      return result;
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', payload: error.message || 'Login failed' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
      dispatch({ type: 'LOGOUT' });
    } catch (error: any) {
      console.error('Logout failed:', error);
      // Still logout locally even if server call fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  const value = {
    ...state,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### **2. Login Form Component**

```typescript
// src/components/LoginForm.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

export const LoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(formData.email, formData.password);
    } catch (error) {
      // Error is handled by auth context
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <motion.div
      className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl p-6 max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-blue-500 transition-colors duration-150"
            placeholder="Enter your password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors duration-150"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </motion.div>
  );
};
```

#### **3. Protected Route Component**

```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  fallback = <div>Please log in to access this page.</div>
}) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return fallback;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <div>Insufficient permissions.</div>;
  }

  return <>{children}</>;
};
```

#### **4. Update App Component**

```typescript
// src/App.tsx
import React from 'react';
import { Router, Route } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { PageTransition } from '@/components/PageTransition';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LoginForm } from '@/components/LoginForm';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Import existing pages
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';
// ... other imports

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router base={import.meta.env.BASE_PATH}>
          <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 pt-16">
              <PageTransition>
                <Route path="/" component={Home} />
                <Route path="/about" component={About} />

                {/* Protected routes */}
                <Route path="/dashboard">
                  <ProtectedRoute>
                    {/* Dashboard component */}
                  </ProtectedRoute>
                </Route>

                {/* Auth routes */}
                <Route path="/login" component={LoginForm} />

                {/* 404 */}
                <Route component={NotFound} />
              </PageTransition>
            </main>

            <Footer />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### **Phase 3: Update OpenAPI Specification**

#### **Add Authentication Endpoints**

```yaml
# lib/api-spec/openapi.yaml - Add to paths
/auth/register:
  post:
    summary: Register new user
    tags: [Authentication]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/RegisterRequest'
    responses:
      201:
        description: User registered successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'

/auth/login:
  post:
    summary: User login
    tags: [Authentication]
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/LoginRequest'
    responses:
      200:
        description: Login successful
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AuthResponse'

/auth/logout:
  post:
    summary: User logout
    tags: [Authentication]
    responses:
      200:
        description: Logout successful

/auth/me:
  get:
    summary: Get current user
    tags: [Authentication]
    responses:
      200:
        description: Current user info
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserResponse'

components:
  schemas:
    RegisterRequest:
      type: object
      required: [name, email, password]
      properties:
        name: { type: string, minLength: 2 }
        email: { type: string, format: email }
        password: { type: string, minLength: 8 }

    LoginRequest:
      type: object
      required: [email, password]
      properties:
        email: { type: string, format: email }
        password: { type: string }

    AuthResponse:
      type: object
      properties:
        user: { $ref: '#/components/schemas/User' }

    UserResponse:
      type: object
      properties:
        user: { $ref: '#/components/schemas/User' }

    User:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, client] }
        createdAt: { type: string, format: date-time }
```

### **Phase 4: Testing & Integration**

#### **Test Authentication Flow**

```bash
# Test registration
curl -X POST http://localhost:23379/api/auth/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:23379/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected route (with cookies)
curl -X GET http://localhost:23379/api/auth/me \
  -b cookies.txt

# Test logout
curl -X POST http://localhost:23379/api/auth/logout \
  -b cookies.txt \
  -c cookies.txt
```

#### **Run Code Generation**

```bash
# Regenerate API hooks with auth endpoints
pnpm --filter @workspace/api-spec run codegen
```

## Implementation Checklist

### **Backend Authentication**

- [ ] Install jsonwebtoken and bcrypt dependencies
- [ ] Set up JWT_SECRET and JWT_REFRESH_SECRET environment variables
- [ ] Create authentication middleware with token verification
- [ ] Implement auth routes (register, login, logout, me)
- [ ] Add session management with database storage
- [ ] Update main router to include auth routes
- [ ] Test all authentication endpoints

### **Frontend Authentication**

- [ ] Create AuthContext with React hooks
- [ ] Implement LoginForm component with validation
- [ ] Create ProtectedRoute component for route guards
- [ ] Update App.tsx to include AuthProvider
- [ ] Add authentication state management
- [ ] Test login/logout flow in browser

### **API Integration**

- [ ] Update OpenAPI spec with authentication endpoints
- [ ] Run codegen to generate auth hooks
- [ ] Test generated hooks with API endpoints
- [ ] Verify cookie handling works correctly
- [ ] Test protected routes with authentication

### **Security Verification**

- [ ] Verify JWT tokens are properly signed
- [ ] Test session expiration handling
- [ ] Verify password hashing works correctly
- [ ] Test role-based access control
- [ ] Check for proper error handling

## Common Issues & Solutions

### **JWT Token Issues**

- **Problem**: Invalid signature errors
- **Solution**: Ensure JWT_SECRET is set and consistent across restarts
- **Check**: Verify environment variable is properly loaded

### **Cookie Issues**

- **Problem**: Cookies not being sent with requests
- **Solution**: Ensure cookie domain and path are correct
- **Check**: Browser developer tools Network tab for cookie headers

### **Database Session Issues**

- **Problem**: Session not found in database
- **Solution**: Ensure sessions table exists and data is being inserted
- **Check**: Database query to verify session storage

This authentication system provides secure user management with JWT tokens, proper session handling, and comprehensive frontend integration.
