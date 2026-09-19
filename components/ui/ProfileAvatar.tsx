"use client";

import React from "react";
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
  const isFemale = gender === "FEMALE" || name.toLowerCase().includes("mradul") || name.toLowerCase().includes("golu");

  // Size configurations
  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-12 h-12 text-xs",
    lg: "w-20 h-20 text-sm",
    xl: "w-28 h-28 sm:w-32 sm:h-32 text-base",
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
          "relative rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 transform",
          sizeClasses,
          ringClasses,
          isFemale
            ? "bg-gradient-to-b from-rose-950/60 via-purple-950/40 to-black"
            : "bg-gradient-to-b from-red-950/60 via-zinc-900/60 to-black"
        )}
      >
        {isFemale ? (
          /* Sleek Female Vector Dummy Avatar */
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full p-2 transition-transform duration-300 group-hover:scale-110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Halo */}
            <circle cx="50" cy="50" r="45" fill="url(#femaleGlow)" opacity="0.4" />
            <defs>
              <radialGradient id="femaleGlow" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#881337" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="femaleHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <linearGradient id="femaleFace" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="100%" stopColor="#fecdd3" />
              </linearGradient>
            </defs>

            {/* Hair Back Flow */}
            <path
              d="M32 38 C26 50, 24 72, 34 88 C38 78, 40 68, 38 52 Z"
              fill="#be123c"
              opacity="0.7"
            />
            <path
              d="M68 38 C74 50, 76 72, 66 88 C62 78, 60 68, 62 52 Z"
              fill="#be123c"
              opacity="0.7"
            />

            {/* Torso / Shoulders */}
            <path
              d="M26 95 C28 82, 38 74, 50 74 C62 74, 72 82, 74 95 Z"
              fill="#e11d48"
              opacity="0.9"
            />
            <path
              d="M32 95 C34 86, 42 80, 50 80 C58 80, 66 86, 68 95 Z"
              fill="#fff"
              opacity="0.3"
            />

            {/* Neck */}
            <path d="M45 62 L45 74 L55 74 L55 62 Z" fill="#ffe4e6" />

            {/* Head / Face */}
            <ellipse cx="50" cy="48" rx="16" ry="19" fill="url(#femaleFace)" />

            {/* Female Hair Top & Bangs */}
            <path
              d="M32 44 C30 26, 42 18, 50 18 C58 18, 70 26, 68 44 C65 34, 58 30, 50 30 C42 30, 35 34, 32 44 Z"
              fill="url(#femaleHair)"
            />
            {/* Cute Hair Ponytail Bun / Wave */}
            <circle cx="50" cy="18" r="7" fill="#fb7185" />
            <circle cx="50" cy="18" r="4" fill="#fda4af" />

            {/* Delicate Features: Eyes & Smile */}
            <path
              d="M42 47 Q44 45 46 47"
              stroke="#881337"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M54 47 Q56 45 58 47"
              stroke="#881337"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M46 55 Q50 59 54 55"
              stroke="#e11d48"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Subtle Blush */}
            <ellipse cx="40" cy="51" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.6" />
            <ellipse cx="60" cy="51" rx="2.5" ry="1.5" fill="#f43f5e" opacity="0.6" />
          </svg>
        ) : (
          /* Sleek Male Vector Dummy Avatar */
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full p-2 transition-transform duration-300 group-hover:scale-110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Halo */}
            <circle cx="50" cy="50" r="45" fill="url(#maleGlow)" opacity="0.4" />
            <defs>
              <radialGradient id="maleGlow" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="maleHair" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
              <linearGradient id="maleFace" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e4e4e7" />
              </linearGradient>
            </defs>

            {/* Torso / Jacket Shoulders */}
            <path
              d="M24 95 C26 80, 36 72, 50 72 C64 72, 74 80, 76 95 Z"
              fill="#b91c1c"
              opacity="0.9"
            />
            <path
              d="M36 95 C38 84, 44 78, 50 78 C56 78, 62 84, 64 95 Z"
              fill="#fff"
              opacity="0.25"
            />

            {/* Neck */}
            <path d="M44 60 L44 73 L56 73 L56 60 Z" fill="#e4e4e7" />

            {/* Male Head / Jaw */}
            <polygon points="34,36 66,36 64,56 50,68 36,56" fill="url(#maleFace)" />

            {/* Male Modern Hair / Quiff */}
            <path
              d="M32 36 C30 22, 44 14, 52 14 C62 14, 68 22, 68 34 C64 26, 56 24, 50 25 C42 26, 36 28, 32 36 Z"
              fill="url(#maleHair)"
            />

            {/* Sleek Glasses / Headset Accent */}
            <rect
              x="38"
              y="42"
              width="10"
              height="7"
              rx="2"
              fill="#18181b"
              stroke="#ef4444"
              strokeWidth="1.5"
            />
            <rect
              x="52"
              y="42"
              width="10"
              height="7"
              rx="2"
              fill="#18181b"
              stroke="#ef4444"
              strokeWidth="1.5"
            />
            <line x1="48" y1="45" x2="52" y2="45" stroke="#ef4444" strokeWidth="1.5" />

            {/* Cool Confident Smirk */}
            <path
              d="M46 58 Q50 61 55 58"
              stroke="#71717a"
              strokeWidth="2"
              strokeLinecap="round"
            />
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
