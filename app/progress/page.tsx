"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate } from "@/lib/formatters";
import {
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Clock,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Live Timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerProject, setTimerProject] = useState("Deep Work");
  const [timerType, setTimerType] = useState<"WORK" | "STUDY" | "PERSONAL">("WORK");

  // Manual entry
  const [manualProject, setManualProject] = useState("");
  const [manualDuration, setManualDuration] = useState("45");
  const [manualType, setManualType] = useState<"WORK" | "STUDY" | "PERSONAL">("WORK");

  const fetchProgress = async () => {
    try {
      const res = await fetch("/api/progress");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Progress fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchProgress();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const handleSaveTimerSession = async () => {
    const minutes = Math.max(1, Math.round(timerSeconds / 60));
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: timerProject,
          durationMinutes: minutes,
          type: timerType,
        }),
      });
      setIsTimerRunning(false);
      setTimerSeconds(0);
      fetchProgress();
    } catch (err) {
      console.error("Save session error:", err);
    }
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProject) return;

    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: manualProject,
          durationMinutes: Number(manualDuration),
          type: manualType,
        }),
      });
      setManualProject("");
      fetchProgress();
    } catch (err) {
      console.error("Manual log error:", err);
    }
  };

  const formatTimerDigits = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const { today, thisWeek, last7Days, recentSessions } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-red-400" />
          Focus Stopwatch & Analytics
        </h2>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Real-time activity stopwatch and daily/weekly productivity rollups
        </p>
      </div>

      {/* Grid: Stopwatch + Manual Log */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Glass Stopwatch */}
        <Card glow="red" className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                <CardTitle>Live Stopwatch</CardTitle>
              </div>
              <Badge variant={isTimerRunning ? "red" : "glass"} size="sm">
                {isTimerRunning ? "Active Session" : "Standby"}
              </Badge>
            </CardHeader>

            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-mono font-bold tracking-widest text-white drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                {formatTimerDigits(timerSeconds)}
              </div>
              <p className="text-xs text-red-400 font-mono mt-2 uppercase tracking-wider font-semibold">
                {timerType}: {timerProject}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <input
                type="text"
                value={timerProject}
                onChange={(e) => setTimerProject(e.target.value)}
                placeholder="Project name"
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
              <select
                value={timerType}
                onChange={(e) =>
                  setTimerType(e.target.value as "WORK" | "STUDY" | "PERSONAL")
                }
                className="px-3.5 py-2 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
              >
                <option value="WORK">Work</option>
                <option value="STUDY">Study</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            {!isTimerRunning ? (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={() => setIsTimerRunning(true)}
              >
                <Play className="w-4 h-4 fill-white" /> Start
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => setIsTimerRunning(false)}
              >
                <Pause className="w-4 h-4" /> Pause
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsTimerRunning(false);
                setTimerSeconds(0);
              }}
              disabled={timerSeconds === 0}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              variant="white"
              size="sm"
              onClick={handleSaveTimerSession}
              disabled={timerSeconds < 30}
            >
              Log
            </Button>
          </div>
        </Card>

        {/* Manual Activity Entry */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-white" />
              <CardTitle>Manual Activity Log</CardTitle>
            </div>
          </CardHeader>

          <form onSubmit={handleManualLog} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                Project Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Next.js Architecture, Playwright"
                value={manualProject}
                onChange={(e) => setManualProject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                  Category
                </label>
                <select
                  value={manualType}
                  onChange={(e) =>
                    setManualType(e.target.value as "WORK" | "STUDY" | "PERSONAL")
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                >
                  <option value="WORK">Work</option>
                  <option value="STUDY">Study</option>
                  <option value="PERSONAL">Personal</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1 uppercase">
                  Duration (Mins)
                </label>
                <input
                  type="number"
                  min="1"
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="primary" size="sm" type="submit">
                Record Session
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Aggregation Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-[11px] text-zinc-500 font-mono uppercase">Today&apos;s Work</span>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {formatDuration(today?.workMinutes || 0)}
          </p>
        </Card>
        <Card>
          <span className="text-[11px] text-zinc-500 font-mono uppercase">Today&apos;s Study</span>
          <p className="text-xl font-bold text-red-400 font-mono mt-1">
            {formatDuration(today?.studyMinutes || 0)}
          </p>
        </Card>
        <Card>
          <span className="text-[11px] text-zinc-500 font-mono uppercase">Week Total</span>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {formatDuration(thisWeek?.totalMinutes || 0)}
          </p>
        </Card>
        <Card>
          <span className="text-[11px] text-zinc-500 font-mono uppercase">Work/Study Split</span>
          <p className="text-xs text-zinc-300 font-mono mt-1">
            W: {formatDuration(thisWeek?.workMinutes || 0)} | S:{" "}
            {formatDuration(thisWeek?.studyMinutes || 0)}
          </p>
        </Card>
      </div>

      {/* 7-Day Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-red" />
            <CardTitle>Last 7 Days Hours Breakdown</CardTitle>
          </div>
        </CardHeader>

        <div className="h-64 min-h-[256px] w-full pt-4">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days || []}>
                <XAxis dataKey="day" stroke="#71717A" fontSize={11} fontStyle="monospace" />
                <YAxis stroke="#71717A" fontSize={11} unit="h" fontStyle="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.95)",
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: "1rem",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px", fontFamily: "monospace" }} />
                <Bar dataKey="workHours" name="Work Hours" fill="#FFFFFF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="studyHours" name="Study Hours" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="personalHours" name="Personal" fill="#71717A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
              Loading analytics chart...
            </div>
          )}
        </div>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>

        <div className="divide-y divide-white/5">
          {!recentSessions || recentSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 font-mono">
              No sessions logged yet.
            </div>
          ) : (
            recentSessions.map((s: any) => (
              <div
                key={s.id}
                className="py-3.5 px-2 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant={s.type === "STUDY" ? "red" : "white"} size="sm">
                    {s.type}
                  </Badge>
                  <span className="font-bold text-white">{s.project}</span>
                </div>

                <div className="flex items-center gap-4 text-zinc-400 font-mono">
                  <span className="text-white font-bold">
                    {formatDuration(s.durationMinutes)}
                  </span>
                  <span>{formatDate(s.date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
