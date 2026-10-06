"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Dumbbell,
  Home,
  Flame,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  CheckCircle2,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";
import { format, parseISO } from "date-fns";

export interface ActivityItem {
  id: string;
  type: string; // "Home Workout" | "Gym"
  durationMinutes: number;
  caloriesBurned: number;
  notes: string | null;
  date: string;
  createdAt?: string;
}

interface ActivitySectionProps {
  activityData?: {
    today?: ActivityItem[];
    history?: ActivityItem[];
    todayTotalMinutes?: number;
    todayTotalCalories?: number;
  };
  onRefresh: () => Promise<void>;
}

export function ActivitySection({ activityData, onRefresh }: ActivitySectionProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [workoutType, setWorkoutType] = useState<"Home Workout" | "Gym">("Home Workout");
  const [duration, setDuration] = useState("45");
  const [calories, setCalories] = useState("315");
  const [hasManuallyEditedCalories, setHasManuallyEditedCalories] = useState(false);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auto-estimate calories based on duration and workout type if user hasn't typed a custom value
  useEffect(() => {
    if (!hasManuallyEditedCalories) {
      const mins = Number(duration) || 0;
      // Approximate: Gym ~ 8 kcal/min, Home Workout ~ 7 kcal/min
      const multiplier = workoutType === "Gym" ? 8 : 7;
      setCalories(String(Math.round(mins * multiplier)));
    }
  }, [duration, workoutType, hasManuallyEditedCalories]);

  const handleDurationPreset = (mins: number) => {
    haptics.selection();
    setDuration(String(mins));
  };

  const handleCaloriesChange = (val: string) => {
    setHasManuallyEditedCalories(true);
    setCalories(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const durMins = parseInt(duration, 10);
    const calBurnt = parseInt(calories, 10) || 0;

    if (isNaN(durMins) || durMins <= 0) return;

    setIsSubmitting(true);
    haptics.impactMedium();

    try {
      const res = await fetch("/api/vitality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOG_ACTIVITY",
          type: workoutType,
          durationMinutes: durMins,
          caloriesBurned: calBurnt,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        haptics.success();
        setShowLogModal(false);
        setNotes("");
        setHasManuallyEditedCalories(false);
        await onRefresh();
      } else {
        haptics.error();
      }
    } catch (err) {
      console.error("Failed to log activity:", err);
      haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.warning();
    setDeletingId(id);

    try {
      const res = await fetch(`/api/vitality?type=activity&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        haptics.success();
        await onRefresh();
      }
    } catch (err) {
      console.error("Failed to delete activity log:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const todayActivities = activityData?.today || [];
  const todayTotalMins = activityData?.todayTotalMinutes ?? todayActivities.reduce((acc, a) => acc + a.durationMinutes, 0);
  const todayTotalCalories = activityData?.todayTotalCalories ?? todayActivities.reduce((acc, a) => acc + a.caloriesBurned, 0);
  const historyList = activityData?.history || [];

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Ambient Red Glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
            <Dumbbell className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Workout &amp; Activity
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">
              Gym &amp; Home Training
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setShowLogModal(true);
          }}
          className="h-7 px-3 text-[10px] font-mono font-bold border border-brand-red/30 bg-brand-red/15 hover:bg-brand-red/25 text-red-300 gap-1 rounded-lg shadow-glow-red-subtle flex items-center transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-brand-red" />
          <span>Log</span>
        </button>
      </div>

      {/* Quick Today Metrics Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-black/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Workout Time</span>
            <Clock className="w-3.5 h-3.5 text-brand-red" />
          </div>
          <div className="pt-1.5">
            <div className="text-xl font-bold font-mono text-white">
              {todayTotalMins} <span className="text-xs text-zinc-400 font-normal">mins</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              {todayActivities.length > 0
                ? `${todayActivities.length} ${todayActivities.length === 1 ? "session" : "sessions"} today`
                : "No workouts today"}
            </div>
          </div>
        </div>

        <div className="bg-black/50 border border-white/5 p-3 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Active Calories</span>
            <Flame className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="pt-1.5">
            <div className="text-xl font-bold font-mono text-white">
              {todayTotalCalories.toLocaleString()} <span className="text-xs text-zinc-400 font-normal">kcal</span>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              {todayTotalCalories > 0 ? "Burned in sessions" : "Target: 300+ kcal"}
            </div>
          </div>
        </div>
      </div>

      {/* Logged Activities List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-500 font-bold px-1">
          <span>Today&apos;s Sessions</span>
          <span>{todayActivities.length} logged</span>
        </div>

        {todayActivities.length === 0 ? (
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-center space-y-2.5">
            <div className="flex items-center justify-center gap-2">
              <Dumbbell className="w-4 h-4 text-zinc-600" />
              <span className="text-xs font-mono text-zinc-400">No workout logged today</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setWorkoutType("Home Workout");
                  setShowLogModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Home className="w-3.5 h-3.5 text-blue-400" />
                <span>+ Home Workout</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setWorkoutType("Gym");
                  setShowLogModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-zinc-300 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Dumbbell className="w-3.5 h-3.5 text-brand-red" />
                <span>+ Gym</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {todayActivities.map((act) => {
              const isGym = act.type === "Gym";
              return (
                <div
                  key={act.id}
                  className="p-3 rounded-2xl bg-black/60 border border-white/5 flex items-center justify-between gap-3 group hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0",
                        isGym
                          ? "bg-red-950/30 border-red-500/30 text-brand-red"
                          : "bg-blue-950/30 border-blue-500/30 text-blue-400"
                      )}
                    >
                      {isGym ? <Dumbbell className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold font-mono text-white">
                          {act.type}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          {act.durationMinutes} mins
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded-full border border-amber-500/20">
                          {act.caloriesBurned} kcal
                        </span>
                      </div>
                      {act.notes && (
                        <p className="text-[11px] text-zinc-400 font-sans truncate mt-0.5">
                          {act.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Delete entry"
                    disabled={deletingId === act.id}
                    onClick={(e) => handleDelete(act.id, e)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Logging Activity */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-brand-red/30 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
                  <Dumbbell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                    Log Workout Activity
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Record workout type, duration &amp; calories
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* 1. Workout Type Selector: Home Workout vs Gym */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block mb-1.5">
                  Workout Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setWorkoutType("Home Workout");
                    }}
                    className={clsx(
                      "py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                      workoutType === "Home Workout"
                        ? "bg-brand-red text-white border-brand-red shadow-glow-red font-bold"
                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Home Workout</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setWorkoutType("Gym");
                    }}
                    className={clsx(
                      "py-2.5 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95",
                      workoutType === "Gym"
                        ? "bg-brand-red text-white border-brand-red shadow-glow-red font-bold"
                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <Dumbbell className="w-3.5 h-3.5" />
                    <span>Gym</span>
                  </button>
                </div>
              </div>

              {/* 2. Duration (Minutes) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                    Duration (Minutes) *
                  </label>
                  <span className="text-[10px] font-mono text-brand-red font-bold">
                    +{Math.max(5, Math.floor((Number(duration) || 0) / 3))} XP
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="600"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-red pr-14 placeholder:text-zinc-700"
                    placeholder="e.g. 45"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 pointer-events-none">
                    mins
                  </span>
                </div>

                {/* Duration Preset Chips */}
                <div className="grid grid-cols-4 gap-1.5 pt-1.5">
                  {[20, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleDurationPreset(mins)}
                      className={clsx(
                        "py-1 rounded-lg text-[10px] font-mono border transition-all text-center",
                        Number(duration) === mins
                          ? "bg-brand-red/20 border-brand-red text-red-300 font-bold"
                          : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                      )}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Calories Burnt */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-500" />
                    Calories Burnt
                  </label>
                  {!hasManuallyEditedCalories && (
                    <span className="text-[9px] font-mono text-zinc-500">
                      Auto-estimated
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    required
                    value={calories}
                    onChange={(e) => handleCaloriesChange(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-red pr-14 placeholder:text-zinc-700"
                    placeholder="e.g. 350"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 pointer-events-none">
                    kcal
                  </span>
                </div>
              </div>

              {/* 4. Notes (Optional) */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                  Workout Notes / Focus <span className="text-zinc-600 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Chest & Triceps, Bench 80kg, 100 pushups..."
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-brand-red"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 text-xs font-mono border border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !duration || Number(duration) <= 0}
                  className="flex-1 text-xs font-mono bg-brand-red hover:bg-brand-redDark text-white font-bold shadow-glow-red disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving..." : "Log Activity"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
