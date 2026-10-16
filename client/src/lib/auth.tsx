import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { PublicUser } from "@shared/schema";
import { apiRequest, queryClient } from "./queryClient";

interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
}

interface AuthContextType {
  user: PublicUser | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session from the cookie on page load, so a refresh keeps you signed in.
  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (login: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { login, password });
    queryClient.clear();
    setUser(await res.json());
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const res = await apiRequest("POST", "/api/auth/register", input);
    queryClient.clear();
    setUser(await res.json());
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout").catch(() => {});
    queryClient.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
