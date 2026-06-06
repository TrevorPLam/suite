import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authClient, useSession as useBetterAuthSession } from '@suite/auth/client';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session, isPending } = useBetterAuthSession();

  useEffect(() => {
    setUser(session?.user || null);
    setLoading(isPending);
  }, [session, isPending]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });
    if (error) throw error;
    setUser(data?.user || null);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: name || '',
    });
    if (error) throw error;
    setUser(data?.user || null);
  };

  const signOut = async () => {
    await authClient.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
