"use client";

import React, { useState, useEffect } from "react";
import { Heart, Sparkles, Flame, CheckCircle2 } from "lucide-react";
import { clsx } from "clsx";
import { formatDuration } from "@/lib/formatters";

export interface PartnerBroadcastData {
  userId: string;
  userName: string;
  project: string;
  topicTitle: string | null;
  status: "RUNNING" | "PAUSED" | "COMPLETED" | "IDLE";
  mode: "TIMER" | "STOPWATCH";
  remainingSeconds: number;
  totalSeconds: number;
  updatedAt: number;
}

export function PartnerFocusBroadcast() {
  const [partnerName, setPartnerName] = useState<string>("Partner");
  const [broadcast, setBroadcast] = useState<PartnerBroadcastData | null>(null);

  const fetchBroadcast = async () => {
    try {
      const res = await fetch("/api/progress/broadcast", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.partnerName) setPartnerName(data.partnerName);
        setBroadcast(data.partnerBroadcast || null);
      }
    } catch {
      // Silently ignore
    }
  };

  useEffect(() => {
    fetchBroadcast();
    // Poll every 25 seconds for partner focus state
    const interval = setInterval(fetchBroadcast, 25000);
    return () => clearInterval(interval);
  }, []);

  if (!broadcast || broadcast.status === "IDLE") {
    return null;
  }

  const isRunning = broadcast.status === "RUNNING";
  const isCompleted = broadcast.status === "COMPLETED";

  return (
    <div
      className={clsx(
        "p-2.5 px-3.5 rounded-2xl border flex items-center justify-between gap-2 text-xs font-mono transition-all animate-in fade-in duration-300 select-none",
        isRunning
          ? "bg-rose-950/30 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] text-rose-200"
          : isCompleted
          ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200"
          : "bg-zinc-950 border-white/10 text-zinc-300"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={clsx(
            "w-6 h-6 rounded-lg flex items-center justify-center shrink-0",
            isRunning ? "bg-rose-500/20 text-rose-400" : "bg-emerald-500/20 text-emerald-400"
          )}
        >
          {isRunning ? (
            <Heart className="w-3.5 h-3.5 fill-rose-500/40 animate-pulse" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-white tracking-tight">
              {partnerName}
            </span>
            <span
              className={clsx(
                "text-[9px] px-1.5 py-0.2 rounded font-semibold",
                isRunning ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
              )}
            >
              {isRunning ? "Deep Focus Now" : "Goal Finished"}
            </span>
          </div>

          <span className="text-[10px] text-zinc-300 truncate mt-0.5">
            {broadcast.project}
            {broadcast.topicTitle ? ` • ${broadcast.topicTitle}` : ""}
          </span>
        </div>
      </div>

      <div className="shrink-0 text-right">
        {isRunning && broadcast.mode === "TIMER" && (
          <span className="text-xs font-bold text-rose-300 font-mono">
            {formatDuration(Math.round(broadcast.remainingSeconds / 60))} left
          </span>
        )}
        {isCompleted && (
          <span className="text-[10px] font-bold text-emerald-300 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Done!
          </span>
        )}
      </div>
    </div>
  );
}
