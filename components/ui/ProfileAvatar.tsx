"use client";

import React, { useState } from "react";
import { clsx } from "clsx";

export type Gender = "MALE" | "FEMALE";

interface ProfileAvatarProps {
  name: string;
  gender?: Gender;
  size?: "sm" | "md" | "lg" | "xl";
  isSelected?: boolean;
  className?: string;
  onClick?: () => void;
  showLabel?: boolean;
}

export function ProfileAvatar({
  name,
  gender = "MALE",
  size = "md",
  isSelected = false,
  className,
  onClick,
  showLabel = false,
}: ProfileAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const isFemale =
    gender === "FEMALE" ||
    name.toLowerCase().includes("mradul") ||
    name.toLowerCase().includes("golu");

  const avatarSrc = isFemale ? "/female-avatar.svg" : "/male-avatar.svg";

  // Size configurations
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-28 h-28 sm:w-32 sm:h-32",
  }[size];

  // Prime Video Glow & Border Styling
  const ringClasses = isFemale
    ? isSelected
      ? "border-2 border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.6)] ring-2 ring-rose-500/50 scale-105"
      : "border-2 border-rose-500/40 hover:border-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
    : isSelected
    ? "border-2 border-brand-red shadow-[0_0_25px_rgba(239,68,68,0.6)] ring-2 ring-brand-red/50 scale-105"
    : "border-2 border-brand-red/40 hover:border-brand-red hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]";

  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center group select-none",
        onClick && "cursor-pointer",
        className
      )}
    >
      {/* Prime Video Circular Avatar Container */}
      <div
        className={clsx(
          "relative rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 transform bg-black",
          sizeClasses,
          ringClasses
        )}
      >
        {!imgError ? (
          <img
            src={avatarSrc}
            alt={name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
          />
        ) : isFemale ? (
          /* High-Fidelity Inline Fallback if network blocked on phone */
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <circle cx="50" cy="50" r="48" fill="#1c1917" />
            <circle cx="50" cy="50" r="40" fill="#f43f5e" fillOpacity="0.25" />
            <circle cx="50" cy="20" r="7" fill="#f43f5e" />
            <path d="M34 50 C32 30, 42 22, 50 22 C58 22, 68 30, 66 50 C62 38, 56 34, 50 34 C44 34, 38 38, 34 50 Z" fill="#be123c" />
            <ellipse cx="50" cy="52" rx="16" ry="19" fill="#ffe4e6" />
            <path d="M43 49 Q45 47 47 49" stroke="#881337" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M53 49 Q55 47 57 49" stroke="#881337" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="42" cy="54" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.6" />
            <ellipse cx="58" cy="54" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.6" />
            <path d="M47 58 Q50 61 53 58" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M28 95 C30 82, 38 74, 50 74 C62 74, 70 82, 72 95 Z" fill="#be123c" />
          </svg>
        ) : (
          /* High-Fidelity Inline Fallback for Male */
          <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none">
            <circle cx="50" cy="50" r="48" fill="#1c1917" />
            <circle cx="50" cy="50" r="40" fill="#ef4444" fillOpacity="0.25" />
            <path d="M34 40 C32 24, 46 16, 54 16 C64 16, 68 24, 68 36 C64 28, 56 26, 50 27 C44 28, 38 30, 34 40 Z" fill="#27272a" />
            <polygon points="36,38 64,38 62,58 50,68 38,58" fill="#e4e4e7" />
            <rect x="40" y="44" width="9" height="7" rx="2" fill="#09090b" stroke="#ef4444" strokeWidth="1.5" />
            <rect x="51" y="44" width="9" height="7" rx="2" fill="#09090b" stroke="#ef4444" strokeWidth="1.5" />
            <line x1="49" y1="47" x2="51" y2="47" stroke="#ef4444" strokeWidth="1.5" />
            <path d="M46 58 Q50 60 54 58" stroke="#3f3f46" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M26 95 C28 80, 36 72, 50 72 C64 72, 72 80, 74 95 Z" fill="#18181b" stroke="#ef4444" strokeWidth="1" />
          </svg>
        )}

        {/* Selected Check Indicator */}
        {isSelected && (
          <div
            className={clsx(
              "absolute bottom-0 inset-x-0 py-0.5 text-center text-[9px] font-mono font-bold tracking-widest text-white uppercase backdrop-blur-md",
              isFemale ? "bg-rose-600/90" : "bg-brand-red/90"
            )}
          >
            ACTIVE
          </div>
        )}
      </div>

      {/* Label under Circle (Prime Video Style) */}
      {showLabel && (
        <span
          className={clsx(
            "mt-3 text-sm sm:text-base font-bold tracking-wider font-mono uppercase transition-colors duration-200",
            isSelected
              ? isFemale
                ? "text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                : "text-brand-red drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
              : "text-zinc-400 group-hover:text-white"
          )}
        >
          {name}
        </span>
      )}
    </div>
  );
}
