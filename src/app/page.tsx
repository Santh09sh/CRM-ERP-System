"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HOMEPAGE_QUESTIONS, VENTURES, type VentureKey } from "@/lib/constants";
import { ArrowRight, ArrowLeft, ExternalLink, X, User, Phone, Mail, Building2, Check } from "lucide-react";
import Link from "next/link";
import { Flywheel } from "@/components/shared/flywheel";

type Step1Value = "student" | "company" | "college" | "individual";

type ReferralInfo = {
  code: string;
  ambassador_name: string;
  tier_label: string;
  tier_emoji: string;
};

/* â”€â”€â”€ Background Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function BackgroundAnimation() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Red glow orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: "10%",
          left: "5%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(229,77,76,0.2) 0%, rgba(229,77,76,0.05) 50%, transparent 75%)",
          filter: "blur(60px)",
        }}
        animate={{
          x: [0, 100, -60, 0],
          y: [0, -80, 60, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Green glow orb */}
      <motion.div
        className="absolute rounded-full"
        style={{
          bottom: "5%",
          right: "5%",
          width: "55vw",
          height: "55vw",
          background: "radial-gradient(circle, rgba(0,166,81,0.18) 0%, rgba(0,166,81,0.04) 50%, transparent 75%)",
          filter: "blur(70px)",
        }}
        animate={{
          x: [0, -80, 60, 0],
          y: [0, 80, -50, 0],
          scale: [1, 1.08, 0.92, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating Centle logo watermark - SVG drawn in exact logo colors */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{ zIndex: 1 }}
        animate={{
          opacity: [0.05, 0.08, 0.05],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.svg
          viewBox="0 0 600 250"
          style={{ width: "70vw", maxWidth: 900 }}
          animate={{
            scale: [1.0, 1.03, 1.0],
            rotate: [0, 0.3, -0.3, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* "Cen" in Red */}
          <text
            x="0" y="200"
            fontFamily="Georgia, serif"
            fontWeight="900"
            fontSize="220"
            fill="#E54D4C"
          >
            Cen
          </text>
          {/* "tle" in Green */}
          <text
            x="340" y="200"
            fontFamily="Georgia, serif"
            fontWeight="900"
            fontSize="220"
            fill="#00A651"
          >
            tle
          </text>
          {/* Small arrow in green at top right */}
          <polygon points="530,10 580,60 555,60 555,110 505,110 505,60 480,60" fill="#00A651" opacity="0.8" />
        </motion.svg>
      </motion.div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.01) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

export default function HomePage() {
  const [screen, setScreen] = useState<"hero" | "step1" | "step2" | "result" | "capture">("hero");
  const [step1Answer, setStep1Answer] = useState<Step1Value | null>(null);
  const [selectedVenture, setSelectedVenture] = useState<VentureKey | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [showReferralBanner, setShowReferralBanner] = useState(true);

  // Detect ?ref= param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref");
    if (!code) return;
    sessionStorage.setItem("referral_code", code);
    fetch(`/api/referral/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.found) {
          setReferral({ code, ...data });
        }
      })
      .catch(() => {});
  }, []);

  const handleStep1 = (value: Step1Value) => {
    setStep1Answer(value);
    setScreen("step2");
  };

  const handleStep2 = (venture: VentureKey) => {
    setSelectedVenture(venture);
    setConfidence(Math.floor(Math.random() * 15) + 85);
    // If referred, show capture form before result
    if (referral) {
      setScreen("capture");
    } else {
      setScreen("result");
    }
  };

  const reset = () => {
    setScreen("hero");
    setStep1Answer(null);
    setSelectedVenture(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] overflow-hidden relative">
      <BackgroundAnimation />

      {/* Referral Banner */}
      <AnimatePresence>
        {referral && showReferralBanner && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 200, delay: 1 }}
          >
            <div className="flex items-center gap-3 bg-zinc-950/95 border border-zinc-800 backdrop-blur-xl rounded-2xl px-5 py-3.5 shadow-2xl max-w-md w-full">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xl">{referral.tier_emoji}</span>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">
                    You were referred by {referral.ambassador_name}
                  </p>
                  <p className="text-zinc-500 text-[10px]">
                    {referral.tier_label} Ambassador Â· Centle Group
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReferralBanner(false)}
                className="text-zinc-600 hover:text-zinc-400 transition-colors p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "hero" && (
          <HeroScreen key="hero" onBegin={() => setScreen("step1")} />
        )}
        {screen === "step1" && (
          <Step1Screen key="step1" onSelect={handleStep1} onBack={() => setScreen("hero")} />
        )}
        {screen === "step2" && step1Answer && (
          <Step2Screen
            key="step2"
            category={step1Answer}
            onSelect={handleStep2}
            onBack={() => setScreen("step1")}
          />
        )}
        {screen === "capture" && selectedVenture && referral && (
          <CaptureScreen
            key="capture"
            venture={selectedVenture}
            referral={referral}
            onDone={() => setScreen("result")}
            onSkip={() => setScreen("result")}
          />
        )}
        {screen === "result" && selectedVenture && (
          <ResultScreen
            key="result"
            venture={selectedVenture}
            confidence={confidence}
            onReset={reset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* â”€â”€â”€ Hero Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/* -- Capture Screen (for referred users) -- */

function CaptureScreen({
  venture,
  referral,
  onDone,
  onSkip,
}: {
  venture: VentureKey;
  referral: ReferralInfo;
  onDone: () => void;
  onSkip: () => void;
}) {
  const v = VENTURES[venture];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/webhooks/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "referral",
          referral_code: referral.code,
          venture,
          contact: { name, email, phone, company },
          message: `Referred by ${referral.ambassador_name} (${referral.tier_label}) interested in ${v.name}`,
        }),
      });
      setSubmitted(true);
      setTimeout(onDone, 1800);
    } catch {
      setSubmitting(false);
      onDone();
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-zinc-950/60 border border-zinc-800 backdrop-blur-md">
            <span className="text-lg">{referral.tier_emoji}</span>
            <span className="text-zinc-400 text-xs">Referred by <span className="text-white font-semibold">{referral.ambassador_name}</span></span>
          </div>
          <h2
            className="text-white font-bold leading-tight mb-2"
            style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.6rem, 4vw, 2.2rem)", letterSpacing: "-0.02em" }}
          >
            Connect with {v.name}
          </h2>
          <p className="text-zinc-500 text-sm">Quick intro so the team can reach you.</p>
        </div>
        {submitted ? (
          <motion.div className="flex flex-col items-center gap-4 py-12" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-semibold">You are in the pipeline!</p>
            <p className="text-zinc-500 text-sm text-center">The {v.name} team will reach out shortly.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { icon: User, placeholder: "Your full name", value: name, onChange: setName, required: true, type: "text" },
              { icon: Mail, placeholder: "Email address", value: email, onChange: setEmail, required: true, type: "email" },
              { icon: Phone, placeholder: "Phone number (optional)", value: phone, onChange: setPhone, required: false, type: "tel" },
              { icon: Building2, placeholder: "Company or College (optional)", value: company, onChange: setCompany, required: false, type: "text" },
            ].map(({ icon: Icon, ...field }) => (
              <div key={field.placeholder} className="relative">
                <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors backdrop-blur-md"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <div className="w-4 h-4 rounded-full border-2 border-zinc-400 border-t-zinc-800 animate-spin" />
              ) : (
                <>Connect me with {v.name} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
            <button type="button" onClick={onSkip} className="text-zinc-600 hover:text-zinc-400 text-xs text-center transition-colors">
              Skip and continue
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
function HeroScreen({ onBegin }: { onBegin: () => void }) {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#F5F5F5 1px, transparent 1px), linear-gradient(90deg, #F5F5F5 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        className="relative z-10 text-center max-w-3xl flex flex-col items-center"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <motion.div
          className="inline-flex items-center gap-2 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#E54D4C]" />
          <span className="text-zinc-500 text-xs font-semibold tracking-[0.2em] uppercase">Centle Group</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
        </motion.div>

        <h1
          className="text-white font-bold leading-[0.95] tracking-[-0.03em] mb-6"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(3rem, 8vw, 6.5rem)",
          }}
        >
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Six companies.
          </motion.span>
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            One ecosystem.
          </motion.span>
          <motion.span
            className="block text-[#A3A3A3]"
            initial={{ opacity: 0, y: 45 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            Find yours.
          </motion.span>
        </h1>

        <motion.p
          className="text-zinc-400 text-lg max-w-md mx-auto mb-10 leading-relaxed font-light"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 1 }}
        >
          Answer two quick questions. We&apos;ll route you to the right venture in the Centle ecosystem.
        </motion.p>

        <motion.button
          onClick={onBegin}
          className="btn-primary text-base px-8 py-3.5 group rounded-xl bg-white text-black hover:bg-zinc-200 transition-all font-semibold flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Begin
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </motion.button>
      </motion.div>

      {/* Venture logos footer */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4 text-zinc-600 text-[10px] tracking-[0.2em] uppercase font-semibold select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        {Object.values(VENTURES).map((v, idx, arr) => (
          <span key={v.name} className="flex items-center gap-4">
            <span className="hover:text-zinc-400 transition-colors cursor-default">
              {v.name}
            </span>
            {idx < arr.length - 1 && (
              <span className="text-zinc-800">â€¢</span>
            )}
          </span>
        ))}
      </motion.div>

      {/* CRM Login link */}
      <motion.div
        className="absolute top-6 right-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
      >
        <Link href="/login" className="btn-secondary text-xs tracking-wider uppercase rounded-lg px-4 py-2 border border-zinc-900 bg-zinc-950/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all">
          CRM Login
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </motion.div>
    </motion.div>
  );
}

/* â”€â”€â”€ Step 1 Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Step1Screen({
  onSelect,
  onBack,
}: {
  onSelect: (value: Step1Value) => void;
  onBack: () => void;
}) {
  const { question, options } = HOMEPAGE_QUESTIONS.step1;

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex flex-col gap-4 items-start">
          <motion.button
            onClick={onBack}
            className="btn-ghost text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </motion.button>

          {/* Custom Progress Bar */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Step 1 of 2</span>
            <div className="h-[2px] w-24 bg-zinc-900 rounded-full overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full w-1/2 bg-gradient-to-r from-[#E54D4C] to-[#00A651] rounded-full" />
            </div>
          </motion.div>
        </div>

        <motion.h2
          className="text-white"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            letterSpacing: "-0.02em",
            fontWeight: 700,
            lineHeight: 1.15,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {question}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((option, i) => (
            <motion.button
              key={option.value}
              onClick={() => onSelect(option.value as Step1Value)}
              className="p-6 text-left rounded-2xl bg-zinc-950/45 border border-zinc-900/80 backdrop-blur-md group cursor-pointer transition-all hover:bg-zinc-900/40 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ borderColor: "rgba(255,255,255,0.15)", y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-0 left-0 w-[3px] h-full bg-[#E54D4C] opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-white text-lg font-semibold mb-2 group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                {option.label}
              </p>
              <p className="text-zinc-500 group-hover:text-zinc-400 transition-colors text-sm font-light leading-relaxed">{option.description}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* â”€â”€â”€ Step 2 Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function Step2Screen({
  category,
  onSelect,
  onBack,
}: {
  category: Step1Value;
  onSelect: (venture: VentureKey) => void;
  onBack: () => void;
}) {
  const step2Data = HOMEPAGE_QUESTIONS.step2[category];

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex flex-col gap-4 items-start">
          <motion.button
            onClick={onBack}
            className="btn-ghost text-xs text-zinc-500 hover:text-white transition-colors flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </motion.button>

          {/* Custom Progress Bar */}
          <motion.div
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-zinc-500 font-mono text-xs tracking-widest uppercase">Step 2 of 2</span>
            <div className="h-[2px] w-24 bg-zinc-900 rounded-full overflow-hidden relative">
              <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-r from-[#E54D4C] to-[#00A651] rounded-full" />
            </div>
          </motion.div>
        </div>

        <motion.h2
          className="text-white"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            letterSpacing: "-0.02em",
            fontWeight: 700,
            lineHeight: 1.15,
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {step2Data.question}
        </motion.h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {step2Data.options.map((option, i) => (
            <motion.button
              key={option.value}
              onClick={() => onSelect(option.venture as VentureKey)}
              className="p-6 text-left rounded-2xl bg-zinc-950/45 border border-zinc-900/80 backdrop-blur-md group cursor-pointer transition-all hover:bg-zinc-900/40 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              whileHover={{ borderColor: "rgba(255,255,255,0.15)", y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute top-0 left-0 w-[3px] h-full bg-[#00A651] opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-white text-lg font-semibold mb-2 group-hover:text-white transition-colors" style={{ fontFamily: "var(--font-heading)" }}>
                {option.label}
              </p>
              <p className="text-zinc-500 group-hover:text-zinc-400 transition-colors text-xs uppercase tracking-wider font-semibold">
                {VENTURES[option.venture as VentureKey]?.name}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* â”€â”€â”€ Floating Logo Constellation Background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function LogoConstellation({ logoSrc, brandColor }: { logoSrc: string; brandColor: string }) {
  // Generate a grid of logo instances with deterministic but varied positions
  const logos = Array.from({ length: 28 }, (_, i) => {
    const col = i % 7;
    const row = Math.floor(i / 7);
    // Stagger every other row for a diamond pattern
    const offsetX = row % 2 === 0 ? 0 : 7;
    return {
      id: i,
      left: `${col * 14.28 + offsetX}%`,
      top: `${row * 25 - 5}%`,
      rotate: (i * 17 + 5) % 40 - 20, // -20 to +20 degrees
      scale: 0.7 + (i % 3) * 0.15,    // 0.7 to 1.0
      delay: i * 0.04,
      duration: 18 + (i % 5) * 4,      // 18-34s drift cycle
    };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {logos.map((logo) => (
        <motion.img
          key={logo.id}
          src={logoSrc}
          alt=""
          className="absolute pointer-events-none select-none"
          style={{
            left: logo.left,
            top: logo.top,
            width: "48px",
            height: "48px",
            objectFit: "contain",
            transform: `rotate(${logo.rotate}deg) scale(${logo.scale})`,
            filter: "brightness(0) invert(1)",
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.15, 0.25, 0.15, 0],
            y: [0, -30, -60],
            x: [0, 8, -5],
          }}
          transition={{
            duration: logo.duration,
            delay: logo.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Soft vignette overlay to fade logos at edges */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 30%, #050505 85%)`,
        }}
      />
    </div>
  );
}

/* â”€â”€â”€ Result Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function ResultScreen({
  venture,
  confidence,
  onReset,
}: {
  venture: VentureKey;
  confidence: number;
  onReset: () => void;
}) {
  const v = VENTURES[venture];

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Layer 1: Floating Logo Constellation */}
      {v.logo && (
        <LogoConstellation logoSrc={v.logo} brandColor={v.color} />
      )}

      {/* Layer 2: Atmospheric Brand Glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          top: "40%",
          left: "50%",
          width: "60vw",
          height: "60vw",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, ${v.color}18 0%, ${v.color}08 35%, transparent 65%)`,
          filter: "blur(80px)",
          zIndex: 0,
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Main Content */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-8 text-center relative z-10">
        {/* Logo Hero with Glow Ring */}
        <motion.div
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {v.logo && (
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Glow ring behind logo */}
              <div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{
                  background: `radial-gradient(circle, ${v.color}30 0%, transparent 70%)`,
                  transform: "scale(2.5)",
                }}
              />
              {/* Logo container with bright white plaque effect */}
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-[2rem] bg-white/95 border border-white shadow-xl flex items-center justify-center p-5">
                <img
                  src={v.logo}
                  alt={v.name}
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          )}

          <motion.p
            className="text-zinc-500 text-xs font-semibold tracking-[0.2em] uppercase mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            We recommend
          </motion.p>

          <h1
            className="text-white text-5xl sm:text-6xl font-bold tracking-[-0.03em] leading-tight"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {v.name}
          </h1>
          <p className="text-zinc-400 text-lg max-w-lg mx-auto leading-relaxed mt-1">
            {v.tagline}
          </p>
        </motion.div>


        {/* Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <a
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-base px-8 py-3.5 group rounded-xl bg-white text-black hover:bg-zinc-200 transition-all font-semibold flex items-center justify-center gap-2 w-full sm:w-auto shadow-lg shadow-white/5"
          >
            Visit {v.name}
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
          <button
            onClick={onReset}
            className="btn-secondary text-sm px-6 py-3.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Try again
          </button>
        </motion.div>

        {/* Cross-venture flywheel */}
        <motion.div
          className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/60 backdrop-blur-xl max-w-lg w-full text-center flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
            <p className="text-zinc-500 text-xs font-semibold tracking-[0.15em] uppercase">
              Cross-Venture Flywheel
            </p>
          </div>
          
          <Flywheel demo={true} size={300} />
          
          <p className="text-zinc-500 text-xs leading-relaxed font-light mt-6">
            Our interconnected ecosystem drives compounding growth. Data flows seamlessly across ventures, generating qualified leads for every business unit.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

