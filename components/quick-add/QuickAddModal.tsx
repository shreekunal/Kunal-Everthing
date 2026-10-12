"use client";

import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { InputDate } from "../ui/InputDate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  Flame,
  BarChart3,
  Calendar,
  Heart,
  Send,
  Plus,
  Bell,
  Trophy,
  Zap,
  UtensilsCrossed,
  ShieldAlert,
  Wallet,
  CreditCard,
} from "lucide-react";
import { DEFAULT_MESSAGE_TEMPLATES } from "@/lib/presets";
import { haptics } from "@/lib/haptics";
import { scheduleTaskNotification } from "@/lib/notifications";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded?: () => void;
  initialTab?: TabType;
}

type TabType = "task" | "expense" | "session" | "date" | "message" | "discipline";

export function QuickAddModal({ isOpen, onClose, onItemAdded, initialTab }: QuickAddModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || "task");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskCategory, setTaskCategory] = useState("Work");
  const [taskReminderPreset, setTaskReminderPreset] = useState("NONE");
  const [taskCustomRemindAt, setTaskCustomRemindAt] = useState("");

  const [sessionProject, setSessionProject] = useState("");
  const [sessionDuration, setSessionDuration] = useState("30");
  const [sessionType, setSessionType] = useState("STUDY");

  const [partnerPhone, setPartnerPhone] = useState("");
  const [messageText, setMessageText] = useState("");

  const [dateTitle, setDateTitle] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [dateCategory, setDateCategory] = useState("CUSTOM");

  // Discipline states
  const [disciplineAction, setDisciplineAction] = useState<"UNHEALTHY_FOOD" | "FAP" | "CUSTOM_PENALTY" | "CUSTOM_REWARD">("UNHEALTHY_FOOD");
  const [disciplinePoints, setDisciplinePoints] = useState("50");
  const [disciplineTitle, setDisciplineTitle] = useState("");
  const [disciplineNotes, setDisciplineNotes] = useState("");

  // Expense states
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseSourceType, setExpenseSourceType] = useState<"ACCOUNT" | "CARD">("ACCOUNT");
  const [expenseSourceId, setExpenseSourceId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Food & Dining");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [financeData, setFinanceData] = useState<{
    accounts: Array<{ id: string; name: string; balance: number; type: string }>;
    creditCards: Array<{ id: string; name: string; last4?: string }>;
  }>({ accounts: [], creditCards: [] });

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    fetch("/api/relationship")
      .then((res) => res.json())
      .then((data) => {
        if (data?.partner?.phone) {
          setPartnerPhone(data.partner.phone);
        }
      })
      .catch(() => { });

    fetch("/api/money")
      .then((res) => res.json())
      .then((data) => {
        const accs = data.accounts || [];
        const cards = data.creditCards || [];
        setFinanceData({ accounts: accs, creditCards: cards });
        if (accs.length > 0) {
          setExpenseSourceType("ACCOUNT");
          setExpenseSourceId(accs[0].id);
        } else if (cards.length > 0) {
          setExpenseSourceType("CARD");
          setExpenseSourceId(cards[0].id);
        }
      })
      .catch(() => { });
  }, [isOpen]);


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
        const data = await res.json().catch(() => null);
        const createdTask = data?.task || data;
        if (remindAt && createdTask?.id) {
          scheduleTaskNotification({
            id: createdTask.id,
            title: createdTask.title || taskTitle,
            remindAt,
          }).catch((err) => console.warn("Task notification schedule failed:", err));
        }

        haptics.success();
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

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionProject) return;
    setLoading(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: sessionProject,
          type: sessionType,
          durationMinutes: Number(sessionDuration) || 30,
        }),
      });
      if (res.ok) {
        haptics.success();
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
        haptics.success();
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
    haptics.impactMedium();
    const cleanPhone = partnerPhone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(messageText);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
    onClose();
  };

  const handleCreateDiscipline = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let payload: any = {};
      if (disciplineAction === "UNHEALTHY_FOOD") {
        payload = { action: "PENALTY_UNHEALTHY_FOOD", points: 150, notes: disciplineNotes };
      } else if (disciplineAction === "FAP") {
        payload = { action: "PENALTY_FAP", points: 300, notes: disciplineNotes };
      } else if (disciplineAction === "CUSTOM_PENALTY") {
        payload = {
          action: "PENALTY_CUSTOM",
          title: disciplineTitle || "Discipline Infraction",
          points: Number(disciplinePoints) || 100,
          notes: disciplineNotes,
        };
      } else {
        payload = {
          action: "REWARD_CUSTOM",
          title: disciplineTitle || "Good Habit Deed",
          points: Number(disciplinePoints) || 10,
          notes: disciplineNotes,
        };
      }

      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (disciplineAction === "CUSTOM_REWARD") {
          haptics.success();
        } else {
          haptics.warning();
        }
        setSuccessMessage("⚡ Discipline record updated!");
        setDisciplineNotes("");
        setDisciplineTitle("");
        if (onItemAdded) onItemAdded();
        setTimeout(() => {
          setSuccessMessage("");
          onClose();
        }, 800);
      }
    } catch {
      alert("Failed to record discipline action");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid expense amount");
      return;
    }
    if (!expenseSourceId) {
      alert("Please select a bank account or card");
      return;
    }

    setLoading(true);
    try {
      if (expenseSourceType === "ACCOUNT") {
        const res = await fetch(`/api/money/${expenseSourceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adjustmentType: "DEBIT",
            adjustmentAmount: amt,
          }),
        });
        if (!res.ok) throw new Error("Failed to deduct from account balance");
      }

      haptics.success();
      setSuccessMessage("💸 Expense recorded & balance updated!");
      setExpenseAmount("");
      setExpenseNotes("");
      if (onItemAdded) onItemAdded();
      setTimeout(() => {
        setSuccessMessage("");
        onClose();
      }, 750);
    } catch (err: any) {
      alert(err.message || "Failed to record expense");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "task", label: "Task", icon: CheckSquare },
    { id: "expense", label: "Expense", icon: Wallet },
    { id: "discipline", label: "Discipline", icon: Trophy },
    { id: "session", label: "Work/Study", icon: BarChart3 },
    { id: "date", label: "Date", icon: Calendar },
    { id: "message", label: "WhatsApp", icon: Heart },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Quick Add">
      {/* Mobile-Optimized Tab Switcher */}
      <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 p-1.5 bg-black/80 border border-white/10 rounded-2xl mb-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                haptics.selection();
                setActiveTab(tab.id as TabType);
                setSuccessMessage("");
              }}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${isActive
                  ? "bg-brand-red text-white shadow-glow-red-subtle font-bold"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
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
              <Select value={taskPriority} onValueChange={setTaskPriority}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Priority" />
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
                Due Date
              </label>
              <InputDate
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                placeholder="Pick due date..."
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
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-mono font-medium transition-all ${taskReminderPreset === chip.id
                      ? "bg-brand-red text-white shadow-glow-red-subtle font-bold"
                      : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5"
                    }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="pt-0.5">
              <InputDate
                type="datetime-local"
                value={taskCustomRemindAt}
                placeholder="Pick custom reminder time..."
                onChange={(e) => {
                  setTaskCustomRemindAt(e.target.value);
                  setTaskReminderPreset(e.target.value ? "CUSTOM" : "NONE");
                }}
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="glass" size="sm" type="button" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit" isLoading={loading} className="order-1 sm:order-2 py-2.5 font-bold shadow-glow-red">
              Create Task
            </Button>
          </div>
        </form>
      )}

      {/* Expense Form */}
      {activeTab === "expense" && (
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Amount (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-mono font-bold text-sm">₹</span>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                placeholder="0.00"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 font-mono"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Payment Source / Account *
              </label>
              <Select
                value={expenseSourceId ? `${expenseSourceType}:${expenseSourceId}` : ""}
                onValueChange={(val) => {
                  const [type, id] = val.split(":");
                  setExpenseSourceType(type as "ACCOUNT" | "CARD");
                  setExpenseSourceId(id);
                }}
              >
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Select Account or Card" />
                </SelectTrigger>
                <SelectContent>
                  {financeData.accounts.map((acc) => (
                    <SelectItem key={acc.id} value={`ACCOUNT:${acc.id}`}>
                      🏦 {acc.name} (₹{acc.balance.toLocaleString("en-IN")})
                    </SelectItem>
                  ))}
                  {financeData.creditCards.map((card) => (
                    <SelectItem key={card.id} value={`CARD:${card.id}`}>
                      💳 {card.name} •• {card.last4}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food & Dining">🍔 Food & Dining</SelectItem>
                  <SelectItem value="Groceries">🛒 Groceries & Essentials</SelectItem>
                  <SelectItem value="Travel & Fuel">⛽ Travel & Fuel</SelectItem>
                  <SelectItem value="Shopping">🛍️ Shopping</SelectItem>
                  <SelectItem value="Bills & Utilities">⚡ Bills & Utilities</SelectItem>
                  <SelectItem value="Date Night">🌹 Date Night</SelectItem>
                  <SelectItem value="Tech & Tools">💻 Tech & Subscriptions</SelectItem>
                  <SelectItem value="Entertainment">🎬 Entertainment</SelectItem>
                  <SelectItem value="Other">📦 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Swiggy, Petrol, Groceries, Netflix"
              value={expenseNotes}
              onChange={(e) => setExpenseNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="glass" size="sm" type="button" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button
              variant="red"
              size="sm"
              type="submit"
              isLoading={loading}
              className="order-1 sm:order-2 py-2.5 font-bold shadow-glow-red"
            >
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              <span>Log Expense</span>
            </Button>
          </div>
        </form>
      )}

      {/* Session Form */}
      {activeTab === "session" && (
        <form onSubmit={handleLogSession} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Project / Topic *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Data Structures, System Design, Physics"
              value={sessionProject}
              onChange={(e) => setSessionProject(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Type
              </label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDY">Study</SelectItem>
                  <SelectItem value="PERSONAL">Personal</SelectItem>
                </SelectContent>
              </Select>
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="glass" size="sm" type="button" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit" isLoading={loading} className="order-1 sm:order-2 py-2.5 font-bold shadow-glow-red">
              Log Activity (+{Math.max(2, Math.floor((Number(sessionDuration) || 30) / 5))} XP)
            </Button>
          </div>
        </form>
      )}

      {/* Important Date Form */}
      {activeTab === "date" && (
        <form onSubmit={handleCreateDate} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Event / Date Name *
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
              <Select value={dateCategory} onValueChange={setDateCategory}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                  <SelectItem value="ANNIVERSARY">Anniversary</SelectItem>
                  <SelectItem value="BILL_DUE">Bill / Card Due</SelectItem>
                  <SelectItem value="DOCUMENT_EXPIRY">Doc Expiry</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Date *
              </label>
              <InputDate
                required
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                placeholder="Select event date..."
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="glass" size="sm" type="button" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit" isLoading={loading} className="order-1 sm:order-2 py-2.5 font-bold shadow-glow-red">
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
              Quick Love Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEFAULT_MESSAGE_TEMPLATES.map((tmpl, idx) => {
                const isSelected = messageText === tmpl.content;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setMessageText(tmpl.content);
                    }}
                    className={`text-left p-3 rounded-2xl border transition-all ${isSelected
                        ? "bg-brand-red/15 border-brand-red text-white shadow-glow-red-subtle"
                        : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-zinc-300"
                      }`}
                  >
                    <span className="font-semibold block text-white text-xs font-mono">
                      &quot;{tmpl.content}&quot;
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Message Preview / Custom Text
            </label>
            <textarea
              rows={3}
              placeholder="Type message or tap preset above..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="glass" size="sm" type="button" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button
              variant="red"
              size="sm"
              type="button"
              onClick={handleSendWhatsApp}
              disabled={!messageText}
              className="order-1 sm:order-2 py-2.5 font-bold shadow-glow-red"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send WhatsApp Message</span>
            </Button>
          </div>
        </div>
      )}

      {/* Discipline & Infraction Form */}
      {activeTab === "discipline" && (
        <form onSubmit={handleCreateDiscipline} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Action / Infraction Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDisciplineAction("UNHEALTHY_FOOD");
                  setDisciplinePoints("150");
                }}
                className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all ${disciplineAction === "UNHEALTHY_FOOD"
                    ? "bg-brand-red/20 text-white border-brand-red font-bold shadow-glow-red-subtle"
                    : "bg-white/[0.03] text-zinc-400 border-white/10"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>🍔 Ate Junk Food</span>
                  <span className="text-brand-red font-bold">-150 XP</span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Resets Clean Diet streak</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisciplineAction("FAP");
                  setDisciplinePoints("300");
                }}
                className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all ${disciplineAction === "FAP"
                    ? "bg-brand-red/20 text-white border-brand-red font-bold shadow-glow-red-subtle"
                    : "bg-white/[0.03] text-zinc-400 border-white/10"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>⚡ Relapse </span>
                  <span className="text-brand-red font-bold">-300 XP</span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Resets Purity to Day 0</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisciplineAction("CUSTOM_PENALTY");
                  setDisciplinePoints("100");
                }}
                className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all ${disciplineAction === "CUSTOM_PENALTY"
                    ? "bg-brand-red/20 text-white border-brand-red font-bold shadow-glow-red-subtle"
                    : "bg-white/[0.03] text-zinc-400 border-white/10"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>⚠️ Other Penalty</span>
                  <span className="text-brand-red font-bold">-100 XP</span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Custom infraction deduction</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDisciplineAction("CUSTOM_REWARD");
                  setDisciplinePoints("10");
                }}
                className={`p-2.5 rounded-xl border text-left font-mono text-xs transition-all ${disciplineAction === "CUSTOM_REWARD"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
                    : "bg-white/[0.03] text-zinc-400 border-white/10"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span>🌟 Habit / Deed</span>
                  <span className="text-emerald-400 font-bold">+10 XP</span>
                </div>
                <span className="text-[10px] text-zinc-500 block mt-0.5">Cold shower, reading, etc.</span>
              </button>
            </div>
          </div>

          {(disciplineAction === "CUSTOM_PENALTY" || disciplineAction === "CUSTOM_REWARD") && (
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Title / Deed *
              </label>
              <input
                type="text"
                placeholder="e.g. Skipped gym / Read 30 mins"
                value={disciplineTitle}
                onChange={(e) => setDisciplineTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Notes / Triggers (Optional)
            </label>
            <input
              type="text"
              placeholder="Context or reflection..."
              value={disciplineNotes}
              onChange={(e) => setDisciplineNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="glass" size="sm" type="button" onClick={onClose} className="order-2 sm:order-1">
              Cancel
            </Button>
            <Button
              variant={disciplineAction === "CUSTOM_REWARD" ? "glass" : "red"}
              size="sm"
              type="submit"
              disabled={loading}
              className={`order-1 sm:order-2 py-2.5 font-bold ${disciplineAction === "CUSTOM_REWARD" ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" : "shadow-glow-red"}`}
            >
              {disciplineAction === "CUSTOM_REWARD" ? "+ Award XP" : "⚡ Apply Discipline"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

