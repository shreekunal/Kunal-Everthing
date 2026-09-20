"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Smile,
  Moon,
  Sun,
  Sparkles,
  BookOpen,
  X,
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

// 6 Core Petals with strictly pure, raw template strings
const PETALS = [
  {
    id: "love",
    label: "Love You",
    icon: Heart,
    color: "from-rose-500 to-pink-600",
    glow: "shadow-[0_0_20px_rgba(244,63,94,0.6)]",
    borderColor: "border-rose-400",
    textColor: "text-rose-300",
    text: "I love you so much ❤️",
  },
  {
    id: "affection",
    label: "Pyara Bacha",
    icon: Smile,
    color: "from-pink-500 to-rose-600",
    glow: "shadow-[0_0_20px_rgba(236,72,153,0.6)]",
    borderColor: "border-pink-400",
    textColor: "text-pink-300",
    text: "Mera bacha pyara sa",
  },
  {
    id: "night",
    label: "Good Night",
    icon: Moon,
    color: "from-indigo-500 to-purple-600",
    glow: "shadow-[0_0_20px_rgba(99,102,241,0.6)]",
    borderColor: "border-indigo-400",
    textColor: "text-indigo-300",
    text: "Good Night babu .. Take Care",
  },
  {
    id: "morning",
    label: "Good Morning",
    icon: Sun,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.6)]",
    borderColor: "border-amber-400",
    textColor: "text-amber-300",
    text: "Good Morning Babyyyy",
  },
  {
    id: "shayari",
    label: "Shayari",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.6)]",
    borderColor: "border-purple-400",
    textColor: "text-purple-300",
    text: "Sometimes I just randomly smile because I remember that you're mine. ❤️",
  },
  {
    id: "hub",
    label: "Partner Hub",
    icon: BookOpen,
    color: "from-zinc-700 to-zinc-800",
    glow: "shadow-[0_0_15px_rgba(255,255,255,0.3)]",
    borderColor: "border-white/30",
    textColor: "text-zinc-200",
    text: "",
  },
];

export function PartnerRadialWheel({ isOpen, onClose, origin }: PartnerRadialWheelProps) {
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<any>(null);
  const [activePetalId, setActivePetalId] = useState<string | null>(null);
  const activePetalIdRef = useRef<string | null>(null);

  // Keep ref in sync for release-to-launch event handler
  useEffect(() => {
    activePetalIdRef.current = activePetalId;
  }, [activePetalId]);

  // Load partner data from cache & API
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

  // Execute chosen action (raw message to WhatsApp or Hub navigation)
  const executeAction = useCallback(
    (item: (typeof PETALS)[0]) => {
      haptics.impactMedium();

      if (item.id === "hub") {
        onClose();
        router.push("/relationship");
        return;
      }

      // STRICTLY RAW MESSAGE TEXT: Zero prefix, Zero quotes, Zero sender signature
      const messageText = item.text;
      const encoded = encodeURIComponent(messageText);
      const url = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encoded}`
        : `https://wa.me/?text=${encoded}`;

      window.open(url, "_blank");
      onClose();
    },
    [cleanPhone, onClose, router]
  );

  // Geometry calculations: default origin falls back to bottom-dock Love button
  const getCenterCoords = useCallback(() => {
    if (typeof window === "undefined") return { x: 250, y: 600, isTop: false };

    if (origin && origin.x && origin.y) {
      const isTop = origin.y < window.innerHeight / 2;
      return { x: origin.x, y: origin.y, isTop };
    }

    // Default mobile fallback: tab 4 on bottom nav (70% width, 50px from bottom)
    return {
      x: Math.round(window.innerWidth * 0.7),
      y: window.innerHeight - 50,
      isTop: false,
    };
  }, [origin]);

  const centerPos = getCenterCoords();
  const radius = 145; // px (expanded gap between center and radial buttons)

  // Angles: upward fan arc if near bottom, downward fan arc if near top
  const angles = centerPos.isTop
    ? [30, 60, 90, 120, 150, 180]
    : [-170, -145, -120, -95, -70, -45];

  // Traditional Radial Drag & Release Engine (pointermove & pointerup)
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

      const candidate = PETALS[closestIdx];
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

  const activePetal = PETALS.find((p) => p.id === activePetalId);

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

      {/* Origin Point anchored exactly at Touch Position */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${centerPos.x}px`,
          top: `${centerPos.y}px`,
        }}
      >
        {/* Dynamic Petals blooming from center */}
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
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ease-out"
              style={{
                transform: `translate(${x}px, ${y}px) scale(${isSelected ? 1.45 : 1})`,
                zIndex: isSelected ? 50 : 20,
              }}
            >
              <button
                type="button"
                data-petal-id={petal.id}
                onClick={() => executeAction(petal)}
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

        {/* Center Anchor Hub (Where thumb was placed) */}
        <div
          className={clsx(
            "absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full flex flex-col items-center justify-center transition-transform duration-150 border-2",
            activePetalId
              ? "bg-zinc-900/90 border-white/20 text-zinc-500 scale-90"
              : "bg-gradient-to-tr from-rose-600 to-pink-500 border-rose-300 text-white shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse scale-100"
          )}
        >
          <Heart className="w-5 h-5 fill-current" />
          <span className="text-[8px] font-mono font-bold uppercase mt-0.5 tracking-wider">
            {activePetalId ? "Release" : "Hold & Slide"}
          </span>
        </div>

        {/* Live Message Preview Tooltip (Appears above the arc as you glide) */}
        {activePetal && (
          <div
            className={clsx(
              "absolute -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/95 border border-white/25 text-white text-xs sm:text-sm font-mono shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap pointer-events-none z-50",
              centerPos.isTop ? "top-48" : "-top-48"
            )}
          >
            <span className="text-zinc-400 mr-2 font-bold uppercase text-[10px] tracking-wider">Preview:</span>
            <span className={clsx("font-bold tracking-tight", activePetal.textColor)}>
              {activePetal.id === "hub" ? "Open Full Partner Hub" : activePetal.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
