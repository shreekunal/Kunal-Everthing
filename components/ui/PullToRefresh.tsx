"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 75;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (window.scrollY <= 2) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling.current || disabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0 && window.scrollY <= 2) {
      // Apply rubberband dampening
      const dampened = Math.min(MAX_PULL, diff * 0.45);
      setPullDistance(dampened);

      if (dampened >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        haptics.impactLight();
      }
    } else {
      setPullDistance(0);
      isPulling.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling.current || disabled || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(50); // Hold at spinner height
      haptics.impactMedium();
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 400);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full"
    >
      {/* Pull Indicator Banner */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? 1 : 0,
        }}
        className="overflow-hidden transition-all duration-150 ease-out flex items-center justify-center pointer-events-none"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/90 border border-brand-red/30 shadow-glow-red-subtle text-xs font-mono text-white">
          <Loader2
            className={`w-4 h-4 text-brand-red ${
              isRefreshing ? "animate-spin" : ""
            }`}
            style={{
              transform: isRefreshing
                ? undefined
                : `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
            }}
          />
          <span className="text-[11px] text-zinc-300">
            {isRefreshing
              ? "Syncing Everything..."
              : pullDistance >= PULL_THRESHOLD
              ? "Release to refresh"
              : "Pull down"}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
}
