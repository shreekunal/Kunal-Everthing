"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Share2,
  Sparkles,
  Footprints,
  Clock,
  CheckCircle2,
  Heart,
  Calendar,
  Check,
  Flame,
} from "lucide-react";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";

interface WeeklyRecapData {
  userName: string;
  dateRange: string;
  focusHours: number;
  totalSteps: number;
  pointsEarned: number;
  tasksDone: number;
  dominantMood: string;
  averageRating: number;
  diaryEntriesCount: number;
}

export function WeeklyRecapCard() {
  const [recap, setRecap] = useState<WeeklyRecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [sharedSuccess, setSharedSuccess] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadRecap() {
      try {
        const res = await fetch("/api/dashboard/weekly-recap");
        if (res.ok) {
          const data = await res.json();
          setRecap(data);
        }
      } catch (err) {
        console.error("Failed to load weekly recap:", err);
      } finally {
        setLoading(false);
      }
    }
    loadRecap();
  }, []);

  const handleShareRecap = async () => {
    if (!cardRef.current || sharing || !recap) return;

    setSharing(true);
    haptics.selection();

    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#09090b",
      });

      const fileName = `Everything-Weekly-Recap-${Date.now()}.png`;

      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.split(",")[1];
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        const canShare = await Share.canShare().catch(() => ({ value: false }));
        if (canShare.value) {
          await Share.share({
            title: `Weekly Discipline Recap • ${recap.userName}`,
            url: fileResult.uri,
            dialogTitle: `Share Weekly Recap`,
          });
          haptics.success();
          setSharedSuccess(true);
          setTimeout(() => setSharedSuccess(false), 3000);
        }
      } else {
        // Web / PWA share fallback
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });

          if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Weekly Discipline Recap • ${recap.userName}`,
            });
            haptics.success();
            setSharedSuccess(true);
            setTimeout(() => setSharedSuccess(false), 3000);
          } else {
            // Download fallback
            const link = document.createElement("a");
            link.download = fileName;
            link.href = dataUrl;
            link.click();
            haptics.success();
            setSharedSuccess(true);
            setTimeout(() => setSharedSuccess(false), 3000);
          }
        } catch {
          // Download fallback
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (err) {
      console.error("Failed to share weekly recap:", err);
    } finally {
      setSharing(false);
    }
  };

  if (loading || !recap) {
    return null;
  }

  return (
    <div className="w-full rounded-3xl bg-zinc-950/90 border border-white/[0.08] p-4 sm:p-5 shadow-glass-panel space-y-4">
      {/* Top Action Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
            <Flame className="w-4 h-4 fill-rose-500/20" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              7-Day Discipline Recap
            </h3>
            <p className="text-[10px] text-zinc-400 font-mono">{recap.dateRange}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShareRecap}
          disabled={sharing}
          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-95 active:scale-95 disabled:opacity-50 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.25)] transition-all"
        >
          {sharing ? (
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : sharedSuccess ? (
            <Check className="w-3.5 h-3.5 text-white" />
          ) : (
            <Share2 className="w-3.5 h-3.5" />
          )}
          <span>{sharedSuccess ? "Shared!" : "Share Recap"}</span>
        </button>
      </div>

      {/* Shareable Canvas Card (Captured by html-to-image) */}
      <div
        ref={cardRef}
        className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-white/10 shadow-2xl space-y-4 relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Banner */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-500 flex items-center justify-center text-white font-black text-xs shadow-[0_0_10px_rgba(244,63,94,0.5)]">
              E
            </div>
            <div>
              <span className="text-xs font-bold font-mono tracking-widest text-white uppercase block">
                Everything OS
              </span>
              <span className="text-[9px] font-mono text-zinc-400">
                Weekly Mastery • {recap.userName}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[9px] font-mono text-zinc-400 block flex items-center gap-1 justify-end">
              <Calendar className="w-3 h-3 text-zinc-500" />
              {recap.dateRange}
            </span>
          </div>
        </div>

        {/* 5-Metric Highlights Grid (Strictly No Money Data) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {/* 1. Focus Hours */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Deep Focus</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-white">
              {recap.focusHours} <span className="text-xs font-normal text-zinc-400">hrs</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">Monk flow time</div>
          </div>

          {/* 2. Total Steps */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              <span>Movement</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-white">
              {recap.totalSteps.toLocaleString()}{" "}
              <span className="text-xs font-normal text-zinc-400">steps</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">Total 7-day walk</div>
          </div>

          {/* 3. Points / Karma XP */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Karma Earned</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
              +{recap.pointsEarned}{" "}
              <span className="text-xs font-normal text-amber-400/80">XP</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">Discipline gains</div>
          </div>

          {/* 4. Tasks Done */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tasks Done</span>
            </div>
            <div className="text-base sm:text-lg font-bold font-mono text-white">
              {recap.tasksDone}{" "}
              <span className="text-xs font-normal text-zinc-400">tasks</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">Finished items</div>
          </div>

          {/* 5. Diary & Reflection Mood */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1 col-span-2 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span>Dominant State</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-white">
                {recap.dominantMood}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/25">
                ★ {recap.averageRating}
              </span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono">
              {recap.diaryEntriesCount} daily reflection{recap.diaryEntriesCount === 1 ? "" : "s"} logged
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-400">
          <span>&ldquo;Relentless silent momentum.&rdquo;</span>
          <span className="text-rose-400 font-semibold">Everything OS</span>
        </div>
      </div>
    </div>
  );
}
