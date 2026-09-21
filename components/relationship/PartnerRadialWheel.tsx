"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Smile,
  Moon,
  Sun,
  MessageCircle,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";
import { offlineCache } from "@/lib/offlineCache";
import clsx from "clsx";

export interface RadialOrigin {
  x: number;
  y: number;
}

interface PartnerRadialWheelProps {
  isOpen: boolean;
  onClose: () => void;
  origin?: RadialOrigin | null;
}

// 4 Core Beloved Petals with raw WhatsApp message strings
const PETALS = [
  {
    id: "love",
    label: "Love You",
    icon: Heart,
    badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    gradient: "from-rose-500 via-pink-600 to-rose-700",
    glowColor: "rgba(244, 63, 94, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(244,63,94,0.7)]",
    borderColor: "border-rose-400/80",
    textColor: "text-rose-400",
    accentHex: "#F43F5E",
    title: "Send Love",
    text: "I love you so much ❤️",
  },
  {
    id: "affection",
    label: "Pyara Bacha",
    icon: Smile,
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/40",
    gradient: "from-pink-500 via-rose-500 to-pink-700",
    glowColor: "rgba(236, 72, 153, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(236,72,153,0.7)]",
    borderColor: "border-pink-400/80",
    textColor: "text-pink-400",
    accentHex: "#EC4899",
    title: "Sweet Affection",
    text: "Mera bacha pyara sa",
  },
  {
    id: "night",
    label: "Good Night",
    icon: Moon,
    badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    gradient: "from-indigo-500 via-purple-600 to-indigo-700",
    glowColor: "rgba(99, 102, 241, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(99,102,241,0.7)]",
    borderColor: "border-indigo-400/80",
    textColor: "text-indigo-400",
    accentHex: "#6366F1",
    title: "Night Blessing",
    text: "Good Night babu .. Take Care",
  },
  {
    id: "morning",
    label: "Good Morning",
    icon: Sun,
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    gradient: "from-amber-500 via-orange-500 to-amber-700",
    glowColor: "rgba(245, 158, 11, 0.75)",
    shadowGlow: "shadow-[0_0_30px_rgba(245,158,11,0.7)]",
    borderColor: "border-amber-400/80",
    textColor: "text-amber-400",
    accentHex: "#F59E0B",
    title: "Morning Energy",
    text: "Good Morning Babyyyy",
  },
];

