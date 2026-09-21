import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import {
  deleteAccount as deleteAccountRequest,
  getAuthSession,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../services/auth/userAuthService";
import type { AuthUser } from "../services/auth/userAuthService";
import { setAuthCsrfToken } from "../services/auth/csrfToken";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user?: AuthUser;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  deleteAccount(password: string): Promise<void>;
  refreshSession(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser>();

  const clearAuth = useCallback(() => {
    setAuthCsrfToken(undefined);
    setUser(undefined);
    setStatus("unauthenticated");
  }, []);

  const applyAuth = useCallback((nextUser: AuthUser, csrfToken: string) => {
    setAuthCsrfToken(csrfToken);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await getAuthSession();
      if (session.authenticated) applyAuth(session.user, session.csrfToken);
      else clearAuth();
    } catch {
      clearAuth();
    }
  }, [applyAuth, clearAuth]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    window.addEventListener("app:auth-expired", clearAuth);
    return () => window.removeEventListener("app:auth-expired", clearAuth);
  }, [clearAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await loginRequest(email, password);
      applyAuth(response.user, response.csrfToken);
    },
    [applyAuth],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const response = await registerRequest(email, password);
      applyAuth(response.user, response.csrfToken);
    },
    [applyAuth],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    clearAuth();
  }, [clearAuth]);

  const deleteAccount = useCallback(
    async (password: string) => {
      await deleteAccountRequest(password);
      clearAuth();
    },
    [clearAuth],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout, deleteAccount, refreshSession }),
    [deleteAccount, login, logout, refreshSession, register, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
