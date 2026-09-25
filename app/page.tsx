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
    const storedWeekly = localStorage.getItem("everthing_weekly_study_goal_hours");
    const storedDaily = localStorage.getItem("everthing_daily_study_goal_hours");
    if (storedWeekly) {
      const val = parseInt(storedWeekly, 10);
      if (!isNaN(val) && val > 0) setWeeklyStudyGoal(val);
    }
    if (storedDaily) {
      const val = parseInt(storedDaily, 10);
      if (!isNaN(val) && val > 0) {
        setDailyStudyGoal(val);
      }
    } else if (storedWeekly) {
      const val = parseInt(storedWeekly, 10);
      if (!isNaN(val) && val > 0) {
        setDailyStudyGoal(Math.max(1, Math.round(val / 7)));
      }
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
    window.addEventListener("kunal-os-refresh", fetchDashboardData);
    window.addEventListener("kunal-os-refresh", loadWaterStats);
    window.addEventListener("kunal-os-refresh", loadStudyGoal);
    window.addEventListener("storage", loadWaterStats);
    window.addEventListener("storage", loadStudyGoal);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("kunal-os-refresh", fetchDashboardData);
      window.removeEventListener("kunal-os-refresh", loadWaterStats);
      window.removeEventListener("kunal-os-refresh", loadStudyGoal);
      window.removeEventListener("storage", loadWaterStats);
      window.removeEventListener("storage", loadStudyGoal);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
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

  const handleToggleRoutine = async (routineId: string) => {
    haptics.success();
    try {
      await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchDashboardData();
    } catch (err) {
      console.error("Routine toggle error:", err);
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
        sub: "Start strong with your primary objectives and deep work protocols.",
      };
    if (hour >= 12 && hour < 17)
      return {
        title: `Afternoon Momentum, ${firstName}`,
        sub: "Maintain operational cadence, hydrate, and eliminate distractions.",
      };
    if (hour >= 17 && hour < 22)
      return {
        title: `Evening Discipline, ${firstName}`,
        sub: "Review your accomplishments, close remaining loops, and prepare for rest.",
      };
    return {
      title: `Night Vigil, ${firstName}`,
      sub: "Guard your peace, practice restorative gratitude, and recover for tomorrow.",
    };
  };

  const greeting = getGreeting(currentUserName);

  const { todayTasks, routines, financials, weeklySummary, upcomingDues, discipline } =
    data || {};

  return (
    <PullToRefresh onRefresh={fetchDashboardData}>
      <div className="space-y-6">
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-brand-red" />
              {greeting.title}
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              {greeting.sub}
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-zinc-300 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
            <span>{format(new Date(), "EEEE, MMM d, yyyy")}</span>
          </div>
        </div>

        {/* Upcoming Credit Card Due Alert Banner */}
        {(() => {
          const urgentCard = upcomingDues?.find(
            (c: any) => c.daysRemaining <= 3 && c.daysRemaining >= 0
          );
          if (!urgentCard) return null;

          return (
            <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-between gap-3 text-xs font-mono shadow-glow-red">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    Payment Statement Due: {urgentCard.bank ? `${urgentCard.bank} ` : ""}{urgentCard.name}
                  </p>
                  <p className="text-red-300 text-[11px] mt-0.5">
                    {urgentCard.daysRemaining <= 0
                      ? "Statement is DUE TODAY!"
                      : `Due in ${urgentCard.daysRemaining} days`} • Due Day {urgentCard.dueDate || 30}
                  </p>
                </div>
              </div>
              <Link
                href="/money"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors whitespace-nowrap active:scale-95 flex-shrink-0"
              >
                View Cards
              </Link>
            </div>
          );
        })()}

      {/* 4 Hero Glass Metric Cards - All Navigatable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Net Worth -> /money */}
        <Link
          href="/money"
          onClick={() => haptics.selection()}
          className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
        >
          <Card glow="red" className="relative overflow-hidden group hover:border-brand-red/40 transition-all h-full">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
              <span className="group-hover:text-white transition-colors">Net Worth</span>
              <Wallet className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              {formatINR(financials?.netWorth || 0)}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-500">Assets: {formatINR(financials?.totalAssets || 0)}</span>
              <span className="text-zinc-500">Liab: {formatINR(financials?.totalLiabilities || 0)}</span>
            </div>
          </Card>
        </Link>

        {/* 2. Daily Hydration KPI -> Scrolls to Hydration Tracker */}
        <div
          onClick={() => {
            haptics.impactLight();
            const el = document.getElementById("hydration-tracker");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("ring-2", "ring-cyan-400", "shadow-[0_0_20px_rgba(6,182,212,0.4)]");
              setTimeout(() => {
                el.classList.remove("ring-2", "ring-cyan-400", "shadow-[0_0_20px_rgba(6,182,212,0.4)]");
              }, 2000);
            }
          }}
          className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
        >
          <Card glow="cyan" className="relative overflow-hidden group border-cyan-500/20 hover:border-cyan-400/50 transition-all h-full">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
              <span className="group-hover:text-cyan-300 transition-colors">Hydration Today</span>
              <Droplets className="w-4 h-4 text-cyan-400 fill-cyan-400/20 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-cyan-400 font-mono flex items-baseline gap-1.5">
              <span>{waterGlasses}</span>
              <span className="text-xs text-zinc-400 font-normal">/ {waterTarget} Glasses</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
              {waterGlasses >= waterTarget ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Goal Met (+30 XP)
                </span>
              ) : (
                <span className="text-zinc-400 font-semibold">
                  {Math.min(100, Math.round((waterGlasses / Math.max(1, waterTarget)) * 100))}% Goal
                </span>
              )}
              <span className="text-cyan-400 font-bold font-mono">
                {waterGlasses * 250} ml
              </span>
            </div>
          </Card>
        </div>

        {/* 3. Study Analytics -> /progress */}
        <Link
          href="/progress"
          onClick={() => haptics.selection()}
          className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
        >
          <Card glow="red" className="relative overflow-hidden group hover:border-brand-red/40 transition-all h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
                <span className="group-hover:text-white transition-colors truncate">Study Today</span>
                <GraduationCap className="w-4 h-4 text-brand-red group-hover:scale-110 transition-transform shrink-0" />
              </div>
              {(() => {
                const studiedTodayMins = weeklySummary?.studyMinutesToday || 0;
                const dailyTargetMins = Math.max(1, dailyStudyGoal * 60);
                const remainingMins = Math.max(0, dailyTargetMins - studiedTodayMins);
                const isGoalMet = studiedTodayMins >= dailyTargetMins;
                const percent = Math.min(100, Math.round((studiedTodayMins / dailyTargetMins) * 100));

                return (
                  <>
                    <div className="text-xl sm:text-2xl font-bold tracking-tight font-mono flex items-baseline gap-1.5">
                      {isGoalMet ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-4 h-4 animate-pulse text-emerald-400 shrink-0" />
                          <span>Goal Met!</span>
                        </span>
                      ) : (
                        <>
                          <span className="text-white">{formatDuration(remainingMins)}</span>
                          <span className="text-xs text-brand-red font-semibold lowercase">left</span>
                        </>
                      )}
                    </div>

                    {/* Compact Micro-Progress Bar for mobile */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-2">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          isGoalMet ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-brand-red shadow-glow-red"
                        )}
                        style={{ width: `${Math.max(4, percent)}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span className="truncate">
                        Done: {formatDuration(studiedTodayMins)}/{dailyStudyGoal}h
                      </span>
                      <span className="text-zinc-500 shrink-0 ml-1">
                        Wk: {formatDuration(weeklySummary?.studyMinutes || 0)}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </Card>
        </Link>

        {/* 4. Consistency -> /routines */}
        <Link
          href="/routines"
          onClick={() => haptics.selection()}
          className="block group cursor-pointer focus:outline-none active:scale-[0.98] transition-transform"
        >
          <Card glow="red" className="relative overflow-hidden group hover:border-brand-red/40 transition-all h-full">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
              <span className="group-hover:text-white transition-colors">Habit Streak</span>
              <Flame className="w-4 h-4 text-red-400 fill-red-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
              {weeklySummary?.routineCompletionRate || 0}%
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span>
                Tasks: {weeklySummary?.tasksCompleted || 0}/{weeklySummary?.tasksTotal || 0}
              </span>
              <span className="text-zinc-400">
                Rate: {weeklySummary?.routineCompletionRate || 0}%
              </span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Sleek Discipline Companion & Karma Hub */}
      {discipline ? (
        <Card glow="red" className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 border border-brand-red/30 shadow-[0_0_30px_rgba(239,68,68,0.12)] p-4">
          {/* Pet Deceased Alert Banner */}
          {discipline.isPetDead && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-700/60 flex items-center justify-between gap-2 text-xs font-mono text-zinc-300">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span><strong className="text-white">COMPANION DECEASED</strong> (XP below 0). Complete habits to resurrect!</span>
              </div>
            </div>
          )}

          {/* Header: Direct Link to /rewards */}
          <Link
            href="/rewards"
            onClick={() => haptics.selection()}
            className="group flex items-center justify-between pb-3 border-b border-white/[0.08] hover:border-brand-red/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-red/15 border border-brand-red/30 text-brand-red group-hover:scale-105 transition-transform">
                <Crown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase font-mono tracking-wider group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                  Companion &amp; Karma
                  <ArrowRight className="w-3 h-3 text-zinc-500 group-hover:text-brand-red group-hover:translate-x-0.5 transition-transform" />
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
          </Link>

          {/* Checkin Feedback Banner */}
          {checkinFeedback && (
            <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-between text-xs font-mono text-zinc-200 animate-in fade-in duration-200">
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

          {/* Center Compact Deck: Interactive Pet + XP Telemetry */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-3">
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
                  <span className={`text-2xl font-black tracking-tight ${discipline.totalXP < 0 ? "text-red-400" : "text-white"}`}>
                    {discipline.totalXP.toLocaleString()} XP
                  </span>
                  <span className="text-xs text-zinc-400 truncate">{discipline.title}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[10px]">
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
              <Link
                href="/rewards"
                onClick={() => haptics.selection()}
                className="block group"
              >
                <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-brand-red to-orange-500 rounded-full transition-all duration-500 shadow-glow-red"
                    style={{ width: `${Math.max(5, discipline.progressPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-1">
                  <span>To Level {discipline.level + 1}</span>
                  <span className="group-hover:text-white transition-colors">
                    {discipline.progressPercent}% ({discipline.currentLevelXP || discipline.totalXP}/{discipline.nextLevelXP} XP)
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* Bottom Row: 4 Sleek Compact Action Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2.5 border-t border-white/[0.08]">
            {/* Purity Direct Check-in */}
            <button
              type="button"
              disabled={Boolean(isCheckingIn)}
              onClick={() => handleDailyCheckin("PURITY")}
              className={clsx(
                "px-3 py-2 rounded-xl border flex items-center justify-between transition-all active:scale-95 text-left",
                discipline.todayCheckins?.purity
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default"
                  : "bg-brand-red/5 hover:bg-brand-red/15 border-brand-red/30 hover:border-brand-red/50 text-white cursor-pointer shadow-glow-red-subtle"
              )}
              title={discipline.todayCheckins?.purity ? "Purity Verified Today" : "Click to Verify Today's Monk Purity (+25 XP)"}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldCheck className={clsx("w-3.5 h-3.5 flex-shrink-0", discipline.todayCheckins?.purity ? "text-emerald-400" : "text-brand-red")} />
                <span className="text-[11px] font-mono truncate">
                  {discipline.todayCheckins?.purity ? "Purity ✓" : "Purity"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!discipline.todayCheckins?.purity && (
                  <span className="text-[9px] font-mono font-bold text-brand-red bg-brand-red/15 px-1 rounded">
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
                "px-3 py-2 rounded-xl border flex items-center justify-between transition-all active:scale-95 text-left",
                discipline.todayCheckins?.diet
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 cursor-default"
                  : "bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/30 hover:border-emerald-500/50 text-white cursor-pointer"
              )}
              title={discipline.todayCheckins?.diet ? "Clean Diet Verified Today" : "Click to Verify Today's Clean Diet (+25 XP)"}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-mono truncate">
                  {discipline.todayCheckins?.diet ? "Diet ✓" : "Clean Diet"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!discipline.todayCheckins?.diet && (
                  <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-1 rounded">
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
              className="px-3 py-2 rounded-xl bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/30 hover:border-brand-red flex items-center justify-between transition-all active:scale-95"
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
              className="px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 flex items-center justify-between transition-all active:scale-95"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs leading-none">🍔</span>
                <span className="text-[11px] font-mono text-zinc-400 hover:text-red-300 truncate">Junk Food</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 leading-none">
                -50
              </span>
            </button>
          </div>
        </Card>
      ) : loading ? (
        /* Smooth Companion & XP Mode Loading Phase Skeleton */
        <Card glow="red" className="relative overflow-hidden bg-black/95 border border-brand-red/20 shadow-glow-red-subtle p-3.5 sm:p-4 animate-pulse">
          {/* Header Row Skeleton */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/30" />
              <div className="w-36 h-4 rounded-md bg-white/10" />
            </div>
            <div className="w-16 h-5 rounded-full bg-brand-red/15 border border-brand-red/25" />
          </div>

          {/* Interactive Companion Pet Bay Skeleton */}
          <div className="my-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-brand-red/15 border border-brand-red/25 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-brand-red animate-pulse" />
              </div>
              <div className="space-y-1.5">
                <div className="w-32 h-3.5 rounded bg-white/15" />
                <div className="w-48 h-2.5 rounded bg-white/10" />
              </div>
            </div>
            <div className="w-14 h-3.5 rounded bg-white/10" />
          </div>

          {/* 4-Pill Telemetry Dock Skeleton */}
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            <div className="h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <div className="w-20 h-3 rounded bg-white/10" />
            </div>
            <div className="h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <div className="w-20 h-3 rounded bg-white/10" />
            </div>
            <div className="h-9 rounded-xl bg-brand-red/5 border border-brand-red/20 flex items-center justify-center">
              <div className="w-20 h-3 rounded bg-brand-red/20" />
            </div>
            <div className="h-9 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center">
              <div className="w-20 h-3 rounded bg-white/10" />
            </div>
          </div>

          {/* Progress Bar Skeleton */}
          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1.5">
            <div className="flex justify-between items-center">
              <div className="w-24 h-2.5 rounded bg-white/10" />
              <div className="w-16 h-2.5 rounded bg-white/10" />
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full w-2/5 bg-brand-red/30 rounded-full animate-pulse" />
            </div>
          </div>
        </Card>
      ) : null}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Priorities & Habits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <Link
                href="/tasks"
                onClick={() => haptics.selection()}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <CheckSquare className="w-4 h-4 text-red-400" />
                <CardTitle className="group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                  <span>Today&apos;s Priorities</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-red group-hover:translate-x-0.5 transition-transform" />
                </CardTitle>
              </Link>
              <Link
                href="/tasks"
                className="text-xs text-zinc-400 hover:text-white transition-colors font-mono"
              >
                View all ({todayTasks?.length || 0})
              </Link>
            </CardHeader>

            <div className="space-y-2">
              {!todayTasks || todayTasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-mono">
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
                        "group relative overflow-hidden flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                        isDone
                          ? "bg-black/40 border-white/5 opacity-60 text-zinc-500"
                          : task.priority === "HIGH"
                          ? "bg-gradient-to-r from-red-950/20 via-zinc-950/80 to-zinc-950 border-red-500/30 shadow-glow-red-subtle hover:border-red-500/50 text-white"
                          : "bg-zinc-950/80 hover:bg-zinc-900/60 border-white/[0.08] hover:border-white/20 text-white"
                      )}
                    >
                      {task.priority === "HIGH" && !isDone && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red shadow-glow-red" />
                      )}
                      <div className="flex items-center gap-3 min-w-0">
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
                              : "border-zinc-700 group-hover:border-brand-red/80 bg-white/[0.02]"
                          )}
                          aria-label={isDone ? "Mark todo" : "Mark done"}
                        >
                          <Check className={clsx("w-3 h-3 stroke-[2.5]", isDone ? "opacity-100" : "opacity-0")} />
                        </button>
                        <span className={clsx("text-sm font-medium truncate", isDone && "line-through text-zinc-500")}>
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.category && (
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-zinc-400 border border-white/5 font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                            <span>{task.category}</span>
                          </span>
                        )}
                        {task.priority === "HIGH" && !isDone && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                            Urgent
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePostponeTask(task);
                          }}
                          className="h-6 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-zinc-400 hover:text-white border border-white/10 flex items-center gap-1 transition-all active:scale-95"
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
          </Card>

          {/* Daily Routines */}
          <Card>
            <CardHeader>
              <Link
                href="/routines"
                onClick={() => haptics.selection()}
                className="flex items-center gap-2 group cursor-pointer"
              >
                <Flame className="w-4 h-4 text-red-400 fill-red-400" />
                <CardTitle className="group-hover:text-brand-red transition-colors flex items-center gap-1.5">
                  <span>Daily Habits &amp; Streaks</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-brand-red group-hover:translate-x-0.5 transition-transform" />
                </CardTitle>
              </Link>
              <Link
                href="/routines"
                className="text-xs text-zinc-400 hover:text-white transition-colors font-mono"
              >
                Matrix
              </Link>
            </CardHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {routines?.map((routine: any) => {
                const isCompleted = routine.completedToday;

                return (
                  <div
                    key={routine.id}
                    onClick={() => handleToggleRoutine(routine.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isCompleted
                        ? "bg-red-500/10 border-red-500/30 text-white shadow-glow-red-subtle"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-colors ${
                          isCompleted
                            ? "bg-red-500 border-red-400 text-white font-bold text-xs"
                            : "border-zinc-700 hover:border-zinc-500"
                        }`}
                      >
                        {isCompleted && "✓"}
                      </button>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{routine.name}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {routine.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 text-red-400 font-mono text-xs font-bold">
                      <Flame className="w-3.5 h-3.5 fill-red-400" />
                      <span>{routine.currentStreak}d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Col: Hydration Tracker */}
        <div id="hydration-tracker" className="space-y-6 rounded-2xl transition-all duration-300">
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
