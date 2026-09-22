"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Heart,
  Droplets,
  Clock,
  CheckSquare,
  Flame,
  Crown,
  Sparkles,
  ArrowLeft,
  PhoneCall,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  UtensilsCrossed,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { PixelPet } from "@/components/discipline/PixelPet";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import { offlineCache } from "@/lib/offlineCache";
import clsx from "clsx";

export default function PartnerProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [localWaterCount, setLocalWaterCount] = useState<number | null>(null);

  const applyPartnerData = useCallback((json: any) => {
    if (!json) return;
    setData(json);

    // Read client-side local storage if available for same-device profile switching
    if (typeof window !== "undefined" && json.partner?.id) {
      const todayKey = format(new Date(), "yyyy-MM-dd");
      const localKey = `kunal_os_water_count_${json.partner.id}_${todayKey}`;
      const savedCount = localStorage.getItem(localKey);
      if (savedCount !== null) {
        const parsed = parseInt(savedCount, 10);
        if (!isNaN(parsed)) {
          setLocalWaterCount(parsed);
        }
      }
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      await offlineCache.swr(
        "partner_progress_cache",
        async () => {
          const res = await fetch("/api/partner/progress", { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch partner progress");
          return res.json();
        },
        (cached) => {
          applyPartnerData(cached);
          setLoading(false);
        }
      ).then((fresh) => {
        if (fresh) {
          applyPartnerData(fresh);
        }
      });
    } catch (err) {
      console.error("Failed to load partner progress:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyPartnerData]);

  useEffect(() => {
    // 1. Instant Cache Hydration (0ms)
    const cached = offlineCache.get<any>("partner_progress_cache");
    if (cached) {
      applyPartnerData(cached);
      setLoading(false);
    }

    fetchProgress();

    // Listen for cross-window or local updates
    const handleRefresh = () => fetchProgress();
    window.addEventListener("kunal-os-refresh", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      window.removeEventListener("kunal-os-refresh", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [fetchProgress, applyPartnerData]);

  const handleManualRefresh = () => {
    haptics.impactLight();
    setRefreshing(true);
    fetchProgress();
  };

  const partner = data?.partner;
  const isFemale = partner?.gender === "FEMALE";
  const partnerNickname = partner?.nickname || partner?.name || "Partner";

  // Compute final water glasses: max of server log and local storage
  const serverWater = data?.water || { glasses: 0, target: 8, ml: 0, targetMl: 2000, percent: 0, goalMet: false };
  const finalGlasses = localWaterCount !== null ? Math.max(localWaterCount, serverWater.glasses) : serverWater.glasses;
  const finalTarget = serverWater.target || 8;
  const finalMl = finalGlasses * 250;
  const finalTargetMl = finalTarget * 250;
  const finalPercent = Math.min(100, Math.round((finalGlasses / Math.max(1, finalTarget)) * 100));
  const isGoalMet = finalGlasses >= finalTarget;

  const focus = data?.focus || {
    todayTotalMinutes: 0,
    todayWorkMinutes: 0,
    todayStudyMinutes: 0,
    todayPersonalMinutes: 0,
    weekTotalMinutes: 0,
    recentSessions: [],
  };

  const tasks = data?.tasks || {
    pendingCount: 0,
    completedTodayCount: 0,
    pending: [],
    completedToday: [],
  };

  const habits = data?.habits || {
    totalCount: 0,
    completedTodayCount: 0,
    completionRate: 0,
    list: [],
  };

  const discipline = data?.discipline;

  const handleWhatsAppCall = () => {
    haptics.impactMedium();
    if (partner?.callLink) {
      window.open(partner.callLink, "_blank");
      return;
    }
    const cleanPhone = (partner?.phone || "").replace(/[^0-9]/g, "");
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    }
  };

  const handleSendWhatsApp = () => {
    haptics.impactMedium();
    const cleanPhone = (partner?.phone || "").replace(/[^0-9]/g, "");
    const message = `Hey ${partnerNickname}! Just checked your progress today ❤️ Proud of you!`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  return (
    <PullToRefresh onRefresh={fetchProgress}>
      <div className="space-y-6 pb-12">
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/relationship"
            onClick={() => haptics.selection()}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Relationship Hub</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/10 transition-colors"
              title="Refresh Partner Data"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin text-brand-red")} />
            </button>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Partner Stream</span>
            </div>
          </div>
        </div>

        {/* Partner Profile Header Glass Banner */}
        <Card
          glow={isFemale ? "rose" : "red"}
          className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border border-white/10 p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ProfileAvatar
                name={partner?.name || "Partner"}
                gender={isFemale ? "FEMALE" : "MALE"}
                size="lg"
                isSelected
              />
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {partner?.name || "Partner"}&apos;s Progress
                  </h1>
                  {partner?.nickname && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      ❤️ {partner.nickname}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <span>Daily Health, Habits, Focus &amp; Karma Telemetry</span>
                  <span>•</span>
                  <span>{format(new Date(), "EEE, MMM d")}</span>
                </p>
              </div>
            </div>

            {/* Quick Contact & Cheer CTA */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Cheer on WhatsApp</span>
              </button>
              {partner?.phone && (
                <button
                  type="button"
                  onClick={handleWhatsAppCall}
                  className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white transition-colors active:scale-95"
                  title="Call Partner"
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400" />
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* 5 Sleek Progress Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          {/* 1. Water Drinking Count */}
          <Card glow="cyan" className="relative overflow-hidden bg-black/90 border border-cyan-500/30 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Droplets className="w-4 h-4 fill-cyan-400/20" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Water Drinking Record
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                {isGoalMet ? "Goal Achieved 🎉" : `${finalPercent}% Completed`}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400 tracking-tight">
                  {finalGlasses}{" "}
                  <span className="text-xs sm:text-sm font-normal text-zinc-400">
                    / {finalTarget} Glasses
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {finalMl.toLocaleString()} ml of {finalTargetMl.toLocaleString()} ml consumed today
                </p>
              </div>

              {isGoalMet ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Goal Met (+30 XP)</span>
                </div>
              ) : (
                <div className="text-xs font-mono text-zinc-400 text-right">
                  <span>{Math.max(0, finalTarget - finalGlasses)} glasses left</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-3.5 w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                style={{ width: `${Math.max(4, finalPercent)}%` }}
              />
            </div>
          </Card>

          {/* 2. Focus & Deep Work Time */}
          <Card glow="red" className="relative overflow-hidden bg-black/90 border border-purple-500/30 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Focus &amp; Study Time
                </h3>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded-full">
                {focus.sessionsCountToday} Sessions Today
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                  {formatDuration(focus.todayTotalMinutes)}
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Deep Work: {formatDuration(focus.todayWorkMinutes)} • Study: {formatDuration(focus.todayStudyMinutes)}
                </p>
              </div>
              <div className="text-right font-mono text-xs text-zinc-400">
                <span className="text-purple-400 font-bold">{formatDuration(focus.weekTotalMinutes)}</span>
                <span className="block text-[10px] text-zinc-500">This Week</span>
              </div>
            </div>

            {/* Recent Sessions Compact Snippet */}
            <div className="mt-3.5 pt-3 border-t border-white/5 space-y-1.5">
              {focus.recentSessions.length === 0 ? (
                <p className="text-[11px] font-mono text-zinc-500 py-1">
                  No focus sessions logged today yet.
                </p>
              ) : (
                focus.recentSessions.slice(0, 2).map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-[11px] font-mono text-zinc-300 py-1 px-2 rounded-lg bg-white/[0.02]"
                  >
                    <span className="truncate max-w-[200px]">{s.project}</span>
                    <span className="text-purple-300 font-bold">{formatDuration(s.durationMinutes)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 3. Pending Tasks */}
          <Card glow="red" className="relative overflow-hidden bg-black/90 border border-white/10 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-brand-red">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Pending Tasks
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                {tasks.completedTodayCount} Completed Today
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs font-mono text-zinc-400">
                Active Queue: <strong className="text-white">{tasks.pendingCount}</strong> tasks remaining
              </span>
            </div>

            <div className="mt-2.5 space-y-2 max-h-56 overflow-y-auto">
              {tasks.pending.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                  ✨ All clear! No pending tasks right now.
                </div>
              ) : (
                tasks.pending.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-brand-red flex-shrink-0" />
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[10px]">
                      {task.priority === "HIGH" && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
                          Urgent
                        </span>
                      )}
                      {task.category && (
                        <span className="text-zinc-500 hidden sm:inline">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 4. Daily Habits & Streaks */}
          <Card glow="red" className="relative overflow-hidden bg-black/90 border border-amber-500/30 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400/20" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Habits &amp; Streaks
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">
                {habits.completedTodayCount}/{habits.totalCount} Done ({habits.completionRate}%)
              </span>
            </div>

            <div className="mt-3.5 space-y-2 max-h-56 overflow-y-auto">
              {habits.list.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                  No habits registered yet.
                </div>
              ) : (
                habits.list.map((routine: any) => (
                  <div
                    key={routine.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      routine.completedToday
                        ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                        : "bg-white/[0.02] border-white/5 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          routine.completedToday
                            ? "bg-emerald-500 text-black"
                            : "border border-zinc-700 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="text-xs font-medium truncate">{routine.name}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
                      <span className="text-red-400 font-bold flex items-center gap-0.5">
                        <Flame className="w-3 h-3 fill-red-400" />
                        {routine.currentStreak}d
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          routine.completedToday
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {routine.completedToday ? "Done" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 5. Companion & Karma Hub (Full Width Sleek Deck) */}
        {discipline ? (
          <Card
            glow={isFemale ? "rose" : "red"}
            className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 border border-brand-red/30 shadow-[0_0_30px_rgba(239,68,68,0.12)] p-4 sm:p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-red/15 border border-brand-red/30 text-brand-red">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase font-mono tracking-wider">
                    {partnerNickname}&apos;s Companion &amp; Karma
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${discipline.isPetDead ? "bg-zinc-800 text-zinc-400" : "bg-brand-red text-white"}`}>
                  {discipline.isPetDead ? "R.I.P." : `LVL ${discipline.level}`}
                </span>
                {discipline.season && (
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                    • {discipline.season.name}
                  </span>
                )}
              </div>
            </div>

            {/* Companion Character + Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 py-4">
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                <PixelPet
                  level={discipline.level}
                  totalXP={discipline.totalXP}
                  isPetDead={discipline.isPetDead}
                  purityStreak={discipline.streaks?.purity?.currentStreak || 0}
                  dietStreak={discipline.streaks?.diet?.currentStreak || 0}
                  todayDeducted={discipline.todayDeducted}
                  userName={partner?.name || "Partner"}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {discipline.totalXP.toLocaleString()} XP
                    </span>
                    <span className="text-xs text-zinc-400 truncate">{discipline.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold">
                      +{discipline.todayEarned} Today
                    </span>
                    {discipline.todayDeducted > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
                        -{discipline.todayDeducted}
                      </span>
                    )}
                  </div>
                </div>

                {/* Laser Progress Bar */}
                <div>
                  <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-brand-red to-orange-500 rounded-full transition-all duration-500 shadow-glow-red"
                      style={{ width: `${Math.max(5, discipline.progressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-1">
                    <span>Level {discipline.level}</span>
                    <span>
                      {discipline.progressPercent}% ({discipline.currentLevelXP || discipline.totalXP}/{discipline.nextLevelXP} XP)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Discipline Streaks Chips */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.08]">
              <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">Monk Purity</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">
                  {discipline.streaks?.purity?.currentStreak || 0}d
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">Clean Diet</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">
                  {discipline.streaks?.diet?.currentStreak || 0}d
                </span>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </PullToRefresh>
  );
}
