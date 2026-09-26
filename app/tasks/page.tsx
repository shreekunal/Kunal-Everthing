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
  Flame,
  Filter,
  Check,
  AlertTriangle,
} from "lucide-react";
import { format, addHours, setHours, setMinutes, addDays } from "date-fns";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";
import { offlineCache } from "@/lib/offlineCache";
import { offlineQueue } from "@/lib/offlineQueue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { scheduleTaskNotification, cancelTaskNotification } from "@/lib/notifications";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "HIGH" | "COMPLETED">("ACTIVE");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

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

  // Delete states
  const [taskToDelete, setTaskToDelete] = useState<any | null>(null);
  const [isConfirmClearCompletedOpen, setIsConfirmClearCompletedOpen] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const fetchTasks = async () => {
    try {
      await offlineCache.swr(
        "tasks",
        async () => {
          const res = await fetch("/api/tasks");
          if (!res.ok) throw new Error("Failed to fetch tasks");
          return res.json();
        },
        (cached) => {
          setTasks(cached.tasks || []);
          setLoading(false);
        }
      ).then((fresh) => {
        setTasks(fresh.tasks || []);
      });
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Back Button integration: close open modals or dialogs first
  useEffect(() => {
    if (!isAddModalOpen && !taskToDelete && !isConfirmClearCompletedOpen && !quickReminderTaskId) return;
    return backButton.register(() => {
      if (isAddModalOpen) {
        setIsAddModalOpen(false);
        return true;
      }
      if (taskToDelete) {
        setTaskToDelete(null);
        return true;
      }
      if (isConfirmClearCompletedOpen) {
        setIsConfirmClearCompletedOpen(false);
        return true;
      }
      if (quickReminderTaskId) {
        setQuickReminderTaskId(null);
        return true;
      }
      return false;
    });
  }, [isAddModalOpen, taskToDelete, isConfirmClearCompletedOpen, quickReminderTaskId]);

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

    // 1. Instant 0ms Optimistic Update (Immediate visual feedback)
    let updatedTasksList: any[] = [];
    setTasks((prev) => {
      updatedTasksList = prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
      offlineCache.set("tasks", { tasks: updatedTasksList });
      return updatedTasksList;
    });

    if (newStatus === "DONE") {
      cancelTaskNotification(taskId);
    }

    // 2. Silent background sync (queues offline when disconnected)
    try {
      const res = await offlineQueue.offlineFetch(
        `/api/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
        `Task status -> ${newStatus}`
      );
      if (res && res.ok) {
        const data = await res.json();
        if (data.nextTask && data.nextTask.remindAt) {
          scheduleTaskNotification({
            id: data.nextTask.id,
            title: data.nextTask.title,
            remindAt: data.nextTask.remindAt,
            description: data.nextTask.description || undefined,
          });
        }
      }
    } catch (err) {
      console.error("Task toggle error:", err);
      if (navigator.onLine) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
        );
      }
    }
  };

  const handleExecuteDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    haptics.warning();
    cancelTaskNotification(taskToDelete.id);
    try {
      await offlineQueue.offlineFetch(
        `/api/tasks/${taskToDelete.id}`,
        { method: "DELETE" },
        "Delete task"
      );
      setTasks((prev) => {
        const filtered = prev.filter((t) => t.id !== taskToDelete.id);
        offlineCache.set("tasks", { tasks: filtered });
        return filtered;
      });
      setTaskToDelete(null);
    } catch (err) {
      console.error("Task delete error:", err);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleExecuteClearCompleted = async () => {
    const completed = tasks.filter((t) => t.status === "DONE");
    if (completed.length === 0) return;

    haptics.warning();
    completed.forEach((t) => cancelTaskNotification(t.id));
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

      if (remindAt) {
        const targetTask = tasks.find((t) => t.id === taskId);
        await scheduleTaskNotification({
          id: taskId,
          title: targetTask?.title || "Task Reminder",
          remindAt,
          description: targetTask?.description || undefined,
        });
      } else {
        await cancelTaskNotification(taskId);
      }

      setQuickReminderTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error("Update reminder error:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || isCreatingTask) return;

    setIsCreatingTask(true);
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
        const data = await res.json().catch(() => null);
        const createdTask = data?.task || data;
        if (remindAt && createdTask?.id) {
          await scheduleTaskNotification({
            id: createdTask.id,
            title: createdTask.title || title,
            remindAt,
            description: description || undefined,
          });
        }

        haptics.success();
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
    } finally {
      setIsCreatingTask(false);
    }
  };

  const TASK_CATEGORIES = ["ALL", "Work", "Study", "Health", "Personal", "Finance"];

  const activeCount = tasks.filter((t) => t.status !== "DONE").length;
  const completedCount = tasks.filter((t) => t.status === "DONE").length;
  const urgentCount = tasks.filter((t) => t.priority === "HIGH" && t.status !== "DONE").length;

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

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Mobile-Optimized Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-red" />
            Tasks & Priorities
          </h2>
          <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
            <span className="text-white font-bold">{activeCount} active</span>
            <span>•</span>
            <span className={urgentCount > 0 ? "text-red-400 font-bold" : "text-zinc-500"}>
              {urgentCount} urgent
            </span>
            <span>•</span>
            <span>{completedCount} done</span>
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

      {/* Mobile-Optimized Segmented Status Bar */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-black/80 border border-white/10 rounded-2xl">
        {[
          { id: "ACTIVE" as const, label: "Active", count: activeCount },
          { id: "HIGH" as const, label: "Urgent", count: urgentCount },
          { id: "ALL" as const, label: "All", count: tasks.length },
          { id: "COMPLETED" as const, label: "Done", count: completedCount },
        ].map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                haptics.selection();
                setFilter(tab.id);
              }}
              className={`py-2 px-1 rounded-xl text-xs font-mono font-medium transition-all flex flex-col items-center justify-center text-center ${
                isActive
                  ? "bg-brand-red text-white shadow-glow-red font-bold"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-bold ${
                  isActive ? "text-white/90" : "text-zinc-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category Filter & Actions Row (No Horizontal Scroller) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
          <Tag className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Category:</span>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCategory}
            onValueChange={(val) => {
              haptics.selection();
              setSelectedCategory(val);
            }}
          >
            <SelectTrigger className="w-[165px] h-8 bg-black/80 rounded-xl border-white/10 text-xs font-mono">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent align="end">
              {TASK_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat === "ALL" ? "All Categories" : cat} (
                  {cat === "ALL"
                    ? tasks.length
                    : tasks.filter(
                        (t) => (t.category || "").toLowerCase() === cat.toLowerCase()
                      ).length}
                  )
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {completedCount > 0 && filter === "COMPLETED" && (
            <button
              onClick={() => {
                haptics.warning();
                setIsConfirmClearCompletedOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[10px] font-mono text-red-400 flex items-center gap-1 transition-all active:scale-95"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Done</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Task Card Feed */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500 font-mono">
            Loading your tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-10 text-center text-xs text-zinc-500 font-mono bg-white/[0.02] border border-white/5 rounded-2xl">
            No tasks found in this view. Tap &apos;+ New&apos; to create one!
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
                className={clsx(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-200",
                  isDone
                    ? "bg-black/40 border-white/5 opacity-55 hover:opacity-75"
                    : task.priority === "HIGH"
                    ? "bg-gradient-to-r from-red-950/20 via-black/85 to-black border-red-500/30 shadow-glow-red-subtle hover:border-red-500/50"
                    : "bg-zinc-950/80 hover:bg-zinc-900/60 border-white/[0.08] hover:border-white/20 shadow-sm"
                )}
              >
                {/* Sleek Crimson Accent Spine for Urgent Tasks */}
                {task.priority === "HIGH" && !isDone && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-red shadow-glow-red" />
                )}

                <div className="p-3.5 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Tactile Nothing-style Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id, task.status)}
                      className={clsx(
                        "w-5 h-5 rounded-lg border flex items-center justify-center transition-all duration-200 active:scale-90 flex-shrink-0 mt-0.5",
                        isDone
                          ? "bg-brand-red border-brand-red text-white shadow-glow-red"
                          : "border-zinc-700 hover:border-brand-red/80 bg-white/[0.02] hover:bg-brand-red/10 text-transparent"
                      )}
                      aria-label={isDone ? "Mark todo" : "Mark done"}
                    >
                      <Check className={clsx("w-3.5 h-3.5 stroke-[2.5]", isDone ? "opacity-100" : "opacity-0")} />
                    </button>

                    <div className="min-w-0 flex-1">
                      {/* Header Row: Title & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={clsx(
                            "text-sm font-semibold tracking-tight leading-snug transition-all",
                            isDone ? "line-through text-zinc-500 font-normal" : "text-zinc-100 group-hover:text-white"
                          )}
                        >
                          {task.title}
                        </p>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {task.priority === "HIGH" && !isDone && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold tracking-wider uppercase bg-red-500/15 text-red-400 border border-red-500/30">
                              Urgent
                            </span>
                          )}
                          {task.category && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/5 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                              <span>{task.category}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-zinc-400/85 mt-1 leading-relaxed line-clamp-2 font-sans font-normal">
                          {task.description}
                        </p>
                      )}

                      {/* Sleek Metadata & Action Dock */}
                      <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2 flex-wrap text-xs font-mono">
                        {/* Left: Due Date, Reminders & Recurrence */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {task.dueDate && (
                            <span
                              className={clsx(
                                "text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1",
                                dueInfo.isOverdue && !isDone
                                  ? "bg-red-500/15 border-red-500/30 text-red-400 font-bold"
                                  : dueInfo.isToday && !isDone
                                  ? "bg-amber-500/15 border-amber-500/30 text-amber-300 font-bold"
                                  : "bg-white/[0.03] border-white/10 text-zinc-400"
                              )}
                            >
                              {dueInfo.isOverdue && !isDone ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                              ) : (
                                <Calendar className="w-2.5 h-2.5 opacity-70" />
                              )}
                              <span>{dueInfo.label}</span>
                            </span>
                          )}

                          {hasReminder && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-red/15 border border-brand-red/35 text-brand-red flex items-center gap-1 font-bold">
                              <Bell className="w-2.5 h-2.5 fill-brand-red" />
                              <span>{format(new Date(task.remindAt), "MMM d, h:mm a")}</span>
                            </span>
                          )}

                          {task.recurrence && task.recurrence !== "NONE" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.02] text-zinc-400 border border-white/5 flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5 opacity-50" />
                              <span className="capitalize">{task.recurrence.toLowerCase()}</span>
                            </span>
                          )}
                        </div>

                        {/* Right: Sleek Action Dock */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => handlePostponeTask(task)}
                              className="h-6 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-[10px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-all"
                              title="Postpone 1 Day"
                            >
                              <Calendar className="w-2.5 h-2.5 text-brand-red" />
                              <span>+1d</span>
                            </button>
                          )}

                          {!isDone && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className={clsx(
                                    "h-6 px-2 rounded-lg border text-[10px] flex items-center gap-1 active:scale-95 transition-all font-mono",
                                    hasReminder
                                      ? "bg-brand-red/15 border-brand-red/40 text-brand-red"
                                      : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-zinc-300 hover:text-white"
                                  )}
                                >
                                  <Bell className="w-2.5 h-2.5" />
                                  <span>{hasReminder ? "Alarm" : "Remind"}</span>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52 p-1.5 bg-zinc-950/95 backdrop-blur-3xl border-white/15">
                                <DropdownMenuLabel>Set Quick Reminder</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleUpdateReminder(task.id, "1_HOUR")}>
                                  <span>In 1 Hour</span>
                                  <Clock className="w-3.5 h-3.5 ml-auto opacity-60 text-zinc-400" />
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateReminder(task.id, "TODAY_EVENING")}>
                                  <span>Tonight at 8 PM</span>
                                  <Clock className="w-3.5 h-3.5 ml-auto opacity-60 text-zinc-400" />
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleUpdateReminder(task.id, "TOMORROW_MORNING")}>
                                  <span>Tomorrow at 9 AM</span>
                                  <Clock className="w-3.5 h-3.5 ml-auto opacity-60 text-zinc-400" />
                                </DropdownMenuItem>
                                {hasReminder && (
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateReminder(task.id, "NONE")}
                                    className="text-red-400 focus:bg-red-500/20 focus:text-red-300 border-t border-white/10 mt-1"
                                  >
                                    <span>Clear Alarm</span>
                                    <Trash2 className="w-3.5 h-3.5 ml-auto opacity-60" />
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              haptics.warning();
                              setTaskToDelete(task);
                            }}
                            className="h-6 w-6 rounded-lg hover:bg-red-500/15 active:scale-90 text-zinc-500 hover:text-brand-red flex items-center justify-center transition-colors ml-0.5"
                            aria-label="Delete Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Task Modal */}
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
              placeholder="Add key notes..."
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
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High (Urgent)</SelectItem>
                </SelectContent>
              </Select>
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red font-mono"
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
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Select recurrence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">One-time</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKDAYS">Mon - Fri</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
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
            <Button variant="red" size="sm" type="submit" isLoading={isCreatingTask}>
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
        message={`Are you sure you want to delete "${taskToDelete?.title}"?`}
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
