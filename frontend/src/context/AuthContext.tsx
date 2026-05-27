import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { login as loginRequest, logout as logoutRequest, register as registerRequest } from "@/services/authService";
import { getSession } from "@/services/crmService";
import { clearTokens, getAccessToken } from "@/services/tokenStorage";
import type { Tenant, User } from "@/types";

type AuthContextValue = {
  user: User | null;
  tenant: Tenant | null;
  members: User[];
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    tenantName: string;
    name: string;
    email: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const session = await getSession();
    setUser(session.user);
    setTenant(session.tenant);
    setMembers(session.members);
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }

    loadSession()
      .catch(() => {
        clearTokens();
        setUser(null);
        setTenant(null);
        setMembers([]);
      })
      .finally(() => setIsLoading(false));
  }, [loadSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenant,
      members,
      isAuthenticated: Boolean(user),
      isLoading,
      refreshSession: loadSession,
      login: async (payload) => {
        const nextUser = await loginRequest(payload);
        setUser(nextUser);
        await loadSession().catch(() => undefined);
      },
      register: async (payload) => {
        const nextUser = await registerRequest(payload);
        setUser(nextUser);
        await loadSession().catch(() => undefined);
      },
      logout: async () => {
        await logoutRequest();
        setUser(null);
        setTenant(null);
        setMembers([]);
      },
    }),
    [isLoading, loadSession, members, tenant, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
