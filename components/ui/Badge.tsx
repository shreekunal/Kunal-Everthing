import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "red" | "white" | "glass" | "outline" | "emerald" | "amber" | "crimson" | "rose" | "sky" | "indigo" | "zinc";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "glass",
  size = "md",
  className,
  ...props
}: BadgeProps) {
  const variantStyles: Record<string, string> = {
    red: "bg-red-500/15 text-red-400 border-red-500/30 shadow-glow-red-subtle",
    white: "bg-white/10 text-white border-white/20",
    glass: "bg-white/[0.04] text-zinc-300 border-white/10",
    outline: "bg-transparent text-zinc-300 border-white/15",
    // Fallbacks mapped cleanly to tri-color
    emerald: "bg-red-500/15 text-red-400 border-red-500/30",
    amber: "bg-red-500/15 text-red-400 border-red-500/30",
    crimson: "bg-red-500/20 text-red-300 border-red-500/40 shadow-glow-red",
    rose: "bg-red-500/15 text-red-400 border-red-500/30",
    sky: "bg-white/10 text-white border-white/20",
    indigo: "bg-red-500/15 text-red-400 border-red-500/30",
    zinc: "bg-white/[0.04] text-zinc-400 border-white/10",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] font-mono",
    md: "px-2.5 py-1 text-xs font-mono font-medium",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 rounded-full border backdrop-blur-md transition-colors",
          variantStyles[variant] || variantStyles.glass,
          sizeStyles[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
