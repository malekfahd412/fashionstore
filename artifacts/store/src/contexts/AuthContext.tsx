import React, { createContext, useContext, useState, useEffect } from "react";
import { readGuestCartItems, clearGuestCart } from "@/hooks/useGuestCart";
import {
  setAuthTokenGetter,
  setTokenRefresher,
  setOnAuthFailure,
} from "@workspace/api-client-react";

export type UserRole = "admin" | "vendor" | "customer";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (user: User, token: string, refreshToken: string) => void;
  logout: () => void;
}

const STORAGE_KEYS = {
  user: "auth_user",
  token: "auth_token",
  refreshToken: "auth_refresh_token",
} as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem(STORAGE_KEYS.user);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.token);
  });

  useEffect(() => {
    // Supply the access token for every outgoing API request.
    setAuthTokenGetter(() => localStorage.getItem(STORAGE_KEYS.token));

    // Attempt to silently refresh the access token when a 401 is received.
    // The refresher is called at most once per concurrent burst (coalesced
    // by custom-fetch). On success it persists new tokens and returns them;
    // on failure it returns null, triggering onAuthFailure below.
    setTokenRefresher(async () => {
      const rt = localStorage.getItem(STORAGE_KEYS.refreshToken);
      if (!rt) return null;

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: rt }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (typeof data.token !== "string" || typeof data.refreshToken !== "string") {
          return null;
        }

        localStorage.setItem(STORAGE_KEYS.token, data.token);
        localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
        return { token: data.token, refreshToken: data.refreshToken };
      } catch {
        return null;
      }
    });

    // When refresh fails, wipe all auth state and redirect to login.
    setOnAuthFailure(() => {
      localStorage.removeItem(STORAGE_KEYS.user);
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      setUser(null);
      setToken(null);
      window.location.href = "/login";
    });

    return () => {
      setTokenRefresher(null);
      setOnAuthFailure(null);
    };
  }, []);

  const login = (newUser: User, newToken: string, newRefreshToken: string) => {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(newUser));
    localStorage.setItem(STORAGE_KEYS.token, newToken);
    localStorage.setItem(STORAGE_KEYS.refreshToken, newRefreshToken);

    // Merge any guest cart items into the server cart (fire-and-forget)
    const guestItems = readGuestCartItems();
    if (guestItems.length > 0) {
      clearGuestCart();
      for (const item of guestItems) {
        fetch("/api/cart/items", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${newToken}` },
          body: JSON.stringify({ variantId: item.variantId, quantity: item.quantity }),
        }).catch(() => {});
      }
    }
  };

  const logout = () => {
    // Revoke the refresh token on the server (fire-and-forget — don't block UI).
    const rt = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (rt) {
      const at = localStorage.getItem(STORAGE_KEYS.token);
      fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(at ? { Authorization: `Bearer ${at}` } : {}),
        },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {
        // Server-side revocation failure is non-fatal; tokens are cleared locally.
      });
    }

    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