export function PartnerRadialWheel({ isOpen, onClose, origin }: PartnerRadialWheelProps) {
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<any>(null);
  const [activePetalId, setActivePetalId] = useState<string | null>(null);
  const activePetalIdRef = useRef<string | null>(null);

  useEffect(() => {
    activePetalIdRef.current = activePetalId;
  }, [activePetalId]);

  // Load partner profile from cache & API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cachedPartner = offlineCache.get<any>("partner_profile");
    if (cachedPartner) setPartnerData(cachedPartner);

    fetch("/api/relationship")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.partner) {
          setPartnerData(data.partner);
          offlineCache.set("partner_profile", data.partner);
        }
      })
      .catch(() => {});
  }, []);

  // Back button integration: dismiss on Android back
  useEffect(() => {
    if (!isOpen) return;
    return backButton.register(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  const partnerPhone = partnerData?.phone || "";
  const cleanPhone = partnerPhone.replace(/[^0-9]/g, "");
  const partnerName = partnerData?.nickname || partnerData?.name || "Partner";

  const executeAction = useCallback(
    (item: (typeof PETALS)[0]) => {
      haptics.impactMedium();
      const messageText = item.text;
      const encoded = encodeURIComponent(messageText);
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

      window.open(url, "_blank");
      onClose();
    },
    [cleanPhone, onClose]
  );

  // Viewport-aware origin geometry calculation
  const centerPos = useMemo(() => {
    if (typeof window === "undefined") {
      return { x: 250, y: 600, isTop: false, isRightSide: true };
    }

    const winW = window.innerWidth;
    const winH = window.innerHeight;

    let x = Math.round(winW * 0.72);
    let y = winH - 50;

    if (origin && origin.x && origin.y) {
      x = origin.x;
      y = origin.y;
    }

    const isTop = y < winH * 0.45;
    // On the bottom nav, Relationship is in the right half (button 4 of 5)
    const isRightSide = x > winW * 0.45;

    return { x, y, isTop, isRightSide };
  }, [origin]);

  const radius = typeof window !== "undefined" && window.innerWidth < 400 ? 126 : 136;

  // Viewport-adaptive fan angles:
  // Instead of cramping all 4 petals into a narrow 75° quadrant on the left,
  // we bloom from high left (-162°) across vertical (-90°) to upper right (-52° to -56°).
  // This utilizes available space on the right, gives wide ~36° gaps between petals,
  // and prevents off-screen clipping on the right edge!
  const angles = useMemo(() => {
    if (centerPos.isTop) {
      // If triggered from top navigation
      if (centerPos.isRightSide) {
        return [85, 115, 145, 175];
      }
      return [5, 35, 65, 95];
    } else {
      // Bottom dock (standard mobile position)
      if (centerPos.isRightSide) {
        const winW = typeof window !== "undefined" ? window.innerWidth : 390;
        const availableRight = Math.max(50, winW - centerPos.x - 38);
        const maxCos = Math.min(0.62, Math.max(0.35, availableRight / radius));
        const safeRightAngle = -Math.round((Math.acos(maxCos) * 180) / Math.PI);
        const leftAngle = -162;
        const step = (safeRightAngle - leftAngle) / 3;
        return [
          leftAngle,
          Math.round(leftAngle + step),
          Math.round(leftAngle + 2 * step),
          safeRightAngle,
        ];
      }
      return [-90, -60, -30, 0];
    }
  }, [centerPos.isTop, centerPos.isRightSide, centerPos.x, radius]);

  // Touch and pointer tracking engine
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

      // Deadzone: within 35px is cancel / idle
      if (distance < 35) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
          haptics.selection();
        }
        return;
      }

      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

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

      // Release selection if user gestures away from the fan quadrant
      if (minDiff > 45) {
        if (activePetalIdRef.current !== null) {
          setActivePetalId(null);
          haptics.selection();
        }
        return;
      }

      const candidate = PETALS[closestIdx];
      if (candidate && candidate.id !== activePetalIdRef.current) {
        setActivePetalId(candidate.id);
        haptics.selection();
      }
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      let currentActiveId = activePetalIdRef.current;

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
            currentActiveId = petalBtn.getAttribute("data-petal-id");
          }
        }
      }

      if (currentActiveId) {
        const item = PETALS.find((p) => p.id === currentActiveId);
        if (item) {
          executeAction(item);
          return;
        }
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

  const activeIndex = PETALS.findIndex((p) => p.id === activePetalId);
  const activePetal = activeIndex >= 0 ? PETALS[activeIndex] : null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-auto select-none overflow-hidden animate-in fade-in duration-200">
      {/* Rose-tinted Ambient Hologram Backdrop */}
      <div
        className="fixed inset-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 380px at ${centerPos.x}px ${centerPos.y}px, rgba(30, 15, 25, 0.90) 0%, rgba(0, 0, 0, 0.95) 85%)`,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
        onClick={() => {
          haptics.impactLight();
          onClose();
        }}
      />

      {/* SVG Orbit Track (Clean without any connecting lasers) */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
        <circle
          cx={centerPos.x}
          cy={centerPos.y}
          r={radius}
          fill="none"
          stroke="rgba(244, 63, 94, 0.12)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
      </svg>

      {/* Anchored Stage at Origin */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${centerPos.x}px`,
          top: `${centerPos.y}px`,
        }}
      >
        {/* Fan of Beloved Petals (Blooming UP-LEFT into view) */}
        {PETALS.map((petal, idx) => {
          const angleDeg = angles[idx];
          const angleRad = (angleDeg * Math.PI) / 180;
          const x = Math.round(Math.cos(angleRad) * radius);
          const y = Math.round(Math.sin(angleRad) * radius);
          const Icon = petal.icon;
          const isSelected = activePetalId === petal.id;

          return (
            <div
              key={petal.id}
              className="absolute transition-all duration-200 ease-out flex items-center justify-center pointer-events-none"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: `translate(-50%, -50%) scale(${isSelected ? 1.35 : 1})`,
                zIndex: isSelected ? 50 : 20,
              }}
            >
              <button
                type="button"
                data-petal-id={petal.id}
                onClick={() => executeAction(petal)}
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
                style={{ width: "52px", height: "52px" }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-transparent via-white/[0.04] to-white/20 pointer-events-none" />
                <Icon
                  className={clsx(
                    "w-5 h-5 drop-shadow-md transition-transform duration-200",
                    isSelected ? "text-white scale-110" : "opacity-90"
                  )}
                />
              </button>

              {/* Floating Pill Label - Only visible when petal is selected/active */}
              {isSelected && (
                <div
                  className={clsx(
                    "absolute left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wide border shadow-2xl transition-all duration-200 pointer-events-none animate-in fade-in zoom-in-90",
                    "bg-white text-zinc-950 border-white shadow-[0_0_20px_rgba(255,255,255,0.8)] scale-110 z-50",
                    centerPos.isTop ? "top-15" : "-bottom-7"
                  )}
                >
                  {petal.label}
                </div>
              )}
            </div>
          );
        })}

        {/* Center Anchor Hub (Rose Heart Core without laser lines) */}
        <div
          className={clsx(
            "absolute flex flex-col items-center justify-center transition-all duration-200 border-2 backdrop-blur-2xl shadow-2xl rounded-full",
            activePetal
              ? "bg-zinc-950/95 border-rose-400 text-rose-400 scale-95 shadow-[0_0_25px_rgba(244,63,94,0.4)]"
              : "bg-gradient-to-tr from-rose-600 via-pink-600 to-rose-700 border-rose-300/80 text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] scale-100"
          )}
          style={{
            width: "58px",
            height: "58px",
            left: "0px",
            top: "0px",
            transform: "translate(-50%, -50%)",
          }}
        >
          <Heart
            className={clsx(
              "w-6 h-6 fill-current transition-transform duration-200",
              activePetal ? "scale-90" : "scale-100 animate-pulse"
            )}
          />
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider mt-0.5">
            {activePetal ? "Send" : "Slide"}
          </span>
        </div>
      </div>

      {/* Floating WhatsApp Message Preview Card - Centered Horizontally on Screen */}
      {activePetal && (
        <div
          className={clsx(
            "fixed left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl bg-zinc-950/95 border border-white/20 text-white shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap pointer-events-none z-50 flex items-center gap-3.5 max-w-[92vw]",
            centerPos.isTop ? "top-28" : "bottom-56"
          )}
          style={{
            boxShadow: `0 0 35px ${activePetal.glowColor}, 0 20px 40px rgba(0,0,0,0.8)`,
          }}
        >
          <div
            className={clsx(
              "p-2 rounded-xl border flex items-center justify-center flex-shrink-0",
              activePetal.badgeColor
            )}
          >
            {React.createElement(activePetal.icon, {
              className: clsx("w-4 h-4", activePetal.textColor),
            })}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className={clsx("font-bold text-xs sm:text-sm tracking-tight", activePetal.textColor)}>
                {activePetal.title}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                To: {partnerName}
              </span>
            </div>
            <span className="text-zinc-200 text-xs font-mono font-medium mt-0.5 italic truncate max-w-[200px] sm:max-w-[280px]">
              &ldquo;{activePetal.text}&rdquo;
            </span>
          </div>

          <div className="pl-2 border-l border-white/15 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex-shrink-0">
            <MessageCircle className="w-3.5 h-3.5 fill-emerald-400/20 text-emerald-400" />
            <span>WhatsApp</span>
          </div>
        </div>
      )}
    </div>
  );
}
