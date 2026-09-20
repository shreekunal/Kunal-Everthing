"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  CheckSquare,
  Wallet,
  Flame,
  BarChart3,
  Calendar,
  Trophy,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";
import clsx from "clsx";

export interface RadialOrigin {
  x: number;
  y: number;
}

export type QuickAddTabType =
  | "task"
  | "expense"
  | "routine"
  | "session"
  | "date"
  | "discipline";

interface QuickAddRadialWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: QuickAddTabType) => void;
  origin?: RadialOrigin | null;
}

// 6 Core Creation Petals with refined Cyber-tactile aesthetics
const QUICK_ADD_PETALS = [
  {
    id: "task" as const,
    label: "Task",
    icon: CheckSquare,
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
    gradient: "from-red-600 via-rose-600 to-red-700",
    glowColor: "rgba(239, 68, 68, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(239,68,68,0.7)]",
    borderColor: "border-red-400/80",
    textColor: "text-red-400",
    accentHex: "#EF4444",
    title: "New Priority Task",
    description: "Create to-do with custom reminders & priority",
  },
  {
    id: "expense" as const,
    label: "Expense",
    icon: Wallet,
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    gradient: "from-emerald-500 via-teal-600 to-emerald-700",
    glowColor: "rgba(16, 185, 129, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(16,185,129,0.7)]",
    borderColor: "border-emerald-400/80",
    textColor: "text-emerald-400",
    accentHex: "#10B981",
    title: "Record Expense",
    description: "Instant transaction log with bank/card attribution",
  },
  {
    id: "routine" as const,
    label: "Habit",
    icon: Flame,
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradient: "from-amber-500 via-orange-600 to-amber-700",
    glowColor: "rgba(245, 158, 11, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(245,158,11,0.7)]",
    borderColor: "border-amber-400/80",
    textColor: "text-amber-400",
    accentHex: "#F59E0B",
    title: "New Routine / Habit",
    description: "Establish daily streak & discipline tracking",
  },
  {
    id: "session" as const,
    label: "Focus",
    icon: BarChart3,
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    gradient: "from-cyan-500 via-blue-600 to-cyan-700",
    glowColor: "rgba(6, 182, 212, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(6,182,212,0.7)]",
    borderColor: "border-cyan-400/80",
    textColor: "text-cyan-400",
    accentHex: "#06B6D4",
    title: "Deep Work Sprint",
    description: "Log dedicated focus session & productivity XP",
  },
  {
    id: "date" as const,
    label: "Event",
    icon: Calendar,
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    gradient: "from-purple-500 via-fuchsia-600 to-purple-700",
    glowColor: "rgba(168, 85, 247, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(168,85,247,0.7)]",
    borderColor: "border-purple-400/80",
    textColor: "text-purple-400",
    accentHex: "#A855F7",
    title: "Special Date & Alert",
    description: "Milestone countdown & annual remembrance",
  },
  {
    id: "discipline" as const,
    label: "Karma",
    icon: Trophy,
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    gradient: "from-yellow-500 via-amber-500 to-yellow-600",
    glowColor: "rgba(234, 179, 8, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(234,179,8,0.7)]",
    borderColor: "border-yellow-400/80",
    textColor: "text-yellow-400",
    accentHex: "#EAB308",
    title: "Monk Karma XP",
    description: "Record positive deeds & level up discipline tier",
  },
];

