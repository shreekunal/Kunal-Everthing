"use client";

import React, { useState } from "react";
import { Sparkles, Flame, Shield, Heart, Zap, Award } from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";

interface CoStudyCompanionProps {
  status: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";
  isCompanionMode: boolean;
  onToggleCompanionMode: () => void;
  activeSeconds: number;
  userName?: string;
}

export function CoStudyCompanion({
  status,
  isCompanionMode,
  onToggleCompanionMode,
  activeSeconds,
  userName = "Disciple",
}: CoStudyCompanionProps) {
  const [bubbleText, setBubbleText] = useState<string | null>(null);

  const getStatusQuote = () => {
    switch (status) {
      case "RUNNING":
        return "Sprout is channeling deep monk flow with you... (+15% XP Active)";
      case "PAUSED":
        return "Breath in. Sprout is holding the focus field until you return.";
      case "COMPLETED":
        return "Session accomplished! Monk aura unlocked +15% Companion XP! 🎉";
      case "IDLE":
      default:
        return isCompanionMode
          ? "Cyber Sprout is ready to co-study. +15% XP bonus awaits!"
          : "Companion mode off. Tap to activate Cyber Sprout presence.";
    }
  };

  const handlePetTap = () => {
    haptics.selection();
    const quotes = [
      "One unbroken breath at a time.",
      "True focus is silent, relentless momentum.",
      "Sprout believes in your discipline today!",
      "Distractions fade, mastery remains.",
      "+15% Companion XP granted upon clean session finish!",
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setBubbleText(quote);
    setTimeout(() => setBubbleText(null), 4000);
  };

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-950 via-zinc-900/60 to-zinc-950 border border-white/10 relative overflow-hidden transition-all duration-300">
      {/* Background ambient glow when active */}
      {status === "RUNNING" && isCompanionMode && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none animate-pulse" />
      )}

      <div className="flex items-center justify-between gap-3 relative z-10">
        {/* Pet Avatar & Breathing Aura */}
        <div className="flex items-center gap-3">
          <div
            onClick={handlePetTap}
            role="button"
            tabIndex={0}
            className={clsx(
              "relative w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 cursor-pointer select-none active:scale-95",
              status === "RUNNING" && isCompanionMode
                ? "bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pet-float"
                : status === "COMPLETED"
                ? "bg-brand-red/20 border-brand-red/50 shadow-glow-red animate-bounce"
                : status === "PAUSED"
                ? "bg-zinc-900/80 border-white/10 opacity-75"
                : "bg-white/[0.04] border-white/10 hover:border-emerald-500/30"
            )}
            title="Tap Cyber Sprout for focus wisdom"
          >
            {/* Meditating Cyber Sprout Pixel Art SVG */}
            <svg
              viewBox="0 0 24 24"
              className={clsx(
                "w-10 h-10 drop-shadow-md transition-transform duration-300",
                status === "RUNNING" && "scale-105"
              )}
              shapeRendering="crispEdges"
            >
              {/* Pet Body */}
              <rect x="7" y="8" width="10" height="10" rx="1" fill="#FFFFFF" />
              <rect x="8" y="9" width="8" height="8" fill="#F4F4F5" />

              {/* Head Sprout Leaves with Energy Glow */}
              <g className={clsx(status === "RUNNING" ? "animate-pulse" : "animate-pet-float")}>
                <rect x="11" y="5" width="2" height="3" fill="#10B981" />
                <rect x="9" y="4" width="2" height="2" fill="#10B981" />
                <rect x="13" y="4" width="2" height="2" fill="#10B981" />
                {status === "RUNNING" && (
                  <rect x="11" y="3" width="2" height="1" fill="#34D399" />
                )}
              </g>

              {/* Eyes reacting to state */}
              {status === "RUNNING" ? (
                // Meditating Closed Serene Zen Eyes
                <g>
                  <rect x="8" y="12" width="3" height="1" fill="#059669" />
                  <rect x="13" y="12" width="3" height="1" fill="#059669" />
                  <rect x="7" y="14" width="2" height="1" fill="#EF4444" opacity="0.6" />
                  <rect x="15" y="14" width="2" height="1" fill="#EF4444" opacity="0.6" />
                </g>
              ) : status === "PAUSED" ? (
                // Alert / Waiting Eyes
                <g>
                  <rect x="9" y="11" width="2" height="2" fill="#71717A" />
                  <rect x="13" y="11" width="2" height="2" fill="#71717A" />
                </g>
              ) : status === "COMPLETED" ? (
                // Starburst Joyful Eyes
                <g>
                  <rect x="8" y="11" width="3" height="2" fill="#EF4444" />
                  <rect x="13" y="11" width="3" height="2" fill="#EF4444" />
                  <rect x="7" y="14" width="2" height="1" fill="#10B981" />
                  <rect x="15" y="14" width="2" height="1" fill="#10B981" />
                </g>
              ) : (
                // Open Curious Eyes
                <g className="animate-pet-eyes">
                  <rect x="9" y="11" width="2" height="3" fill="#000000" />
                  <rect x="13" y="11" width="2" height="3" fill="#000000" />
                  <rect x="7" y="14" width="2" height="1" fill="#EF4444" />
                  <rect x="15" y="14" width="2" height="1" fill="#EF4444" />
                </g>
              )}

              {/* Mini Feet in Lotus Meditation Pose */}
              <rect x="7" y="18" width="3" height="1.5" fill="#A1A1AA" />
              <rect x="14" y="18" width="3" height="1.5" fill="#A1A1AA" />
            </svg>

            {/* Pulsing Monk Halo Ring */}
            {status === "RUNNING" && isCompanionMode && (
              <span className="absolute -inset-1 rounded-2xl border border-emerald-500/50 animate-ping opacity-30 pointer-events-none" />
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold font-mono text-white tracking-tight">
                Cyber Sprout
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-semibold flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                {status === "RUNNING" ? "Monk Flow" : "Co-Study"}
              </span>
              {isCompanionMode && (
                <span className="text-[10px] font-mono text-red-300 font-bold">
                  +15% XP
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-300 font-mono mt-0.5 line-clamp-2 leading-tight">
              {bubbleText || getStatusQuote()}
            </p>
          </div>
        </div>

        {/* Co-Study Mode Toggle Switch */}
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            onToggleCompanionMode();
          }}
          className={clsx(
            "shrink-0 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold transition-all active:scale-95 flex items-center gap-1",
            isCompanionMode
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
              : "bg-white/[0.04] text-zinc-400 border-white/10 hover:text-white"
          )}
          title={isCompanionMode ? "Co-Study bonus enabled" : "Enable Co-Study bonus"}
        >
          <span>🐾</span>
          <span>{isCompanionMode ? "Active" : "Off"}</span>
        </button>
      </div>
    </div>
  );
}
