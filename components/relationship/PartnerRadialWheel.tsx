"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  Smile,
  Moon,
  Sun,
  Sparkles,
  BookOpen,
  X,
  Send,
  MessageCircle,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";
import { offlineCache } from "@/lib/offlineCache";
import clsx from "clsx";

interface PartnerRadialWheelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_TEMPLATES = [
  {
    id: "love",
    label: "Love You",
    icon: Heart,
    color: "from-rose-500 to-pink-600",
    glow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]",
    borderColor: "border-rose-400/60",
    textColor: "text-rose-300",
    text: "I love you so much ❤️",
  },
  {
    id: "affection",
    label: "Pyara Bacha",
    icon: Smile,
    color: "from-pink-500 to-rose-600",
    glow: "shadow-[0_0_15px_rgba(236,72,153,0.4)]",
    borderColor: "border-pink-400/60",
    textColor: "text-pink-300",
    text: "Mera bacha pyara sa",
  },
  {
    id: "night",
    label: "Good Night",
    icon: Moon,
    color: "from-indigo-500 to-purple-600",
    glow: "shadow-[0_0_15px_rgba(99,102,241,0.4)]",
    borderColor: "border-indigo-400/60",
    textColor: "text-indigo-300",
    text: "Good Night babu .. Take Care",
  },
  {
    id: "morning",
    label: "Good Morning",
    icon: Sun,
    color: "from-amber-500 to-orange-600",
    glow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]",
    borderColor: "border-amber-400/60",
    textColor: "text-amber-300",
    text: "Good Morning Babyyyy",
  },
  {
    id: "shayari",
    label: "Sweet Shayari",
    icon: Sparkles,
    color: "from-purple-500 to-pink-500",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]",
    borderColor: "border-purple-400/60",
    textColor: "text-purple-300",
    text: "Sometimes I just randomly smile because I remember that you're mine. ❤️",
  },
  {
    id: "hub",
    label: "Partner Hub",
    icon: BookOpen,
    color: "from-zinc-700 to-zinc-800",
    glow: "shadow-[0_0_15px_rgba(255,255,255,0.15)]",
    borderColor: "border-white/20",
    textColor: "text-zinc-200",
    text: "",
  },
];

export function PartnerRadialWheel({ isOpen, onClose }: PartnerRadialWheelProps) {
  const router = useRouter();
  const [partnerData, setPartnerData] = useState<any>(null);
  const [senderName, setSenderName] = useState<string>("Kunal");

  // Load partner data & sender name from cache & API
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cachedUser = localStorage.getItem("kunal_os_current_user_name");
    if (cachedUser) setSenderName(cachedUser);

    const cachedPartner = offlineCache.get<any>("partner_profile");
    if (cachedPartner) {
      setPartnerData(cachedPartner);
    }

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

  // Back button integration: dismiss wheel on back gesture
  useEffect(() => {
    if (!isOpen) return;
    return backButton.register(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const partnerNickname = partnerData?.nickname || partnerData?.name || "My Love";
  const partnerPhone = partnerData?.phone || "";
  const cleanPhone = partnerPhone.replace(/[^0-9]/g, "");

  // Dispatch message directly to WhatsApp
  const handleDispatch = (template: (typeof DEFAULT_TEMPLATES)[0]) => {
    haptics.impactMedium();

    if (template.id === "hub") {
      onClose();
      router.push("/relationship");
      return;
    }

    const formattedMessage = `${partnerNickname}... ❤️\n\n"${template.text}"\n\n—${senderName}`;
    const encoded = encodeURIComponent(formattedMessage);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(url, "_blank");
    onClose();
  };

  // Radial geometry calculation: 6 items in an upward semi-circle arc (-165° to -15°)
  const radius = 115; // px from center origin
  const angles = [-165, -135, -105, -75, -45, -15];

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end items-center pointer-events-auto select-none animate-in fade-in duration-200">
      {/* Dark Blurred Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={() => {
          haptics.impactLight();
          onClose();
        }}
      />

      {/* Main Radial Bloom Origin Container (Anchored right above Bottom Dock) */}
      <div className="relative z-10 mb-20 flex flex-col items-center">
        {/* Radial Petals Bloom Arc */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          {DEFAULT_TEMPLATES.map((item, idx) => {
            const angleDeg = angles[idx];
            const angleRad = (angleDeg * Math.PI) / 180;
            const x = Math.round(Math.cos(angleRad) * radius);
            const y = Math.round(Math.sin(angleRad) * radius);
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className="absolute flex flex-col items-center justify-center transition-all duration-300 ease-out animate-in zoom-in-50"
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  transitionDelay: `${idx * 30}ms`,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleDispatch(item)}
                  title={item.label}
                  className={clsx(
                    "w-12 h-12 rounded-full border flex items-center justify-center text-white bg-gradient-to-br transition-transform duration-150 active:scale-90 hover:scale-110",
                    item.color,
                    item.borderColor,
                    item.glow
                  )}
                >
                  <Icon className="w-5 h-5 drop-shadow-md" />
                </button>

                {/* Floating Micro-Pill Label */}
                <span
                  className={clsx(
                    "mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold whitespace-nowrap bg-black/90 border border-white/20 shadow-2xl backdrop-blur-md pointer-events-none",
                    item.textColor
                  )}
                >
                  {item.label}
                </span>
              </div>
            );
          })}

          {/* Central Pulsing Heart Hub */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-pink-500 border-2 border-rose-300 flex flex-col items-center justify-center shadow-[0_0_25px_rgba(244,63,94,0.6)] animate-pulse">
            <Heart className="w-6 h-6 text-white fill-white" />
            <span className="text-[9px] font-mono font-bold text-white tracking-wider truncate max-w-[50px] leading-tight">
              {partnerNickname}
            </span>
          </div>
        </div>

        {/* Dismiss / Close Pill */}
        <button
          type="button"
          onClick={() => {
            haptics.impactLight();
            onClose();
          }}
          className="mt-14 px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 text-zinc-300 text-xs font-mono flex items-center gap-1.5 backdrop-blur-md active:scale-95 transition-all"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close Wheel</span>
        </button>
      </div>
    </div>
  );
}
