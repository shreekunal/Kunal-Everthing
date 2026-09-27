"use client";

import React, { useState, useEffect } from "react";
import {
  Timer,
  Play,
  Square,
  Sparkles,
  Zap,
  Flame,
  Dna,
  Bell,
  Clock,
  ChevronDown,
  X,
  History,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";
import { formatDuration } from "@/lib/formatters";
import {
  scheduleFastingNotifications,
  cancelFastingNotifications,
} from "@/lib/notifications";
import { format } from "date-fns";

interface FastingSectionProps {
  fastingData: {
    active: {
      id: string;
      protocol: string;
      targetHours: number;
      startTime: string;
      targetEndTime: string;
      status: string;
    } | null;
    history: Array<{
      id: string;
      protocol: string;
      targetHours: number;
      startTime: string;
      endTime: string | null;
      status: string;
      feelingsRating: number | null;
      notes: string | null;
    }>;
  };
  preferredProtocol: string;
  onRefresh: () => Promise<void>;
}

const PROTOCOLS = [
  { id: "16:8", name: "16:8", desc: "LeanGains" },
  { id: "18:6", name: "18:6", desc: "Warrior Prep" },
  { id: "20:4", name: "20:4", desc: "Warrior" },
  { id: "14:10", name: "14:10", desc: "Circadian" },
  { id: "24:0", name: "24h", desc: "OMAD" },
];

const METABOLIC_STAGES = [
  {
    id: 1,
    minHours: 0,
    maxHours: 4,
    name: "Digestion",
    desc: "Blood sugar & insulin peak. Nutrients absorbed from last meal.",
    icon: Zap,
    color: "text-amber-400",
  },
  {
    id: 2,
    minHours: 4,
    maxHours: 8,
    name: "Blood Sugar Drop",
    desc: "Insulin falls to baseline, blood glucose normalizes, digestive organs rest.",
    icon: Flame,
    color: "text-orange-400",
  },
  {
    id: 3,
    minHours: 8,
    maxHours: 12,
    name: "Glycogen Burn",
    desc: "Liver glycogen stores deplete. Metabolic switch triggers toward fat burning.",
    icon: Sparkles,
    color: "text-emerald-400",
  },
  {
    id: 4,
    minHours: 12,
    maxHours: 16,
    name: "Ketosis & Fat Burn",
    desc: "Active fat oxidation. Ketone production elevates for sustained brain energy.",
    icon: Flame,
    color: "text-emerald-400",
  },
  {
    id: 5,
    minHours: 16,
    maxHours: 72,
    name: "Autophagy & Repair",
    desc: "Damaged cells recycle misfolded proteins. Cellular rejuvenation and repair.",
    icon: Dna,
    color: "text-cyan-400",
  },
];

export function FastingSection({
  fastingData,
  preferredProtocol,
  onRefresh,
}: FastingSectionProps) {
  const activeFast = fastingData.active;
  const [selectedProtocol, setSelectedProtocol] = useState(
    activeFast?.protocol || preferredProtocol || "16:8"
  );
  const [startOffsetHours, setStartOffsetHours] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showEndModal, setShowEndModal] = useState(false);
  const [feelingsRating, setFeelingsRating] = useState<number>(5);
  const [notes, setNotes] = useState("");

  // Collapsible sections
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute live fast calculations
  let elapsedMinutes = 0;
  let remainingMinutes = 0;
  let progressPercent = 0;
  let currentHours = 0;

  if (activeFast) {
    const startMs = new Date(activeFast.startTime).getTime();
    const targetEndMs = new Date(activeFast.targetEndTime).getTime();
    const totalDurationMs = targetEndMs - startMs;
    const elapsedMs = Math.max(0, now - startMs);

    elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
    currentHours = elapsedMinutes / 60;
    const diffToTarget = targetEndMs - now;
    remainingMinutes = Math.max(0, Math.floor(diffToTarget / (1000 * 60)));

    progressPercent =
      totalDurationMs > 0
        ? Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100))
        : 0;
  }

  // Active metabolic stage
  const currentStageIndex = METABOLIC_STAGES.findIndex(
    (s) => currentHours >= s.minHours && currentHours < s.maxHours
  );
  const currentStage =
    currentStageIndex !== -1
      ? METABOLIC_STAGES[currentStageIndex]
      : METABOLIC_STAGES[METABOLIC_STAGES.length - 1];

  // Start Fast Action
  const handleStartFast = async () => {
    haptics.impactHeavy();
    setIsSubmitting(true);
    try {
      let targetHours = 16;
      if (selectedProtocol.includes(":")) {
        targetHours = parseFloat(selectedProtocol.split(":")[0]) || 16;
      }

      const startTime = new Date(Date.now() - startOffsetHours * 60 * 60 * 1000);
      const targetEndTime = new Date(
        startTime.getTime() + targetHours * 60 * 60 * 1000
      );

      const res = await fetch("/api/vitality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "START_FAST",
          protocol: selectedProtocol,
          targetHours,
          startTime: startTime.toISOString(),
        }),
      });

      if (res.ok) {
        haptics.success();
        await scheduleFastingNotifications(
          startTime,
          targetEndTime,
          selectedProtocol
        );
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete Fast
  const handleEndFast = async () => {
    if (!activeFast) return;
    haptics.impactMedium();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "END_FAST",
          sessionId: activeFast.id,
          feelingsRating,
          notes,
        }),
      });

      if (res.ok) {
        haptics.success();
        await cancelFastingNotifications();
        setShowEndModal(false);
        setNotes("");
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Fast
  const handleCancelFast = async () => {
    if (!activeFast) return;
    if (!window.confirm("Cancel this ongoing fast?")) return;
    haptics.impactLight();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CANCEL_FAST", sessionId: activeFast.id }),
      });
      if (res.ok) {
        haptics.selection();
        await cancelFastingNotifications();
        await onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mini ring calculations (56px size)
  const radius = 23;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (progressPercent / 100) * circumference;

  return (
    <div className="space-y-2.5">
      {/* 1. COMPACT FASTING CARD */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black p-4 shadow-xl space-y-3">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Timer className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-white font-bold leading-tight">
                Intermittent Fasting
              </h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                {activeFast
                  ? `${activeFast.protocol} Fast Active`
                  : "Timer Inactive"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
            <Bell className="w-2.5 h-2.5 text-emerald-400" />
            <span>Alarms Active</span>
          </div>
        </div>

        {activeFast ? (
          /* ACTIVE STATE: Minimal Horizontal Layout */
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between bg-black/60 border border-white/5 p-3 rounded-2xl gap-3">
              {/* Mini Glowing Ring */}
              <div className="relative flex items-center justify-center w-14 h-14 flex-shrink-0">
                <svg className="w-14 h-14 -rotate-90 transform" viewBox="0 0 56 56">
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    className="stroke-zinc-900"
                    strokeWidth="4.5"
                    fill="transparent"
                  />
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    className="stroke-emerald-400 transition-all duration-700 ease-out"
                    strokeWidth="4.5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    style={{
                      filter: "drop-shadow(0 0 6px rgba(52, 211, 153, 0.5))",
                    }}
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {progressPercent}%
                  </span>
                </div>
              </div>

              {/* Time Metrics & Active Stage */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono text-white tracking-tight">
                    {formatDuration(elapsedMinutes)}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {remainingMinutes > 0
                      ? `${formatDuration(remainingMinutes)} left`
                      : "Achieved!"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                  <span>Target: {format(new Date(activeFast.targetEndTime), "hh:mm a")}</span>
                  {currentStage && (
                    <span className="text-emerald-400 font-bold truncate max-w-[130px]">
                      • {currentStage.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelFast}
                disabled={isSubmitting}
                className="flex-1 h-9 rounded-xl border border-white/10 hover:border-red-500/30 text-zinc-400 hover:text-red-400 font-mono text-xs transition-all active:scale-95 flex items-center justify-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                disabled={isSubmitting}
                className="flex-[2] h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all active:scale-95 shadow-md flex items-center justify-center gap-1.5"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>End Fast & Record</span>
              </button>
            </div>
          </div>
        ) : (
          /* INACTIVE STATE: Clean 1-Row Chips + Launch Button */
          <div className="space-y-3 pt-1">
            {/* Protocol Chips (1 Horizontal Row) */}
            <div className="grid grid-cols-5 gap-1.5">
              {PROTOCOLS.map((p) => {
                const isSelected = selectedProtocol === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setSelectedProtocol(p.id);
                    }}
                    className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? "bg-emerald-950/40 border-emerald-500 text-white shadow-glow-emerald-subtle"
                        : "bg-black/50 border-white/5 text-zinc-400 hover:border-white/20 active:scale-95"
                    }`}
                  >
                    <span className="text-xs font-mono font-bold">{p.name}</span>
                    <span className="text-[8px] font-mono text-zinc-500 mt-0.5">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Launch Bar with Start-Offset */}
            <div className="flex gap-2 items-center">
              {/* Optional offset toggle */}
              <div className="flex bg-black/60 border border-white/10 rounded-xl p-0.5">
                {[0, 1, 2].map((offset) => (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setStartOffsetHours(offset);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
                      startOffsetHours === offset
                        ? "bg-emerald-500 text-black font-bold"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {offset === 0 ? "Now" : `-${offset}h`}
                  </button>
                ))}
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={handleStartFast}
                disabled={isSubmitting}
                className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start {selectedProtocol} Fast</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. BIOLOGICAL ROADMAP (COLLAPSIBLE - OPENS ON DEMAND) */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/60 overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setShowRoadmap(!showRoadmap);
          }}
          className="w-full py-2.5 px-3.5 flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Dna className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-white">Biological Roadmap</span>
            {activeFast && currentStage && (
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Phase {currentStage.id}: {currentStage.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span>{showRoadmap ? "Hide" : "5 Stages"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                showRoadmap ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {showRoadmap && (
          <div className="p-3.5 pt-0 space-y-2 border-t border-white/5 mt-1 animate-in fade-in duration-200">
            {METABOLIC_STAGES.map((stage) => {
              const isCurrent =
                activeFast &&
                currentHours >= stage.minHours &&
                currentHours < stage.maxHours;
              const isPassed = activeFast && currentHours >= stage.maxHours;

              return (
                <div
                  key={stage.id}
                  className={`p-2.5 rounded-xl border text-xs font-mono transition-all ${
                    isCurrent
                      ? "bg-emerald-950/30 border-emerald-500/50 shadow-glow-emerald-subtle"
                      : isPassed
                      ? "bg-zinc-900/40 border-emerald-500/20 opacity-80"
                      : "bg-black/40 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <stage.icon className={`w-3.5 h-3.5 ${stage.color}`} />
                      <span className="font-bold text-white">
                        {stage.id}. {stage.name}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[8px] border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {stage.minHours}h–{stage.maxHours}h
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 pl-5.5 leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. FASTING HISTORY LOG (COLLAPSIBLE - OPENS ON DEMAND) */}
      {fastingData.history.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/60 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setShowHistory(!showHistory);
            }}
            className="w-full py-2.5 px-3.5 flex items-center justify-between text-xs font-mono text-zinc-300 hover:text-white transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-semibold text-white">Fasting History</span>
              <span className="text-[10px] text-zinc-500 font-mono">
                ({fastingData.history.length} sessions)
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <span>{showHistory ? "Hide" : "View"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                  showHistory ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {showHistory && (
            <div className="p-3.5 pt-0 space-y-1.5 border-t border-white/5 mt-1 animate-in fade-in duration-200">
              {fastingData.history.slice(0, 5).map((f) => {
                const durationMins = f.endTime
                  ? Math.floor(
                      (new Date(f.endTime).getTime() -
                        new Date(f.startTime).getTime()) /
                        (1000 * 60)
                    )
                  : 0;

                return (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-black/40 border border-white/5 text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 ${
                          f.status === "COMPLETED"
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/30"
                            : "border-amber-500/30 text-amber-400 bg-amber-950/30"
                        }`}
                      >
                        {f.status}
                      </Badge>
                      <span className="text-white font-bold">{f.protocol}</span>
                      <span className="text-zinc-400">
                        • {formatDuration(durationMins)}
                      </span>
                      {f.feelingsRating && (
                        <span className="text-amber-400 text-[10px]">
                          {"★".repeat(f.feelingsRating)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {format(new Date(f.startTime), "MMM d")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* END FAST MODAL */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl max-w-sm w-full p-4 space-y-3.5 shadow-2xl">
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Record Fasting Session
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  How Did You Feel? (1 to 5)
                </label>
                <div className="flex justify-between gap-1">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFeelingsRating(val)}
                      className={`flex-1 py-1.5 rounded-lg border font-mono text-xs transition-all ${
                        feelingsRating === val
                          ? "bg-emerald-500 text-black border-emerald-400 font-bold"
                          : "bg-black border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {val}★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Broke fast clean with bone broth & eggs"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowEndModal(false)}
                  className="flex-1 text-xs font-mono border border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleEndFast}
                  disabled={isSubmitting}
                  className="flex-1 text-xs font-mono bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirm & Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
