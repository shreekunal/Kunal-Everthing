"use client";

import React, { useState, useRef, useCallback } from "react";
import { Check, Sparkles } from "lucide-react";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";

interface SwipeableListItemProps {
  children: React.ReactNode;
  onComplete: () => void | Promise<void>;
  isCompleted?: boolean;
  disabled?: boolean;
  className?: string;
  completeLabel?: string;
}

export function SwipeableListItem({
  children,
  onComplete,
  isCompleted = false,
  disabled = false,
  className,
  completeLabel = "Complete",
}: SwipeableListItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isThresholdReached, setIsThresholdReached] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const SWIPE_THRESHOLD = 75;

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled || isCompleted) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isSwiping || disabled || isCompleted) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Detect direction intent on first movement
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    // Only handle horizontal swipe right
    if (isHorizontalSwipeRef.current) {
      if (dx > 0) {
        const clampedOffset = Math.min(110, dx * 0.65);
        setOffsetX(clampedOffset);

        const thresholdPassed = clampedOffset >= SWIPE_THRESHOLD;
        if (thresholdPassed !== isThresholdReached) {
          if (thresholdPassed) {
            haptics.impactLight();
          }
          setIsThresholdReached(thresholdPassed);
        }
      } else {
        setOffsetX(0);
        setIsThresholdReached(false);
      }
    }
  };

  const handlePointerEnd = async () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    if (isThresholdReached && !disabled && !isCompleted) {
      haptics.success();
      setOffsetX(120);
      try {
        await onComplete();
      } finally {
        setTimeout(() => {
          setOffsetX(0);
          setIsThresholdReached(false);
        }, 300);
      }
    } else {
      setOffsetX(0);
      setIsThresholdReached(false);
    }
    isHorizontalSwipeRef.current = null;
  };

  if (disabled || isCompleted) {
    return <div className={className}>{children}</div>;
  }

  const progress = Math.min(1, offsetX / SWIPE_THRESHOLD);

  return (
    <div
      className={clsx("relative overflow-hidden rounded-2xl touch-pan-y select-none", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {/* Background Reveal Layer (Emerald Completed State) */}
      <div
        className={clsx(
          "absolute inset-0 flex items-center pl-4 rounded-2xl transition-colors duration-200",
          isThresholdReached
            ? "bg-emerald-500/30 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            : "bg-emerald-500/10 border border-emerald-500/20"
        )}
      >
        <div
          className={clsx(
            "flex items-center gap-2 font-mono text-xs font-bold transition-all duration-150",
            isThresholdReached ? "text-emerald-300 scale-110" : "text-emerald-400"
          )}
          style={{ opacity: Math.max(0.2, progress) }}
        >
          <div
            className={clsx(
              "w-7 h-7 rounded-xl flex items-center justify-center border transition-all",
              isThresholdReached
                ? "bg-emerald-500 text-black border-emerald-400 shadow-glow-emerald"
                : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
            )}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <span className="tracking-wide uppercase text-[10px]">
            {isThresholdReached ? "Release to Finish!" : completeLabel}
          </span>
        </div>
      </div>

      {/* Foreground Swipeable Content */}
      <div
        className={clsx(
          "relative bg-black/90 rounded-2xl transition-transform",
          !isSwiping && "duration-200 ease-out"
        )}
        style={{
          transform: `translateX(${offsetX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
