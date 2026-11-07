"use client";

import React from "react";
import clsx from "clsx";
import { format, subDays } from "date-fns";
import {
  Clock,
  Timer,
  Sparkles,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  Plus,
  Target,
  X,
  Calendar,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import { CoStudyCompanion } from "@/components/progress/CoStudyCompanion";
import type { useFocusTimer } from "@/hooks/useFocusTimer";

function formatStopwatchTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function computeElapsed(start?: string, end?: string): number | null {
  if (!start || !end || !start.includes(":") || !end.includes(":")) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return Math.max(1, endTotal - startTotal);
}

export interface FocusLogTabProps {
  timerState: ReturnType<typeof useFocusTimer>;
  isCompanionMode: boolean;
  onToggleCompanionMode: () => void;
  partnerLabel: string;
  onOpenTimerSaveModal: () => void;
  onOpenStopwatchSaveModal: () => void;

  manualProject: string;
  setManualProject: (val: string) => void;
  manualDuration: string;
  setManualDuration: (val: string) => void;
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
  selectedTopicId: string;
  setSelectedTopicId: (val: string) => void;
  isLoggingStudy: boolean;
  onManualLog: (e: React.FormEvent) => void;
  aimsData: any[];

  recentSessions: any[];
  onRepeatSession: (session: any) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function FocusLogTab({
  timerState,
  isCompanionMode,
  onToggleCompanionMode,
  partnerLabel,
  onOpenTimerSaveModal,
  onOpenStopwatchSaveModal,
  manualProject,
  setManualProject,
  manualDuration,
  setManualDuration,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  selectedTopicId,
  setSelectedTopicId,
  isLoggingStudy,
  onManualLog,
  aimsData,
  recentSessions,
  onRepeatSession,
  onDeleteSession,
}: FocusLogTabProps) {
  const {
    focusMode,
    swStatus,
    swActiveSeconds,
    swStartClock,
    timerPreset,
    timerTotalSeconds,
    timerRemainingSeconds,
    isCustomTimer,
    setIsCustomTimer,
    customTimerHours,
    setCustomTimerHours,
    customTimerMins,
    setCustomTimerMins,
    swElapsedWallSecs,
    swEfficiencyPercent,
    handleSwitchFocusMode,
    handleSelectTimerPreset,
    handleUpdateCustomTimer,
    handleAdjustCustomTimer,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    handleStartStopwatch,
    handlePauseStopwatch,
    handleResumeStopwatch,
    handleResetStopwatch,
  } = timerState;

  const liveElapsedMinutes = computeElapsed(startTime, endTime);
  const liveEfficiency =
    liveElapsedMinutes && liveElapsedMinutes > 0
      ? Math.min(100, Math.round(((Number(manualDuration) || 0) / liveElapsedMinutes) * 100))
      : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 🐾 Co-Study Monk Companion Card */}
      <CoStudyCompanion
        status={swStatus}
        isCompanionMode={isCompanionMode}
        onToggleCompanionMode={onToggleCompanionMode}
        activeSeconds={swActiveSeconds}
        userName={partnerLabel === "Golu" ? "Kunal" : "Mradul"}
      />

      {/* PHONE-LOCK RESILIENT LIVE FOCUS STOPWATCH & TIMER */}
      <div className="p-4 rounded-2xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-brand-red/30 shadow-2xl relative overflow-hidden">
        {/* Status Top Bar */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
          {/* Minimal Mode Toggle */}
          <div className="flex items-center gap-1 bg-black/60 p-0.5 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => handleSwitchFocusMode("STOPWATCH")}
              className={clsx(
                "px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1",
                focusMode === "STOPWATCH"
                  ? "bg-brand-red text-white shadow-glow-red"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Clock className="w-3 h-3" />
              <span>Stopwatch</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchFocusMode("TIMER")}
              className={clsx(
                "px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all flex items-center gap-1",
                focusMode === "TIMER"
                  ? "bg-brand-red text-white shadow-glow-red"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Timer className="w-3 h-3" />
              <span>Timer</span>
            </button>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-1.5">
            {swStatus === "RUNNING" && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-red-300 font-bold bg-brand-red/15 px-2 py-0.5 rounded-full border border-brand-red/30">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-ping inline-block" />
                {focusMode === "TIMER" ? "FOCUSING" : "FLOW STATE"}
              </span>
            )}
            {swStatus === "PAUSED" && (
              <span className="text-[10px] font-mono text-zinc-300 font-bold bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/10">
                PAUSED
              </span>
            )}
            {swStatus === "COMPLETED" && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30 animate-pulse">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                GOAL MET!
              </span>
            )}
            {swStatus === "IDLE" && (
              <span className="text-[10px] font-mono text-zinc-500">
                READY
              </span>
            )}
          </div>
        </div>

        {/* Timer Preset Quick Selector (Timer Mode & IDLE) */}
        {focusMode === "TIMER" && swStatus === "IDLE" && (
          <div className="space-y-2 mb-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              {[15, 25, 45, 50, 60, 90].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectTimerPreset(mins)}
                  className={clsx(
                    "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border active:scale-95",
                    !isCustomTimer && timerPreset === mins
                      ? "bg-brand-red text-white border-brand-red shadow-glow-red"
                      : "bg-white/[0.04] text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.08]"
                  )}
                >
                  {mins}m
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsCustomTimer(true);
                  setCustomTimerHours(String(Math.floor(timerPreset / 60)));
                  setCustomTimerMins(String(timerPreset % 60));
                }}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border active:scale-95",
                  isCustomTimer
                    ? "bg-brand-red text-white border-brand-red shadow-glow-red"
                    : "bg-white/[0.04] text-zinc-400 border-white/10 hover:text-white hover:bg-white/[0.08]"
                )}
              >
                Custom
              </button>
            </div>

            {isCustomTimer && (
              <div className="pt-2 pb-1 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10">
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={customTimerHours}
                      onChange={(e) => handleUpdateCustomTimer(e.target.value, customTimerMins)}
                      className="w-10 px-1 py-0.5 bg-white/[0.05] border border-white/10 rounded text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-brand-red"
                      placeholder="0"
                    />
                    <span className="text-[11px] font-mono text-zinc-400 font-semibold">hr</span>
                  </div>
                  <span className="text-zinc-600 font-bold">:</span>
                  <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={customTimerMins}
                      onChange={(e) => handleUpdateCustomTimer(customTimerHours, e.target.value)}
                      className="w-10 px-1 py-0.5 bg-white/[0.05] border border-white/10 rounded text-center text-sm font-mono font-bold text-white focus:outline-none focus:border-brand-red"
                      placeholder="25"
                    />
                    <span className="text-[11px] font-mono text-zinc-400 font-semibold">min</span>
                  </div>
                </div>

                {/* Quick Steppers & Adjustment Chips */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAdjustCustomTimer(15)}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[9px] font-mono text-zinc-300 hover:text-white transition-colors active:scale-95"
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustCustomTimer(30)}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[9px] font-mono text-zinc-300 hover:text-white transition-colors active:scale-95"
                  >
                    +30m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustCustomTimer(60)}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-[9px] font-mono text-zinc-300 hover:text-white transition-colors active:scale-95"
                  >
                    +1h
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCustomTimer("0", "25")}
                    className="px-2 py-0.5 rounded-md bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 text-[9px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors active:scale-95"
                  >
                    Reset (25m)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Glowing Big Digital Counter */}
        <div className="text-center py-2">
          <div
            className={clsx(
              "text-4xl sm:text-5xl font-black font-mono tracking-tight text-white select-none transition-colors",
              swStatus === "COMPLETED" && "text-emerald-400"
            )}
          >
            {focusMode === "TIMER"
              ? formatStopwatchTime(timerRemainingSeconds)
              : formatStopwatchTime(swActiveSeconds)}
          </div>

          {/* Progress Bar for Timer Mode */}
          {focusMode === "TIMER" && (
            <div className="w-full max-w-xs mx-auto h-1.5 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className={clsx(
                  "h-full transition-all duration-300",
                  swStatus === "COMPLETED" ? "bg-emerald-400" : "bg-brand-red shadow-glow-red"
                )}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((timerTotalSeconds - timerRemainingSeconds) / Math.max(1, timerTotalSeconds)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          )}

          {/* Real-Time Session Telemetry */}
          {focusMode === "TIMER" ? (
            <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] font-mono text-zinc-400 flex-wrap">
              {swStatus === "COMPLETED" ? (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {Math.round(timerTotalSeconds / 60)}m focus goal completed! Click Finish &amp; Save.
                </span>
              ) : swStatus !== "IDLE" ? (
                <>
                  <span>
                    Target: <strong className="text-white">{Math.round(timerTotalSeconds / 60)}m</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Focused: <strong className="text-white">{formatDuration(Math.round(swActiveSeconds / 60))}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-red-300 font-bold">
                    {Math.round(
                      ((timerTotalSeconds - timerRemainingSeconds) / Math.max(1, timerTotalSeconds)) * 100
                    )}
                    % done
                  </span>
                </>
              ) : (
                <span>
                  Focus Goal: <strong className="text-white">{Math.round(timerTotalSeconds / 60)} minutes</strong>
                </span>
              )}
            </div>
          ) : (
            swStatus !== "IDLE" &&
            swStartClock && (
              <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] font-mono text-zinc-400 flex-wrap">
                <span>
                  Started: <strong className="text-white">{swStartClock}</strong>
                </span>
                <span>•</span>
                <span>
                  Elapsed:{" "}
                  <strong className="text-white">{formatDuration(Math.round(swElapsedWallSecs / 60))}</strong>
                </span>
                <span>•</span>
                <span className="text-red-300 font-bold">Eff: {swEfficiencyPercent}%</span>
              </div>
            )
          )}
        </div>

        {/* Touch Controls Grid */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
          {focusMode === "TIMER" ? (
            swStatus === "IDLE" ? (
              <button
                type="button"
                onClick={handleStartTimer}
                className="col-span-3 py-2.5 rounded-xl bg-brand-red text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-glow-red active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Timer ({Math.round(timerTotalSeconds / 60)}m)</span>
              </button>
            ) : swStatus === "COMPLETED" ? (
              <>
                <button
                  type="button"
                  onClick={onOpenTimerSaveModal}
                  className="col-span-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-emerald active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Finish &amp; Save ({Math.round(timerTotalSeconds / 60)}m)</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            ) : (
              <>
                {swStatus === "RUNNING" ? (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    className="py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResumeTimer}
                    className="py-2.5 rounded-xl bg-brand-red text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenTimerSaveModal}
                  className="py-2.5 rounded-xl bg-brand-red hover:bg-brand-redDark text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Finish &amp; Save</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )
          ) : (
            /* Stopwatch Controls */
            swStatus === "IDLE" ? (
              <button
                type="button"
                onClick={handleStartStopwatch}
                className="col-span-3 py-2.5 rounded-xl bg-brand-red text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-glow-red active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Focus Stopwatch</span>
              </button>
            ) : (
              <>
                {swStatus === "RUNNING" ? (
                  <button
                    type="button"
                    onClick={handlePauseStopwatch}
                    className="py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>Pause</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResumeStopwatch}
                    className="py-2.5 rounded-xl bg-brand-red text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Resume</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onOpenStopwatchSaveModal}
                  className="py-2.5 rounded-xl bg-brand-red hover:bg-brand-redDark text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Finish &amp; Save</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetStopwatch}
                  className="py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </>
            )
          )}
        </div>
      </div>

      {/* MANUAL / PRE-FILLED LOG FORM */}
      <form onSubmit={onManualLog} className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3.5 shadow-xl relative overflow-hidden">
        {/* Ambient Red Glow */}
        <div className="absolute -top-10 -right-10 w-36 h-36 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

        {/* Form Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-xs font-mono uppercase font-bold tracking-wider text-white">
              Log Focus Session
            </span>
          </div>
          <span className="text-[10px] font-mono text-brand-red font-bold px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/20 shadow-glow-red-subtle">
            +{Math.max(2, Math.floor((Number(manualDuration) || 0) / 5))} XP
          </span>
        </div>

        {/* 1. AIM TARGETS IN COMPACT PILLS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
              Aim Target
            </label>
            {selectedTopicId && (
              <span className="text-[9px] font-mono text-red-300 font-bold bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-full">
                Aim Linked
              </span>
            )}
          </div>

          {/* High-Stakes Aim Pills Only */}
          {aimsData && aimsData.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {aimsData.map((aim: any) => {
                const isSelected = manualProject === aim.title;
                return (
                  <button
                    key={aim.id}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      if (isSelected) {
                        setSelectedTopicId("");
                        setManualProject("");
                      } else {
                        setSelectedTopicId("");
                        setManualProject(aim.title);
                      }
                    }}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-mono border transition-all active:scale-95 flex items-center gap-1.5",
                      isSelected
                        ? "bg-brand-red text-white border-brand-red shadow-glow-red-subtle font-bold"
                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <Target className="w-3 h-3 text-brand-red" />
                    <span className="truncate max-w-[140px]">{aim.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Detail Chapter / Focus Input */}
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Focus Topic / Goal Detail..."
              value={manualProject}
              onChange={(e) => setManualProject(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-mono pr-8"
            />
            {manualProject && (
              <button
                type="button"
                onClick={() => {
                  setManualProject("");
                  setSelectedTopicId("");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                title="Clear"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 2. WALL-CLOCK TIME & REAL-TIME EFFICIENCY */}
        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-brand-red" />
              Wall-Clock Time
            </span>
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                const now = new Date();
                setEndTime(format(now, "HH:mm"));
                const prior = new Date(now.getTime() - Number(manualDuration) * 60000);
                setStartTime(format(prior, "HH:mm"));
              }}
              className="text-[9px] font-mono text-brand-red hover:underline"
            >
              Fill Current
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono text-zinc-400 block font-bold">Start Time</span>
                {startTime && (
                  <button
                    type="button"
                    onClick={() => setStartTime("")}
                    className="text-[9px] font-mono text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={clsx(
                    "w-full px-2.5 py-2 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red [color-scheme:dark] min-h-[38px]",
                    !startTime && "opacity-0 absolute inset-0 cursor-pointer w-full h-full z-10"
                  )}
                />
                {!startTime && (
                  <div className="w-full px-2.5 py-2 rounded-lg bg-black border border-white/15 text-xs text-zinc-500 font-mono flex items-center justify-between min-h-[38px]">
                    <span>--:-- (Start)</span>
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-mono text-zinc-400 block font-bold">End Time</span>
                {endTime && (
                  <button
                    type="button"
                    onClick={() => setEndTime("")}
                    className="text-[9px] font-mono text-zinc-500 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={clsx(
                    "w-full px-2.5 py-2 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red [color-scheme:dark] min-h-[38px]",
                    !endTime && "opacity-0 absolute inset-0 cursor-pointer w-full h-full z-10"
                  )}
                />
                {!endTime && (
                  <div className="w-full px-2.5 py-2 rounded-lg bg-black border border-white/15 text-xs text-zinc-500 font-mono flex items-center justify-between min-h-[38px]">
                    <span>--:-- (End)</span>
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Real-time Efficiency Output */}
          {liveElapsedMinutes && liveElapsedMinutes > 0 && (
            <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono border-t border-white/5">
              <span className="text-zinc-400">
                Elapsed: <strong className="text-white">{formatDuration(liveElapsedMinutes)}</strong>
              </span>
              <span
                className={clsx(
                  "font-bold px-1.5 py-0.2 rounded",
                  liveEfficiency && liveEfficiency >= 80
                    ? "text-red-300 bg-brand-red/10 border border-brand-red/30 shadow-glow-red-subtle"
                    : liveEfficiency && liveEfficiency >= 60
                    ? "text-zinc-300 bg-white/5 border border-white/10"
                    : "text-zinc-500 bg-white/5"
                )}
              >
                Efficiency: {liveEfficiency}%
              </span>
            </div>
          )}
        </div>

        {/* 3. PURE STUDY DURATION */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[10px] font-mono text-zinc-400 uppercase font-bold">
              Pure Focus Mins *
            </label>
            {liveElapsedMinutes && liveElapsedMinutes > 0 && (
              <span className="text-[10px] font-mono text-zinc-500">
                Max: <span className="text-zinc-300 font-bold">{liveElapsedMinutes}m</span> (elapsed)
              </span>
            )}
          </div>
          <input
            type="number"
            min="1"
            max={liveElapsedMinutes && liveElapsedMinutes > 0 ? liveElapsedMinutes : undefined}
            required
            value={manualDuration}
            onChange={(e) => {
              const val = e.target.value;
              if (liveElapsedMinutes && liveElapsedMinutes > 0 && Number(val) > liveElapsedMinutes) {
                setManualDuration(String(liveElapsedMinutes));
              } else {
                setManualDuration(val);
              }
            }}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
          />
        </div>

        {/* Quick Pomodoro Duration Chips */}
        <div className="grid grid-cols-4 gap-1.5">
          {[25, 45, 60, 120].map((mins) => {
            const isExceeding = Boolean(liveElapsedMinutes && liveElapsedMinutes > 0 && mins > liveElapsedMinutes);
            return (
              <button
                key={mins}
                type="button"
                disabled={isExceeding}
                onClick={() => {
                  haptics.selection();
                  setManualDuration(String(mins));
                }}
                className={clsx(
                  "py-1.5 rounded-lg text-xs font-mono transition-all border text-center font-medium",
                  Number(manualDuration) === mins
                    ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red"
                    : isExceeding
                    ? "bg-white/[0.01] text-zinc-600 border-white/5 opacity-40 cursor-not-allowed"
                    : "bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
                )}
              >
                {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
              </button>
            );
          })}
        </div>

        {/* 4. SUBMIT BUTTON */}
        <Button
          variant="red"
          size="sm"
          type="submit"
          isLoading={isLoggingStudy}
          className="w-full py-2.5 text-xs font-semibold shadow-glow-red mt-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Log Focus Session (+{Math.max(2, Math.floor((Number(manualDuration) || 0) / 5))} XP)</span>
        </Button>
      </form>

      {/* Recent Sessions List */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
            Recent Sessions
          </span>
          <span className="text-[9px] font-mono text-zinc-500">
            {recentSessions?.length || 0} logged
          </span>
        </div>

        {!recentSessions || recentSessions.length === 0 ? (
          <div className="py-4 text-center text-xs text-zinc-500 font-mono">
            No study sessions logged yet.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentSessions.slice(0, 10).map((s: any) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-white truncate text-xs">{s.project}</span>
                    {s.efficiencyPercent && (
                      <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1 rounded">
                        {s.efficiencyPercent}% Eff
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 flex-wrap">
                    {s.date && (() => {
                      const todayStr = format(new Date(), "yyyy-MM-dd");
                      const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
                      const isToday = s.date === todayStr;
                      const isYesterday = s.date === yesterdayStr;
                      const label = isToday
                        ? "Today"
                        : isYesterday
                        ? "Yesterday"
                        : formatDate(s.date);

                      return (
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 rounded border",
                            isToday
                              ? "bg-brand-red/15 border-brand-red/30 text-red-200 font-bold shadow-glow-red-subtle"
                              : isYesterday
                              ? "bg-white/[0.06] border-white/10 text-zinc-300 font-medium"
                              : "bg-white/[0.03] border-white/5 text-zinc-400 font-medium"
                          )}
                        >
                          <Calendar className="w-2.5 h-2.5 opacity-70" />
                          <span>{label}</span>
                        </span>
                      );
                    })()}
                    {s.startTime && s.endTime && (
                      <span>{s.startTime} → {s.endTime}</span>
                    )}
                    <span>•</span>
                    <span className="text-zinc-300 font-semibold">{formatDuration(s.durationMinutes)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRepeatSession(s)}
                    className="p-1 rounded-md text-zinc-400 hover:text-white bg-white/[0.04]"
                    title="Repeat session"
                  >
                    <RotateCcw className="w-3 h-3 text-brand-red" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(s.id)}
                    className="p-1 rounded-md text-zinc-600 hover:text-rose-400"
                    title="Delete session"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
