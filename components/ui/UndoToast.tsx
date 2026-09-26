"use client";

import React, { useState, useEffect } from "react";
import { RotateCcw, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";

export interface UndoToastProps {
  isOpen: boolean;
  message: string;
  subMessage?: string;
  isError?: boolean;
  durationSeconds?: number;
  onUndo: () => void | Promise<void>;
  onClose: () => void;
}

export function UndoToast({
  isOpen,
  message,
  subMessage,
  isError = false,
  durationSeconds = 10,
  onUndo,
  onClose,
}: UndoToastProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);
  const [isUndoing, setIsUndoing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(durationSeconds);
      return;
    }

    setSecondsRemaining(durationSeconds);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, durationSeconds, onClose]);

  if (!isOpen) return null;

  const progressPercent = Math.max(0, (secondsRemaining / durationSeconds) * 100);

  const handleUndoClick = async () => {
    try {
      setIsUndoing(true);
      haptics.impactMedium();
      await onUndo();
    } finally {
      setIsUndoing(false);
      onClose();
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-2xl border transition-all",
          isError
            ? "bg-black/95 border-red-500/40 text-red-100 shadow-[0_0_30px_rgba(239,68,68,0.25)]"
            : "bg-black/95 border-emerald-500/40 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
        )}
      >
        {/* Animated 10s Countdown Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className={clsx(
              "h-full transition-all duration-1000 ease-linear",
              isError ? "bg-red-500" : "bg-emerald-500"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border",
                isError
                  ? "bg-red-500/20 border-red-500/30 text-red-400"
                  : "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
              )}
            >
              {isError ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-tight font-mono">
                {message}
              </p>
              {subMessage && (
                <p className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono">
                  {subMessage}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleUndoClick}
              disabled={isUndoing}
              className={clsx(
                "px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border",
                isError
                  ? "bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/40 shadow-glow-red-subtle"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
              )}
            >
              <RotateCcw className={clsx("w-3.5 h-3.5", isUndoing && "animate-spin")} />
              <span>Undo ({secondsRemaining}s)</span>
            </button>

            <button
              onClick={() => {
                haptics.impactLight();
                onClose();
              }}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
