"use client";

import React from "react";
import clsx from "clsx";
import { format, subDays } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Compass,
  Sparkles,
  Sunrise,
  Sun,
  Coffee,
  Sunset,
  Moon,
  Zap,
  Award,
  Layers,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import {
  ConsistencyHeatmap60d,
  type HeatmapDay,
  type HeatmapStats,
} from "@/components/progress/ConsistencyHeatmap60d";
import {
  KnowledgeDecayRadar,
  type DecayingTopic,
} from "@/components/progress/KnowledgeDecayRadar";

function getCurrentWindowId(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return "EARLY_MORNING";
  if (hour >= 9 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 17) return "AFTERNOON";
  if (hour >= 17 && hour < 21) return "EVENING";
  if (hour >= 21 || hour < 1) return "NIGHT";
  return "LATE_NIGHT";
}

export interface AnalyticsTabProps {
  heatmapDays: HeatmapDay[];
  heatmapStats: HeatmapStats | null;
  decayingTopics: DecayingTopic[];
  onReviewTopic: (topic: DecayingTopic) => void;
  weekStudyMinutes: number;
  mounted: boolean;
  last7Days: any[];
  cognitiveWindows: any;
  primeWindow: any;
  recentSessions: any[];
  aimsData: any[];
}

export function AnalyticsTab({
  heatmapDays,
  heatmapStats,
  decayingTopics,
  onReviewTopic,
  weekStudyMinutes,
  mounted,
  last7Days,
  cognitiveWindows,
  primeWindow,
  recentSessions,
  aimsData,
}: AnalyticsTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 🟩 60-Day Study Consistency Matrix */}
      <ConsistencyHeatmap60d
        days={heatmapDays}
        stats={
          heatmapStats || {
            totalStudyMinutes60d: 0,
            totalStudyHours60d: 0,
            activeDays60d: 0,
            currentStreak: 0,
            longestStreak60d: 0,
            consistencyPercent: 0,
          }
        }
      />

      {/* 📡 Spaced Repetition Knowledge Decay Radar */}
      <KnowledgeDecayRadar
        decayingTopics={decayingTopics}
        onReviewTopic={onReviewTopic}
      />

      {/* 7-Day Bar Chart */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
            Last 7 Days Study Hours
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Week: {formatDuration(weekStudyMinutes)}
          </span>
        </div>

        <div className="h-48 w-full pt-2">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days || []}>
                <XAxis dataKey="day" stroke="#71717A" fontSize={10} fontStyle="monospace" />
                <YAxis stroke="#71717A" fontSize={10} unit="h" fontStyle="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0,0,0,0.95)",
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: "0.75rem",
                    fontSize: "11px",
                  }}
                  formatter={(value: any) => [
                    formatDuration(Math.round(Number(value) * 60)),
                    "Study Focus",
                  ]}
                />
                <Bar dataKey="studyHours" name="Study Hours" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* REDESIGNED COGNITIVE PRIME WINDOWS COCKPIT */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3.5 shadow-xl relative overflow-hidden">
        {/* Ambient Red Glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-red/10 border border-brand-red/25 text-brand-red flex-shrink-0">
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-white">
                Cognitive Prime Windows
              </h3>
              <p className="text-[10px] font-mono text-zinc-500">
                Circadian Focus &amp; Productivity Mapping
              </p>
            </div>
          </div>

          {primeWindow ? (
            <span className="text-[10px] font-mono text-red-300 font-bold px-2 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 flex items-center gap-1 shadow-glow-red-subtle">
              <Sparkles className="w-2.5 h-2.5 text-brand-red animate-pulse" />
              <span>{primeWindow.label}</span>
            </span>
          ) : (
            <span className="text-[10px] font-mono text-zinc-500">6 Circadian Zones</span>
          )}
        </div>

        {/* 6-Zone Chronological Telemetry Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(cognitiveWindows?.windows || []).map((w: any) => {
            const isPrime = primeWindow?.id === w.id;
            const isCurrent = getCurrentWindowId() === w.id;
            const maxHours = Math.max(...(cognitiveWindows?.windows || []).map((win: any) => win.studyHours || 0), 1);
            const volumePercent = Math.min(100, Math.round(((w.studyHours || 0) / maxHours) * 100));

            return (
              <div
                key={w.id}
                className={clsx(
                  "p-2.5 rounded-xl border font-mono transition-all relative overflow-hidden flex flex-col justify-between",
                  isPrime
                    ? "bg-brand-red/15 border-brand-red/50 shadow-glow-red"
                    : isCurrent
                    ? "bg-white/[0.04] border-white/20 shadow-sm"
                    : w.sessionCount > 0
                    ? "bg-white/[0.02] border-white/10"
                    : "bg-white/[0.01] border-white/5 opacity-60"
                )}
              >
                {/* Top line: Icon, Label & Status Badge */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <div className={clsx("p-1 rounded-md", isPrime ? "text-brand-red bg-brand-red/20" : "text-zinc-400 bg-white/5")}>
                      {w.id === "EARLY_MORNING" && <Sunrise className="w-3 h-3 text-brand-red" />}
                      {w.id === "MORNING" && <Sun className="w-3 h-3 text-brand-red" />}
                      {w.id === "AFTERNOON" && <Coffee className="w-3 h-3 text-brand-red" />}
                      {w.id === "EVENING" && <Sunset className="w-3 h-3 text-brand-red" />}
                      {w.id === "NIGHT" && <Moon className="w-3 h-3 text-brand-red" />}
                      {w.id === "LATE_NIGHT" && <Sparkles className="w-3 h-3 text-brand-red" />}
                    </div>
                    <span className="text-[10px] font-bold text-white truncate">{w.label}</span>
                  </div>

                  {isPrime ? (
                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-brand-red text-white shadow-glow-red flex-shrink-0">
                      PRIME
                    </span>
                  ) : isCurrent ? (
                    <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-white/10 border border-white/20 text-white flex items-center gap-1 flex-shrink-0">
                      <span className="w-1 h-1 rounded-full bg-brand-red animate-ping" />
                      NOW
                    </span>
                  ) : null}
                </div>

                {/* Time Range */}
                <div className="text-[9px] text-zinc-500 mb-2">
                  {w.range}
                </div>

                {/* Mini Energy / Study Level Indicator Bar */}
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-500",
                      isPrime ? "bg-gradient-to-r from-brand-redDark to-brand-red shadow-glow-red" : "bg-zinc-600"
                    )}
                    style={{ width: `${Math.max(4, volumePercent)}%` }}
                  />
                </div>

                {/* Bottom Stats Row */}
                <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                  <span className="text-white font-bold">{formatDuration(w.totalStudyMins ?? Math.round((w.studyHours || 0) * 60))}</span>
                  <span className="text-zinc-400 text-[9px]">{w.sessionCount} sess</span>
                  <span className={clsx("text-[9px] font-bold", isPrime ? "text-red-300" : "text-zinc-400")}>
                    {w.avgEfficiencyPercent ? `${w.avgEfficiencyPercent}%` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Strategic Scheduling Recommendation */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2 text-[11px] font-mono text-zinc-400">
          <Zap className="w-3.5 h-3.5 text-brand-red flex-shrink-0 mt-0.5" />
          <div>
            <span className="text-white font-bold">Circadian Strategy: </span>
            Schedule core conceptual subjects (Polity Constitutional Articles, History timelines) in your{" "}
            <span className="text-red-300 font-semibold">{primeWindow?.label || "Morning"}</span> window. Reserve secondary windows for Geography mapping and revision drills.
          </div>
        </div>
      </div>

      {/* 3. FOCUS DEPTH & INTENSITY METRICS */}
      {(() => {
        const totalSess = recentSessions?.length || 0;
        const deepSess = (recentSessions || []).filter((s: any) => (s.durationMinutes || 0) >= 45).length;
        const deepRatio = totalSess > 0 ? Math.round((deepSess / totalSess) * 100) : 0;
        const longest = (recentSessions || []).reduce((max: number, s: any) => Math.max(max, s.durationMinutes || 0), 0);
        const totalMins = (recentSessions || []).reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0);
        const avgSess = totalSess > 0 ? Math.round(totalMins / totalSess) : 0;

        // Aim Subject Allocation
        const aimMap: Record<string, number> = {};
        (recentSessions || []).forEach((s: any) => {
          const p = s.project?.trim() || "Core Study";
          aimMap[p] = (aimMap[p] || 0) + (s.durationMinutes || 0);
        });
        const aimList = Object.entries(aimMap)
          .map(([name, mins]) => ({ name, mins }))
          .sort((a, b) => b.mins - a.mins)
          .slice(0, 5);

        // Aims Mastery Summary
        let totalTopicsMastered = 0;
        let totalTopicsTracked = 0;
        (aimsData || []).forEach((a: any) => {
          totalTopicsMastered += a.stats?.masteredTopics || 0;
          totalTopicsTracked += a.stats?.totalTopics || 0;
        });

        // 14-Day Consistency Calculation
        const past14Days = Array.from({ length: 14 }).map((_, i) => {
          const d = subDays(new Date(), 13 - i);
          const dStr = format(d, "yyyy-MM-dd");
          const dayLabel = format(d, "EEE");
          const dayNum = format(d, "d");
          const dayMins = (recentSessions || [])
            .filter((s: any) => s.date === dStr)
            .reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0);
          return { dStr, dayLabel, dayNum, dayMins, isToday: i === 13 };
        });

        const consistencyDays = past14Days.filter((d) => d.dayMins > 0).length;
        const consistencyScore = Math.min(40, Math.round((consistencyDays / 14) * 40));
        const deepScore = Math.min(30, Math.round((deepRatio / 100) * 30));
        const durationScore = Math.min(30, Math.round((avgSess / 60) * 30));
        const flowScore = Math.min(100, consistencyScore + deepScore + durationScore);

        let flowBadge = "Disciplined Seeker";
        let flowTier = "TIER II • PRACTITIONER";
        if (flowScore >= 85) {
          flowBadge = "Diamond Monk Flow 💎";
          flowTier = "TIER IV • GRANDMASTER";
        } else if (flowScore >= 70) {
          flowBadge = "Apex Focus Flow ⚔️";
          flowTier = "TIER III • WARRIOR";
        } else if (flowScore >= 50) {
          flowBadge = "Momentum Builder 🥈";
          flowTier = "TIER II • PRACTITIONER";
        }

        // Circadian Focus Distribution
        let morningMins = 0;
        let afternoonMins = 0;
        let nightMins = 0;

        (cognitiveWindows?.windows || []).forEach((w: any) => {
          const mins = w.totalStudyMins ?? Math.round((w.studyHours || 0) * 60);
          if (w.id === "EARLY_MORNING" || w.id === "MORNING") morningMins += mins;
          else if (w.id === "AFTERNOON") afternoonMins += mins;
          else nightMins += mins;
        });
        const totalCircadianMins = Math.max(1, morningMins + afternoonMins + nightMins);
        const morningPct = Math.round((morningMins / totalCircadianMins) * 100);
        const afternoonPct = Math.round((afternoonMins / totalCircadianMins) * 100);
        const nightPct = Math.max(0, 100 - morningPct - afternoonPct);

        return (
          <div className="space-y-4">
            {/* 1. FLOW STATE INDEX COCKPIT */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brand-red/15 border border-brand-red/30 text-brand-red">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase font-bold text-white tracking-wider">
                      Flow State Rating
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-500">{flowTier}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-mono font-black text-white">{flowScore}</span>
                  <span className="text-xs font-mono font-bold text-brand-red">/100</span>
                  <span className="block text-[9px] font-mono text-red-300 font-bold">{flowBadge}</span>
                </div>
              </div>

              {/* Flow Progress Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-redDark via-brand-red to-brand-redLight rounded-full shadow-glow-red transition-all duration-700"
                  style={{ width: `${Math.max(5, flowScore)}%` }}
                />
              </div>

              {/* 14-Day Consistency Momentum Strip */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-400 font-medium">14-Day Study Consistency</span>
                  <span className="text-brand-red font-bold">
                    {consistencyDays}/14 Active Days ({Math.round((consistencyDays / 14) * 100)}%)
                  </span>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-[repeat(14,minmax(0,1fr))] gap-1 pt-0.5">
                  {past14Days.map((day) => {
                    const hasStudy = day.dayMins > 0;
                    const isDeep = day.dayMins >= 60;
                    return (
                      <div key={day.dStr} className="flex flex-col items-center gap-1 group">
                        <span className="text-[8px] font-mono text-zinc-500 scale-90">{day.dayNum}</span>
                        <div
                          title={`${day.dStr}: ${formatDuration(day.dayMins)}`}
                          className={clsx(
                            "w-full h-5 rounded-md transition-all border",
                            isDeep
                              ? "bg-brand-red border-brand-red shadow-glow-red-subtle"
                              : hasStudy
                              ? "bg-brand-red/40 border-brand-red/60"
                              : "bg-white/[0.03] border-white/5 hover:border-white/15",
                            day.isToday && "ring-1 ring-white/60"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. CIRCADIAN ENERGY & DAY-PART BALANCE */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <span className="text-xs font-mono uppercase font-bold text-zinc-300 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-brand-red" />
                  Day-Part Study Balance
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Circadian Allocation</span>
              </div>

              {/* Multi-segmented Progress Bar */}
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-white/5 flex gap-0.5">
                <div
                  style={{ width: `${morningPct}%` }}
                  className="h-full bg-amber-500 transition-all duration-500 rounded-l-full"
                  title={`Morning: ${morningPct}% (${formatDuration(morningMins)})`}
                />
                <div
                  style={{ width: `${afternoonPct}%` }}
                  className="h-full bg-brand-red transition-all duration-500"
                  title={`Afternoon: ${afternoonPct}% (${formatDuration(afternoonMins)})`}
                />
                <div
                  style={{ width: `${nightPct}%` }}
                  className="h-full bg-indigo-500 transition-all duration-500 rounded-r-full"
                  title={`Evening/Night: ${nightPct}% (${formatDuration(nightMins)})`}
                />
              </div>

              {/* Legend Row */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-zinc-400 block text-[9px]">Morning</span>
                    <span className="text-white font-bold">{morningPct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-red shrink-0" />
                  <div className="truncate">
                    <span className="text-zinc-400 block text-[9px]">Afternoon</span>
                    <span className="text-white font-bold">{afternoonPct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-zinc-400 block text-[9px]">Night</span>
                    <span className="text-white font-bold">{nightPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. 4 MINI KPI CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Deep Focus Ratio</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {deepRatio}<span className="text-xs text-brand-red font-bold">%</span>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-1">
                  {deepSess}/{totalSess} sessions &ge; 45m
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Peak Session</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {formatDuration(longest)}
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-1">
                  Longest flow stretch
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Avg Duration</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {formatDuration(avgSess)}
                </div>
                <span className="text-[9px] font-mono text-zinc-500 mt-1">
                  Per logged session
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Mastery Count</span>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {totalTopicsMastered} <span className="text-xs text-zinc-500">/ {totalTopicsTracked}</span>
                </div>
                <span className="text-[9px] font-mono text-red-300 font-bold mt-1">
                  {totalTopicsTracked > 0 ? Math.round((totalTopicsMastered / totalTopicsTracked) * 100) : 0}% Checkpoints
                </span>
              </div>
            </div>

            {/* 4. AIM SUBJECT ALLOCATION PROGRESS BARS */}
            {aimList.length > 0 && (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="text-xs font-mono uppercase font-bold text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-brand-red" />
                    Aim Focus Distribution
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {formatDuration(totalMins)} logged
                  </span>
                </div>

                <div className="space-y-2.5">
                  {aimList.map((item) => {
                    const pct = totalMins > 0 ? Math.round((item.mins / totalMins) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-300 font-medium truncate max-w-[200px]">{item.name}</span>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-white font-bold">{formatDuration(item.mins)}</span>
                            <span className="text-zinc-500">({pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-red rounded-full shadow-glow-red-subtle transition-all duration-500"
                            style={{ width: `${Math.max(3, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
