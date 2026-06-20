"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "./animated-counter";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  index?: number;
}

export function StatCard({
  label,
  value,
  prefix,
  suffix,
  decimals,
  icon: Icon,
  trend,
  index = 0,
}: StatCardProps) {
  return (
    <motion.div
      className="card p-6"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#666]" />
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trend.positive
                ? "text-[#22C55E] bg-[rgba(34,197,94,0.1)]"
                : "text-[#EF4444] bg-[rgba(239,68,68,0.1)]"
            }`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {trend.positive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>

      <div className="text-3xl font-bold text-white mb-2">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
        />
      </div>

      <p className="text-sm text-[#888] font-medium tracking-wide uppercase">{label}</p>
    </motion.div>
  );
}
