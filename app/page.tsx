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
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener("kunal-os-refresh", fetchDashboardData);
    return () => window.removeEventListener("kunal-os-refresh", fetchDashboardData);
  }, []);

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
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

  const { todayTasks, routines, financials, weeklySummary, upcomingDues, partner } =
    data || {};

  return (
    <div className="space-y-6">
      {/* Dashboard Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-brand-red" />
            Dashboard & Daily Briefing
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Real-time glance at your tasks, routines, deep work focus, and financial standing
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-zinc-300 bg-white/[0.03] border border-white/10 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
          <span>{format(new Date(), "EEEE, MMM d, yyyy")}</span>
        </div>
      </div>

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
    </div>
  );
}
