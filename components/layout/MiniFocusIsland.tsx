"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Target, Zap } from "lucide-react";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";

interface StopwatchPersistedState {
  status: "IDLE" | "RUNNING" | "PAUSED";
  startTimeMs: number | null;
  lastResumeTimeMs: number | null;
  accumulatedSeconds: number;
  startClock: string;
}

const STOPWATCH_STORAGE_KEY = "everything_study_stopwatch";

function formatStopwatchTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

export function MiniFocusIsland() {
  const router = useRouter();
  const [swState, setSwState] = useState<StopwatchPersistedState | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  const syncState = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
      if (raw) {
        const parsed: StopwatchPersistedState = JSON.parse(raw);
        setSwState(parsed);
        if (parsed.status === "RUNNING" && parsed.lastResumeTimeMs) {
          const now = Date.now();
          const chunk = Math.max(0, Math.floor((now - parsed.lastResumeTimeMs) / 1000));
          setElapsedSeconds((parsed.accumulatedSeconds || 0) + chunk);
        } else if (parsed.status === "PAUSED") {
          setElapsedSeconds(parsed.accumulatedSeconds || 0);
        } else {
          setElapsedSeconds(0);
        }
      } else {
        setSwState(null);
        setElapsedSeconds(0);
      }
    } catch {
      setSwState(null);
    }
  }, []);

  useEffect(() => {
    syncState();
    const interval = setInterval(() => {
      if (swState?.status === "RUNNING") {
        syncState();
      }
    }, 1000);

    const handleUpdate = () => syncState();
    window.addEventListener("storage", handleUpdate);
    window.addEventListener("everything-stopwatch-update", handleUpdate);
    window.addEventListener("focus", handleUpdate);
    window.addEventListener("visibilitychange", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleUpdate);
      window.removeEventListener("everything-stopwatch-update", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
      window.removeEventListener("visibilitychange", handleUpdate);
    };
  }, [swState?.status, syncState]);

  if (!swState || swState.status === "IDLE" || elapsedSeconds === 0) {
    return null;
  }

  const isRunning = swState.status === "RUNNING";
  const earnedXP = Math.floor(elapsedSeconds / 300); // 1 XP per 5 mins

  return (
    <button
      type="button"
      onClick={() => {
        haptics.impactMedium();
        router.push("/progress?tab=LOG");
      }}
      className={clsx(
        "flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-mono font-bold transition-all active:scale-95 select-none",
        isRunning
          ? "bg-red-500/10 border-red-500/40 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
          : "bg-white/[0.04] border-white/10 text-zinc-400"
      )}
      title="Focus Stopwatch Active • Tap to view session"
    >
      <span className="relative flex h-2 w-2">
        {isRunning && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75" />
        )}
        <span
          className={clsx(
            "relative inline-flex rounded-full h-2 w-2",
            isRunning ? "bg-brand-red" : "bg-zinc-500"
          )}
        />
      </span>

      <span className="text-white tracking-wider">
        {formatStopwatchTime(elapsedSeconds)}
      </span>

      {earnedXP > 0 && (
        <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/15 px-1.5 py-0.2 rounded-md border border-emerald-500/30">
          +{earnedXP} XP
        </span>
      )}
    </button>
  );
}
