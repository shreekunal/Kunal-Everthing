import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: "red" | "white" | "none" | "indigo" | "emerald" | "amber" | "rose";
  hoverable?: boolean;
}

export function Card({
  children,
  glow = "none",
  hoverable = false,
  className,
  ...props
}: CardProps) {
  const glowStyles: Record<string, string> = {
    red: "hover:border-brand-red/50 hover:shadow-glow-red",
    white: "hover:border-white/30",
    none: "",
    // Mapped cleanly
    indigo: "hover:border-brand-red/50 hover:shadow-glow-red",
    emerald: "hover:border-brand-red/50 hover:shadow-glow-red",
    amber: "hover:border-brand-red/50 hover:shadow-glow-red",
    rose: "hover:border-brand-red/50 hover:shadow-glow-red",
  };

  return (
    <div
      className={twMerge(
        clsx(
          "bg-[#090909]/95 border border-white/10 rounded-2xl p-5 sm:p-6 transition-colors duration-150 shadow-glass-panel",
          hoverable && "hover:border-white/20 hover:bg-[#111111]",
          glowStyles[glow],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx(
          "flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/5",
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={twMerge(
        clsx(
          "text-xs font-semibold tracking-wider text-zinc-300 uppercase font-mono",
          className
        )
      )}
      {...props}
    >
      {children}
    </h3>
  );
}
