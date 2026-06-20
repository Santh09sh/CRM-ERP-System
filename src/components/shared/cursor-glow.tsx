"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number; // 0 = red, 120 = green
  type: "spark" | "ring";
}

export function CursorGlow() {
  const pathname = usePathname();
  const isCrmApp = pathname !== "/" && pathname !== "/login" && pathname !== "/signup" && !pathname.startsWith("/r/");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: -200, y: -200, prevX: -200, prevY: -200 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const ringX = useRef(-200);
  const ringY = useRef(-200);

  useEffect(() => {
    if (isCrmApp) {
      document.body.style.cursor = "default";
      return;
    }

    document.body.style.cursor = "none";

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let frameCount = 0;

    const onMouseMove = (e: MouseEvent) => {
      cursorRef.current.prevX = cursorRef.current.x;
      cursorRef.current.prevY = cursorRef.current.y;
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;

      // Move the custom cursor dot
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      }

      // Speed = distance moved
      const dx = cursorRef.current.x - cursorRef.current.prevX;
      const dy = cursorRef.current.y - cursorRef.current.prevY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      // Spawn more particles when moving fast
      const spawnCount = Math.floor(speed * 0.6) + 1;
      for (let i = 0; i < spawnCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const burst = Math.random() * speed * 0.3;
        // Alternate red (#E54D4C hue~0) and green (#00A651 hue~145)
        const hue = frameCount % 2 === 0 ? 0 : 145;

        particlesRef.current.push({
          x: e.clientX + (Math.random() - 0.5) * 4,
          y: e.clientY + (Math.random() - 0.5) * 4,
          vx: Math.cos(angle) * burst,
          vy: Math.sin(angle) * burst - 1.5,
          life: 1,
          maxLife: 0.6 + Math.random() * 0.6,
          size: 1.5 + Math.random() * 3,
          hue,
          type: Math.random() > 0.7 ? "ring" : "spark",
        });
      }
      frameCount++;
    };

    // Click burst
    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = 4 + Math.random() * 6;
        particlesRef.current.push({
          x: e.clientX,
          y: e.clientY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: 0.8 + Math.random() * 0.4,
          size: 2 + Math.random() * 4,
          hue: i % 2 === 0 ? 0 : 145,
          type: "spark",
        });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);

    const draw = () => {
      // Smooth ring follower (CSS-style lerp)
      ringX.current += (cursorRef.current.x - ringX.current) * 0.12;
      ringY.current += (cursorRef.current.y - ringY.current) * 0.12;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringX.current - 20}px, ${ringY.current - 20}px)`;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life -= 0.025;
        if (p.life <= 0) return false;

        p.vx *= 0.95;
        p.vy *= 0.95;
        p.vy += 0.08; // gravity
        p.x += p.vx;
        p.y += p.vy;

        const alpha = (p.life / p.maxLife) * 0.63; // 0.9 * 0.7 = 30% less opacity
        const saturation = 90;
        const lightness = 55;

        if (p.type === "spark") {
          // Glowing spark
          const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          grd.addColorStop(0, `hsla(${p.hue}, ${saturation}%, ${lightness}%, ${alpha})`);
          grd.addColorStop(0.4, `hsla(${p.hue}, ${saturation}%, ${lightness}%, ${alpha * 0.5})`);
          grd.addColorStop(1, `hsla(${p.hue}, ${saturation}%, ${lightness}%, 0)`);

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          // Bright core
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 10%, 95%, ${alpha})`;
          ctx.fill();
        } else {
          // Expanding ring
          const radius = Math.max(0.1, p.size * (2 + (1 - p.life / p.maxLife) * 8));
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${p.hue}, ${saturation}%, ${lightness}%, ${alpha * 0.6})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        return true;
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
      document.body.style.cursor = "default";
    };
  }, [isCrmApp]);

  if (isCrmApp) return null;

  return (
    <>
      {/* Canvas for particle trail */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9999 }}
      />

      {/* Tiny sharp cursor dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          zIndex: 10000,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "white",
          boxShadow: "0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(229,77,76,0.6)",
          willChange: "transform",
        }}
      />

      {/* Slow-follow ring */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{
          zIndex: 9998,
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "1.5px solid rgba(229,77,76,0.5)",
          boxShadow: "0 0 8px rgba(229,77,76,0.2) inset, 0 0 8px rgba(0,166,81,0.1)",
          willChange: "transform",
        }}
      />
    </>
  );
}
