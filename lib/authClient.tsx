"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { firebaseClientConfigured } from "@/lib/firebaseConfig";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  /** True when the user owns an approved wholesaler profile (distinct role). */
  isWholesaler: boolean;
  membershipTier: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** False until the initial /api/auth/me check resolves. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Something went wrong. Please try again.");
  }
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (active) setUser(d.user ?? null);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Firebase path: sign in client-side, then exchange the ID token for a
    // server session cookie. Falls back to the legacy password endpoint when
    // Firebase isn't configured.
    if (firebaseClientConfigured) {
      const { firebaseSignIn, mapFirebaseAuthError } = await import(
        "@/lib/firebaseClient"
      );
      let idToken: string;
      try {
        idToken = await firebaseSignIn(email, password);
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      }
      const { user } = await postJson("/api/auth/session", { idToken });
      setUser(user);
      return;
    }
    const { user } = await postJson("/api/auth/login", { email, password });
    setUser(user);
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      if (firebaseClientConfigured) {
        // Keep the app's 8-char policy even though Firebase's own minimum is 6.
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        const { firebaseSignUp, mapFirebaseAuthError } = await import(
          "@/lib/firebaseClient"
        );
        let idToken: string;
        try {
          idToken = await firebaseSignUp(name, email, password);
        } catch (err) {
          throw new Error(mapFirebaseAuthError(err));
        }
        const { user } = await postJson("/api/auth/session", { idToken });
        setUser(user);
        return;
      }
      const { user } = await postJson("/api/auth/signup", {
        name,
        email,
        password,
      });
      setUser(user);
    },
    []
  );

  const logout = useCallback(async () => {
    if (firebaseClientConfigured) {
      try {
        const { firebaseSignOut } = await import("@/lib/firebaseClient");
        await firebaseSignOut();
      } catch {
        // Ignore client sign-out errors — we still clear the server cookie below.
      }
    }
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
