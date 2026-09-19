"use client";

import React, { useState } from "react";
import { haptics } from "@/lib/haptics";
import { Sparkles, Skull, Heart, Shield } from "lucide-react";

interface PixelPetProps {
  level: number;
  totalXP: number;
  isPetDead?: boolean;
  purityStreak?: number;
  dietStreak?: number;
  todayDeducted?: number;
}

export function PixelPet({
  level,
  totalXP,
  isPetDead = false,
  purityStreak = 0,
  dietStreak = 0,
  todayDeducted = 0,
}: PixelPetProps) {
  const [dialogText, setDialogText] = useState<string | null>(null);
  const [isBouncing, setIsBouncing] = useState(false);

  // Determine pet mood
  const isEnergized = purityStreak >= 7 && dietStreak >= 3;
  const isSlumped = todayDeducted > 0;

  // Monk quotes based on state
  const wisdomQuotes = isPetDead
    ? [
        "Your infractions broke the protocol... I need positive XP to revive! 💀",
        "Discipline collapsed into the void. Log work or habits to bring me back!",
        "R.I.P. Monk Spirit. Redeem yourself with clean focus today.",
      ]
    : isSlumped
    ? [
        "Ouch! That penalty hurt... stay strong Kunal, we bounce back!",
        "Pain is temporary. Discipline is forever. No more slips today.",
        "Dust it off, Kunal. Eyes on the horizon!",
      ]
    : isEnergized
    ? [
        "Unstoppable momentum, Kunal! Both streaks burning bright! 🔥",
        "Apex focus unlocked. You are sculpting iron will today!",
        "Look at us! 7+ days pure and clean. Grandmaster level energy!",
      ]
    : [
        "Steady breath, Kunal. One focused minute at a time.",
        "Discipline is choosing between what you want now and what you want most.",
        "Your companion is vigilant. Today is another victory.",
        "Focus on the protocol. The rewards take care of themselves.",
      ];

  const handlePetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPetDead) {
      haptics.warning();
    } else {
      haptics.impactMedium();
    }
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    const randomQuote = wisdomQuotes[Math.floor(Math.random() * wisdomQuotes.length)];
    setDialogText(randomQuote);
    setTimeout(() => setDialogText(null), 4500);
  };

  // Determine evolution form based on level/XP
  const getPetForm = () => {
    if (isPetDead) {
      return {
        name: "Resting Soul",
        sub: "Deceased (Negative XP)",
        color: "#EF4444",
        type: "TOMBSTONE",
      };
    }
    if (level >= 15 || totalXP >= 5000) {
      return {
        name: "Celestial Phoenix",
        sub: "Tier V Ascended",
        color: "#EF4444",
        type: "PHOENIX",
      };
    }
    if (level >= 10 || totalXP >= 2000) {
      return {
        name: "Monk Dragon",
        sub: "Tier IV Master",
        color: "#EF4444",
        type: "DRAGON",
      };
    }
    if (level >= 6 || totalXP >= 750) {
      return {
        name: "Shadow Wolf",
        sub: "Tier III Ascetic",
        color: "#FFFFFF",
        type: "WOLF",
      };
    }
    if (level >= 3 || totalXP >= 250) {
      return {
        name: "Monk Fox Cub",
        sub: "Tier II Practitioner",
        color: "#EF4444",
        type: "FOX",
      };
    }
    return {
      name: "Cyber Sprout",
      sub: "Tier I Disciple",
      color: "#FFFFFF",
      type: "SPROUT",
    };
  };

  const form = getPetForm();

  return (
    <div className="relative flex items-center gap-3 select-none">
      {/* Interactive Pet Canvas / Sprite */}
      <button
        type="button"
        onClick={handlePetClick}
        title="Tap companion for monk wisdom"
        className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center p-1.5 transition-all duration-300 group ${
          isPetDead
            ? "bg-red-950/40 border border-red-500/50 shadow-glow-red animate-pet-dead"
            : isEnergized
            ? "bg-white/[0.06] border border-white/20 shadow-glow-red animate-pet-float"
            : "bg-white/[0.03] border border-white/10 hover:border-brand-red/40 animate-pet-breathe"
        } ${isBouncing ? "scale-90" : "hover:scale-105 active:scale-95"}`}
      >
        {/* Render Pixel Art Matrix */}
        {form.type === "TOMBSTONE" && (
          <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-md" shapeRendering="crispEdges">
            {/* Tombstone Arch */}
            <rect x="7" y="3" width="10" height="2" fill="#71717A" />
            <rect x="5" y="5" width="14" height="14" fill="#3F3F46" />
            <rect x="3" y="19" width="18" height="4" fill="#27272A" />
            {/* Scarlet Glowing Cross / Cracks */}
            <rect x="11" y="7" width="2" height="7" fill="#EF4444" />
            <rect x="9" y="9" width="6" height="2" fill="#EF4444" />
            {/* R.I.P dots */}
            <rect x="7" y="15" width="2" height="2" fill="#EF4444" />
            <rect x="11" y="15" width="2" height="2" fill="#EF4444" />
            <rect x="15" y="15" width="2" height="2" fill="#EF4444" />
          </svg>
        )}

        {form.type === "SPROUT" && (
          <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-md" shapeRendering="crispEdges">
            {/* Head/Body */}
            <rect x="7" y="8" width="10" height="10" rx="1" fill="#FFFFFF" />
            {/* Inner shading */}
            <rect x="8" y="9" width="8" height="8" fill="#F4F4F5" />
            {/* Sprout Leaves on Head */}
            <g className="animate-pet-float">
              <rect x="11" y="5" width="2" height="3" fill="#10B981" />
              <rect x="9" y="4" width="2" height="2" fill="#10B981" />
              <rect x="13" y="4" width="2" height="2" fill="#10B981" />
            </g>
            {/* Pixel Eyes (Blinking/Slumped) */}
            {isSlumped ? (
              <>
                <rect x="8" y="12" width="2" height="2" fill="#EF4444" />
                <rect x="14" y="12" width="2" height="2" fill="#EF4444" />
                {/* Bandage */}
                <rect x="7" y="8" width="4" height="2" fill="#F87171" />
              </>
            ) : (
              <g className="animate-pet-eyes">
                <rect x="9" y="11" width="2" height="3" fill="#000000" />
                <rect x="13" y="11" width="2" height="3" fill="#000000" />
                {/* Blushing cheeks */}
                <rect x="7" y="14" width="2" height="1" fill="#EF4444" />
                <rect x="15" y="14" width="2" height="1" fill="#EF4444" />
              </g>
            )}
            {/* Mini Feet */}
            <rect x="8" y="18" width="2" height="2" fill="#A1A1AA" />
            <rect x="14" y="18" width="2" height="2" fill="#A1A1AA" />
          </svg>
        )}

        {form.type === "FOX" && (
          <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-md" shapeRendering="crispEdges">
            {/* Fox Ears */}
            <rect x="6" y="5" width="3" height="3" fill="#EF4444" />
            <rect x="15" y="5" width="3" height="3" fill="#EF4444" />
            <rect x="7" y="6" width="1" height="2" fill="#FFFFFF" />
            <rect x="16" y="6" width="1" height="2" fill="#FFFFFF" />
            {/* Head */}
            <rect x="7" y="8" width="10" height="8" fill="#EF4444" />
            <rect x="8" y="13" width="8" height="4" fill="#FFFFFF" />
            {/* Eyes */}
            <g className="animate-pet-eyes">
              <rect x="8" y="10" width="2" height="2" fill="#000000" />
              <rect x="14" y="10" width="2" height="2" fill="#000000" />
            </g>
            {/* Snout */}
            <rect x="11" y="13" width="2" height="2" fill="#000000" />
            {/* Body */}
            <rect x="8" y="16" width="8" height="5" fill="#EF4444" />
            {/* Tail Wag */}
            <g className="animate-pet-tail">
              <rect x="17" y="15" width="3" height="4" fill="#EF4444" />
              <rect x="19" y="14" width="2" height="2" fill="#FFFFFF" />
            </g>
          </svg>
        )}

        {form.type === "WOLF" && (
          <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-md" shapeRendering="crispEdges">
            {/* Wolf Pointed Ears */}
            <rect x="5" y="4" width="3" height="4" fill="#E4E4E7" />
            <rect x="16" y="4" width="3" height="4" fill="#E4E4E7" />
            <rect x="6" y="5" width="1" height="2" fill="#71717A" />
            <rect x="17" y="5" width="1" height="2" fill="#71717A" />
            {/* Head & Mane */}
            <rect x="6" y="8" width="12" height="8" fill="#E4E4E7" />
            {/* Crimson Piercing Eyes */}
            <g className="animate-pet-eyes">
              <rect x="8" y="10" width="2" height="2" fill="#EF4444" />
              <rect x="14" y="10" width="2" height="2" fill="#EF4444" />
            </g>
            {/* Snout */}
            <rect x="10" y="12" width="4" height="3" fill="#A1A1AA" />
            <rect x="11" y="13" width="2" height="2" fill="#000000" />
            {/* Body */}
            <rect x="7" y="16" width="10" height="5" fill="#71717A" />
            {/* Tail Wag */}
            <g className="animate-pet-tail">
              <rect x="17" y="15" width="3" height="4" fill="#71717A" />
              <rect x="19" y="14" width="2" height="2" fill="#E4E4E7" />
            </g>
          </svg>
        )}

        {form.type === "DRAGON" && (
          <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-md" shapeRendering="crispEdges">
            {/* Dragon Horns */}
            <rect x="5" y="3" width="2" height="4" fill="#EF4444" />
            <rect x="17" y="3" width="2" height="4" fill="#EF4444" />
            <rect x="7" y="5" width="2" height="2" fill="#F87171" />
            <rect x="15" y="5" width="2" height="2" fill="#F87171" />
            {/* Dragon Head */}
            <rect x="6" y="7" width="12" height="8" fill="#EF4444" />
            {/* Golden Fierce Eyes */}
            <g className="animate-pet-eyes">
              <rect x="8" y="9" width="2" height="2" fill="#F59E0B" />
              <rect x="14" y="9" width="2" height="2" fill="#F59E0B" />
            </g>
            {/* Snout & Whiskers */}
            <rect x="9" y="12" width="6" height="3" fill="#DC2626" />
            <rect x="10" y="13" width="1" height="1" fill="#000000" />
            <rect x="13" y="13" width="1" height="1" fill="#000000" />
            {/* Serpentine Crest */}
            <rect x="8" y="16" width="8" height="5" fill="#B91C1C" />
            <rect x="11" y="17" width="2" height="4" fill="#F59E0B" />
          </svg>
        )}

        {form.type === "PHOENIX" && (
          <svg viewBox="0 0 24 24" className="w-10 h-10 drop-shadow-md" shapeRendering="crispEdges">
            {/* Phoenix Crown Feathers */}
            <rect x="11" y="2" width="2" height="4" fill="#EF4444" />
            <rect x="9" y="3" width="2" height="3" fill="#F59E0B" />
            <rect x="13" y="3" width="2" height="3" fill="#F59E0B" />
            {/* Head */}
            <rect x="8" y="6" width="8" height="6" fill="#EF4444" />
            {/* Sharp Eyes */}
            <g className="animate-pet-eyes">
              <rect x="9" y="8" width="2" height="2" fill="#FFFFFF" />
              <rect x="13" y="8" width="2" height="2" fill="#FFFFFF" />
            </g>
            {/* Beak */}
            <rect x="11" y="10" width="2" height="2" fill="#F59E0B" />
            {/* Flapping Wings */}
            <g className="animate-pet-wings">
              <rect x="3" y="9" width="4" height="7" fill="#DC2626" />
              <rect x="17" y="9" width="4" height="7" fill="#DC2626" />
            </g>
            {/* Fire Body */}
            <rect x="7" y="12" width="10" height="7" fill="#EF4444" />
            <rect x="9" y="14" width="6" height="4" fill="#F59E0B" />
            {/* Tail Embers */}
            <rect x="10" y="19" width="4" height="3" fill="#F59E0B" />
          </svg>
        )}

        {/* Small Status Indicator Badge on Corner */}
        {isPetDead ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 border border-black flex items-center justify-center text-[9px] text-white">
            💀
          </span>
        ) : isEnergized ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-black flex items-center justify-center text-[9px] text-white">
            ✨
          </span>
        ) : isSlumped ? (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border border-black flex items-center justify-center text-[9px] text-white">
            🩹
          </span>
        ) : null}
      </button>

      {/* Pet Meta Text */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1">
            {form.name}
          </h4>
          {isEnergized && (
            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.2 rounded">
              Sparkling
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-zinc-400 mt-0.5 truncate">
          {form.sub} • Tap for wisdom
        </p>
      </div>

      {/* Dynamic Pop-up Monk Wisdom Dialogue Bubble */}
      {dialogText && (
        <div className="absolute left-0 -top-12 z-30 max-w-xs px-3 py-1.5 rounded-xl bg-black border border-brand-red/50 text-white text-[11px] font-mono shadow-glow-red animate-in fade-in duration-200">
          <p className="leading-snug">{dialogText}</p>
          <div className="absolute left-6 -bottom-1.5 w-3 h-3 bg-black border-r border-b border-brand-red/50 rotate-45" />
        </div>
      )}
    </div>
  );
}
