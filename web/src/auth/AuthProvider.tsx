import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { api, clearToken, setToken } from '../api/client';
import type { User } from '../api/types';

interface AuthValue {
  user: User | null;
  /** True while the session is being read back from the API. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * On a reload the token is in local storage but the user is not, so the
   * session is read back from the API before the app decides anything.
   * Without this, a reload would bounce a signed-in user to the login page.
   */
  useEffect(() => {
    let active = true;

    api
      .me()
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch(() => {
        // A token that no longer works is worse than no token: it would be
        // sent with every request and refused with every request.
        clearToken();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await api.login({ email, password });
    setToken(result.token);
    setUser(result.user);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    await api.register({ name, email, password });
    // Registering does not sign in. The account has to sign in like any
    // other, so the token is only issued by the login endpoint.
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth was called outside an AuthProvider');
  return value;
}
