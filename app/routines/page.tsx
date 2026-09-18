"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Flame, Plus, Check, Trophy, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { haptics } from "@/lib/haptics";

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [past14Days, setPast14Days] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Health");
  const [targetDays, setTargetDays] = useState("DAILY");
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(30);

  const fetchRoutines = async () => {
    try {
      const res = await fetch("/api/routines");
      if (res.ok) {
        const data = await res.json();
        setRoutines(data.routines || []);
        setPast14Days(data.past14Days || []);
      }
    } catch (err) {
      console.error("Failed to fetch routines:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

  const handleToggleCompletion = async (routineId: string, date?: string) => {
    haptics.success();
    try {
      await fetch(`/api/routines/${routineId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      fetchRoutines();
    } catch (err) {
      console.error("Toggle routine error:", err);
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    haptics.warning();
    try {
      await fetch(`/api/routines/${routineId}`, { method: "DELETE" });
      setRoutines((prev) => prev.filter((r) => r.id !== routineId));
    } catch (err) {
      console.error("Delete routine error:", err);
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
          name,
          category,
          targetDays,
          targetDurationMinutes: Number(targetDurationMinutes),
        }),
      });

      if (res.ok) {
        setName("");
        setIsAddModalOpen(false);
        fetchRoutines();
      }
    } catch (err) {
      console.error("Create routine error:", err);
    }
  };

  const totalStreaks = routines.reduce((acc, r) => acc + r.currentStreak, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400 fill-red-400" />
            Habit Matrix & Streaks
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Tracking {routines.length} daily habits • Total active streak: {totalStreaks} days
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Routine</span>
        </Button>
      </div>

      {/* Routine Cards with 14-day Heatmap */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono">
            Loading habits & matrix...
          </div>
        ) : routines.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono">
            No routines configured yet. Click &apos;New Routine&apos; to start!
          </div>
        ) : (
          routines.map((routine) => {
            return (
              <Card key={routine.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Routine info & today toggle */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleToggleCompletion(routine.id)}
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                        routine.completedToday
                          ? "bg-red-500 text-white font-bold shadow-glow-red border border-red-400"
                          : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border border-white/10"
                      }`}
                    >
                      {routine.completedToday ? (
                        <Check className="w-6 h-6 stroke-[3]" />
                      ) : (
                        <span className="text-[10px] font-mono font-bold">TODAY</span>
                      )}
                    </button>

                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {routine.name}
                        {routine.currentStreak >= 7 && (
                          <span className="text-red-400 flex items-center gap-0.5 text-xs font-mono font-bold">
                            <Flame className="w-3.5 h-3.5 fill-red-400" /> STREAK ON FIRE
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 font-mono">
                        <Badge variant="glass" size="sm">
                          {routine.category}
                        </Badge>
                        <span className="text-[11px] text-zinc-500">
                          {routine.targetDays} • {routine.targetDurationMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Streaks & Best */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 bg-black/60 px-4 py-2 rounded-2xl border border-white/10">
                      <div className="text-center">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">
                          Current
                        </span>
                        <span className="text-base font-bold text-red-400 font-mono flex items-center justify-center gap-1">
                          <Flame className="w-4 h-4 fill-red-400" />
                          {routine.currentStreak}d
                        </span>
                      </div>
                      <div className="w-px h-7 bg-white/10" />
                      <div className="text-center">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">
                          Best
                        </span>
                        <span className="text-base font-bold text-white font-mono flex items-center justify-center gap-1">
                          <Trophy className="w-3.5 h-3.5" />
                          {routine.bestStreak}d
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteRoutine(routine.id)}
                      className="text-zinc-600 hover:text-red-400 p-2 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 14-Day Heatmap Matrix Row */}
                <div className="mt-5 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-2 font-mono">
                    <span>14-Day Activity Matrix</span>
                    <span className="text-zinc-500">Click day to toggle</span>
                  </div>

                  <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
                    {routine.pastHistory?.map((h: any) => {
                      const dayLabel = format(parseISO(h.date), "dd/MM");
                      const isCompleted = h.completed;

                      return (
                        <button
                          key={h.date}
                          onClick={() => handleToggleCompletion(routine.id, h.date)}
                          title={`${h.date}: ${isCompleted ? "Completed" : "Pending"}`}
                          className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                            isCompleted
                              ? "bg-red-500/20 border-red-500/40 text-red-400 font-bold shadow-glow-red-subtle"
                              : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-600"
                          }`}
                        >
                          <span className="text-[10px] font-mono">{dayLabel}</span>
                          <span className="text-xs mt-0.5">
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
              placeholder="e.g. Gym, Read 20 mins, Study"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="Health">Health</option>
                <option value="Study">Study</option>
                <option value="Work">Work</option>
                <option value="Mindset">Mindset</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Frequency
              </label>
              <select
                value={targetDays}
                onChange={(e) => setTargetDays(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="DAILY">Daily</option>
                <option value="MON_SAT">Mon - Sat</option>
                <option value="WEEKDAYS">Weekdays only</option>
                <option value="WEEKENDS">Weekends only</option>
                <option value="SUNDAY">Every Sunday</option>
              </select>
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
              onChange={(e) => setTargetDurationMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Routine
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
