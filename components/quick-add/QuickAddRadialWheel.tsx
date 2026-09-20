"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckSquare,
  Wallet,
  Flame,
  BarChart3,
  Calendar,
  Trophy,
  Plus,
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

// 6 Core Creation Petals
const QUICK_ADD_PETALS = [
  {
    id: "task" as const,
    label: "Task",
    icon: CheckSquare,
    color: "from-brand-red to-red-600",
    glow: "shadow-[0_0_25px_rgba(220,38,38,0.7)]",
    borderColor: "border-red-400",
    textColor: "text-red-300",
    title: "New Task",
    description: "Create a to-do with priority & reminder",
  },
  {
    id: "expense" as const,
    label: "Expense",
    icon: Wallet,
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-[0_0_25px_rgba(16,185,129,0.7)]",
    borderColor: "border-emerald-400",
    textColor: "text-emerald-300",
    title: "Record Expense",
    description: "Log money spent, card, or category",
  },
  {
    id: "routine" as const,
    label: "Habit",
    icon: Flame,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-[0_0_25px_rgba(245,158,11,0.7)]",
    borderColor: "border-amber-400",
    textColor: "text-amber-300",
    title: "New Habit",
    description: "Build a daily or weekly routine",
  },
  {
    id: "session" as const,
    label: "Focus",
    icon: BarChart3,
    color: "from-cyan-500 to-blue-600",
    glow: "shadow-[0_0_25px_rgba(6,182,212,0.7)]",
    borderColor: "border-cyan-400",
    textColor: "text-cyan-300",
    title: "Focus Sprint",
    description: "Log deep work focus session",
  },
  {
    id: "date" as const,
    label: "Event",
    icon: Calendar,
    color: "from-purple-500 to-pink-600",
    glow: "shadow-[0_0_25px_rgba(168,85,247,0.7)]",
    borderColor: "border-purple-400",
    textColor: "text-purple-300",
    title: "Special Date",
    description: "Countdown for key milestone or event",
  },
  {
    id: "discipline" as const,
    label: "Karma",
    icon: Trophy,
    color: "from-yellow-500 to-amber-600",
    glow: "shadow-[0_0_25px_rgba(234,179,8,0.7)]",
    borderColor: "border-yellow-400",
    textColor: "text-yellow-300",
    title: "Log Karma",
    description: "Record positive deeds & earn discipline XP",
  },
];

