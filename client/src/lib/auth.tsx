import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiRequest } from "./queryClient";

interface AuthUser {
  id: number;
  username: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pin: string) => Promise<void>;
  register: (username: string, pin: string, displayName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// In-memory token storage (no localStorage — blocked in iframe)
let memoryToken: string | null = null;

export function getAuthToken(): string | null {
  return memoryToken;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const saveSession = useCallback((newToken: string, newUser: AuthUser) => {
    memoryToken = newToken;
    setToken(newToken);
    setUser(newUser);
  }, []);

  const login = useCallback(async (username: string, pin: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { username, pin });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Login failed");
    }
    const data = await res.json();
    saveSession(data.token, data.user);
  }, [saveSession]);

  const register = useCallback(async (username: string, pin: string, displayName: string) => {
    const res = await apiRequest("POST", "/api/auth/register", { username, pin, displayName });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Registration failed");
    }
    const data = await res.json();
    saveSession(data.token, data.user);
  }, [saveSession]);

  const logout = useCallback(() => {
    if (memoryToken) {
      apiRequest("POST", "/api/auth/logout").catch(() => {});
    }
    memoryToken = null;
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