export function QuickAddRadialWheel({
  isOpen,
  onClose,
  onSelectTab,
  origin,
}: QuickAddRadialWheelProps) {
  const [activePetalId, setActivePetalId] = useState<QuickAddTabType | null>(null);
  const [pointerCoords, setPointerCoords] = useState<{ x: number; y: number } | null>(null);
  const activePetalIdRef = useRef<QuickAddTabType | null>(null);

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

  const executeAction = useCallback(
    (tabId: QuickAddTabType) => {
      haptics.impactMedium();
      onClose();
      onSelectTab(tabId);
    },
    [onClose, onSelectTab]
  );

  // Viewport-aware origin geometry calculation with edge detection
  const centerPos = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: 200, y: 600, isTop: false, isLeft: false, isRight: false };
    }

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let x = Math.round(winW * 0.5);
    let y = winH - 50;

    if (origin && origin.x && origin.y) {
      x = origin.x;
      y = origin.y;
    }

    const isTop = y < winH * 0.45;
    const isLeft = x < winW * 0.28;
    const isRight = x > winW * 0.72;

    return { x, y, isTop, isLeft, isRight };
  }, [origin]);

  const radius = typeof window !== "undefined" && window.innerWidth < 380 ? 132 : 148;

  // Viewport-adaptive fan angles preventing off-screen clipping
  const angles = useMemo(() => {
    if (centerPos.isTop) {
      if (centerPos.isLeft) return [25, 50, 75, 100, 125, 150];
      if (centerPos.isRight) return [30, 55, 80, 105, 130, 155];
      return [35, 60, 85, 110, 135, 160];
    } else {
      if (centerPos.isLeft) return [-90, -70, -50, -30, -10, 10];
      if (centerPos.isRight) return [-190, -170, -150, -130, -110, -90];
      return [-165, -135, -105, -75, -45, -15];
    }
  }, [centerPos.isTop, centerPos.isLeft, centerPos.isRight]);

  // Real-time gesture angle & compass calculation
  const pointerAngle = useMemo(() => {
    if (!pointerCoords) return null;
    const dx = pointerCoords.x - centerPos.x;
    const dy = pointerCoords.y - centerPos.y;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }, [pointerCoords, centerPos.x, centerPos.y]);

  // Touch and pointer tracking engine
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const touch = "touches" in e && e.touches.length > 0 ? e.touches[0] : null;
      const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

      if (clientX === undefined || clientY === undefined) return;

      setPointerCoords({ x: clientX, y: clientY });

      const dx = clientX - centerPos.x;
      const dy = clientY - centerPos.y;
      const distance = Math.hypot(dx, dy);

      // Deadzone: within 35px of center is cancel / idle state
      if (distance < 35) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
          haptics.selection();
        }
        return;
      }

      // Calculate touch angle in degrees
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Find closest angular petal
      let closestIdx = 0;
      let minDiff = Infinity;

      angles.forEach((targetAngle, idx) => {
        let diff = Math.abs(angleDeg - targetAngle);
        if (diff > 180) diff = 360 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = idx;
        }
      });

      // If finger points outside the angular fan threshold (e.g. downward off-screen), release selection
      if (minDiff > 42) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
          haptics.selection();
        }
        return;
      }

      const candidate = QUICK_ADD_PETALS[closestIdx];
      if (candidate && candidate.id !== activePetalIdRef.current) {
        setActivePetalId(candidate.id);
        haptics.selection();
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      let currentActiveId = activePetalIdRef.current;

      // Direct tap fallback on specific petal
      if (!currentActiveId && typeof document !== "undefined") {
        let checkX: number | undefined;
        let checkY: number | undefined;
        if ("changedTouches" in e && e.changedTouches.length > 0) {
          checkX = e.changedTouches[0].clientX;
          checkY = e.changedTouches[0].clientY;
        } else if ("clientX" in e) {
          checkX = (e as MouseEvent).clientX;
          checkY = (e as MouseEvent).clientY;
        }
        if (checkX !== undefined && checkY !== undefined) {
          const elem = document.elementFromPoint(checkX, checkY);
          const petalBtn = elem?.closest("[data-petal-id]");
          if (petalBtn) {
            currentActiveId = petalBtn.getAttribute("data-petal-id") as QuickAddTabType;
          }
        }
      }

      if (currentActiveId) {
        executeAction(currentActiveId);
        return;
      }

      onClose();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isOpen, centerPos.x, centerPos.y, angles, executeAction, onClose]);

  if (!isOpen) return null;

  const activeIndex = QUICK_ADD_PETALS.findIndex((p) => p.id === activePetalId);
  const activePetal = activeIndex >= 0 ? QUICK_ADD_PETALS[activeIndex] : null;

  // Active target coordinates for the magnetic laser beam
  const activeCoords = activeIndex >= 0
    ? {
        x: centerPos.x + Math.round(Math.cos((angles[activeIndex] * Math.PI) / 180) * radius),
        y: centerPos.y + Math.round(Math.sin((angles[activeIndex] * Math.PI) / 180) * radius),
      }
    : null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto select-none overflow-hidden animate-in fade-in duration-200">
      {/* High-tech Vignette Backdrop with Subtle Radial Ambient Halo */}
      <div
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 380px at ${centerPos.x}px ${centerPos.y}px, rgba(17, 24, 39, 0.88) 0%, rgba(0, 0, 0, 0.94) 85%)`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
        onClick={() => {
          haptics.impactLight();
          onClose();
        }}
      />

      {/* SVG Vector Hologram Layer (Rings, Reticles, Laser Beam) */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {activePetal && (
            <linearGradient id="active-laser" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="60%" stopColor={activePetal.accentHex} stopOpacity="0.8" />
              <stop offset="100%" stopColor={activePetal.accentHex} stopOpacity="1" />
            </linearGradient>
          )}
        </defs>

        {/* Outer Orbital Track */}
        <circle
          cx={centerPos.x}
          cy={centerPos.y}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />

        {/* Inner Guide Ring */}
        <circle
          cx={centerPos.x}
          cy={centerPos.y}
          r={radius * 0.52}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="1"
          strokeDasharray="2 8"
        />

        {/* Dynamic Magnetic Laser Beam connecting Center to Selected Petal */}
        {activeCoords && activePetal && (
          <g filter="url(#neon-glow)">
            <line
              x1={centerPos.x}
              y1={centerPos.y}
              x2={activeCoords.x}
              y2={activeCoords.y}
              stroke="url(#active-laser)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              className="animate-pulse"
            />
            {/* Luminous Target Reticle Node */}
            <circle
              cx={activeCoords.x}
              cy={activeCoords.y}
              r="26"
              fill="none"
              stroke={activePetal.accentHex}
              strokeWidth="1.5"
              strokeOpacity="0.6"
              className="animate-ping"
              style={{ animationDuration: "2s" }}
            />
          </g>
        )}
      </svg>

      {/* Anchored Stage at Center Coordinates */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${centerPos.x}px`,
          top: `${centerPos.y}px`,
        }}
      >
        {/* Fan of Action Petals */}
        {QUICK_ADD_PETALS.map((petal, idx) => {
          const angleDeg = angles[idx];
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.round(Math.cos(angleRad) * radius);
          const y = Math.round(Math.sin(angleRad) * radius);
          const Icon = petal.icon;
          const isSelected = activePetalId === petal.id;

          return (
            <div
              key={petal.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ease-out"
              style={{
                transform: `translate(${x}px, ${y}px) scale(${isSelected ? 1.35 : 1})`,
                zIndex: isSelected ? 50 : 20,
              }}
            >
              {/* Petal Orb Button */}
              <button
                type="button"
                data-petal-id={petal.id}
                onClick={() => executeAction(petal.id)}
                className={clsx(
                  "relative w-13 h-13 rounded-2xl border flex items-center justify-center text-white backdrop-blur-xl transition-all duration-200 pointer-events-auto",
                  isSelected
                    ? clsx(
                        "bg-gradient-to-br ring-4 ring-white/70 border-white",
                        petal.gradient,
                        petal.shadowGlow
                      )
                    : "bg-zinc-900/85 hover:bg-zinc-800/90 border-white/15 text-zinc-300 hover:text-white shadow-xl hover:scale-105"
                )}
                style={{
                  width: "52px",
                  height: "52px",
                }}
              >
                {/* Specular Inner Glaze */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/[0.04] to-white/20 pointer-events-none" />

                <Icon
                  className={clsx(
                    "w-5 h-5 drop-shadow-md transition-transform duration-200",
                    isSelected ? "text-white scale-110" : "opacity-90"
                  )}
                />
              </button>

              {/* Floating Pill Label */}
              <div
                className={clsx(
                  "absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide border shadow-2xl transition-all duration-200 pointer-events-none",
                  isSelected
                    ? "bg-white text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)] scale-110 z-50"
                    : "bg-black/80 text-zinc-400 border-white/10 opacity-70",
                  centerPos.isTop ? "top-15" : "-bottom-7"
                )}
              >
                {petal.label}
              </div>
            </div>
          );
        })}

        {/* Center Anchor Hub (Touch Origin Reactor) */}
        <div
          className={clsx(
            "absolute -translate-x-1/2 -translate-y-1/2 w-15 h-15 rounded-full flex flex-col items-center justify-center transition-all duration-200 border-2 backdrop-blur-2xl shadow-2xl",
            activePetal
              ? "bg-zinc-950/95 border-white/40 text-white scale-95 shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              : "bg-gradient-to-tr from-brand-red to-red-600 border-red-300/80 text-white shadow-[0_0_25px_rgba(239,68,68,0.7)] scale-100"
          )}
          style={{ width: "58px", height: "58px" }}
        >
          {/* Dynamic Compass Pointer Arrow targeting touch position */}
          {pointerAngle !== null && activePetal && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{
                transform: `rotate(${pointerAngle + 90}deg)`,
              }}
            >
              <div
                className="w-1.5 h-3 rounded-full -translate-y-6 shadow-glow"
                style={{ backgroundColor: activePetal.accentHex }}
              />
            </div>
          )}

          <Plus
            className={clsx(
              "w-6 h-6 transition-transform duration-200",
              activePetal ? "rotate-45 text-white/80" : "text-white"
            )}
          />
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider mt-0.5">
            {activePetal ? "Release" : "Slide"}
          </span>
        </div>

        {/* Futuristic Floating HUD Action Preview Card */}
        {activePetal && (
          <div
            className={clsx(
              "absolute -translate-x-1/2 px-4 py-3 rounded-2xl bg-zinc-950/95 border border-white/20 text-white shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap pointer-events-none z-50 flex items-center gap-3.5",
              centerPos.isTop ? "top-50" : "-top-52"
            )}
            style={{
              boxShadow: `0 0 35px ${activePetal.glowColor}, 0 20px 40px rgba(0,0,0,0.8)`,
            }}
          >
            {/* Holographic Glowing Category Icon Pill */}
            <div
              className={clsx(
                "p-2 rounded-xl border flex items-center justify-center",
                activePetal.badgeColor
              )}
            >
              {React.createElement(activePetal.icon, {
                className: clsx("w-4 h-4", activePetal.textColor),
              })}
            </div>

            {/* Title & Description */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={clsx("font-bold text-xs sm:text-sm tracking-tight", activePetal.textColor)}>
                  {activePetal.title}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-white/10 text-white/80 border border-white/15">
                  Action
                </span>
              </div>
              <span className="text-zinc-400 text-[11px] font-mono mt-0.5 hidden xs:inline">
                {activePetal.description}
              </span>
            </div>

            {/* Tactile Gesture Cue */}
            <div className="pl-2 border-l border-white/15 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Release</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
