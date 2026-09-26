"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Wallet,
  Flame,
  Target,
  GraduationCap,
  Trophy,
  Calendar,
  Settings,
  X,
  Compass,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";
import clsx from "clsx";

export interface RadialOrigin {
  x: number;
  y: number;
}

interface NavRadialWheelProps {
  isOpen: boolean;
  onClose: () => void;
  origin?: RadialOrigin | null;
}

// 8 Navigation targets split into Inner (R1=95px) and Outer (R2=160px) arcs
// Angles in degrees mapped for Bottom-Right corner (~85° span into Top-Left quadrant: -95° to -175°)
const NAV_PETALS = [
  // Inner Tier (Radius ~95px)
  {
    id: "diary",
    label: "Diary",
    href: "/diary",
    icon: BookOpen,
    tier: "inner" as const,
    angleDeg: -170, // leftmost inner
    color: "amber",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradient: "from-amber-500 via-amber-600 to-amber-700",
    glowColor: "rgba(245, 158, 11, 0.7)",
  },
  {
    id: "money",
    label: "Money",
    href: "/money",
    icon: Wallet,
    tier: "inner" as const,
    angleDeg: -145,
    color: "emerald",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    gradient: "from-emerald-500 via-teal-600 to-emerald-700",
    glowColor: "rgba(16, 185, 129, 0.7)",
  },
  {
    id: "routines",
    label: "Habits",
    href: "/routines",
    icon: Flame,
    tier: "inner" as const,
    angleDeg: -120,
    color: "orange",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    gradient: "from-orange-500 via-red-600 to-orange-700",
    glowColor: "rgba(249, 115, 22, 0.7)",
  },
  {
    id: "focus",
    label: "Focus",
    href: "/progress?tab=LOG",
    icon: Target,
    tier: "inner" as const,
    angleDeg: -95, // topmost inner
    color: "cyan",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    gradient: "from-cyan-500 via-blue-600 to-cyan-700",
    glowColor: "rgba(6, 182, 212, 0.7)",
  },

  // Outer Tier (Radius ~160px)
  {
    id: "study",
    label: "Study",
    href: "/progress?tab=AIMS",
    icon: GraduationCap,
    tier: "outer" as const,
    angleDeg: -170, // leftmost outer
    color: "sky",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    gradient: "from-sky-500 via-indigo-600 to-sky-700",
    glowColor: "rgba(14, 165, 233, 0.7)",
  },
  {
    id: "discipline",
    label: "Discipline",
    href: "/rewards",
    icon: Trophy,
    tier: "outer" as const,
    angleDeg: -145,
    color: "red",
    badgeColor: "bg-brand-red/20 text-red-300 border-brand-red/40",
    gradient: "from-red-600 via-brand-red to-red-700",
    glowColor: "rgba(239, 68, 68, 0.8)",
  },
  {
    id: "dates",
    label: "Dates",
    href: "/dates",
    icon: Calendar,
    tier: "outer" as const,
    angleDeg: -120,
    color: "purple",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    gradient: "from-purple-500 via-fuchsia-600 to-purple-700",
    glowColor: "rgba(168, 85, 247, 0.7)",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    tier: "outer" as const,
    angleDeg: -95, // topmost outer
    color: "zinc",
    badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40",
    gradient: "from-zinc-600 via-zinc-700 to-zinc-800",
    glowColor: "rgba(161, 161, 170, 0.7)",
  },
];

