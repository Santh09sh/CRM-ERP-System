"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VENTURES, type VentureKey } from "@/lib/constants";
import Image from "next/image";
import { cn } from "@/lib/utils";

const VENTURE_KEYS = Object.keys(VENTURES) as VentureKey[];

interface FlywheelProps {
  activeVentures?: VentureKey[];
  events?: { from: VentureKey; to: VentureKey }[];
  demo?: boolean;
  className?: string;
  size?: number;
}

export function Flywheel({ activeVentures = [], events = [], demo = false, className, size = 400 }: FlywheelProps) {
  const center = size / 2;
  const radius = size * 0.35; // 35% of size so nodes fit inside
  const nodeRadius = size * 0.08;

  // Calculate positions
  const positions = useMemo(() => {
    const map = new Map<VentureKey, { x: number; y: number }>();
    VENTURE_KEYS.forEach((key, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 3;
      map.set(key, {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    });
    return map;
  }, [center, radius]);

  // Demo mode states
  const [demoActive, setDemoActive] = useState<VentureKey[]>([]);
  const [demoEvents, setDemoEvents] = useState<{ id: string; from: VentureKey; to: VentureKey }[]>([]);

  useEffect(() => {
    if (!demo) return;
    setDemoActive(VENTURE_KEYS);

    const interval = setInterval(() => {
      const fromIdx = Math.floor(Math.random() * VENTURE_KEYS.length);
      let toIdx = Math.floor(Math.random() * VENTURE_KEYS.length);
      while (toIdx === fromIdx) toIdx = Math.floor(Math.random() * VENTURE_KEYS.length);

      const newEvent = {
        id: Math.random().toString(36).substring(7),
        from: VENTURE_KEYS[fromIdx],
        to: VENTURE_KEYS[toIdx],
      };

      setDemoEvents((prev) => [...prev.slice(-4), newEvent]); // Keep last 5 max
    }, 2000);

    return () => clearInterval(interval);
  }, [demo]);

  const displayActive = demo ? demoActive : activeVentures;
  
  // Create stable events array
  const displayEvents = demo
    ? demoEvents
    : events.map((e, i) => ({ id: `evt-${i}`, from: e.from, to: e.to }));

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {/* Background SVG for edges */}
      <svg width={size} height={size} className="absolute inset-0 pointer-events-none">
        {/* Static faint lines between all nodes to form a hexagon */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth={1}>
          {VENTURE_KEYS.map((fromKey, i) => {
            const fromPos = positions.get(fromKey)!;
            const toKey = VENTURE_KEYS[(i + 1) % VENTURE_KEYS.length];
            const toPos = positions.get(toKey)!;
            return (
              <line key={`static-${fromKey}-${toKey}`} x1={fromPos.x} y1={fromPos.y} x2={toPos.x} y2={toPos.y} />
            );
          })}
        </g>

        {/* Animated event lines (cross-sells) */}
        <AnimatePresence>
          {displayEvents.map((evt) => {
            const p1 = positions.get(evt.from);
            const p2 = positions.get(evt.to);
            if (!p1 || !p2) return null;

            const color = VENTURES[evt.from].color;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;

            // Curve the path slightly
            const cx = (p1.x + p2.x) / 2 - dy * 0.2;
            const cy = (p1.y + p2.y) / 2 + dx * 0.2;
            const pathData = `M ${p1.x} ${p1.y} Q ${cx} ${cy} ${p2.x} ${p2.y}`;

            return (
              <motion.g key={evt.id}>
                {/* Glowing Trail */}
                <motion.path
                  d={pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth={4}
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 8px ${color})` }}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />
                {/* Leading Particle */}
                <motion.circle
                  r={3}
                  fill="#FFF"
                  initial={{ offsetDistance: "0%", opacity: 0 }}
                  animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                  style={{ offsetPath: `path('${pathData}')` }}
                />
              </motion.g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Nodes Overlay */}
      {VENTURE_KEYS.map((key) => {
        const p = positions.get(key)!;
        const v = VENTURES[key];
        const isActive = displayActive.includes(key);

        return (
          <motion.button
            key={key}
            onClick={() => window.open(v.url, '_blank')}
            className="absolute rounded-full flex flex-col items-center justify-center bg-white border z-10 transition-colors cursor-pointer"
            style={{
              left: p.x - nodeRadius,
              top: p.y - nodeRadius,
              width: nodeRadius * 2,
              height: nodeRadius * 2,
              borderColor: isActive ? v.color : "#FFF",
              boxShadow: isActive ? `0 0 25px ${v.color}80, inset 0 0 10px ${v.color}40` : "0 0 10px rgba(255,255,255,0.1)",
            }}
            whileHover={{ scale: 1.15, zIndex: 20 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-[75%] h-[75%] relative">
              {/* Fallback to initials if logo is problematic, but we use Image here */}
              <Image src={v.logo} alt={v.name} fill className="object-contain drop-shadow-sm" />
            </div>
            {/* Label below node */}
            <div 
              className="absolute whitespace-nowrap text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full"
              style={{
                top: "100%",
                marginTop: "8px",
                color: isActive ? "#FFF" : "#888",
                background: isActive ? `${v.color}40` : "transparent",
                border: `1px solid ${isActive ? `${v.color}60` : "transparent"}`,
                backdropFilter: "blur(4px)"
              }}
            >
              {v.name}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
