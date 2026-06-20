"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";
import { Shield, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ROUTE_PERMISSIONS } from "./permissions";
import type { UserRole } from "./types";
import { PERMISSIONS } from "./permissions";

interface RouteGuardProps {
  children: ReactNode;
}

// ─── Map routes to human-readable names & which roles can access ──

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pipeline": "Pipeline",
  "/leads": "Leads",
  "/contacts": "Contacts",
  "/companies": "Companies",
  "/deals": "Deals",
  "/tasks": "Tasks",
  "/invoices": "Invoices",
  "/referrals": "Referrals",
  "/admin": "Admin Panel",
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  sales_rep: "Sales Rep",
  ambassador: "Ambassador",
};

function getAllowedRolesForRoute(pathname: string): string[] {
  // Find the matching route key
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  if (!matchedRoute) return [];

  const requiredPermission = ROUTE_PERMISSIONS[matchedRoute];

  // Find all roles that have this permission
  return (Object.entries(PERMISSIONS) as [UserRole, readonly string[]][])
    .filter(([, perms]) => perms.includes(requiredPermission))
    .map(([role]) => ROLE_LABELS[role]);
}

function getRouteLabel(pathname: string): string {
  const match = Object.keys(ROUTE_LABELS).find(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  return match ? ROUTE_LABELS[match] : "This Page";
}

/**
 * Route-level authorization guard.
 * Shows a beautiful restricted-access state for unauthorized users.
 */
export function RouteGuard({ children }: RouteGuardProps) {
  const { role, isAuthenticated, isLoading, canAccess } = useAuth();
  const pathname = usePathname();

  // While loading, show spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#333] border-t-[#F5F5F5] rounded-full animate-spin" />
          <span className="text-[#666] text-xs tracking-wider uppercase">Loading</span>
        </div>
      </div>
    );
  }

  // Not authenticated — show redirecting spinner (middleware handles actual redirect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[#333] border-t-[#F5F5F5] rounded-full animate-spin" />
          <span className="text-[#666] text-xs tracking-wider uppercase">Redirecting</span>
        </div>
      </div>
    );
  }

  // ─── Unauthorized route: Show beautiful restricted-access state ───
  if (!canAccess(pathname)) {
    const pageName = getRouteLabel(pathname);
    const allowedRoles = getAllowedRolesForRoute(pathname);
    const currentRoleLabel = role ? ROLE_LABELS[role] : "your role";

    return (
      <div className="page-container">
        <motion.div
          className="flex flex-col items-center justify-center min-h-[70vh] text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <motion.div
            className="w-20 h-20 rounded-[1.5rem] bg-[#111] border border-[#222] flex items-center justify-center mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Lock className="w-8 h-8 text-[#444]" />
          </motion.div>

          {/* Title */}
          <h2
            className="text-white text-2xl sm:text-3xl font-semibold mb-3"
            style={{ fontFamily: "var(--font-heading)", letterSpacing: "-0.02em" }}
          >
            {pageName}
          </h2>

          {/* Description */}
          <p className="text-[#666] text-base max-w-md mb-8 leading-relaxed">
            This area is available to{" "}
            <span className="text-[#A3A3A3]">
              {allowedRoles.length > 0 ? allowedRoles.join(" & ") : "authorized"}
            </span>{" "}
            roles. You&apos;re currently signed in as{" "}
            <span className="text-white font-medium">{currentRoleLabel}</span>.
          </p>

          {/* Allowed roles pills */}
          {allowedRoles.length > 0 && (
            <motion.div
              className="flex flex-wrap justify-center gap-3 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {allowedRoles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] bg-[#111] border border-[#222] px-4 py-2 rounded-full"
                >
                  <Shield className="w-3 h-3" />
                  {r}
                </span>
              ))}
            </motion.div>
          )}

          {/* Back button */}
          <Link
            href="/dashboard"
            className="btn-secondary text-sm px-6 py-3 rounded-xl border border-[#222] text-[#A3A3A3] hover:text-white hover:border-[#444] transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

