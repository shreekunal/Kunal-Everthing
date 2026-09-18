"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import {
  CheckSquare,
  Flame,
  BarChart3,
  Calendar,
  Heart,
  Send,
  Plus,
  Bell,
} from "lucide-react";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/presets";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: () => void;
}

type TabType = "task" | "routine" | "session" | "date" | "message";

export function QuickAddModal({ isOpen, onClose, onItemAdded }: QuickAddModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("task");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskCategory, setTaskCategory] = useState("Work");
  const [taskReminderPreset, setTaskReminderPreset] = useState("NONE");
  const [taskCustomRemindAt, setTaskCustomRemindAt] = useState("");

  const [routineName, setRoutineName] = useState("");
  const [routineCategory, setRoutineCategory] = useState("Health");
  const [routineDays, setRoutineDays] = useState("DAILY");

  const [sessionProject, setSessionProject] = useState("");
  const [sessionDuration, setSessionDuration] = useState("30");
  const [sessionType, setSessionType] = useState("WORK");

  const [partnerPhone, setPartnerPhone] = useState("");
  const [messageText, setMessageText] = useState("");

  const [dateTitle, setDateTitle] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [dateCategory, setDateCategory] = useState("CUSTOM");

  const calculateRemindAt = (preset: string, customVal: string): string | null => {
    const now = new Date();
    if (preset === "1_HOUR") {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    }
    if (preset === "TODAY_EVENING") {
      const evening = new Date();
      evening.setHours(20, 0, 0, 0);
      if (evening <= now) evening.setDate(evening.getDate() + 1);
      return evening.toISOString();
    }
    if (preset === "TOMORROW_MORNING") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow.toISOString();
    }
    if (preset === "CUSTOM" && customVal) {
      return new Date(customVal).toISOString();
    }
    return null;
  };

  const resetForms = () => {
    setTaskTitle("");
    setTaskReminderPreset("NONE");
    setTaskCustomRemindAt("");
    setRoutineName("");
    setSessionProject("");
    setMessageText("");
    setDateTitle("");
    setDateValue("");
    setSuccessMessage("");
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;
    setLoading(true);
    const remindAt = calculateRemindAt(taskReminderPreset, taskCustomRemindAt);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          priority: taskPriority,
          dueDate: taskDueDate || null,
          category: taskCategory,
          remindAt,
          reminderOffset: taskReminderPreset,
        }),
      });
      if (res.ok) {
        setSuccessMessage("Task created successfully!");
        setTimeout(() => {
          resetForms();
          onClose();
          if (onItemAdded) onItemAdded();
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routineName) return;
    setLoading(true);
    try {
      const res = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routineName,
          category: routineCategory,
          targetDays: routineDays,
        }),
      });
      if (res.ok) {
        setSuccessMessage("Routine created!");
        setTimeout(() => {
          resetForms();
          onClose();
          if (onItemAdded) onItemAdded();
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionProject) return;
    setLoading(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: sessionProject,
          durationMinutes: parseInt(sessionDuration) || 30,
          type: sessionType,
          date: new Date().toISOString().split("T")[0],
        }),
      });
      if (res.ok) {
        setSuccessMessage("Activity logged!");
        setTimeout(() => {
          resetForms();
          onClose();
          if (onItemAdded) onItemAdded();
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTitle || !dateValue) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: dateTitle,
          date: dateValue,
          category: dateCategory,
        }),
      });
      if (res.ok) {
        setSuccessMessage("Date saved!");
        setTimeout(() => {
          resetForms();
          onClose();
          if (onItemAdded) onItemAdded();
        }, 500);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!messageText) return;
    const cleanPhone = partnerPhone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(messageText);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
    onClose();
  };

  const tabs = [
    { id: "task", label: "Task", icon: CheckSquare },
    { id: "routine", label: "Routine", icon: Flame },
    { id: "session", label: "Work/Study", icon: BarChart3 },
    { id: "date", label: "Date", icon: Calendar },
    { id: "message", label: "WhatsApp", icon: Heart },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Quick Add">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-white/10 rounded-2xl mb-5 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSuccessMessage("");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-glow-red-subtle"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {successMessage && (
        <div className="mb-4 p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-brand-red text-xs font-medium font-mono text-center">
          {successMessage}
        </div>
      )}

      {/* Task Form */}
      {activeTab === "task" && (
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Complete Supplier Portal task"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High (Urgent)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Due Date
              </label>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Category
            </label>
            <input
              type="text"
              placeholder="Work, Study, Finance, Personal"
              value={taskCategory}
              onChange={(e) => setTaskCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
            />
          </div>

          {/* Remind Me Section */}
          <div className="p-3 bg-white/[0.02] border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-brand-red" />
              <label className="text-[11px] font-mono font-bold text-white uppercase">
                Remind Me
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: "NONE", label: "No Alert" },
                { id: "1_HOUR", label: "In 1 Hour" },
                { id: "TODAY_EVENING", label: "Today 8 PM" },
                { id: "TOMORROW_MORNING", label: "Tomorrow 9 AM" },
              ].map((chip) => (
                <button
                  type="button"
                  key={chip.id}
                  onClick={() => setTaskReminderPreset(chip.id)}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-mono font-medium transition-all ${
                    taskReminderPreset === chip.id
                      ? "bg-brand-red text-white shadow-glow-red-subtle font-bold"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="pt-0.5">
              <input
                type="datetime-local"
                value={taskCustomRemindAt}
                onChange={(e) => {
                  setTaskCustomRemindAt(e.target.value);
                  setTaskReminderPreset(e.target.value ? "CUSTOM" : "NONE");
                }}
                className="w-full px-2.5 py-1.5 rounded-xl bg-black border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit" isLoading={loading}>
              Create Task
            </Button>
          </div>
        </form>
      )}

      {/* Routine Form */}
      {activeTab === "routine" && (
        <form onSubmit={handleCreateRoutine} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Routine / Habit Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gym, Read 20 mins, Study"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
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
                value={routineCategory}
                onChange={(e) => setRoutineCategory(e.target.value)}
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
                value={routineDays}
                onChange={(e) => setRoutineDays(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="DAILY">Daily</option>
                <option value="MON_SAT">Mon - Sat</option>
                <option value="WEEKDAYS">Weekdays only</option>
                <option value="WEEKENDS">Weekends</option>
                <option value="SUNDAY">Every Sunday</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Create Routine
            </Button>
          </div>
        </form>
      )}

      {/* Session Form */}
      {activeTab === "session" && (
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Project / Topic *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Next.js App, Micro CRM, Cloud Study"
              value={sessionProject}
              onChange={(e) => setSessionProject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Type
              </label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="WORK">Work</option>
                <option value="STUDY">Study</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Log Activity
            </Button>
          </div>
        </form>
      )}

      {/* Date Form */}
      {activeTab === "date" && (
        <form onSubmit={handleCreateDate} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Her Birthday, Anniversary, Car Insurance"
              value={dateTitle}
              onChange={(e) => setDateTitle(e.target.value)}
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
                value={dateCategory}
                onChange={(e) => setDateCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              >
                <option value="BIRTHDAY">Birthday</option>
                <option value="ANNIVERSARY">Anniversary</option>
                <option value="BILL_DUE">Bill / Card Due</option>
                <option value="DOCUMENT_EXPIRY">Doc Expiry</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Date *
              </label>
              <input
                type="date"
                required
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Save Date
            </Button>
          </div>
        </form>
      )}

      {/* Message Form */}
      {activeTab === "message" && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Pick Preset Template
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 border border-white/10 rounded-2xl bg-black/60">
              {DEFAULT_MESSAGE_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessageText(tmpl.content)}
                  className="text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-[11px] text-zinc-300 border border-white/5 transition-colors"
                >
                  <span className="font-semibold block text-red-400 font-mono">
                    {tmpl.title}
                  </span>
                  <span className="line-clamp-1 text-zinc-400">{tmpl.content}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Message Content
            </label>
            <textarea
              rows={3}
              placeholder="Good morning ❤️..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!messageText}
            >
              <Send className="w-3.5 h-3.5" />
              Open in WhatsApp
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
