import type { UserRole } from "./types";

// ─── Permission Definitions ─────────────────────────────────

export const PERMISSIONS = {
  admin: [
    "view_dashboard",
    "manage_users",
    "view_pipeline",
    "view_leads",
    "view_contacts",
    "view_companies",
    "view_deals",
    "view_tasks",
    "view_invoices",
    "view_referrals",
    "manage_settings",
  ],
  manager: [
    "view_dashboard",
    "view_pipeline",
    "view_leads",
    "view_contacts",
    "view_companies",
    "view_deals",
    "view_tasks",
    "view_invoices",
    "view_referrals",
  ],
  sales_rep: [
    "view_dashboard",
    "view_pipeline",
    "view_leads",
    "view_contacts",
    "view_companies",
    "view_deals",
    "view_tasks",
  ],
  ambassador: [
    "view_dashboard",
    "view_referrals",
    "view_my_leads",
    "view_my_conversions",
  ],
} as const;

export type Permission = (typeof PERMISSIONS)[UserRole][number];

// ─── Route → Permission Mapping ─────────────────────────────

export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/dashboard": "view_dashboard",
  "/pipeline": "view_pipeline",
  "/leads": "view_leads",
  "/contacts": "view_contacts",
  "/companies": "view_companies",
  "/deals": "view_deals",
  "/tasks": "view_tasks",
  "/invoices": "view_invoices",
  "/referrals": "view_referrals",
  "/admin": "manage_users",
};

// ─── Helpers ────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[role] as readonly string[]).includes(permission);
}

/** Check if a role can access a given route path */
export function canAccessRoute(role: UserRole, pathname: string): boolean {
  // Find the matching route (handles nested paths like /leads/123)
  const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  if (!matchedRoute) return true; // Unknown routes are allowed (will 404 naturally)

  const requiredPermission = ROUTE_PERMISSIONS[matchedRoute];
  return hasPermission(role, requiredPermission);
}

/** Get all permissions for a role */
export function getRolePermissions(role: UserRole): readonly string[] {
  return PERMISSIONS[role];
}

/** Get the list of allowed routes for a role */
export function getAllowedRoutes(role: UserRole): string[] {
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, permission]) => hasPermission(role, permission))
    .map(([route]) => route);
}
