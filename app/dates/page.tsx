"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InputDate } from "@/components/ui/InputDate";
import { formatDate, getDueStatus } from "@/lib/formatters";
import {
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Bell,
  Cake,
  Heart,
  FileText,
  Clock,
  Sparkles,
  Repeat,
  AlertCircle,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DatesPage() {
  const [dates, setDates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [proximityView, setProximityView] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [category, setCategory] = useState("CUSTOM");
  const [repeatPattern, setRepeatPattern] = useState("YEARLY");
  const [reminderDays, setReminderDays] = useState("14,7,1,0");
  const [notes, setNotes] = useState("");

  // Delete state
  const [dateToDelete, setDateToDelete] = useState<any | null>(null);
  const [isDeletingDate, setIsDeletingDate] = useState(false);

  const fetchDates = async () => {
    try {
      const res = await fetch("/api/dates");
      if (res.ok) {
        const json = await res.json();
        setDates(json.dates || []);
      }
    } catch (err) {
      console.error("Fetch dates error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDates();
  }, []);

  const handleCreateDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dateVal) return;

    try {
      await fetch("/api/dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date: dateVal,
          category,
          repeatPattern,
          reminderDaysBefore: reminderDays,
          notes: notes ? notes.trim() : null,
        }),
      });
      haptics.success();
      setName("");
      setDateVal("");
      setNotes("");
      setIsAddModalOpen(false);
      fetchDates();
    } catch (err) {
      console.error("Create date error:", err);
    }
  };

  const handleExecuteDeleteDate = async () => {
    if (!dateToDelete) return;
    setIsDeletingDate(true);
    haptics.warning();
    try {
      await fetch(`/api/dates/${dateToDelete.id}`, { method: "DELETE" });
      setDates((prev) => prev.filter((d) => d.id !== dateToDelete.id));
      setDateToDelete(null);
    } catch (err) {
      console.error("Delete date error:", err);
    } finally {
      setIsDeletingDate(false);
    }
  };

  const CATEGORIES = [
    { id: "ALL", label: "All", icon: Sparkles },
    { id: "BIRTHDAY", label: "Birthdays", icon: Cake },
    { id: "ANNIVERSARY", label: "Anniversaries", icon: Heart },
    { id: "DOCUMENT_EXPIRY", label: "Docs", icon: FileText },
    { id: "BILL_DUE", label: "Bills", icon: Bell },
    { id: "CUSTOM", label: "Custom", icon: CalendarIcon },
  ];

  const filteredDates = dates.filter((d) => {
    if (selectedCategory === "ALL") return true;
    return d.category === selectedCategory;
  });

  const upcomingDates = filteredDates.filter((d) => {
    const dueInfo = getDueStatus(d.date);
    return dueInfo.isOverdue || (dueInfo.daysDiff >= 0 && dueInfo.daysDiff <= 30);
  });

  const laterDates = filteredDates.filter((d) => {
    const dueInfo = getDueStatus(d.date);
    return !dueInfo.isOverdue && dueInfo.daysDiff > 30;
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "BIRTHDAY":
        return <Cake className="w-4 h-4 text-brand-red" />;
      case "ANNIVERSARY":
        return <Heart className="w-4 h-4 text-brand-red fill-brand-red" />;
      case "DOCUMENT_EXPIRY":
        return <FileText className="w-4 h-4 text-amber-400" />;
      case "BILL_DUE":
        return <Bell className="w-4 h-4 text-red-400" />;
      default:
        return <CalendarIcon className="w-4 h-4 text-zinc-300" />;
    }
  };

  const renderDateCard = (d: any) => {
    const dueInfo = getDueStatus(d.date);
    const isUrgent = dueInfo.isOverdue || dueInfo.daysDiff <= 3;
    const isWarning = dueInfo.daysDiff > 3 && dueInfo.daysDiff <= 14;

    return (
      <div
        key={d.id}
        className={`p-4 rounded-2xl border transition-all ${
          isUrgent
            ? "bg-red-500/[0.04] border-red-500/30 shadow-glow-red-subtle"
            : isWarning
            ? "bg-amber-500/[0.02] border-amber-500/20"
            : "bg-white/[0.03] border-white/10 hover:border-white/20"
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Category Avatar */}
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center flex-shrink-0">
            {getCategoryIcon(d.category)}
          </div>

          <div className="min-w-0 flex-1">
            {/* Header: Title & Due Status Pill */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{d.name}</h4>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-zinc-500 font-mono">
                  <span>{d.category}</span>
                  <span>•</span>
                  <span>{d.repeatPattern}</span>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${
                  dueInfo.isOverdue
                    ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                    : dueInfo.isToday
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold"
                    : isUrgent
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                    : "bg-white/[0.04] border-white/10 text-zinc-300"
                }`}
              >
                {dueInfo.label}
              </span>
            </div>

            {/* Target Date Box */}
            <div className="mt-2.5 px-3 py-2 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500 text-[11px]">Event Date:</span>
              <span className="font-bold text-white">{formatDate(d.date)}</span>
            </div>

            {d.notes && (
              <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                {d.notes}
              </p>
            )}

            {/* Bottom Meta & Delete */}
            <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1 text-zinc-400 text-[10px]">
                <Bell className="w-3 h-3 text-brand-red" />
                <span>Alerts: {d.reminderDaysBefore}d before</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  haptics.warning();
                  setDateToDelete(d);
                }}
                className="p-1.5 text-zinc-500 hover:text-brand-red active:scale-90 transition-colors"
                aria-label="Delete Date"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-20 sm:pb-6">
      {/* Mobile-Optimized Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-red" />
            Important Dates & Reminders
          </h2>
          <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
            {upcomingDates.length} upcoming in next 30 days • {dates.length} total scheduled
          </p>
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

      {/* Proximity View Mode Toggle */}
      <div className="flex items-center justify-between gap-2 p-1 bg-black/80 border border-white/10 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setProximityView(true);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            proximityView
              ? "bg-brand-red text-white font-bold shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          📅 Next 30 Days Focus
        </button>
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setProximityView(false);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
            !proximityView
              ? "bg-brand-red text-white font-bold shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          All Scheduled ({dates.length})
        </button>
      </div>

      {/* Category Filter Row (No Horizontal Scroller) */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Event Type:</span>
        </div>

        <Select
          value={selectedCategory}
          onValueChange={(val) => {
            haptics.selection();
            setSelectedCategory(val);
          }}
        >
          <SelectTrigger className="w-[170px] h-8 bg-black/80 rounded-xl border-white/10 text-xs font-mono">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent align="end">
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.label} (
                {cat.id === "ALL"
                  ? dates.length
                  : dates.filter((d) => d.category === cat.id).length}
                )
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dates Feed */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500 font-mono">
          Loading scheduled dates...
        </div>
      ) : filteredDates.length === 0 ? (
        <div className="p-10 text-center text-xs text-zinc-500 font-mono bg-white/[0.02] border border-white/5 rounded-2xl">
          No dates found in this category. Tap &apos;+ New&apos; to schedule!
        </div>
      ) : proximityView ? (
        <div className="space-y-4">
          {/* Upcoming Next 30 Days */}
          {upcomingDates.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                  Upcoming Within 30 Days ({upcomingDates.length})
                </h3>
              </div>
              <div className="space-y-2.5">{upcomingDates.map(renderDateCard)}</div>
            </div>
          )}

          {/* Later Dates */}
          {laterDates.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center gap-2 px-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-mono">
                  Later Dates ({laterDates.length})
                </h3>
              </div>
              <div className="space-y-2.5">{laterDates.map(renderDateCard)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">{filteredDates.map(renderDateCard)}</div>
      )}

      {/* New Date Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Important Date"
      >
        <form onSubmit={handleCreateDate} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Passport Renewal, Car Insurance, Birthday"
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
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIRTHDAY">Birthday</SelectItem>
                  <SelectItem value="ANNIVERSARY">Anniversary</SelectItem>
                  <SelectItem value="DOCUMENT_EXPIRY">Doc Expiry</SelectItem>
                  <SelectItem value="BILL_DUE">Bill Due Date</SelectItem>
                  <SelectItem value="EXAM">Exam / Assessment</SelectItem>
                  <SelectItem value="CUSTOM">Custom Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Repeat Pattern
              </label>
              <Select value={repeatPattern} onValueChange={setRepeatPattern}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Repeat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YEARLY">Every Year</SelectItem>
                  <SelectItem value="MONTHLY">Every Month</SelectItem>
                  <SelectItem value="ONCE">One-time only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Date *
              </label>
              <InputDate
                required
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                placeholder="Select date..."
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Alert Days Before
              </label>
              <input
                type="text"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                placeholder="14,7,1,0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Any key details or reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red"
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
              Save Event
            </Button>
          </div>
        </form>
      </Modal>

      {/* Date Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(dateToDelete)}
        onClose={() => setDateToDelete(null)}
        onConfirm={handleExecuteDeleteDate}
        isLoading={isDeletingDate}
        title="Delete Important Date"
        message={`Are you sure you want to delete "${dateToDelete?.name}"? All recurring alerts for this date will be cancelled.`}
        confirmText="Delete Date"
        confirmVariant="red"
        iconType="danger"
      />
    </div>
  );
}
