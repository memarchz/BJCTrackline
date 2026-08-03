"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, apiErrorMessage } from "./api";
import { clearToken, getToken, setToken } from "./token";
import type { UserSummary } from "./types";

interface AuthContextValue {
  user: UserSummary | null;
  loading: boolean;
  login: (identifier: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (identifier: string, password: string, remember?: boolean) => {
    try {
      const res = await api.post("/auth/login", { identifier, password, remember });
      setUser(res.data.user);
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Invalid username/email or password"));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore — we're clearing local state regardless
    }
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
