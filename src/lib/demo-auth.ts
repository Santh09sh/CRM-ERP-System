import type { Profile, UserRole } from "./types";

// ─── Demo Profiles ──────────────────────────────────────────

export const DEMO_PROFILES: Record<string, Profile> = {
  "admin@saasum.in": {
    id: "demo-admin-001",
    full_name: "Vishnu Reddy",
    email: "admin@saasum.in",
    role: "admin",
    avatar_url: null,
    phone: "+91 98765 43210",
    telegram_chat_id: null,
    created_at: new Date().toISOString(),
  },
  "manager@saasum.in": {
    id: "demo-manager-001",
    full_name: "Priya Sharma",
    email: "manager@saasum.in",
    role: "manager",
    avatar_url: null,
    phone: "+91 98765 43211",
    telegram_chat_id: null,
    created_at: new Date().toISOString(),
  },
  "rep@saasum.in": {
    id: "demo-rep-001",
    full_name: "Arjun Mehta",
    email: "rep@saasum.in",
    role: "sales_rep",
    avatar_url: null,
    phone: "+91 98765 43212",
    telegram_chat_id: null,
    created_at: new Date().toISOString(),
  },
  "ambassador@saasum.in": {
    id: "demo-ambassador-001",
    full_name: "Sneha Reddy",
    email: "ambassador@saasum.in",
    role: "ambassador",
    avatar_url: null,
    phone: "+91 98765 43213",
    telegram_chat_id: null,
    created_at: new Date().toISOString(),
  },
};

export const DEMO_PASSWORD = "demo2024";

// ─── Demo Role Metadata ─────────────────────────────────────

export const DEMO_ROLE_INFO: {
  role: UserRole;
  label: string;
  email: string;
  description: string;
  features: string[];
}[] = [
  {
    role: "admin",
    label: "Admin",
    email: "admin@saasum.in",
    description: "Full system access",
    features: ["User management", "Settings control", "All modules"],
  },
  {
    role: "manager",
    label: "Manager",
    email: "manager@saasum.in",
    description: "Team oversight",
    features: ["Reports", "Deal approvals", "Invoices"],
  },
  {
    role: "sales_rep",
    label: "Sales Rep",
    email: "rep@saasum.in",
    description: "Core CRM access",
    features: ["Leads & Pipeline", "Contacts", "Deals & Tasks"],
  },
  {
    role: "ambassador",
    label: "Ambassador",
    email: "ambassador@saasum.in",
    description: "Referral partner",
    features: ["Referral dashboard", "Conversions", "Commission tracking"],
  },
];

// ─── Session Keys ───────────────────────────────────────────

const STORAGE_KEY = "saasum_demo_session";
const COOKIE_NAME = "demo_session";

// ─── Session Functions ──────────────────────────────────────

/** Check if an email is a demo account */
export function isDemoUser(email: string): boolean {
  return email.trim().toLowerCase() in DEMO_PROFILES;
}

/** Validate demo credentials */
export function validateDemoCredentials(email: string, password: string): boolean {
  return isDemoUser(email) && password === DEMO_PASSWORD;
}

/** Get a demo profile by email */
export function getDemoProfile(email: string): Profile | null {
  return DEMO_PROFILES[email.trim().toLowerCase()] ?? null;
}

/** Create a demo session (localStorage + cookie) */
export function createDemoSession(profile: Profile): void {
  if (typeof window === "undefined") return;

  const sessionData = JSON.stringify(profile);

  // localStorage for client-side hydration
  localStorage.setItem(STORAGE_KEY, sessionData);

  // Cookie for middleware (30 days)
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(sessionData)}; path=/; expires=${expires}; SameSite=Lax`;
}

/** Read demo session from localStorage */
export function getDemoSession(): Profile | null {
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Profile;
  } catch {
    return null;
  }
}

/** Clear demo session (localStorage + cookie) */
export function clearDemoSession(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(STORAGE_KEY);
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/** Parse demo session from cookie string (for middleware) */
export function parseDemoSessionCookie(cookieHeader: string): Profile | null {
  try {
    const match = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));

    if (!match) return null;

    const value = decodeURIComponent(match.substring(COOKIE_NAME.length + 1));
    return JSON.parse(value) as Profile;
  } catch {
    return null;
  }
}