export function NavRadialWheel({ isOpen, onClose, origin }: NavRadialWheelProps) {
  const router = useRouter();
  const [activePetalId, setActivePetalId] = useState<string | null>(null);
  const activePetalIdRef = useRef<string | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    activePetalIdRef.current = activePetalId;
  }, [activePetalId]);

  // Back button integration: dismiss on Android back
  useEffect(() => {
    if (!isOpen) return;
    return backButton.register(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  // Center position geometry (Default: Bottom-Right corner)
  const centerPos = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: 340, y: 720 };
    }
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    if (origin) {
      return {
        x: Math.min(winW - 20, Math.max(20, origin.x)),
        y: Math.min(winH - 20, Math.max(20, origin.y)),
      };
    }
    return {
      x: winW - 36,
      y: winH - 36,
    };
  }, [origin]);

  const executeNavigation = useCallback(
    (petal: (typeof NAV_PETALS)[0]) => {
      haptics.impactMedium();
      router.push(petal.href);
      onClose();
    },
    [router, onClose]
  );

  // Compute petal pixel coordinates
  const petalLayout = useMemo(() => {
    const R_INNER = 96;
    const R_OUTER = 168;

    return NAV_PETALS.map((petal) => {
      const radius = petal.tier === "inner" ? R_INNER : R_OUTER;
      const rad = (petal.angleDeg * Math.PI) / 180;
      const x = centerPos.x + radius * Math.cos(rad);
      const y = centerPos.y + radius * Math.sin(rad);
      return {
        ...petal,
        x,
        y,
        radius,
      };
    });
  }, [centerPos]);

  // Global Pointer / Touch tracking
  const handlePointerMove = useCallback(
    (e: PointerEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ("touches" in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const dx = clientX - centerPos.x;
      const dy = clientY - centerPos.y;
      const distance = Math.hypot(dx, dy);

      // Dead-zone near center (40px)
      if (distance < 42) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
        }
        return;
      }

      // Check tier by distance
      const isOuter = distance >= 132;
      const targetTier = isOuter ? "outer" : "inner";

      // Angular calculation (-180 to 180)
      let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

      // Find closest petal in this tier
      const tierPetals = petalLayout.filter((p) => p.tier === targetTier);
      let closestPetal = tierPetals[0];
      let minDiff = 360;

      for (const p of tierPetals) {
        const diff = Math.abs(angleDeg - p.angleDeg);
        if (diff < minDiff) {
          minDiff = diff;
          closestPetal = p;
        }
      }

      if (closestPetal && activePetalIdRef.current !== closestPetal.id) {
        haptics.selection();
        setActivePetalId(closestPetal.id);
      }
    },
    [centerPos, petalLayout]
  );

  const handlePointerUp = useCallback(() => {
    const currentActiveId = activePetalIdRef.current;
    if (currentActiveId) {
      const selectedPetal = NAV_PETALS.find((p) => p.id === currentActiveId);
      if (selectedPetal) {
        executeNavigation(selectedPetal);
        return;
      }
    }
    onClose();
  }, [executeNavigation, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setActivePetalId(null);
      return;
    }

    const onPointerMoveListener = (e: PointerEvent) => handlePointerMove(e);
    const onPointerUpListener = () => handlePointerUp();
    const onTouchMoveListener = (e: TouchEvent) => handlePointerMove(e);
    const onTouchEndListener = () => handlePointerUp();

    window.addEventListener("pointermove", onPointerMoveListener, { passive: true });
    window.addEventListener("pointerup", onPointerUpListener);
    window.addEventListener("pointercancel", onPointerUpListener);
    window.addEventListener("touchmove", onTouchMoveListener, { passive: true });
    window.addEventListener("touchend", onTouchEndListener);
    window.addEventListener("touchcancel", onTouchEndListener);

    return () => {
      window.removeEventListener("pointermove", onPointerMoveListener);
      window.removeEventListener("pointerup", onPointerUpListener);
      window.removeEventListener("pointercancel", onPointerUpListener);
      window.removeEventListener("touchmove", onTouchMoveListener);
      window.removeEventListener("touchend", onTouchEndListener);
      window.removeEventListener("touchcancel", onTouchEndListener);
    };
  }, [isOpen, handlePointerMove, handlePointerUp]);

  if (!isOpen) return null;

  const activePetal = NAV_PETALS.find((p) => p.id === activePetalId);

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto touch-none select-none bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Active Navigation HUD Indicator at Top */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-200">
        {activePetal ? (
          <div
            className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-black/90 border border-white/20 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-150"
            style={{ borderColor: activePetal.glowColor }}
          >
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shadow-lg"
              style={{
                boxShadow: `0 0 20px ${activePetal.glowColor}`,
              }}
            >
              <activePetal.icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white font-mono tracking-wider">
                {activePetal.label}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Release to launch
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/10 backdrop-blur-xl">
            <Compass className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
            <span className="text-[11px] font-mono text-zinc-300">
              Slide finger to select application
            </span>
          </div>
        )}
      </div>

      {/* Center Origin Node (Bottom-Right Anchor) */}
      <div
        className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/90 border-2 border-brand-red flex items-center justify-center shadow-glow-red"
        style={{ left: `${centerPos.x}px`, top: `${centerPos.y}px` }}
      >
        <div className="w-3 h-3 rounded-full bg-brand-red animate-ping" />
      </div>

      {/* Render 8 Petals along 85° Arc */}
      {petalLayout.map((petal) => {
        const isActive = activePetalId === petal.id;
        const Icon = petal.icon;

        return (
          <div
            key={petal.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-150"
            style={{
              left: `${petal.x}px`,
              top: `${petal.y}px`,
              transform: `translate(-50%, -50%) scale(${isActive ? 1.22 : 1})`,
            }}
          >
            <button
              type="button"
              onClick={() => executeNavigation(petal)}
              className={clsx(
                "relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center border transition-all duration-200",
                isActive
                  ? "bg-gradient-to-br text-white border-white shadow-2xl"
                  : "bg-black/85 text-zinc-300 border-white/15 hover:border-white/40"
              )}
              style={
                isActive
                  ? {
                      boxShadow: `0 0 25px ${petal.glowColor}`,
                      borderColor: "rgba(255, 255, 255, 0.9)",
                      background: `radial-gradient(circle at center, ${petal.glowColor}, #000)`,
                    }
                  : {}
              }
              aria-label={petal.label}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 transition-transform",
                  isActive ? "text-white scale-110" : "text-zinc-300"
                )}
              />
              <span
                className={clsx(
                  "text-[9px] font-bold font-mono tracking-tight mt-0.5 leading-none transition-colors",
                  isActive ? "text-white drop-shadow-md" : "text-zinc-400"
                )}
              >
                {petal.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
