"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Shield, Briefcase, Users, Share2, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DEMO_ROLE_INFO,
  isDemoUser,
  getDemoProfile,
  createDemoSession,
  clearDemoSession,
  DEMO_PASSWORD,
} from "@/lib/demo-auth";
import { toast } from "sonner";
import type { UserRole } from "@/lib/types";

// ─── Role → Icon Map ────────────────────────────────────────

const ROLE_ICONS: Record<UserRole, React.ElementType> = {
  admin: Shield,
  manager: Briefcase,
  sales_rep: Users,
  ambassador: Share2,
};

const ROLE_ACCENTS: Record<UserRole, string> = {
  admin: "#F5F5F5",
  manager: "#A3A3A3",
  sales_rep: "#D4D4D4",
  ambassador: "#888",
};

// ─── Page Component ─────────────────────────────────────────

export default function LoginPage() {
  const [step, setStep] = useState<"roles" | "manual">("roles");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // ── Demo Role Selection ────────────────────────────────────

  const handleRoleSelection = (role: UserRole) => {
    const roleInfo = DEMO_ROLE_INFO.find((r) => r.role === role);
    if (!roleInfo) return;

    // Clear any existing demo session so stale cookies don't persist
    clearDemoSession();

    setEmail(roleInfo.email);
    setPassword(DEMO_PASSWORD);
    setStep("manual");
  };

  // ── Manual (Supabase or Demo) Login ────────────────────────

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Check if it's a demo account
      if (isDemoUser(trimmedEmail)) {
        if (password !== DEMO_PASSWORD) {
          toast.error("Invalid demo password");
          return;
        }
        const profile = getDemoProfile(trimmedEmail);
        if (profile) {
          createDemoSession(profile);
          toast.success(`Welcome, ${profile.full_name}`);
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }

      // Otherwise, try Supabase
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Welcome back");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-6">
      {/* Subtle grid */}
      <div
        className="fixed inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#F5F5F5 1px, transparent 1px), linear-gradient(90deg, #F5F5F5 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <AnimatePresence mode="wait">
        {step === "roles" ? (
          /* ═══════════════════════════════════════════════════
             STEP 1 — Role Selection
             ═══════════════════════════════════════════════════ */
          <motion.div
            key="roles"
            className="relative z-10 w-full max-w-4xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Brand */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/" className="inline-block mb-10">
                <span className="text-[#333] text-xs tracking-[0.2em] uppercase hover:text-[#666] transition-colors">
                  ← Centle Group
                </span>
              </Link>
              <div className="mb-6 flex items-center">
                <img
                  src="/logos/saasum.png"
                  alt="Saasum Logo"
                  className="h-16 md:h-20 w-auto object-contain"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[#A3A3A3] text-xl" style={{ fontFamily: "var(--font-heading)" }}>
                  Unified CRM.
                </p>
                <p className="text-[#666] text-base">
                  Select your role to enter the demo.
                </p>
              </div>
            </motion.div>

            {/* Role Cards Grid */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              {DEMO_ROLE_INFO.map((info, i) => {
                const Icon = ROLE_ICONS[info.role];

                return (
                  <motion.button
                    key={info.role}
                    onClick={() => handleRoleSelection(info.role)}
                    className="group relative text-left p-6 sm:p-8 md:p-10 rounded-[2rem] border border-[#1A1A1A] bg-[#0A0A0A]/60 backdrop-blur-sm transition-all duration-300 hover:border-[#333] hover:bg-[#111]/60"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Icon + Label */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 mb-6 sm:mb-8">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors bg-[#1A1A1A] group-hover:bg-[#222] shrink-0"
                      >
                        <Icon className="w-7 h-7 text-[#666] group-hover:text-[#A3A3A3] transition-colors" />
                      </div>
                      <div>
                        <p
                          className="text-xl text-white font-medium"
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {info.label}
                        </p>
                        <p className="text-base text-[#555] mt-1">{info.description}</p>
                      </div>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-3 mb-6 sm:mb-8">
                      {info.features.map((feat) => (
                        <span
                          key={feat}
                          className="text-xs text-[#888] bg-[#111] border border-[#222] px-4 py-2 rounded-full"
                        >
                          {feat}
                        </span>
                      ))}
                    </div>

                    {/* Credential hint */}
                    <div className="pt-5 border-t border-[#1A1A1A]/60 mt-auto">
                      <p className="text-sm text-[#444]" style={{ fontFamily: "var(--font-mono)" }}>
                        {info.email}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>

            {/* Manual login link */}
            <motion.div
              className="mt-8 flex items-center justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <button
                onClick={() => setStep("manual")}
                className="text-[#555] text-xs hover:text-[#A3A3A3] transition-colors flex items-center gap-1.5"
              >
                Use custom credentials
                <ArrowRight className="w-3 h-3" />
              </button>

              <span className="text-[10px] text-[#333]" style={{ fontFamily: "var(--font-mono)" }}>
                Password: demo2024
              </span>
            </motion.div>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════════════
             STEP 2 — Manual Login Form
             ═══════════════════════════════════════════════════ */
          <motion.div
            key="manual"
            className="relative z-10 w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Brand */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => setStep("roles")}
                className="inline-flex items-center gap-1.5 mb-8 text-[#333] text-xs tracking-[0.2em] uppercase hover:text-[#666] transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to roles
              </button>
              <div className="mb-5 flex items-center">
                <img
                  src="/logos/saasum.png"
                  alt="Saasum Logo"
                  className="h-12 md:h-16 w-auto object-contain"
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[#A3A3A3] text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                  Unified CRM.
                </p>
                <p className="text-[#666666] text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                  Built for modern
                </p>
                <p className="text-[#666666] text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                  revenue teams.
                </p>
              </div>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleManualLogin}
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div>
                <label className="text-[#666666] text-xs tracking-wider uppercase block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-base"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-[#666666] text-xs tracking-wider uppercase block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>

            <motion.div
              className="mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1A1A1A]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#050505] px-2 text-[#666]">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: `${location.origin}/auth/callback`,
                    },
                  });
                }}
                className="mt-6 btn-secondary w-full justify-center py-3 flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </button>
            </motion.div>

            <motion.p
              className="text-[#666666] text-sm text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-[#A3A3A3] hover:text-white transition-colors">
                Sign up
              </Link>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
