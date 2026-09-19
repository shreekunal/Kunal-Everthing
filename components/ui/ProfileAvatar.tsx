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
  const isFemale =
    gender === "FEMALE" ||
    name.toLowerCase().includes("mradul") ||
    name.toLowerCase().includes("golu");

  const avatarSrc = isFemale ? "/female-avatar.png" : "/male-avatar.png";

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
          "relative rounded-full overflow-hidden flex items-center justify-center transition-all duration-300 transform bg-zinc-950",
          sizeClasses,
          ringClasses
        )}
      >
        <img
          src={avatarSrc}
          alt={name}
          loading="eager"
          draggable={false}
          className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-300 group-hover:scale-105"
        />

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
