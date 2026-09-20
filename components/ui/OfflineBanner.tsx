"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from "lucide-react";
import { offlineQueue } from "@/lib/offlineQueue";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedCount, setLastSyncedCount] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setPendingCount(offlineQueue.getQueue().length);

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      const timer = setTimeout(() => {
        setJustReconnected(false);
        setLastSyncedCount(null);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
      setLastSyncedCount(null);
    };

    const handleQueueUpdated = (e: any) => {
      setPendingCount(e.detail?.pendingCount ?? offlineQueue.getQueue().length);
    };

    const handleQueueSynced = (e: any) => {
      const count = e.detail?.syncedCount ?? 0;
      if (count > 0) {
        setLastSyncedCount(count);
        setJustReconnected(true);
        setTimeout(() => {
          setJustReconnected(false);
          setLastSyncedCount(null);
        }, 3500);
      }
    };

    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-updated", handleQueueUpdated);
    window.addEventListener("offline-queue-synced", handleQueueSynced);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-updated", handleQueueUpdated);
      window.removeEventListener("offline-queue-synced", handleQueueSynced);
    };
  }, []);

  if (!isOffline && !justReconnected) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-3">
      {isOffline ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono shadow-2xl backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" />
          <span>
            {pendingCount > 0
              ? `Offline Mode • ${pendingCount} change${pendingCount > 1 ? "s" : ""} queued`
              : "Offline Mode • Instant Cached Shell"}
          </span>
        </div>
      ) : lastSyncedCount ? (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>
            Synced {lastSyncedCount} pending change{lastSyncedCount > 1 ? "s" : ""} to Cloud
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono shadow-2xl backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connected • Synced with Cloud</span>
        </div>
      )}
    </div>
  );
}
