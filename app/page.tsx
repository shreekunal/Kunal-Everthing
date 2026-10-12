"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatINR, formatDuration, getDueStatus } from "@/lib/formatters";
import {
  CheckSquare,
  Flame,
  Wallet,
  Clock,
  CreditCard,
  CheckCircle2,
  Circle,
  Check,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  Trophy,
  Zap,
  ShieldCheck,
  UtensilsCrossed,
  AlertTriangle,
  Calendar,
  Skull,
  Sparkles,
  Droplets,
  Crown,
  GraduationCap,
  Footprints,
} from "lucide-react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import clsx from "clsx";
import { haptics } from "@/lib/haptics";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { PixelPet } from "@/components/discipline/PixelPet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { backButton } from "@/lib/backButton";
import { offlineCache } from "@/lib/offlineCache";
import { WaterTrackerCard } from "@/components/dashboard/WaterTrackerCard";
import { Capacitor } from "@capacitor/core";
import { fetchHealthConnectSteps } from "@/lib/healthSync";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTime, setCacheTime] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);
  const [checkinFeedback, setCheckinFeedback] = useState<string | null>(null);
  const [confirmDeductType, setConfirmDeductType] = useState<"UNHEALTHY_FOOD" | "FAP" | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [waterTarget, setWaterTarget] = useState(8);
  const [dailyStudyGoal, setDailyStudyGoal] = useState(3);
  const [weeklyStudyGoal, setWeeklyStudyGoal] = useState(21);

  const loadStudyGoal = () => {
    if (typeof window === "undefined") return;
    const isWeekend = [0, 6].includes(new Date().getDay());
    const storedWeekday = localStorage.getItem("everthing_weekday_study_goal_hours");
    const storedWeekend = localStorage.getItem("everthing_weekend_study_goal_hours");
    const storedWeekly = localStorage.getItem("everthing_weekly_study_goal_hours");
    const storedDaily = localStorage.getItem("everthing_daily_study_goal_hours");

    let weekdayGoal = 3;
    let weekendGoal = 5;

    if (storedWeekday) {
      const val = parseInt(storedWeekday, 10);
      if (!isNaN(val) && val > 0) weekdayGoal = val;
    } else if (storedDaily) {
      const val = parseInt(storedDaily, 10);
      if (!isNaN(val) && val > 0) weekdayGoal = val;
    }

    if (storedWeekend) {
      const val = parseInt(storedWeekend, 10);
      if (!isNaN(val) && val > 0) weekendGoal = val;
    } else if (storedDaily) {
      const val = parseInt(storedDaily, 10);
      if (!isNaN(val) && val > 0) weekendGoal = Math.max(val, 5);
    }

    const currentDaily = isWeekend ? weekendGoal : weekdayGoal;
    setDailyStudyGoal(currentDaily);

    if (storedWeekly) {
      const val = parseInt(storedWeekly, 10);
      if (!isNaN(val) && val > 0) setWeeklyStudyGoal(val);
    } else {
      setWeeklyStudyGoal(weekdayGoal * 5 + weekendGoal * 2);
    }
  };

  const loadWaterStats = () => {
    if (typeof window === "undefined") return;
    const currentUserId =
      data?.user?.id ||
      localStorage.getItem("kunal_os_current_user_id") ||
      "default";
    const todayKey = format(new Date(), "yyyy-MM-dd");
    let count = localStorage.getItem(`kunal_os_water_count_${currentUserId}_${todayKey}`);
    if (count === null && (currentUserId === "default" || currentUserId.startsWith("kunal"))) {
      count = localStorage.getItem(`kunal_os_water_count_${todayKey}`);
    }
    setWaterGlasses(count !== null ? parseInt(count, 10) || 0 : 0);

    let target = localStorage.getItem(`kunal_os_water_target_glasses_${currentUserId}`);
    if (target === null && (currentUserId === "default" || currentUserId.startsWith("kunal"))) {
      target = localStorage.getItem("kunal_os_water_target_glasses");
    }
    setWaterTarget(target !== null ? parseInt(target, 10) || 8 : 8);
  };

  const fetchDashboardData = async () => {
    try {
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
        await fetchHealthConnectSteps(true).catch(() => {});
      }
      await offlineCache.swr(
        "dashboard",
        async () => {
          const res = await fetch("/api/dashboard", { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch dashboard data");
          return res.json();
        },
        (cached) => {
          setData(cached);
          setLoading(false);
          setIsOffline(false);
        }
      ).then((fresh) => {
        setData(fresh);
        setIsOffline(false);
      });
    } catch (err) {
      console.warn("Using offline dashboard fallback:", err);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  // Back Button integration: close open dialog first
  useEffect(() => {
    if (!confirmDeductType) return;
    return backButton.register(() => {
      if (confirmDeductType) {
        setConfirmDeductType(null);
        return true;
      }
      return false;
    });
  }, [confirmDeductType]);

  useEffect(() => {
    // 1. Instant Cache Hydration: Render Pet, XP, and stats immediately (0ms)
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("everything_dashboard_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.data) {
            setData(parsed.data);
            setCacheTime(parsed.timestamp);
            setLoading(false);
          }
        } catch (e) {
          console.warn("Failed to parse cached dashboard data:", e);
        }
      }
    }

    fetchDashboardData();
    loadWaterStats();
    loadStudyGoal();
    const handleOnline = () => fetchDashboardData();
    const handleOffline = () => setIsOffline(true);
    const handleVisibilitySync = () => {
      if (document.visibilityState === "visible") {
        fetchDashboardData();
      }
    };
    window.addEventListener("kunal-os-refresh", fetchDashboardData);
    window.addEventListener("kunal-os-refresh", loadWaterStats);
    window.addEventListener("kunal-os-refresh", loadStudyGoal);
    window.addEventListener("storage", loadWaterStats);
    window.addEventListener("storage", loadStudyGoal);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("visibilitychange", handleVisibilitySync);
    window.addEventListener("focus", handleVisibilitySync);
    return () => {
      window.removeEventListener("kunal-os-refresh", fetchDashboardData);
      window.removeEventListener("kunal-os-refresh", loadWaterStats);
      window.removeEventListener("kunal-os-refresh", loadStudyGoal);
      window.removeEventListener("storage", loadWaterStats);
      window.removeEventListener("storage", loadStudyGoal);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("visibilitychange", handleVisibilitySync);
      window.removeEventListener("focus", handleVisibilitySync);
    };
  }, []);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    if (newStatus === "DONE") {
      haptics.success();
    } else {
      haptics.impactLight();
    }
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error("Task toggle error:", err);
    }
  };

  const handleQuickDeduct = (type: "UNHEALTHY_FOOD" | "FAP") => {
    setConfirmDeductType(type);
  };

  const handleExecuteDeduct = async () => {
    if (!confirmDeductType) return;
    const isFood = confirmDeductType === "UNHEALTHY_FOOD";
    setIsDeducting(true);
    haptics.warning();
    try {
      await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isFood ? "PENALTY_UNHEALTHY_FOOD" : "PENALTY_FAP",
          points: isFood ? 50 : 100,
        }),
      });
      setConfirmDeductType(null);
      fetchDashboardData();
    } catch (err) {
      console.error("Deduction error:", err);
    } finally {
      setIsDeducting(false);
    }
  };

  const handlePostponeTask = async (task: any) => {
    haptics.impactMedium();
    let baseDate = new Date();
    if (task.dueDate) {
      const parsed = new Date(task.dueDate);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
    const nextDate = addDays(baseDate, 1);
    const nextDateStr = format(nextDate, "yyyy-MM-dd");

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: nextDateStr }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error("Postpone task error:", err);
    }
  };

  const handleDailyCheckin = async (type: "PURITY" | "DIET") => {
    if (isCheckingIn) return;
    const isPurity = type === "PURITY";
    const alreadyDone = isPurity
      ? discipline?.todayCheckins?.purity
      : discipline?.todayCheckins?.diet;

    if (alreadyDone) {
      haptics.impactLight();
      setCheckinFeedback(
        isPurity
          ? "Monk Purity already verified today! 🛡️"
          : "Clean Diet already logged today! 🥗"
      );
      setTimeout(() => setCheckinFeedback(null), 3000);
      return;
    }

    setIsCheckingIn(type);
    haptics.success();

    // Optimistic UI update
    setData((prev: any) => {
      if (!prev || !prev.discipline) return prev;
      const curPurity = prev.discipline.streaks?.purity?.currentStreak || 0;
      const curDiet = prev.discipline.streaks?.diet?.currentStreak || 0;
      return {
        ...prev,
        discipline: {
          ...prev.discipline,
          totalXP: (prev.discipline.totalXP || 0) + 25,
          monthlyXP: (prev.discipline.monthlyXP || 0) + 25,
          todayEarned: (prev.discipline.todayEarned || 0) + 25,
          todayCheckins: {
            ...prev.discipline.todayCheckins,
            [isPurity ? "purity" : "diet"]: true,
          },
          streaks: {
            ...prev.discipline.streaks,
            purity: {
              ...prev.discipline.streaks?.purity,
              currentStreak: isPurity ? curPurity + 1 : curPurity,
            },
            diet: {
              ...prev.discipline.streaks?.diet,
              currentStreak: !isPurity ? curDiet + 1 : curDiet,
            },
          },
        },
      };
    });

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isPurity ? "CHECKIN_PURITY" : "CHECKIN_DIET",
          points: 25,
        }),
      });
      const resJson = await res.json();
      if (resJson?.message) {
        setCheckinFeedback(resJson.message);
        setTimeout(() => setCheckinFeedback(null), 3500);
      }
      fetchDashboardData();
    } catch (err) {
      console.error("Daily checkin error:", err);
    } finally {
      setIsCheckingIn(null);
    }
  };

  const currentUserName =
    data?.user?.name ||
    (typeof window !== "undefined"
      ? localStorage.getItem("kunal_os_current_user_name")
      : null) ||
    "Warrior";

  const getGreeting = (name: string) => {
    const firstName = name.trim().split(" ")[0] || "Warrior";
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12)
      return {
        title: `Morning Focus, ${firstName}`,
        sub: "Execute primary objectives and lock in your flow state.",
      };
    if (hour >= 12 && hour < 17)
      return {
        title: `Afternoon Momentum, ${firstName}`,
        sub: "Maintain operational cadence, hydrate, and eliminate distractions.",
      };
    if (hour >= 17 && hour < 22)
      return {
        title: `Evening Discipline, ${firstName}`,
        sub: "Review your accomplishments, close open loops, and recover.",
      };
    return {
      title: `Night Vigil, ${firstName}`,
      sub: "Guard your peace, practice restorative gratitude, and recharge.",
    };
  };

  const greeting = getGreeting(currentUserName);

  const { todayTasks, financials, weeklySummary, discipline, steps } =
    data || {};

  return (
    <PullToRefresh onRefresh={fetchDashboardData}>
      <div className="space-y-4 pb-14 select-none">
        {/* Offline Status Alert */}
        {isOffline && (
          <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono text-amber-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Offline Mode • Loaded cache from {cacheTime || "previous session"}</span>
            </div>
            <button
              onClick={() => fetchDashboardData()}
              className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 font-bold transition-colors"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* Dashboard Section Header with Dynamic Greeting */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
              <LayoutDashboard className="w-4 h-4 text-brand-red" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white tracking-tight leading-none truncate">
                {greeting.title}
              </h2>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">
                {greeting.sub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 bg-zinc-950 border border-white/10 px-2.5 py-1.5 rounded-xl flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
            <span>{format(new Date(), "EEE, dd MMM")}</span>
          </div>
        </div>

        {/* 4 Hero KPI Metric Cards - Unified Brand Red Theme */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* 1. Net Worth -> /money */}
          <Link
            href="/money"
            onClick={() => haptics.selection()}
            className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
          >
            <div className="rounded-2xl bg-zinc-950 border border-white/10 group-hover:border-brand-red/40 p-3 flex flex-col justify-between h-full transition-all shadow-sm">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
                <span className="group-hover:text-white transition-colors">Net Worth</span>
                <Wallet className="w-3.5 h-3.5 text-brand-red group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono my-1">
                {formatINR(financials?.netWorth || 0)}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                <span className="truncate">Assets: {formatINR(financials?.totalAssets || 0)}</span>
              </div>
            </div>
          </Link>

          {/* 2. Daily Hydration KPI -> Scrolls to Hydration Tracker */}
          <div
            onClick={() => {
              haptics.impactLight();
              const el = document.getElementById("hydration-tracker");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("ring-2", "ring-brand-red", "shadow-glow-red");
                setTimeout(() => {
                  el.classList.remove("ring-2", "ring-brand-red", "shadow-glow-red");
                }, 2000);
              }
            }}
            className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
          >
            <div className="rounded-2xl bg-zinc-950 border border-white/10 group-hover:border-brand-red/40 p-3 flex flex-col justify-between h-full transition-all shadow-sm">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
                <span className="group-hover:text-white transition-colors">Hydration</span>
                <Droplets className="w-3.5 h-3.5 text-brand-red group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono my-1 flex items-baseline gap-1">
                <span>{waterGlasses}</span>
                <span className="text-xs text-zinc-500 font-normal">/ {waterTarget}</span>
                <span className="text-[10px] text-red-300 font-bold ml-auto font-mono">
                  {waterGlasses * 250} ml
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                {waterGlasses >= waterTarget ? (
                  <span className="text-red-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-red animate-pulse" />
                    Goal Met (+30)
                  </span>
                ) : (
                  <span>
                    {Math.min(100, Math.round((waterGlasses / Math.max(1, waterTarget)) * 100))}% Target
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. Study Analytics -> /progress */}
          <Link
            href="/progress"
            onClick={() => haptics.selection()}
            className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
          >
            <div className="rounded-2xl bg-zinc-950 border border-white/10 group-hover:border-brand-red/40 p-3 flex flex-col justify-between h-full transition-all shadow-sm">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
                <span className="group-hover:text-white transition-colors truncate">Study Focus</span>
                <GraduationCap className="w-3.5 h-3.5 text-brand-red group-hover:scale-110 transition-transform shrink-0" />
              </div>
              {(() => {
                const studiedTodayMins = weeklySummary?.studyMinutesToday || 0;
                const dailyTargetMins = Math.max(1, dailyStudyGoal * 60);
                const remainingMins = Math.max(0, dailyTargetMins - studiedTodayMins);
                const isGoalMet = studiedTodayMins >= dailyTargetMins;
                const percent = Math.min(100, Math.round((studiedTodayMins / dailyTargetMins) * 100));

                return (
                  <>
                    <div className="text-lg sm:text-xl font-bold tracking-tight font-mono my-1 flex items-baseline gap-1">
                      {isGoalMet ? (
                        <span className="text-red-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-brand-red animate-pulse" />
                          <span>Goal Met!</span>
                        </span>
                      ) : (
                        <>
                          <span className="text-white">{formatDuration(remainingMins)}</span>
                          <span className="text-[10px] text-brand-red font-semibold lowercase">left</span>
                        </>
                      )}
                    </div>

                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-brand-red shadow-glow-red"
                        style={{ width: `${Math.max(4, percent)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-0.5">
                      <span className="truncate">
                        Done: {formatDuration(studiedTodayMins)}
                      </span>
                      <span className="text-zinc-500 shrink-0 ml-1">
                        {dailyStudyGoal}h goal ({[0, 6].includes(new Date().getDay()) ? "Wknd" : "Wkday"})
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </Link>

          {/* 4. Daily Movement & Steps -> /health */}
          <Link
            href="/health"
            onClick={() => haptics.selection()}
            className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
          >
            <div className="rounded-2xl bg-zinc-950 border border-white/10 group-hover:border-brand-red/40 p-3 flex flex-col justify-between h-full transition-all shadow-sm">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono uppercase">
                <span className="group-hover:text-white transition-colors">Daily Steps</span>
                <Footprints className="w-3.5 h-3.5 text-brand-red group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-lg sm:text-xl font-bold tracking-tight text-white font-mono my-1 flex items-baseline gap-1">
                <span>{(steps?.todayCount || 0).toLocaleString()}</span>
                <span className="text-xs text-zinc-500 font-normal">
                  / {((steps?.targetSteps || 10000) / 1000).toFixed(0)}k
                </span>
                {steps?.syncSource === "HEALTH_CONNECT" && (
                  <span className="text-[9px] text-emerald-400 font-bold ml-auto font-mono flex items-center gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                    Sync
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
                {(steps?.todayCount || 0) >= (steps?.targetSteps || 10000) ? (
                  <span className="text-red-300 font-bold flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-brand-red animate-pulse" />
                    Goal Met!
                  </span>
                ) : (
                  <span>
                    {Math.min(100, Math.round(((steps?.todayCount || 0) / Math.max(1, (steps?.targetSteps || 10000))) * 100))}% ({steps?.distanceKm || Number(((steps?.todayCount || 0) * 0.00078).toFixed(1))} km)
                  </span>
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Sleek Discipline Companion & Karma Hub */}
        {discipline ? (
          <div className="rounded-2xl bg-zinc-950 border border-brand-red/25 hover:border-brand-red/40 transition-all p-3.5 sm:p-4 shadow-lg relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

            {/* Pet Deceased Alert Banner */}
            {discipline.isPetDead && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-between gap-2 text-xs font-mono text-zinc-300">
                <div className="flex items-center gap-2">
                  <Skull className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  <span><strong className="text-white">COMPANION DECEASED</strong>. Purity or Diet streak broken. Verify streaks to resurrect!</span>
                </div>
              </div>
            )}

            {/* Header: Direct Link to /rewards */}
            <Link
              href="/rewards"
              onClick={() => haptics.selection()}
              className="group flex items-center justify-between pb-2.5 border-b border-white/[0.08] hover:border-brand-red/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-brand-red/15 border border-brand-red/30 text-brand-red group-hover:scale-105 transition-transform">
                  <Crown className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                    Companion &amp; Karma XP
                    <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-brand-red group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                  discipline.isPetDead
                    ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                    : "bg-brand-red/15 text-red-300 border-brand-red/30"
                )}>
                  {discipline.isPetDead ? "R.I.P." : `LVL ${discipline.level}`}
                </span>
                {discipline.season && (
                  <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
                    • {discipline.season.name}
                  </span>
                )}
              </div>
            </Link>

            {/* Checkin Feedback Banner */}
            {checkinFeedback && (
              <div className="mt-2 px-3 py-1.5 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-between text-xs font-mono text-zinc-200 animate-in fade-in duration-150">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-red animate-pulse" />
                  {checkinFeedback}
                </span>
                <button
                  type="button"
                  onClick={() => setCheckinFeedback(null)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Center Deck: Interactive Pet + XP Telemetry */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 py-3">
              {/* Companion Character */}
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                <PixelPet
                  level={discipline.level}
                  totalXP={discipline.totalXP}
                  isPetDead={discipline.isPetDead}
                  purityStreak={discipline.streaks?.purity?.currentStreak || 0}
                  dietStreak={discipline.streaks?.diet?.currentStreak || 0}
                  todayDeducted={discipline.todayDeducted}
                  userName={currentUserName}
                />
              </div>

              {/* Score & Progress */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className={`text-2xl font-black tracking-tight ${discipline.totalXP < 0 ? "text-brand-red" : "text-white"}`}>
                      {discipline.totalXP.toLocaleString()} XP
                    </span>
                    <span className="text-xs text-zinc-400 truncate">{discipline.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[10px]">
                    <span className="px-2 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 text-red-300 font-bold">
                      +{discipline.todayEarned} Today
                    </span>
                    {discipline.todayDeducted > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-red/20 border border-brand-red/40 text-brand-red font-bold">
                        -{discipline.todayDeducted}
                      </span>
                    )}
                  </div>
                </div>

                {/* Laser Progress Bar */}
                <Link
                  href="/rewards"
                  onClick={() => haptics.selection()}
                  className="block group"
                >
                  <div className="w-full h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-redDark via-brand-red to-brand-redLight rounded-full transition-all duration-500 shadow-glow-red"
                      style={{ width: `${Math.max(5, discipline.progressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-1">
                    <span>Advancement</span>
                    <span className="group-hover:text-white transition-colors">
                      {discipline.progressPercent}% ({discipline.currentLevelXP || discipline.totalXP}/{discipline.nextLevelXP} XP)
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Bottom Row: 4 Compact Action Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-white/[0.08]">
              {/* Purity Direct Check-in */}
              <button
                type="button"
                disabled={Boolean(isCheckingIn)}
                onClick={() => handleDailyCheckin("PURITY")}
                className={clsx(
                  "px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all active:scale-95 text-left",
                  discipline.todayCheckins?.purity
                    ? "bg-brand-red/15 border-brand-red/30 text-red-300 cursor-default"
                    : "bg-white/[0.03] hover:bg-brand-red/10 border-white/10 hover:border-brand-red/30 text-white cursor-pointer shadow-glow-red-subtle"
                )}
                title={discipline.todayCheckins?.purity ? "Purity Verified Today" : "Click to Verify Today's Monk Purity (+25 XP)"}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className={clsx("w-3.5 h-3.5 flex-shrink-0", discipline.todayCheckins?.purity ? "text-brand-red" : "text-zinc-400")} />
                  <span className="text-[11px] font-mono truncate">
                    {discipline.todayCheckins?.purity ? "Purity ✓" : "Purity"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!discipline.todayCheckins?.purity && (
                    <span className="text-[9px] font-mono font-bold text-red-300 bg-brand-red/15 px-1 rounded">
                      +25
                    </span>
                  )}
                  <span className="text-xs font-bold font-mono text-white">
                    {discipline.streaks?.purity?.currentStreak || 0}d
                  </span>
                </div>
              </button>

              {/* Clean Diet Direct Check-in */}
              <button
                type="button"
                disabled={Boolean(isCheckingIn)}
                onClick={() => handleDailyCheckin("DIET")}
                className={clsx(
                  "px-2.5 py-1.5 rounded-xl border flex items-center justify-between transition-all active:scale-95 text-left",
                  discipline.todayCheckins?.diet
                    ? "bg-brand-red/15 border-brand-red/30 text-red-300 cursor-default"
                    : "bg-white/[0.03] hover:bg-brand-red/10 border-white/10 hover:border-brand-red/30 text-white cursor-pointer"
                )}
                title={discipline.todayCheckins?.diet ? "Clean Diet Verified Today" : "Click to Verify Today's Clean Diet (+25 XP)"}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <UtensilsCrossed className={clsx("w-3.5 h-3.5 flex-shrink-0", discipline.todayCheckins?.diet ? "text-brand-red" : "text-zinc-400")} />
                  <span className="text-[11px] font-mono truncate">
                    {discipline.todayCheckins?.diet ? "Diet ✓" : "Clean Diet"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {!discipline.todayCheckins?.diet && (
                    <span className="text-[9px] font-mono font-bold text-red-300 bg-brand-red/15 px-1 rounded">
                      +25
                    </span>
                  )}
                  <span className="text-xs font-bold font-mono text-white">
                    {discipline.streaks?.diet?.currentStreak || 0}d
                  </span>
                </div>
              </button>

              {/* Relapse Quick Deduction */}
              <button
                type="button"
                onClick={() => handleQuickDeduct("FAP")}
                className="px-2.5 py-1.5 rounded-xl bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/30 hover:border-brand-red flex items-center justify-between transition-all active:scale-95"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                  <span className="text-[11px] font-mono text-red-300 truncate">Relapse</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-red text-white leading-none">
                  -100
                </span>
              </button>

              {/* Junk Food Quick Deduction */}
              <button
                type="button"
                onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
                className="px-2.5 py-1.5 rounded-xl bg-white/[0.03] hover:bg-brand-red/10 border border-white/10 hover:border-brand-red/30 flex items-center justify-between transition-all active:scale-95"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs leading-none">🍔</span>
                  <span className="text-[11px] font-mono text-zinc-400 hover:text-red-300 truncate">Eat Junk</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-brand-red/15 text-red-300 border border-brand-red/30 leading-none">
                  -50
                </span>
              </button>
            </div>
          </div>
        ) : loading ? (
          /* Smooth Companion & XP Mode Loading Phase Skeleton */
          <div className="rounded-2xl bg-zinc-950 border border-white/10 p-3.5 sm:p-4 animate-pulse space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-red/20" />
                <div className="w-32 h-3.5 rounded bg-white/10" />
              </div>
              <div className="w-14 h-4 rounded bg-white/10" />
            </div>

            <div className="py-2 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5" />
              <div className="space-y-1.5 flex-1">
                <div className="w-28 h-4 rounded bg-white/10" />
                <div className="w-full h-1.5 rounded bg-white/5" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5">
              <div className="h-8 rounded-xl bg-white/5" />
              <div className="h-8 rounded-xl bg-white/5" />
              <div className="h-8 rounded-xl bg-white/5" />
              <div className="h-8 rounded-xl bg-white/5" />
            </div>
          </div>
        ) : null}

        {/* Main Grid: Priorities & Hydration */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left 2 Cols: Priorities */}
          <div className="lg:col-span-2 space-y-4">
            {/* Today's Tasks */}
            <div className="rounded-2xl bg-zinc-950 border border-white/10 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <Link
                  href="/tasks"
                  onClick={() => haptics.selection()}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-brand-red" />
                  <span className="text-xs font-bold text-white uppercase font-mono tracking-wider group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                    Today&apos;s Priorities
                    <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-brand-red group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
                <Link
                  href="/tasks"
                  className="text-[10px] text-zinc-400 hover:text-white transition-colors font-mono"
                >
                  View all ({todayTasks?.length || 0})
                </Link>
              </div>

              <div className="space-y-2">
                {!todayTasks || todayTasks.length === 0 ? (
                  <div className="text-center py-5 text-xs text-zinc-500 font-mono">
                    No tasks scheduled for today. Everything is clear!
                  </div>
                ) : (
                  todayTasks.map((task: any) => {
                    const isDone = task.status === "DONE";

                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id, task.status)}
                        className={clsx(
                          "group relative overflow-hidden flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
                          isDone
                            ? "bg-black/40 border-white/5 opacity-60 text-zinc-500"
                            : task.priority === "HIGH"
                            ? "bg-brand-red/5 hover:bg-brand-red/10 border-brand-red/30 shadow-glow-red-subtle text-white"
                            : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-white"
                        )}
                      >
                        {task.priority === "HIGH" && !isDone && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red shadow-glow-red" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTask(task.id, task.status);
                            }}
                            className={clsx(
                              "w-4 h-4 rounded-md border flex items-center justify-center transition-all flex-shrink-0 active:scale-90",
                              isDone
                                ? "bg-brand-red border-brand-red text-white shadow-glow-red"
                                : "border-zinc-700 group-hover:border-brand-red bg-white/[0.02]"
                            )}
                            aria-label={isDone ? "Mark todo" : "Mark done"}
                          >
                            <Check className={clsx("w-3 h-3 stroke-[2.5]", isDone ? "opacity-100" : "opacity-0")} />
                          </button>
                          <span className={clsx("text-xs font-medium truncate", isDone && "line-through text-zinc-500")}>
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {task.category && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-400 border border-white/5 font-mono">
                              <span className="w-1 h-1 rounded-full bg-brand-red" />
                              <span>{task.category}</span>
                            </span>
                          )}
                          {task.priority === "HIGH" && !isDone && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase bg-brand-red/15 text-red-300 border border-brand-red/30">
                              Urgent
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePostponeTask(task);
                            }}
                            className="h-5 px-1.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] text-[9px] font-mono text-zinc-400 hover:text-white border border-white/10 flex items-center gap-1 transition-all active:scale-95"
                            title="Postpone +1 Day to Tomorrow"
                          >
                            <Calendar className="w-2.5 h-2.5 text-brand-red" />
                            <span>+1d</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Col: Hydration Tracker */}
          <div id="hydration-tracker" className="space-y-4 rounded-2xl transition-all duration-300">
            {/* Water & Hydration Tracker with 2h Alarms */}
            <WaterTrackerCard userId={data?.user?.id} />
          </div>
        </div>

        {/* Confirm Deduct Modal */}
        <ConfirmDialog
          isOpen={Boolean(confirmDeductType)}
          onClose={() => setConfirmDeductType(null)}
          onConfirm={handleExecuteDeduct}
          isLoading={isDeducting}
          title={confirmDeductType === "UNHEALTHY_FOOD" ? "Log Junk Food Infraction" : "Log Protocol Relapse"}
          message={
            confirmDeductType === "UNHEALTHY_FOOD"
              ? "Log an Unhealthy/Junk Food infraction (-50 XP) and reset your Clean Diet streak?"
              : "Log a Monk Protocol Relapse (-100 XP) and reset your Purity streak to Day 0?"
          }
          confirmText={confirmDeductType === "UNHEALTHY_FOOD" ? "Deduct 50 XP" : "Deduct 100 XP"}
          confirmVariant="red"
          iconType="danger"
        />
      </div>
    </PullToRefresh>
  );
}
