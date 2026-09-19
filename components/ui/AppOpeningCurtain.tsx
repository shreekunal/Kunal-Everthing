"use client";

import React, { useEffect, useState } from "react";

export function AppOpeningCurtain() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Only show curtain once per session
    if (typeof window === "undefined") return;
    const hasLaunched = sessionStorage.getItem("kunal_os_launched");
    if (!hasLaunched) {
      setIsVisible(true);
      sessionStorage.setItem("kunal_os_launched", "true");

      // Start fade out after 600ms
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 650);

      // Remove component after animation completes
      const endTimer = setTimeout(() => {
        setIsVisible(false);
      }, 1150);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(endTimer);
      };
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-all duration-500 ease-out select-none pointer-events-none ${
        isFading ? "opacity-0 scale-105" : "opacity-100 scale-100"
      }`}
    >
      {/* Scarlet Ambient Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-brand-red/10 blur-3xl pointer-events-none" />

      {/* Monogram / Emblem */}
      <div className="relative flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-black border border-brand-red/40 flex items-center justify-center shadow-glow-red animate-curtain-pulse">
          {/* Custom SVG Monogram */}
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h4v16H4z" fill="#FFFFFF" fillOpacity="0.1" />
            <path d="M12 4l8 8-8 8" stroke="#EF4444" strokeWidth="2.5" />
            <path d="M4 12h14" stroke="#EF4444" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Brand Typography & Micro-Telemetry */}
        <div className="mt-5 text-center">
          <h1 className="text-sm font-black tracking-widest text-white uppercase font-mono">
            KUNAL OS
          </h1>
          <p className="text-[10px] text-zinc-500 font-mono tracking-wider mt-1 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-ping" />
            INITIALIZING SECURE PROTOCOL
          </p>
        </div>
      </div>
    </div>
  );
}
