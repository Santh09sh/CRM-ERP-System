"use client";

import { VENTURES, type VentureKey } from "@/lib/constants";

interface VentureBadgeProps {
  venture: VentureKey;
  /** Show only icon (no text) */
  iconOnly?: boolean;
  /** Size variant */
  size?: "sm" | "md";
}

/**
 * Displays a venture badge with mini logo + colored name.
 * Used across all CRM pages for venture classification.
 */
export function VentureBadge({ venture, iconOnly = false, size = "sm" }: VentureBadgeProps) {
  const v = VENTURES[venture];
  if (!v) return null;

  const logoContainerSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const logoSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border ${
        size === "sm" ? "px-2.5 py-1" : "px-4 py-1.5"
      }`}
      style={{
        backgroundColor: `${v.color}15`,
        borderColor: `${v.color}30`,
      }}
    >
      <div className={`bg-white/95 rounded-[3px] flex items-center justify-center ${logoContainerSize}`}>
        <img
          src={v.logo}
          alt={v.name}
          className={`${logoSize} object-contain`}
          style={{ filter: "brightness(1.1)" }}
        />
      </div>
      {!iconOnly && (
        <span
          className={`${textSize} font-semibold whitespace-nowrap`}
          style={{ color: v.color }}
        >
          {v.name}
        </span>
      )}
    </span>
  );
}
