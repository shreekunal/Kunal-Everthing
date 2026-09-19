import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = "w-5 h-5", size }: BrandLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl bg-black border border-brand-red/40 shadow-glow-red-subtle ${className}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        className="w-full h-full p-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Everything Circle O and Arrow -> */}
        <circle cx="9" cy="12" r="5" stroke="#FFFFFF" strokeWidth="2.2" fill="#FFFFFF" fillOpacity="0.1" />
        <path d="M14 12h7" stroke="#EF4444" strokeWidth="2.5" />
        <path d="M18 8l4 4-4 4" stroke="#EF4444" strokeWidth="2.5" />
      </svg>
    </div>
  );
}
