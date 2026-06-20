"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { VENTURES, type VentureKey } from "@/lib/constants";

// ─── Context ────────────────────────────────────────────────

interface VentureFilterContextValue {
  activeVenture: VentureKey | "all";
  setActiveVenture: (v: VentureKey | "all") => void;
}

const VentureFilterContext = createContext<VentureFilterContextValue>({
  activeVenture: "all",
  setActiveVenture: () => {},
});

export function useVentureFilter() {
  return useContext(VentureFilterContext);
}

// ─── Provider ───────────────────────────────────────────────

export function VentureFilterProvider({ children }: { children: ReactNode }) {
  const [activeVenture, setActiveVenture] = useState<VentureKey | "all">("all");

  return (
    <VentureFilterContext.Provider value={{ activeVenture, setActiveVenture }}>
      {children}
    </VentureFilterContext.Provider>
  );
}

// ─── Switcher Bar ───────────────────────────────────────────

const VENTURE_KEYS: VentureKey[] = ["skill_tank", "maceco", "tobofu", "promtal", "vriddhi", "saasum"];

export function VentureSwitcher() {
  const { activeVenture, setActiveVenture } = useVentureFilter();

  return (
    <div className="flex items-center gap-3 overflow-x-auto py-3 scrollbar-hide">
      {/* All button */}
      <button
        onClick={() => setActiveVenture("all")}
        className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-bold transition-all whitespace-nowrap ${
          activeVenture === "all"
            ? "bg-[#F5F5F5] text-[#050505] shadow-sm"
            : "bg-[#111] text-[#A3A3A3] hover:text-white hover:bg-[#1A1A1A]"
        }`}
      >
        All Ventures
      </button>

      {/* Venture buttons */}
      {VENTURE_KEYS.map((key) => {
        const v = VENTURES[key];
        const isActive = activeVenture === key;

        return (
          <button
            key={key}
            onClick={() => setActiveVenture(key)}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-bold transition-all whitespace-nowrap border ${
              isActive
                ? "text-white shadow-sm"
                : "bg-[#0A0A0A] text-[#A3A3A3] hover:text-white border-transparent hover:border-[#333]"
            }`}
            style={
              isActive
                ? {
                    backgroundColor: `${v.color}25`,
                    borderColor: `${v.color}50`,
                    color: v.color,
                  }
                : undefined
            }
          >
            <div className="bg-white/90 p-[3px] rounded flex items-center justify-center">
              <img
                src={v.logo}
                alt={v.name}
                className="w-6 h-6 object-contain"
                style={{ filter: isActive ? "brightness(1.1)" : "brightness(0.8)" }}
              />
            </div>
            {v.name}
          </button>
        );
      })}
    </div>
  );
}