export function QuickAddRadialWheel({
  isOpen,
  onClose,
  onSelectTab,
  origin,
}: QuickAddRadialWheelProps) {
  const [activePetalId, setActivePetalId] = useState<QuickAddTabType | null>(null);
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

  // Geometry calculations: default origin falls back to center bottom "+" button
  const getCenterCoords = useCallback(() => {
    if (typeof window === "undefined") return { x: 200, y: 600, isTop: false };

    if (origin && origin.x && origin.y) {
      const isTop = origin.y < window.innerHeight / 2;
      return { x: origin.x, y: origin.y, isTop };
    }

    // Default mobile fallback: exact center of screen bottom dock
    return {
      x: Math.round(window.innerWidth * 0.5),
      y: window.innerHeight - 50,
      isTop: false,
    };
  }, [origin]);

  const centerPos = getCenterCoords();
  const radius = 145; // px (generous touch breathing room)

  // Upward symmetrical semi-circle for bottom center "+" button, downward arc for top
  const angles = centerPos.isTop
    ? [60, 85, 110, 135, 160, 185]
    : [-165, -135, -105, -75, -45, -15];

  // Traditional Radial Drag & Release Engine
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const touch = "touches" in e && e.touches.length > 0 ? e.touches[0] : null;
      const clientX = touch ? touch.clientX : (e as MouseEvent).clientX;
      const clientY = touch ? touch.clientY : (e as MouseEvent).clientY;

      if (clientX === undefined || clientY === undefined) return;

      const dx = clientX - centerPos.x;
      const dy = clientY - centerPos.y;
      const distance = Math.hypot(dx, dy);

      // Deadzone: within 36px of center is cancel / no selection
      if (distance < 36) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
          haptics.selection();
        }
        return;
      }

      // Calculate touch angle in degrees
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Find petal with closest angular alignment
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

      // If finger is pointing away from the fan arc (e.g. downward off-screen), deselect
      if (minDiff > 45) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
          haptics.selection();
        }
        return;
      }

      const candidate = QUICK_ADD_PETALS[closestIdx];
      if (candidate && candidate.id !== activePetalIdRef.current) {
        setActivePetalId(candidate.id);
        haptics.selection(); // rotary click feedback
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      let currentActiveId = activePetalIdRef.current;

      // Direct tap fallback: if user tapped directly on a petal button
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

      // Released in deadzone or canceled
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

  const activePetal = QUICK_ADD_PETALS.find((p) => p.id === activePetalId);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto select-none">
      {/* Dark Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={() => {
          haptics.impactLight();
          onClose();
        }}
      />

      {/* Origin Point anchored at Touch Position */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${centerPos.x}px`,
          top: `${centerPos.y}px`,
        }}
      >
        {/* Dynamic Petals blooming from center */}
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
                transform: `translate(${x}px, ${y}px) scale(${isSelected ? 1.45 : 1})`,
                zIndex: isSelected ? 50 : 20,
              }}
            >
              <button
                type="button"
                data-petal-id={petal.id}
                onClick={() => executeAction(petal.id)}
                className={clsx(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center text-white bg-gradient-to-br transition-all duration-150 shadow-2xl pointer-events-auto",
                  petal.color,
                  petal.borderColor,
                  isSelected
                    ? `${petal.glow} ring-4 ring-white/80 border-white scale-105`
                    : "opacity-85 hover:opacity-100"
                )}
              >
                <Icon className={clsx("w-5 h-5 drop-shadow-md", isSelected && "animate-pulse")} />
              </button>

              {/* Enlarge and show text of SELECTED button ONLY */}
              {isSelected && (
                <span
                  className={clsx(
                    "absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-3.5 py-1 rounded-full text-xs font-mono font-bold border-2 shadow-2xl backdrop-blur-xl transition-all duration-150 pointer-events-none bg-white text-black border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.9)] animate-in fade-in zoom-in-95",
                    centerPos.isTop ? "top-16" : "-bottom-9"
                  )}
                >
                  {petal.label}
                </span>
              )}
            </div>
          );
        })}

        {/* Center Anchor Hub (Where "+" thumb was placed) */}
        <div
          className={clsx(
            "absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex flex-col items-center justify-center transition-transform duration-150 border-2",
            activePetalId
              ? "bg-zinc-900/90 border-white/20 text-zinc-500 scale-90"
              : "bg-gradient-to-tr from-brand-red to-red-600 border-red-300 text-white shadow-glow-red animate-pulse scale-100"
          )}
        >
          <Plus className={clsx("w-6 h-6 transition-transform", activePetalId && "rotate-45")} />
          <span className="text-[8px] font-mono font-bold uppercase mt-0.5 tracking-wider">
            {activePetalId ? "Release" : "Slide"}
          </span>
        </div>

        {/* Live Action Preview Tooltip */}
        {activePetal && (
          <div
            className={clsx(
              "absolute -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/95 border border-white/25 text-white text-xs sm:text-sm font-mono shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap pointer-events-none z-50",
              centerPos.isTop ? "top-48" : "-top-48"
            )}
          >
            <span className="text-zinc-400 mr-2 font-bold uppercase text-[10px] tracking-wider">Action:</span>
            <span className={clsx("font-bold tracking-tight", activePetal.textColor)}>
              {activePetal.title}
            </span>
            <span className="text-zinc-400 text-xs ml-2 hidden sm:inline">
              — {activePetal.description}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
