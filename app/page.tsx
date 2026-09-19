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
  Heart,
  CheckCircle2,
  Circle,
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
} from "lucide-react";
import Link from "next/link";
import { format, addDays } from "date-fns";
import { haptics } from "@/lib/haptics";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { EveningCheckinModal } from "@/components/discipline/EveningCheckinModal";
import { PixelPet } from "@/components/discipline/PixelPet";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheTime, setCacheTime] = useState<string | null>(null);
  const [isEveningCheckinOpen, setIsEveningCheckinOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setIsOffline(false);
        if (typeof window !== "undefined") {
          localStorage.setItem(
            "everything_dashboard_cache",
            JSON.stringify({
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              data: json,
            })
          );
        }
      } else {
        throw new Error("Failed to fetch dashboard data");
      }
    } catch (err) {
      console.warn("Using offline dashboard cache if available:", err);
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("everything_dashboard_cache");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setData(parsed.data);
            setCacheTime(parsed.timestamp);
            setIsOffline(true);
          } catch {}
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const handleOnline = () => fetchDashboardData();
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("kunal-os-refresh", fetchDashboardData);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("kunal-os-refresh", fetchDashboardData);
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

  const handleQuickDeduct = async (type: "UNHEALTHY_FOOD" | "FAP") => {
    const isFood = type === "UNHEALTHY_FOOD";
    const confirmMsg = isFood
      ? "Log Unhealthy / Junk Food infraction (-50 XP) and reset Clean Diet streak?"
      : "Log Monk Protocol Relapse (-100 XP) and reset Purity streak to Day 0?";

    if (!confirm(confirmMsg)) return;

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
      fetchDashboardData();
    } catch (err) {
      console.error("Deduction error:", err);
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12)
      return {
        title: "Morning Focus, Kunal",
        sub: "Start strong with your primary objectives and deep work protocols.",
      };
    if (hour >= 12 && hour < 17)
      return {
        title: "Afternoon Momentum, Kunal",
        sub: "Maintain operational cadence, hydrate, and eliminate distractions.",
      };
    if (hour >= 17 && hour < 22)
      return {
        title: "Evening Discipline, Kunal",
        sub: "Review your accomplishments, close remaining loops, and prepare for rest.",
      };
    return {
      title: "Night Vigil, Kunal",
      sub: "Guard your peace, practice restorative gratitude, and recover for tomorrow.",
    };
  };

  const greeting = getGreeting();

  const { todayTasks, routines, financials, weeklySummary, upcomingDues, partner, discipline } =
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

        {/* Urgent Credit Card Due Alert Banner */}
        {(() => {
          const urgentCard = upcomingDues?.find(
            (c: any) => c.daysRemaining <= 3 && (c.outstanding > 0 || c.currentOutstanding > 0)
          );
          if (!urgentCard) return null;

          const outstandingAmt = urgentCard.outstanding || urgentCard.currentOutstanding || 0;

          return (
            <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-between gap-3 text-xs font-mono shadow-glow-red">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">
                    Urgent Payment Due: {urgentCard.bank} {urgentCard.name}
                  </p>
                  <p className="text-red-300 text-[11px] mt-0.5">
                    {urgentCard.daysRemaining <= 0
                      ? "Payment is DUE TODAY!"
                      : `Due in ${urgentCard.daysRemaining} days`} • Outstanding: {formatINR(outstandingAmt)}
                  </p>
                </div>
              </div>
              <Link
                href="/money"
                className="px-3.5 py-1.5 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors whitespace-nowrap active:scale-95 flex-shrink-0"
              >
                Pay Now
              </Link>
            </div>
          );
        })()}

      {/* 4 Hero Glass Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Net Worth */}
        <Card glow="red" className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
            <span>Net Worth</span>
            <Wallet className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
            {formatINR(financials?.netWorth || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-500">Assets: {formatINR(financials?.totalAssets || 0)}</span>
            <Link
              href="/money"
              className="text-red-400 hover:text-red-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card Outstandings */}
        <Card glow="red" className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
            <span>Card Dues</span>
            <CreditCard className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-red-400 font-mono">
            {formatINR(financials?.totalCardOutstanding || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-500">
              {upcomingDues?.[0] ? upcomingDues[0].dueDateLabel : "No dues"}
            </span>
            <Link
              href="/money"
              className="text-red-400 hover:text-red-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
            >
              Pay <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Work & Study */}
        <Card glow="red" className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
            <span>Deep Work (Week)</span>
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
            {formatDuration(
              (weeklySummary?.workMinutes || 0) + (weeklySummary?.studyMinutes || 0)
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>Work: {formatDuration(weeklySummary?.workMinutes || 0)}</span>
            <span>Study: {formatDuration(weeklySummary?.studyMinutes || 0)}</span>
          </div>
        </Card>

        {/* Consistency */}
        <Card glow="red" className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1 font-mono uppercase">
            <span>Habit Streak</span>
            <Flame className="w-4 h-4 text-red-400 fill-red-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono">
            {weeklySummary?.routineCompletionRate || 0}%
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>
              Tasks: {weeklySummary?.tasksCompleted || 0}/{weeklySummary?.tasksTotal || 0}
            </span>
            <span className="text-red-400 font-bold">Active 🔥</span>
          </div>
        </Card>
      </div>

      {/* Discipline Karma & Streaks Live Bar */}
      {discipline && (
        <Card glow="red" className="relative overflow-hidden bg-black/95 border border-brand-red/30 shadow-glow-red-subtle p-3.5 sm:p-4">
          {/* Pet Deceased Alert Banner (when monthly XP < 0) */}
          {discipline.isPetDead && (
            <div className="mb-3 px-3 py-2 rounded-xl bg-red-950/60 border border-red-500/60 flex items-center justify-between gap-2 text-xs font-mono shadow-glow-red animate-pulse">
              <div className="flex items-center gap-2 text-red-300">
                <Skull className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>
                  <strong className="text-white">COMPANION DECEASED</strong> • Score: {discipline.totalXP} XP. Log focus sessions or complete tasks to resurrect!
                </span>
              </div>
            </div>
          )}

          {/* Header Row: Pixel Pet Companion + Level Rank + Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
            {/* Left: Pixel Pet & Level Information */}
            <div className="flex items-center gap-3">
              <PixelPet
                level={discipline.level}
                totalXP={discipline.totalXP}
                isPetDead={discipline.isPetDead}
                purityStreak={discipline.streaks?.purity?.currentStreak || 0}
                dietStreak={discipline.streaks?.diet?.currentStreak || 0}
                todayDeducted={discipline.todayDeducted}
              />
              <div className="hidden sm:block w-[1px] h-8 bg-white/10" />
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-wider ${discipline.isPetDead ? "bg-zinc-800 text-zinc-400" : "bg-brand-red text-white shadow-glow-red-subtle"}`}>
                    {discipline.isPetDead ? "R.I.P." : `Lvl ${discipline.level}`}
                  </span>
                  <h3 className="text-sm font-black text-white tracking-tight">
                    {discipline.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono mt-1">
                  <span className={`font-bold border px-2 py-0.5 rounded-md ${discipline.totalXP < 0 ? "text-red-400 border-red-500/30 bg-red-500/10" : "text-white bg-white/[0.06] border-white/10"}`}>
                    {discipline.totalXP} XP
                  </span>
                  <span className="text-emerald-400 text-[11px] font-medium">+{discipline.todayEarned}</span>
                  {discipline.todayDeducted > 0 && (
                    <span className="text-brand-red text-[11px] font-medium">-{discipline.todayDeducted}</span>
                  )}
                  {discipline.season && (
                    <span className="text-[10px] text-zinc-500 hidden md:inline ml-1">
                      • {discipline.season.name} ({discipline.season.daysRemaining}d left)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  haptics.impactMedium();
                  setIsEveningCheckinOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/40 text-[11px] font-mono text-white transition-all flex items-center gap-1 shadow-glow-red-subtle active:scale-95"
              >
                <span>🌙 Bedtime</span>
              </button>

              <Link
                href="/rewards"
                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-red-500/30 text-[11px] font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1 group"
              >
                <span>Rewards</span>
                <ArrowRight className="w-3 h-3 text-brand-red group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Middle Row: Sleek 4-Pill Telemetry Dock (2x2 Grid with Centered Text) */}
          <div className="grid grid-cols-2 gap-2.5 pt-3">
            {/* Row 1, Col 1: Purity Streak */}
            <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
              <span className="text-xs font-bold text-white">
                {discipline.streaks?.purity?.currentStreak || 0}d
              </span>
              <span className="text-[10px] text-zinc-400">Purity</span>
            </div>

            {/* Row 1, Col 2: Diet Streak */}
            <div className="px-3 py-2 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-center gap-1.5 font-mono">
              <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-bold text-white">
                {discipline.streaks?.diet?.currentStreak || 0}d
              </span>
              <span className="text-[10px] text-zinc-400">Diet</span>
            </div>

            {/* Row 2, Col 1: Relapse Deduction Button (below Purity) */}
            <button
              type="button"
              onClick={() => handleQuickDeduct("FAP")}
              className="px-3 py-2 rounded-xl bg-brand-red/10 hover:bg-brand-red/20 border border-brand-red/40 hover:border-brand-red text-xs font-mono text-white transition-all flex items-center justify-center text-center gap-1.5 shadow-glow-red-subtle active:scale-95"
            >
              <Zap className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
              <span>Relapse</span>
              <span className="text-[10px] font-bold text-white bg-brand-red px-1.5 py-0.5 rounded leading-none">
                -100
              </span>
            </button>

            {/* Row 2, Col 2: Eat Junk Deduction Button (below Diet) */}
            <button
              type="button"
              onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
              className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-xs font-mono text-zinc-200 hover:text-white transition-all flex items-center justify-center text-center gap-1.5 active:scale-95"
            >
              <span>🍔 Junk</span>
              <span className="text-[10px] font-bold text-brand-red bg-red-500/15 px-1.5 py-0.5 rounded leading-none border border-red-500/30">
                -50
              </span>
            </button>
          </div>

          {/* Bottom Micro Progress Line */}
          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
              <span>Next Level Progress</span>
              <span>
                <strong className="text-zinc-300">{discipline.currentLevelXP || discipline.totalXP}</strong> / {discipline.nextLevelXP} XP ({discipline.progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-brand-red rounded-full transition-all duration-500 shadow-glow-red"
                style={{ width: `${Math.max(5, discipline.progressPercent)}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Priorities & Habits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-red-400" />
                <CardTitle>Today&apos;s Priorities</CardTitle>
              </div>
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
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isDone
                          ? "bg-white/[0.01] border-white/5 text-zinc-600 line-through"
                          : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500 hover:text-white flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">{task.title}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.category && (
                          <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/5 font-mono">
                            {task.category}
                          </span>
                        )}
                        {task.priority === "HIGH" && (
                          <Badge variant="red" size="sm">
                            High
                          </Badge>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePostponeTask(task);
                          }}
                          className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-mono text-zinc-400 hover:text-white border border-white/10 flex items-center gap-1 transition-all active:scale-95"
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
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-red-400 fill-red-400" />
                <CardTitle>Daily Habits & Streaks</CardTitle>
              </div>
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

        {/* Right Col: Credit Card Dues & Relationship Spotlight */}
        <div className="space-y-6">
          {/* Credit Card Dues */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-400" />
                <CardTitle>Credit Card Dues</CardTitle>
              </div>
              <Link
                href="/money"
                className="text-xs text-red-400 hover:text-red-300 font-mono"
              >
                Cards Hub
              </Link>
            </CardHeader>

            <div className="space-y-2.5">
              {!upcomingDues || upcomingDues.length === 0 ? (
                <div className="text-xs text-zinc-500 text-center py-4 font-mono">
                  No upcoming card dues!
                </div>
              ) : (
                upcomingDues.map((card: any) => (
                  <div
                    key={card.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-white truncate">
                      {card.bank ? `${card.bank} ` : ""}{card.name}
                    </span>

                    <Badge variant="red" size="sm">
                      {card.dueDateLabel}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Relationship Spotlight */}
          {partner && (
            <Card glow="red">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                  <CardTitle>Relationship</CardTitle>
                </div>
                <Link
                  href="/relationship"
                  className="text-xs text-red-400 hover:text-red-300 font-mono"
                >
                  Templates
                </Link>
              </CardHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Partner:</span>
                  <span className="font-bold text-white">
                    {partner.nickname || partner.name}
                  </span>
                </div>
                {partner.anniversary && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Anniversary:</span>
                    <span className="text-red-400 font-mono">{partner.anniversary}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Link href="/relationship">
                    <Button variant="primary" size="sm" className="w-full">
                      <Heart className="w-3.5 h-3.5" />
                      Send WhatsApp Wish
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Daily Evening Bedtime Monk Reflection Modal */}
      <EveningCheckinModal
        isOpen={isEveningCheckinOpen}
        onClose={() => setIsEveningCheckinOpen(false)}
        onCompleted={fetchDashboardData}
        todayEarned={discipline?.todayEarned || 0}
        todayDeducted={discipline?.todayDeducted || 0}
      />
    </div>
    </PullToRefresh>
  );
}
