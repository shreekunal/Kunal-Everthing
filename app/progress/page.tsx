"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate } from "@/lib/formatters";
import {
  BarChart3,
  Plus,
  TrendingUp,
  Calendar,
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

  // Manual session entry
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

  const { today, thisWeek, last7Days, recentSessions } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-red" />
          Focus & Productivity Analytics
        </h2>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          Daily & weekly deep work rollups, subject distribution, and session logging
        </p>
      </div>

      {/* Hero Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card glow="red">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Today&apos;s Work
          </span>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {formatDuration(today?.workMinutes || 0)}
          </p>
        </Card>
        <Card glow="red">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Today&apos;s Study
          </span>
          <p className="text-xl font-bold text-brand-red font-mono mt-1">
            {formatDuration(today?.studyMinutes || 0)}
          </p>
        </Card>
        <Card>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Week Total
          </span>
          <p className="text-xl font-bold text-white font-mono mt-1">
            {formatDuration(thisWeek?.totalMinutes || 0)}
          </p>
        </Card>
        <Card>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Work / Study Split
          </span>
          <p className="text-xs text-zinc-300 font-mono mt-1.5">
            W: <strong className="text-white">{formatDuration(thisWeek?.workMinutes || 0)}</strong> | S:{" "}
            <strong className="text-brand-red">{formatDuration(thisWeek?.studyMinutes || 0)}</strong>
          </p>
        </Card>
      </div>

      {/* Grid: Manual Log + 7-Day Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Activity Entry */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-red" />
                <CardTitle>Log Focus Session</CardTitle>
              </div>
            </CardHeader>

            <form onSubmit={handleManualLog} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                  Project / Focus Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next.js, Algorithms, Client Work"
                  value={manualProject}
                  onChange={(e) => setManualProject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                    Category
                  </label>
                  <select
                    value={manualType}
                    onChange={(e) =>
                      setManualType(e.target.value as "WORK" | "STUDY" | "PERSONAL")
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                  >
                    <option value="WORK">Work</option>
                    <option value="STUDY">Study</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button variant="red" size="sm" type="submit" className="w-full py-2.5 font-semibold">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Focus Session</span>
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* 7-Day Chart */}
        <Card className="lg:col-span-2">
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
      </div>

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
