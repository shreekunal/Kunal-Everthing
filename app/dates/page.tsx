"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
} from "lucide-react";
import { haptics } from "@/lib/haptics";

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
          name,
          date: dateVal,
          category,
          repeatPattern,
          reminderDaysBefore: reminderDays,
          notes,
        }),
      });
      setName("");
      setDateVal("");
      setIsAddModalOpen(false);
      fetchDates();
    } catch (err) {
      console.error("Create date error:", err);
    }
  };

  const handleDeleteDate = async (id: string) => {
    try {
      await fetch(`/api/dates/${id}`, { method: "DELETE" });
      setDates((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Delete date error:", err);
    }
  };

  const CATEGORIES = [
    { id: "ALL", label: "All" },
    { id: "BIRTHDAY", label: "Birthdays" },
    { id: "ANNIVERSARY", label: "Anniversaries" },
    { id: "DOCUMENT_EXPIRY", label: "Documents" },
    { id: "EXAM_DEADLINE", label: "Exams & Deadlines" },
    { id: "CUSTOM", label: "Custom" },
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

  const renderDateCard = (d: any) => {
    const dueInfo = getDueStatus(d.date);
    const isUrgent = dueInfo.isOverdue || dueInfo.daysDiff <= 3;

    return (
      <Card
        key={d.id}
        glow={isUrgent ? "red" : undefined}
        className="p-5 flex flex-col justify-between group"
      >
        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-brand-red">
                {d.category === "BIRTHDAY" && <Cake className="w-4 h-4 text-brand-red" />}
                {d.category === "ANNIVERSARY" && <Heart className="w-4 h-4 text-brand-red fill-brand-red" />}
                {d.category === "DOCUMENT_EXPIRY" && <FileText className="w-4 h-4 text-white" />}
                {d.category !== "BIRTHDAY" &&
                  d.category !== "ANNIVERSARY" &&
                  d.category !== "DOCUMENT_EXPIRY" && (
                    <CalendarIcon className="w-4 h-4 text-white" />
                  )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{d.name}</h4>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {d.category} • {d.repeatPattern}
                </span>
              </div>
            </div>

            <Badge
              variant={isUrgent ? "red" : "glass"}
              size="sm"
            >
              {dueInfo.label}
            </Badge>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">Target Date:</span>
            <span className="font-bold text-white">
              {formatDate(d.date)}
            </span>
          </div>

          {d.notes && (
            <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2">
              {d.notes}
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <Bell className="w-3 h-3 text-brand-red" />
            Alerts: {d.reminderDaysBefore}d before
          </span>
          <button
            onClick={() => handleDeleteDate(d.id)}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-brand-red p-1 transition-all"
            title="Delete date"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-brand-red" />
            Important Dates & Reminders
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Central schedule for birthdays, anniversaries, document renewals, and exams
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              haptics.selection();
              setProximityView(!proximityView);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
              proximityView
                ? "bg-white/10 border-white/20 text-white"
                : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            {proximityView ? "Grouped: 30d Proximity" : "Flat View"}
          </button>
          <Button variant="red" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            <span>New Date</span>
          </Button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => {
          const count =
            cat.id === "ALL"
              ? dates.length
              : dates.filter((d) => d.category === cat.id).length;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => {
                haptics.selection();
                setSelectedCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${
                isSelected
                  ? "bg-brand-red text-white border-brand-red shadow-glow-red"
                  : "bg-white/[0.03] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
              }`}
            >
              <span>{cat.label}</span>
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

      {/* Dates Content */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500 font-mono">
          Loading scheduled dates...
        </div>
      ) : filteredDates.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-500 font-mono border border-white/5 rounded-2xl bg-white/[0.02]">
          No dates found for this category. Click &apos;New Date&apos; to schedule!
        </div>
      ) : proximityView ? (
        <div className="space-y-6">
          {/* Upcoming Next 30 Days */}
          {upcomingDates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                <h3 className="text-xs font-bold text-white tracking-wider uppercase font-mono">
                  Upcoming (Next 30 Days) — {upcomingDates.length}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingDates.map(renderDateCard)}
              </div>
            </div>
          )}

          {/* Later Dates */}
          {laterDates.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <h3 className="text-xs font-bold text-zinc-400 tracking-wider uppercase font-mono">
                  Later & Future Dates — {laterDates.length}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {laterDates.map(renderDateCard)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDates.map(renderDateCard)}
        </div>
      )}

      {/* New Date Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Important Date"
      >
        <form onSubmit={handleCreateDate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Passport Expiry, Car Insurance, Mom Birthday"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              >
                <option value="BIRTHDAY" className="bg-black text-white">Birthday</option>
                <option value="ANNIVERSARY" className="bg-black text-white">Anniversary</option>
                <option value="DOCUMENT_EXPIRY" className="bg-black text-white">Document Expiry</option>
                <option value="BILL_DUE" className="bg-black text-white">Bill Due Date</option>
                <option value="EXAM" className="bg-black text-white">Exam / Assessment</option>
                <option value="CUSTOM" className="bg-black text-white">Custom Event</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Repeat Pattern
              </label>
              <select
                value={repeatPattern}
                onChange={(e) => setRepeatPattern(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              >
                <option value="YEARLY" className="bg-black text-white">Every Year</option>
                <option value="MONTHLY" className="bg-black text-white">Every Month</option>
                <option value="ONCE" className="bg-black text-white">One-time only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
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
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Reminder Triggers (Days before)
              </label>
              <input
                type="text"
                value={reminderDays}
                onChange={(e) => setReminderDays(e.target.value)}
                placeholder="14,7,1,0"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Any key details or reminders..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
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
    </div>
  );
}
