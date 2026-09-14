import { authStorage } from "./auth-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { login as loginApi, register as registerApi, type AuthUser } from "./api";
import { queryClient } from "./query-client";

const TOKEN_KEY = "lms.accessToken";
const USER_KEY = "lms.user";

interface AuthState {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    role: "teacher" | "student";
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function persist(token: string, user: AuthUser) {
  await authStorage.setItem(TOKEN_KEY, token);
  await authStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const storedToken = await authStorage.getItem(TOKEN_KEY);
        const storedUser = await authStorage.getItem(USER_KEY);
        if (!cancelled && storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as AuthUser;
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (error) {
        console.warn("Could not restore the saved session", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      token,
      user,
      login: async (email, password) => {
        const result = await loginApi(email, password);
        await persist(result.token, result.user);
        setToken(result.token);
        setUser(result.user);
      },
      register: async (input) => {
        const result = await registerApi(input);
        await persist(result.token, result.user);
        setToken(result.token);
        setUser(result.user);
      },
      logout: async () => {
        await authStorage.removeItem(TOKEN_KEY);
        await authStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        queryClient.clear();
      },
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
