"use client";

import React, { useState } from "react";
import { Flame, Calendar, Trophy, Zap, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";

export interface HeatmapDay {
  date: string;
  day: string;
  studyMinutes: number;
  studyHours: number;
  sessionCount: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapStats {
  totalStudyMinutes60d: number;
  totalStudyHours60d: number;
  activeDays60d: number;
  currentStreak: number;
  longestStreak60d: number;
  consistencyPercent: number;
}

interface ConsistencyHeatmap60dProps {
  days: HeatmapDay[];
  stats: HeatmapStats;
}

export function ConsistencyHeatmap60d({ days, stats }: ConsistencyHeatmap60dProps) {
  const [selectedDay, setSelectedDay] = useState<HeatmapDay | null>(null);

  // Group days into weeks (7 days per column)
  const weeks: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  days.forEach((day, idx) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || idx === days.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getTileColor = (level: number) => {
    switch (level) {
      case 4:
        return "bg-rose-400 border-white/60 shadow-[0_0_8px_rgba(244,63,94,0.7)]";
      case 3:
        return "bg-brand-red border-brand-red shadow-glow-red-subtle";
      case 2:
        return "bg-brand-red/60 border-brand-red/70";
      case 1:
        return "bg-brand-red/30 border-brand-red/40";
      case 0:
      default:
        return "bg-zinc-900/60 border-white/5 hover:border-white/20";
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 shadow-lg space-y-3.5">
      {/* Header & Stats Banner */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white tracking-tight flex items-center gap-1.5">
              <span>60-Day Study Consistency Matrix</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brand-red/20 text-brand-red font-bold">
                {stats.consistencyPercent}% Active
              </span>
            </h3>
            <p className="text-[10px] font-mono text-zinc-400">
              Daily study density matrix across the past 2 months
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Total Hours</span>
          <span className="text-sm font-bold font-mono text-white mt-0.5">
            {stats.totalStudyHours60d}h
          </span>
          <span className="text-[8px] font-mono text-zinc-500">60d Volume</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Active Days</span>
          <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
            {stats.activeDays60d} <span className="text-[9px] text-zinc-500">/ 60</span>
          </span>
          <span className="text-[8px] font-mono text-zinc-500">Studied</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Current</span>
          <span className="text-sm font-bold font-mono text-brand-red mt-0.5 flex items-center gap-1">
            <Flame className="w-3 h-3 fill-current" />
            {stats.currentStreak}d
          </span>
          <span className="text-[8px] font-mono text-zinc-500">Active Streak</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Longest</span>
          <span className="text-sm font-bold font-mono text-amber-400 mt-0.5 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            {stats.longestStreak60d}d
          </span>
          <span className="text-[8px] font-mono text-zinc-500">Best Momentum</span>
        </div>
      </div>

      {/* 60-Day Matrix Container */}
      <div className="overflow-x-auto no-scrollbar pt-1 pb-1">
        <div className="inline-flex gap-1.5 min-w-full justify-between">
          {weeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((d) => {
                const isSelected = selectedDay?.date === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setSelectedDay(isSelected ? null : d);
                    }}
                    className={clsx(
                      "w-4 h-4 sm:w-5 sm:h-5 rounded-md border transition-all active:scale-90 flex items-center justify-center",
                      getTileColor(d.level),
                      isSelected && "ring-2 ring-white scale-110"
                    )}
                    title={`${d.date}: ${formatDuration(d.studyMinutes)} (${d.sessionCount} sessions)`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Day Telemetry Card or Legend */}
      {selectedDay ? (
        <div className="p-2.5 rounded-xl bg-white/[0.05] border border-white/15 flex items-center justify-between text-xs font-mono animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-white font-bold">{selectedDay.date} ({selectedDay.day})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-300">
              {selectedDay.studyMinutes > 0 ? (
                <>
                  <strong className="text-brand-red font-bold">
                    {formatDuration(selectedDay.studyMinutes)}
                  </strong>{" "}
                  ({selectedDay.sessionCount} sessions)
                </>
              ) : (
                <span className="text-zinc-500">No study logged</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[10px] text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Scale Legend */
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-white/5">
          <span>Less</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-900 border border-white/5 inline-block" title="0m" />
            <span className="w-3 h-3 rounded bg-brand-red/30 border border-brand-red/40 inline-block" title="1-30m" />
            <span className="w-3 h-3 rounded bg-brand-red/60 border border-brand-red/70 inline-block" title="31-60m" />
            <span className="w-3 h-3 rounded bg-brand-red border border-brand-red inline-block" title="61-120m" />
            <span className="w-3 h-3 rounded bg-rose-400 border border-white inline-block" title="120m+" />
          </div>
          <span>More</span>
        </div>
      )}
    </div>
  );
}
