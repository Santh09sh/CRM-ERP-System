"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  FileText,
  Share2,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Eye,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import { RouteGuard } from "@/lib/route-guard";
import { VentureFilterProvider, VentureSwitcher } from "@/components/shared/venture-switcher";
import type { Permission } from "@/lib/permissions";

// ─── Navigation Items (permission-gated) ────────────────────

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: React.ElementType;
  permission: Permission;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch, permission: "view_pipeline" },
  { href: "/leads", label: "Leads", icon: Users, permission: "view_leads" },
  { href: "/contacts", label: "Contacts", icon: Users, permission: "view_contacts" },
  { href: "/companies", label: "Companies", icon: Building2, permission: "view_companies" },
  { href: "/deals", label: "Deals", icon: Handshake, permission: "view_deals" },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, permission: "view_tasks" },
  { href: "/invoices", label: "Invoices", icon: FileText, permission: "view_invoices" },
  { href: "/referrals", label: "Referrals", icon: Share2, permission: "view_referrals" },
  { href: "/admin", label: "Admin", icon: Shield, permission: "manage_users" },
];

// ─── Layout Shell (inner, consumes useAuth) ─────────────────

function AppLayoutShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, can, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    router.push("/login");
    router.refresh();
  };

  // Filter nav items by the user's permissions
  const filteredNav = NAV_ITEMS.filter((item) => can(item.permission));

  return (
    <div className="min-h-screen bg-[#050505] flex">
      {/* Metallic Gradient Definition for Icons */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e5e5e5" />
            <stop offset="20%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#a3a3a3" />
            <stop offset="60%" stopColor="#f5f5f5" />
            <stop offset="100%" stopColor="#666666" />
          </linearGradient>
        </defs>
      </svg>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 left-0 h-full bg-[#0A0A0A] border-r border-[#1A1A1A] z-40 transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-[#1A1A1A]">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative w-7 h-7">
                {/* Glow behind logo */}
                <motion.div
                  className="absolute inset-0 bg-[#E54D4C] rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-500"
                />
                {/* Animated Logo */}
                <motion.img
                  src="/logos/saasum.png"
                  alt="Saasum Logo"
                  className="w-full h-full object-contain relative z-10"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.1, rotate: 180, transition: { duration: 0.6, ease: "circOut" } }}
                />
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-bold tracking-widest uppercase">
                  Saasum
                </span>
                <span className="text-[#E54D4C] text-[9px] font-bold tracking-[0.2em] -mt-0.5">
                  CRM
                </span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`btn-ghost p-1.5 ${collapsed ? "mx-auto" : "ml-auto"}`}
          >
            <ChevronLeft
              className={`w-4 h-4 text-[#666] transition-transform ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Role indicator */}
        {!collapsed && user && (
          <div className="px-4 py-2 border-b border-[#1A1A1A]">
            <span className="text-[10px] text-[#444] tracking-[0.15em] uppercase">
              {user.role?.replace("_", " ")}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto flex flex-col gap-1.5" style={{ padding: "24px 16px" }}>
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl text-sm transition-all ${
                  isActive
                    ? "bg-[#141414] text-white shadow-sm border border-[#222]"
                    : "text-[#666] hover:text-[#A3A3A3] hover:bg-[#111]"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
                style={{ display: "flex", padding: collapsed ? "12px 0" : "12px 16px" }}
              >
                <item.icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-[#E54D4C]" : "text-[#666] group-hover:text-[#A3A3A3]"}`} />
                {!collapsed && <span className="font-medium tracking-wide" style={{ fontSize: "0.85rem" }}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="border-t border-[#1A1A1A] p-3">
          {user && !collapsed && (
            <div className="flex items-center gap-3 px-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-xs text-[#A3A3A3] font-medium">
                {getInitials(user.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{user.full_name}</p>
                <p className="text-[10px] text-[#666] capitalize">{user.role?.replace("_", " ")}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`btn-ghost text-xs text-[#666] w-full ${
              collapsed ? "justify-center" : "justify-start"
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0A0A] border-b border-[#1A1A1A] z-40 flex items-center justify-between px-4">
        <Link href="/dashboard">
          <span
            className="text-white text-sm font-bold tracking-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            SAASUM
          </span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-ghost p-1.5">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="md:hidden fixed top-14 left-0 bottom-0 w-64 bg-[#0A0A0A] border-r border-[#1A1A1A] z-50"
              initial={{ x: -264 }}
              animate={{ x: 0 }}
              exit={{ x: -264 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Mobile role indicator */}
              {user && (
                <div className="px-4 py-2 border-b border-[#1A1A1A]">
                  <span className="text-[10px] text-[#444] tracking-[0.15em] uppercase">
                    {user.role?.replace("_", " ")}
                  </span>
                </div>
              )}

              <nav className="py-3 px-2 space-y-0.5">
                {filteredNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "bg-[#1A1A1A] text-white"
                          : "text-[#666] hover:text-[#A3A3A3] hover:bg-[#111]"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="absolute bottom-4 left-0 right-0 px-4">
                {user && (
                  <div className="flex items-center gap-3 px-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-[10px] text-[#A3A3A3] font-medium">
                      {getInitials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{user.full_name}</p>
                      <p className="text-[10px] text-[#666] capitalize">{user.role?.replace("_", " ")}</p>
                    </div>
                  </div>
                )}
                <button onClick={handleLogout} className="btn-ghost text-xs text-[#666] w-full justify-start">
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        className={`main-content min-w-0 flex-1 transition-all duration-300 mt-14 md:mt-0 ${
          collapsed ? "collapsed" : ""
        }`}
      >
        <RouteGuard>
          {/* Venture Switcher Bar */}
          {pathname !== "/dashboard" && user?.role !== "ambassador" && (
            <div className="px-6 md:px-8 pt-6 pb-2">
              <VentureSwitcher />
            </div>
          )}
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </RouteGuard>
      </main>
    </div>
  );
}

// ─── Exported Layout (wraps everything in AuthProvider) ─────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <VentureFilterProvider>
        <AppLayoutShell>{children}</AppLayoutShell>
      </VentureFilterProvider>
    </AuthProvider>
  );
}
