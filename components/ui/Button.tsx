import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline" | "white" | "red" | "glass" | "emerald" | "rose";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    const variantStyles: Record<string, string> = {
      primary:
        "bg-brand-red hover:bg-brand-redDark text-white font-medium shadow-glow-red active:scale-[0.98] border border-red-500/30",
      red:
        "bg-brand-red hover:bg-brand-redDark text-white font-medium shadow-glow-red active:scale-[0.98] border border-red-500/30",
      white:
        "bg-white hover:bg-zinc-200 text-black font-semibold shadow-sm active:scale-[0.98]",
      glass:
        "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 backdrop-blur-md active:scale-[0.98]",
      secondary:
        "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 border border-white/10 backdrop-blur-md active:scale-[0.98]",
      danger:
        "bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 shadow-glow-red active:scale-[0.98]",
      outline:
        "bg-transparent hover:bg-white/[0.05] text-zinc-300 border border-white/15 active:scale-[0.98]",
      ghost:
        "bg-transparent hover:bg-white/[0.05] text-zinc-400 hover:text-white",
      // Legacy mapped
      emerald:
        "bg-brand-red hover:bg-brand-redDark text-white font-medium shadow-glow-red active:scale-[0.98] border border-red-500/30",
      rose:
        "bg-brand-red hover:bg-brand-redDark text-white font-medium shadow-glow-red active:scale-[0.98] border border-red-500/30",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
      md: "px-4 py-2 text-sm rounded-xl gap-2",
      lg: "px-6 py-2.5 text-base rounded-2xl gap-2.5",
      icon: "p-2 rounded-xl aspect-square items-center justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer font-sans",
            variantStyles[variant] || variantStyles.primary,
            sizeStyles[size],
            className
          )
        )}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
