"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Profile, UserRole } from "./types";
import { getDemoSession, clearDemoSession } from "./demo-auth";
import { hasPermission, canAccessRoute, type Permission } from "./permissions";
import { createClient } from "./supabase/client";

// ─── Context Shape ──────────────────────────────────────────

interface AuthContextValue {
  user: Profile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Check if the current user has a specific permission */
  can: (permission: Permission) => boolean;
  /** Check if the current user can access a route */
  canAccess: (pathname: string) => boolean;
  /** Refresh user profile (from Supabase or demo) */
  refreshUser: () => Promise<void>;
  /** Logout — clears all sessions */
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  isAuthenticated: false,
  isLoading: true,
  can: () => false,
  canAccess: () => false,
  refreshUser: async () => {},
  logout: async () => {},
});

// ─── Provider ───────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const role = user?.role ?? null;
  const isAuthenticated = user !== null;

  const fetchUser = useCallback(async () => {
    try {
      // 1. Try Supabase first
      const supabase = createClient();
      const {
        data: { user: supaUser },
      } = await supabase.auth.getUser();

      if (supaUser) {
        // Try to fetch existing profile
        let { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supaUser.id)
          .single();

        // Auto-create profile if it doesn't exist (e.g. first Google login)
        if (!profile) {
          const { data: upserted } = await supabase
            .from("profiles")
            .upsert({
              id: supaUser.id,
              full_name: supaUser.user_metadata?.full_name || supaUser.email?.split("@")[0] || "User",
              email: supaUser.email ?? "",
              role: "admin",
              avatar_url: supaUser.user_metadata?.avatar_url || null,
            }, { onConflict: "id" })
            .select("*")
            .single();
          profile = upserted;
        }

        if (profile) {
          setUser(profile);
          return;
        }
      }

      // 2. Fallback to demo session
      const demoProfile = getDemoSession();
      if (demoProfile) {
        setUser(demoProfile);
        return;
      }

      setUser(null);
    } catch {
      // Fallback to demo session on any Supabase error
      const demoProfile = getDemoSession();
      setUser(demoProfile);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const can = useCallback(
    (permission: Permission) => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    [role]
  );

  const canAccess = useCallback(
    (pathname: string) => {
      if (!role) return false;
      return canAccessRoute(role, pathname);
    },
    [role]
  );

  const logout = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase errors during logout
    }
    clearDemoSession();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAuthenticated,
        isLoading,
        can,
        canAccess,
        refreshUser: fetchUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
