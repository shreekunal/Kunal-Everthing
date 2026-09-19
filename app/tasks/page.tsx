"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InputDate } from "@/components/ui/InputDate";
import { getDueStatus } from "@/lib/formatters";
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Trash2,
  Calendar,
  Repeat,
  Tag,
  Bell,
  Clock,
  Check,
} from "lucide-react";
import { format, addHours, setHours, setMinutes, addDays } from "date-fns";
import { haptics } from "@/lib/haptics";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED" | "HIGH">("ACTIVE");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [recurrence, setRecurrence] = useState("NONE");
  const [category, setCategory] = useState("Work");

  // Remind Me states
  const [reminderPreset, setReminderPreset] = useState<string>("NONE");
  const [customRemindAt, setCustomRemindAt] = useState<string>("");

  // Inline Quick Reminder state
  const [quickReminderTaskId, setQuickReminderTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const calculateRemindAt = (preset: string, customVal: string): string | null => {
    const now = new Date();
    if (preset === "1_HOUR") {
      return addHours(now, 1).toISOString();
    }
    if (preset === "TODAY_EVENING") {
      const evening = setMinutes(setHours(now, 20), 0);
      return (evening > now ? evening : addDays(evening, 1)).toISOString();
    }
    if (preset === "TOMORROW_MORNING") {
      const tomorrowMorning = setMinutes(setHours(addDays(now, 1), 9), 0);
      return tomorrowMorning.toISOString();
    }
    if (preset === "CUSTOM" && customVal) {
      return new Date(customVal).toISOString();
    }
    return null;
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "TODO" : "DONE";
    if (newStatus === "DONE") {
      haptics.success();
    } else {
      haptics.impactLight();
    }
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchTasks();
    } catch (err) {
      console.error("Task toggle error:", err);
    }
  };

  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [isConfirmClearCompletedOpen, setIsConfirmClearCompletedOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const handleExecuteDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    haptics.warning();
    try {
      await fetch(`/api/tasks/${taskToDelete.id}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setTaskToDelete(null);
    } catch (err) {
      console.error("Task delete error:", err);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const handleExecuteClearCompleted = async () => {
    const completed = tasks.filter((t) => t.status === "DONE");
    if (completed.length === 0) return;

    haptics.warning();
    try {
      await Promise.all(
        completed.map((t) => fetch(`/api/tasks/${t.id}`, { method: "DELETE" }))
      );
      setIsConfirmClearCompletedOpen(false);
      fetchTasks();
    } catch (err) {
      console.error("Clear completed error:", err);
    }
  };

  const handlePostponeTask = async (task: any) => {
    haptics.impactMedium();
    let baseDate = new Date();
    if (task.dueDate) {
      const parsed = new Date(task.dueDate);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
    const nextDate = addDays(baseDate, 1);
    const nextDateStr = format(nextDate, "yyyy-MM-dd");

    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: nextDateStr }),
      });
      fetchTasks();
    } catch (err) {
      console.error("Postpone task error:", err);
    }
  };

  const handleUpdateReminder = async (taskId: string, preset: string, customVal: string = "") => {
    const remindAt = calculateRemindAt(preset, customVal);
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remindAt,
          reminderOffset: preset,
        }),
      });
      setQuickReminderTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error("Update reminder error:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const remindAt = calculateRemindAt(reminderPreset, customRemindAt);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          remindAt,
          reminderOffset: reminderPreset,
          recurrence,
          category,
        }),
      });

      if (res.ok) {
        setTitle("");
        setDescription("");
        setDueDate("");
        setDueTime("");
        setReminderPreset("NONE");
        setCustomRemindAt("");
        setIsAddModalOpen(false);
        fetchTasks();
      }
    } catch (err) {
      console.error("Create task error:", err);
    }
  };

  const TASK_CATEGORIES = ["ALL", "Work", "Study", "Health", "Personal", "Finance"];

  const filteredTasks = tasks.filter((task) => {
    if (filter === "ACTIVE" && task.status === "DONE") return false;
    if (filter === "COMPLETED" && task.status !== "DONE") return false;
    if (filter === "HIGH" && (task.priority !== "HIGH" || task.status === "DONE")) return false;
    if (
      selectedCategory !== "ALL" &&
      (task.category || "").toLowerCase() !== selectedCategory.toLowerCase()
    )
      return false;
    return true;
  });

  const activeCount = tasks.filter((t) => t.status !== "DONE").length;
  const completedCount = tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-red" />
            Task Management & Reminders
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            {activeCount} active tasks • {completedCount} completed • Smart recurrence & alerts
          </p>
        </div>

        <Button variant="red" size="sm" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Task</span>
        </Button>
      </div>

      {/* Filter Tabs & Archive/Clear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "ACTIVE", label: `Active (${activeCount})` },
              { id: "HIGH", label: "Urgent (High)" },
              { id: "ALL", label: `All (${tasks.length})` },
              { id: "COMPLETED", label: `Completed (${completedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                haptics.selection();
                setFilter(tab.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? "bg-brand-red text-white shadow-glow-red font-bold"
                  : "bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {completedCount > 0 && (
          <button
            onClick={() => {
              haptics.warning();
              setIsConfirmClearCompletedOpen(true);
            }}
            className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[11px] font-mono text-red-400 flex items-center gap-1.5 transition-all whitespace-nowrap active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Done ({completedCount})</span>
          </button>
        )}
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TASK_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count =
            cat === "ALL"
              ? tasks.length
              : tasks.filter(
                  (t) => (t.category || "").toLowerCase() === cat.toLowerCase()
                ).length;
          return (
            <button
              key={cat}
              onClick={() => {
                haptics.selection();
                setSelectedCategory(cat);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                isSelected
                  ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red"
                  : "bg-white/[0.03] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>{cat === "ALL" ? "All Categories" : cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? "bg-black/30 text-white" : "bg-white/10 text-zinc-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task List */}
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-mono">
              Loading tasks...
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 font-mono">
              No tasks found in this view.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === "DONE";
              const dueInfo = getDueStatus(task.dueDate);
              const hasReminder = Boolean(task.remindAt);
              const isQuickOpen = quickReminderTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-colors ${
                    isDone ? "bg-white/[0.01] opacity-60" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className="mt-0.5 text-zinc-500 hover:text-brand-red transition-colors flex-shrink-0"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-red" />
                      ) : (
                        <Circle className="w-5 h-5 hover:border-white" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium leading-snug ${
                          isDone ? "line-through text-zinc-500" : "text-white"
                        }`}
                      >
                        {task.title}
                      </p>

                      {task.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2 font-mono">
                        {task.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/5 flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-zinc-400" />
                            {task.category}
                          </span>
                        )}

                        {task.dueDate && (
                          <Badge variant={dueInfo.isOverdue ? "red" : "glass"} size="sm">
                            <Calendar className="w-2.5 h-2.5" />
                            {dueInfo.label}
                          </Badge>
                        )}

                        {hasReminder && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red flex items-center gap-1 font-mono shadow-glow-red-subtle">
                            <Bell className="w-2.5 h-2.5 text-brand-red fill-brand-red" />
                            <span>
                              {format(new Date(task.remindAt), "MMM d, h:mm a")}
                            </span>
                          </span>
                        )}

                        {task.recurrence && task.recurrence !== "NONE" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-300 border border-white/5 flex items-center gap-1">
                            <Repeat className="w-2.5 h-2.5" />
                            {task.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Remind Button */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center relative">
                    {task.priority === "HIGH" && (
                      <Badge variant="red" size="sm">
                        Urgent
                      </Badge>
                    )}

                    {/* Postpone +1d Button */}
                    <button
                      onClick={() => handlePostponeTask(task)}
                      className="px-2 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-[10px] font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-1 active:scale-95"
                      title="Postpone 1 Day to Tomorrow"
                    >
                      <Calendar className="w-3 h-3 text-brand-red" />
                      <span>+1d</span>
                    </button>

                    {/* Quick Inline Reminder Button */}
                    <div className="relative">
                      <button
                        onClick={() => setQuickReminderTaskId(isQuickOpen ? null : task.id)}
                        className={`p-1.5 rounded-xl border transition-all ${
                          hasReminder
                            ? "bg-brand-red/15 border-brand-red/40 text-brand-red shadow-glow-red-subtle"
                            : "bg-white/[0.02] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                        }`}
                        title="Set Reminder"
                      >
                        <Bell className="w-4 h-4" />
                      </button>

                      {/* Inline Reminder Dropdown */}
                      {isQuickOpen && (
                        <div className="absolute right-0 bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2 w-56 bg-black/95 backdrop-blur-3xl border border-white/15 rounded-2xl p-2 z-30 shadow-glass-panel space-y-1">
                          <span className="text-[10px] font-mono uppercase text-zinc-500 px-2 py-1 block">
                            Quick Remind Me
                          </span>
                          <button
                            onClick={() => handleUpdateReminder(task.id, "1_HOUR")}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:bg-brand-red hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>In 1 Hour</span>
                            <Clock className="w-3 h-3 opacity-60" />
                          </button>
                          <button
                            onClick={() => handleUpdateReminder(task.id, "TODAY_EVENING")}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:bg-brand-red hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>Today at 8:00 PM</span>
                            <Clock className="w-3 h-3 opacity-60" />
                          </button>
                          <button
                            onClick={() => handleUpdateReminder(task.id, "TOMORROW_MORNING")}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-300 hover:bg-brand-red hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span>Tomorrow 9:00 AM</span>
                            <Clock className="w-3 h-3 opacity-60" />
                          </button>
                          {hasReminder && (
                            <button
                              onClick={() => handleUpdateReminder(task.id, "NONE")}
                              className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-brand-red hover:bg-white/10 transition-colors border-t border-white/10 mt-1 pt-1.5"
                            >
                              Clear Reminder
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        haptics.warning();
                        setTaskToDelete(task);
                      }}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-xl text-zinc-500 hover:text-brand-red hover:bg-white/10 transition-all active:scale-90"
                      aria-label="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* New Task Modal with Remind Me Engine */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create New Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Finish client presentation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Add key bullet points or notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              >
                <option value="LOW" className="bg-black text-white">Low</option>
                <option value="MEDIUM" className="bg-black text-white">Medium</option>
                <option value="HIGH" className="bg-black text-white">High (Urgent)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Work, Study, Personal"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Due Date
              </label>
              <InputDate
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                placeholder="Pick due date..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Recurrence
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              >
                <option value="NONE" className="bg-black text-white">One-time</option>
                <option value="DAILY" className="bg-black text-white">Daily</option>
                <option value="WEEKDAYS" className="bg-black text-white">Mon - Fri (Weekdays)</option>
                <option value="WEEKLY" className="bg-black text-white">Weekly</option>
                <option value="MONTHLY" className="bg-black text-white">Monthly</option>
              </select>
            </div>
          </div>

          {/* Remind Me Section */}
          <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2.5">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-brand-red" />
              <label className="text-xs font-mono font-bold text-white uppercase">
                Remind Me
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "NONE", label: "No Alert" },
                { id: "1_HOUR", label: "In 1 Hour" },
                { id: "TODAY_EVENING", label: "Today 8 PM" },
                { id: "TOMORROW_MORNING", label: "Tomorrow 9 AM" },
              ].map((chip) => (
                <button
                  type="button"
                  key={chip.id}
                  onClick={() => setReminderPreset(chip.id)}
                  className={`px-2.5 py-2 rounded-xl text-[11px] font-mono font-medium transition-all ${
                    reminderPreset === chip.id
                      ? "bg-brand-red text-white shadow-glow-red-subtle font-bold"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="pt-1">
              <label className="block text-[10px] font-mono text-zinc-500 mb-1 uppercase">
                Or Custom Date & Time
              </label>
              <InputDate
                type="datetime-local"
                value={customRemindAt}
                placeholder="Pick custom reminder time..."
                onChange={(e) => {
                  setCustomRemindAt(e.target.value);
                  setReminderPreset(e.target.value ? "CUSTOM" : "NONE");
                }}
              />
            </div>
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
              Save Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Single Task Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleExecuteDeleteTask}
        isLoading={isDeletingTask}
        title="Delete Priority Task"
        message={`Are you sure you want to permanently delete "${taskToDelete?.title}"?`}
        confirmText="Delete Task"
        confirmVariant="red"
        iconType="danger"
      />

      {/* Clear Completed Tasks Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmClearCompletedOpen}
        onClose={() => setIsConfirmClearCompletedOpen(false)}
        onConfirm={handleExecuteClearCompleted}
        title="Clear All Completed Tasks"
        message="Are you sure you want to permanently delete all completed tasks from your history?"
        confirmText="Clear Done Tasks"
        confirmVariant="red"
        iconType="danger"
      />
    </div>
  );
}
