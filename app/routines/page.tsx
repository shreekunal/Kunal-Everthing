"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Flame, Plus, Check, Trophy, Trash2, Sun, Moon, Sunset, Calendar, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { offlineCache } from "@/lib/offlineCache";
import { offlineQueue } from "@/lib/offlineQueue";

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [past14Days, setPast14Days] = useState<string[]>([]);
  const [past30Days, setPast30Days] = useState<string[]>([]);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<"ALL" | "MORNING" | "AFTERNOON" | "NIGHT">("ALL");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedRoutineMap, setExpandedRoutineMap] = useState<Record<string, boolean>>({});

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Morning");
  const [targetDays, setTargetDays] = useState("DAILY");
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(30);

  // Delete state
  const [routineToDelete, setRoutineToDelete] = useState<any | null>(null);
  const [isDeletingRoutine, setIsDeletingRoutine] = useState(false);

  const fetchRoutines = async () => {
    try {
      await offlineCache.swr(
        "routines",
        async () => {
          const res = await fetch("/api/routines");
          if (!res.ok) throw new Error("Failed to fetch routines");
          return res.json();
        },
        (cached) => {
          setRoutines(cached.routines || []);
          setPast14Days(cached.past14Days || []);
          setPast30Days(cached.past30Days || cached.past14Days || []);
          setLoading(false);
        }
      ).then((fresh) => {
        setRoutines(fresh.routines || []);
        setPast14Days(fresh.past14Days || []);
        setPast30Days(fresh.past30Days || fresh.past14Days || []);
      });
    } catch (err) {
      console.error("Failed to fetch routines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  // Back Button integration: close open modals first
  useEffect(() => {
    if (!isAddModalOpen && !routineToDelete) return;
    return backButton.register(() => {
      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        return true;
      }
      if (routineToDelete) {
        setRoutineToDelete(null);
        return true;
      }
      return false;
    });
  }, [isAddModalOpen, routineToDelete]);

  const handleToggleCompletion = async (routineId: string, date?: string) => {
    haptics.success();

    // 1. Instant 0ms Optimistic UI update
    let updatedRoutinesList: any[] = [];
    setRoutines((prev) => {
      updatedRoutinesList = prev.map((r) => {
        if (r.id !== routineId) return r;
        const willBeCompleted = !r.completedToday;
        return {
          ...r,
          completedToday: willBeCompleted,
          currentStreak: willBeCompleted
            ? (r.currentStreak || 0) + 1
            : Math.max(0, (r.currentStreak || 1) - 1),
          pastHistory: r.pastHistory?.map((h: any) =>
            h.date === date ? { ...h, completed: !h.completed } : h
          ),
        };
      });
      // Synchronize optimistic state directly into offline cache
      offlineCache.set("routines", {
        routines: updatedRoutinesList,
        past14Days,
        past30Days,
      });
      return updatedRoutinesList;
    });

    // 2. Silent background sync (queues offline when disconnected)
    try {
      await offlineQueue.offlineFetch(
        `/api/routines/${routineId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date }),
        },
        "Routine streak update"
      );
    } catch (err) {
      console.error("Toggle routine error:", err);
      if (navigator.onLine) {
        fetchRoutines();
      }
    }
  };

  const handleExecuteDeleteRoutine = async () => {
    if (!routineToDelete) return;
    setIsDeletingRoutine(true);
    haptics.warning();
    try {
      await offlineQueue.offlineFetch(
        `/api/routines/${routineToDelete.id}`,
        { method: "DELETE" },
        "Delete routine"
      );
      setRoutines((prev) => {
        const filtered = prev.filter((r) => r.id !== routineToDelete.id);
        offlineCache.set("routines", {
          routines: filtered,
          past14Days,
          past30Days,
        });
        return filtered;
      });
      setRoutineToDelete(null);
    } catch (err) {
      console.error("Delete routine error:", err);
    } finally {
      setIsDeletingRoutine(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          targetDays,
          targetDurationMinutes: Number(targetDurationMinutes),
        }),
      });

      if (res.ok) {
        haptics.success();
        setName("");
        setIsAddModalOpen(false);
        fetchRoutines();
      }
    } catch (err) {
      console.error("Create routine error:", err);
    }
  };

  const totalStreaks = routines.reduce((acc, r) => acc + (r.currentStreak || 0), 0);
  const completedTodayCount = routines.filter((r) => r.completedToday).length;
  const todayProgressPercent = routines.length > 0 ? Math.round((completedTodayCount / routines.length) * 100) : 0;

  const TIME_FILTERS = [
    { id: "ALL" as const, label: "All", icon: Sparkles },
    { id: "MORNING" as const, label: "Morning", icon: Sun },
    { id: "AFTERNOON" as const, label: "Focus", icon: Sunset },
    { id: "NIGHT" as const, label: "Night", icon: Moon },
  ];

  const filteredRoutines = routines.filter((r) => {
    if (selectedTimeFilter === "ALL") return true;
    const cat = (r.category || "").toUpperCase();
    const rName = (r.name || "").toUpperCase();
    if (selectedTimeFilter === "MORNING")
      return cat.includes("MORN") || rName.includes("MORN") || cat.includes("HEALTH");
    if (selectedTimeFilter === "AFTERNOON")
      return (
        cat.includes("AFTER") ||
        cat.includes("NOON") ||
        rName.includes("AFTER") ||
        cat.includes("WORK") ||
        cat.includes("STUDY")
      );
    if (selectedTimeFilter === "NIGHT")
      return (
        cat.includes("NIGHT") ||
        cat.includes("EVEN") ||
        rName.includes("NIGHT") ||
        rName.includes("SLEEP") ||
        rName.includes("BED") ||
        cat.includes("DISCIPLINE")
      );
    return true;
  });

  // Calculate daily completion counts for 30-day heatmap
  const dailyCounts: Record<string, number> = {};
  past30Days.forEach((day) => {
    dailyCounts[day] = routines.filter((r) =>
      r.pastHistory?.some((h: any) => h.date === day && h.completed)
    ).length;
  });
  const maxPerDay = Math.max(1, routines.length);

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Mobile-Optimized Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-brand-red fill-brand-red" />
            Habits & Daily Streaks
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
            <span className="text-white font-bold">{completedTodayCount}/{routines.length} today</span>
            <span>•</span>
            <span className="text-red-400 font-bold">{totalStreaks}d total streak</span>
          </div>
        </div>

        <Button
          variant="red"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="h-9 px-3 text-xs font-bold shadow-glow-red flex items-center gap-1.5 flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New</span>
        </Button>
      </div>

      {/* Today's Completion Progress Banner */}
      <Card glow="red" className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider block">
              Today&apos;s Execution
            </span>
            <div className="text-2xl font-bold text-white font-mono mt-0.5 flex items-baseline gap-2">
              <span>{todayProgressPercent}%</span>
              <span className="text-xs text-zinc-400 font-normal">
                ({completedTodayCount} of {routines.length} completed)
              </span>
            </div>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl">
              {todayProgressPercent === 100 ? "🔥" : todayProgressPercent >= 50 ? "⚡" : "🎯"}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-brand-red shadow-glow-red transition-all duration-500"
            style={{ width: `${Math.max(5, todayProgressPercent)}%` }}
          />
        </div>

        {/* 30-Day Mini Heatmap Strip */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-2">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-brand-red" />
              <span>30-Day Activity Grid</span>
            </span>
            <span>
              {hoveredDate
                ? `${hoveredDate.slice(5)}: ${dailyCounts[hoveredDate] || 0}/${routines.length}`
                : "Tap day to inspect"}
            </span>
          </div>

          <div className="grid grid-cols-10 sm:grid-cols-15 gap-1">
            {past30Days.map((day) => {
              const count = dailyCounts[day] || 0;
              const ratio = count / maxPerDay;
              const isFull = ratio >= 0.8 && count > 0;
              const isHigh = ratio >= 0.5 && !isFull;
              const isMed = ratio > 0 && !isHigh && !isFull;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setHoveredDate(hoveredDate === day ? null : day);
                  }}
                  className={`h-6 rounded-md transition-all flex items-center justify-center text-[8px] font-mono border ${
                    isFull
                      ? "bg-brand-red text-white border-brand-red shadow-glow-red font-bold"
                      : isHigh
                      ? "bg-red-500/60 text-white border-red-500/40"
                      : isMed
                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                      : "bg-white/[0.03] text-zinc-600 border-white/5"
                  }`}
                  title={`${day}: ${count}/${routines.length} completed`}
                >
                  <span>{day.split("-")[2]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Protocol Tabs Filter */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-black/80 border border-white/10 rounded-2xl">
        {TIME_FILTERS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedTimeFilter === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                haptics.selection();
                setSelectedTimeFilter(item.id);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-mono font-medium transition-all flex items-center justify-center gap-1.5 ${
                isSelected
                  ? "bg-brand-red text-white shadow-glow-red font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Routines Feed (Mobile Ergonomics) */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono">
            Loading routines...
          </div>
        ) : filteredRoutines.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500 font-mono bg-white/[0.02] border border-white/5 rounded-2xl">
            No routines found for this protocol. Tap &apos;+ New&apos; to create one!
          </div>
        ) : (
          filteredRoutines.map((routine) => {
            const isExpanded = expandedRoutineMap[routine.id] || false;
            const history = routine.pastHistory || [];
            // Show last 7 days by default on mobile, or 14 days when expanded
            const visibleHistory = isExpanded ? history : history.slice(-7);

            return (
              <Card
                key={routine.id}
                className={`p-4 transition-all border ${
                  routine.completedToday
                    ? "border-red-500/30 bg-red-500/[0.02]"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                {/* Main Row: Big Check Button + Info + Streaks */}
                <div className="flex items-center gap-3">
                  {/* Big Touch-Friendly Today Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleCompletion(routine.id)}
                    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                      routine.completedToday
                        ? "bg-brand-red text-white shadow-glow-red border border-red-400"
                        : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border border-white/10"
                    }`}
                    aria-label={routine.completedToday ? "Completed today" : "Mark completed today"}
                  >
                    {routine.completedToday ? (
                      <Check className="w-6 h-6 stroke-[3]" />
                    ) : (
                      <>
                        <span className="text-[9px] font-mono font-bold leading-none">DONE</span>
                        <span className="text-[7px] text-zinc-500 mt-0.5">TODAY</span>
                      </>
                    )}
                  </button>

                  {/* Routine Title & Badges */}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {routine.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 font-mono flex-wrap">
                      <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/5">
                        {routine.category}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {routine.targetDays} • {routine.targetDurationMinutes}m
                      </span>
                    </div>
                  </div>

                  {/* Streaks Pill & Delete */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono">
                      <div className="flex items-center gap-1 text-red-400 font-bold">
                        <Flame className="w-3.5 h-3.5 fill-red-400" />
                        <span>{routine.currentStreak}d</span>
                      </div>
                      <div className="w-px h-4 bg-white/10" />
                      <div className="flex items-center gap-1 text-zinc-400">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{routine.bestStreak}d</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        haptics.warning();
                        setRoutineToDelete(routine);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-brand-red active:scale-90 transition-colors"
                      aria-label="Delete Routine"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Rolling Days Track (Optimized for Phone Tap) */}
                <div className="mt-3.5 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-2">
                    <span>{isExpanded ? "14-Day Matrix" : "Past 7 Days Consistency"}</span>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setExpandedRoutineMap((prev) => ({
                          ...prev,
                          [routine.id]: !isExpanded,
                        }));
                      }}
                      className="text-zinc-500 hover:text-white flex items-center gap-0.5 text-[10px]"
                    >
                      <span>{isExpanded ? "Show 7d" : "Show 14d"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  <div className={`grid gap-1.5 ${isExpanded ? "grid-cols-7" : "grid-cols-7"}`}>
                    {visibleHistory.map((h: any) => {
                      const dayDate = parseISO(h.date);
                      const dayLabel = format(dayDate, "EEE")[0]; // M, T, W...
                      const dateNumber = format(dayDate, "d");
                      const isCompleted = h.completed;

                      return (
                        <button
                          key={h.date}
                          type="button"
                          onClick={() => handleToggleCompletion(routine.id, h.date)}
                          className={`py-2 rounded-xl border transition-all flex flex-col items-center justify-center active:scale-90 ${
                            isCompleted
                              ? "bg-red-500/20 border-red-500/40 text-red-400 font-bold shadow-glow-red-subtle"
                              : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-600"
                          }`}
                          title={`${h.date}: ${isCompleted ? "Completed" : "Pending"}`}
                        >
                          <span className="text-[9px] font-mono text-zinc-400 uppercase">
                            {dayLabel}
                          </span>
                          <span className="text-xs font-mono font-bold mt-0.5">
                            {dateNumber}
                          </span>
                          <span className="text-[10px] mt-0.5 leading-none">
                            {isCompleted ? "✓" : "•"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* New Routine Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Routine"
      >
        <form onSubmit={handleCreateRoutine} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Routine Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gym workout, Read 20 mins, Cold shower"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-mono"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Morning">Morning Protocol</SelectItem>
                  <SelectItem value="Afternoon">Afternoon Focus</SelectItem>
                  <SelectItem value="Night">Night Protocol</SelectItem>
                  <SelectItem value="Health">Health & Fitness</SelectItem>
                  <SelectItem value="Study">Study & Knowledge</SelectItem>
                  <SelectItem value="Work">Deep Work</SelectItem>
                  <SelectItem value="Discipline">Monk Discipline</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Frequency
              </label>
              <Select value={targetDays} onValueChange={setTargetDays}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="MON_SAT">Mon - Sat</SelectItem>
                  <SelectItem value="WEEKDAYS">Weekdays only</SelectItem>
                  <SelectItem value="WEEKENDS">Weekends only</SelectItem>
                  <SelectItem value="SUNDAY">Every Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Target Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              value={targetDurationMinutes}
              onChange={(e) => setTargetDurationMinutes(Number(e.target.value) || 1)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit">
              Save Routine
            </Button>
          </div>
        </form>
      </Modal>

      {/* Routine Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(routineToDelete)}
        onClose={() => setRoutineToDelete(null)}
        onConfirm={handleExecuteDeleteRoutine}
        isLoading={isDeletingRoutine}
        title="Delete Routine"
        message={`Are you sure you want to delete "${routineToDelete?.name}"? All streak counts and history logs will be removed.`}
        confirmText="Delete Routine"
        confirmVariant="red"
        iconType="danger"
      />
    </div>
  );
}
