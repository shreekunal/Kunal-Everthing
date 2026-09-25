"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  BookOpen,
  Heart,
  Sparkles,
  Calendar,
  Star,
  Send,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  RotateCcw,
  Droplets,
  Clock,
  CheckSquare,
  Flame,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import clsx from "clsx";

const MAX_CHAR_LIMIT = 1000;

const MOOD_OPTIONS = [
  { label: "Loved", emoji: "🥰", color: "from-rose-500/20 to-pink-500/20 border-rose-500/40 text-rose-300" },
  { label: "Productive", emoji: "⚡", color: "from-amber-500/20 to-yellow-500/20 border-amber-500/40 text-amber-300" },
  { label: "Peaceful", emoji: "🧘", color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300" },
  { label: "Grateful", emoji: "🙏", color: "from-purple-500/20 to-indigo-500/20 border-purple-500/40 text-purple-300" },
  { label: "Unstoppable", emoji: "🔥", color: "from-red-500/20 to-orange-500/20 border-red-500/40 text-red-300" },
  { label: "Reflective", emoji: "🤔", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-blue-300" },
  { label: "Exhausted", emoji: "😴", color: "from-zinc-500/20 to-slate-500/20 border-zinc-500/40 text-zinc-300" },
];

export default function DailyDiaryPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form State: Mood, Rating, Single Writing Section & Telemetry
  const [mood, setMood] = useState("Loved");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [telemetrySnapshot, setTelemetrySnapshot] = useState<any>(null);

  // Data & History
  const [pastEntries, setPastEntries] = useState<any[]>([]);
  const [partner, setPartner] = useState<any>(null);
  const [todayLiveTelemetry, setTodayLiveTelemetry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Export / Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const diaryCardRef = useRef<HTMLDivElement>(null);

  // Expanded past entries
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchDiaryData = useCallback(async (dateToFetch: string) => {
    try {
      const [diaryRes, partnerRes] = await Promise.all([
        fetch("/api/diary"),
        fetch("/api/partner/progress"),
      ]);

      if (diaryRes.ok) {
        const dJson = await diaryRes.json();
        setPastEntries(dJson.entries || []);
        if (dJson.todayTelemetry) {
          setTodayLiveTelemetry(dJson.todayTelemetry);
        }

        // Check if there is an entry for the currently selected date
        const match = (dJson.entries || []).find((e: any) => e.date === dateToFetch);
        if (match) {
          setMood(match.mood || "Loved");
          setRating(match.rating || 5);
          // Prefer content; fallback to legacy highlights/partnerNote if present
          const existingText = match.content || match.highlights || match.partnerNote || "";
          setContent(existingText.slice(0, MAX_CHAR_LIMIT));
          setTelemetrySnapshot(match.telemetry);
        } else {
          // Reset form for fresh entry
          setMood("Loved");
          setRating(5);
          setContent("");
          setTelemetrySnapshot(null);
        }
      }

      if (partnerRes.ok) {
        const pJson = await partnerRes.json();
        if (pJson.partner) {
          setPartner(pJson.partner);
        }
      }
    } catch (err) {
      console.error("Failed to load diary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiaryData(selectedDate);
  }, [fetchDiaryData, selectedDate]);

  const handleDateChange = (newDate: string) => {
    haptics.selection();
    setSelectedDate(newDate);
    setShowDatePicker(false);
    fetchDiaryData(newDate);
  };

  const handlePullTelemetry = () => {
    haptics.impactMedium();
    if (todayLiveTelemetry) {
      setTelemetrySnapshot(todayLiveTelemetry);
      haptics.success();
    }
  };

  // Quick water increment/decrement
  const handleAdjustWater = async (delta: number) => {
    haptics.selection();
    const currentGlasses =
      telemetrySnapshot?.waterGlasses ?? todayLiveTelemetry?.waterGlasses ?? 0;
    const newCount = Math.max(0, currentGlasses + delta);

    // Update local telemetry state immediately for responsive UI
    const updatedTelemetry = {
      ...(telemetrySnapshot || todayLiveTelemetry || {}),
      waterGlasses: newCount,
    };
    setTelemetrySnapshot(updatedTelemetry);
    setTodayLiveTelemetry((prev: any) => ({ ...(prev || {}), waterGlasses: newCount }));

    try {
      await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: newCount, target: 8, date: selectedDate }),
      });
    } catch (err) {
      console.error("Failed to sync water:", err);
    }
  };

  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    haptics.selection();

    const activeTelemetry = telemetrySnapshot || todayLiveTelemetry;

    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          mood,
          rating,
          content: content.trim().slice(0, MAX_CHAR_LIMIT),
          telemetry: activeTelemetry,
        }),
      });

      if (res.ok) {
        haptics.success();
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        fetchDiaryData(selectedDate);
      }
    } catch (err) {
      console.error("Failed to save diary:", err);
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiary = async (id: string) => {
    haptics.warning();
    try {
      const res = await fetch(`/api/diary?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        haptics.success();
        fetchDiaryData(selectedDate);
      }
    } catch (err) {
      console.error("Failed to delete diary:", err);
      haptics.error();
    }
  };

  const partnerNickname = partner?.nickname || partner?.name || "Partner";
  const activeTelemetry = telemetrySnapshot || todayLiveTelemetry;
  const studyMins = activeTelemetry?.studyMinutes || 0;
  const waterCount = activeTelemetry?.waterGlasses || 0;

  // Generate WhatsApp formatted text with study & water details
  const generateWhatsAppMessage = () => {
    let msg = `Daily Diary & Update • ${format(new Date(selectedDate), "EEEE, MMMM d")} ❤️\n`;
    msg += `⭐ Rating: ${rating}/5 • Mood: ${mood}\n\n`;
    msg += `📊 Discipline:\n`;
    msg += `⏱️ Study / Focus: ${formatDuration(studyMins)}\n`;
    msg += `💧 Water Hydration: ${waterCount} glasses (${waterCount * 250}ml)\n`;
    if (activeTelemetry?.tasksCompleted || activeTelemetry?.habitsDone) {
      msg += `✅ Tasks Done: ${activeTelemetry?.tasksCompleted || 0} | 🔥 Habits: ${activeTelemetry?.habitsDone || 0}\n`;
    }

    if (content.trim()) {
      msg += `\n📝 Reflection & Note:\n"${content.trim()}"\n`;
    }

    msg += `\nAlways in my heart! 💕`;
    return msg;
  };

  // 1-Tap WhatsApp Share
  const handleSendToPartnerWhatsApp = () => {
    haptics.impactMedium();
    const cleanPhone = (partner?.phone || "").replace(/[^0-9]/g, "");
    const message = generateWhatsAppMessage();
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  // Export Letter Card as PNG Image
  const handleExportLetterCard = async () => {
    if (!diaryCardRef.current) return;
    setIsExporting(true);
    setShareStatus(null);
    haptics.selection();

    try {
      const dataUrl = await toPng(diaryCardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#09090b",
      });

      const fileName = `KunalOS-Diary-${selectedDate}.png`;
      const partnerMessage = generateWhatsAppMessage();

      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.split(",")[1];
        const fileResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        const canShare = await Share.canShare();
        if (canShare.value) {
          await Share.share({
            title: `Daily Diary Letter • ${selectedDate}`,
            text: partnerMessage,
            url: fileResult.uri,
            dialogTitle: `Send Diary to ${partnerNickname}`,
          });
          haptics.success();
          setShareStatus({ text: `Diary letter sent to ${partnerNickname}!` });
        } else {
          setShareStatus({ text: `Letter image saved: ${fileName}` });
          haptics.success();
        }
      } else {
        // Web Platform: Try Web Share API
        let shared = false;
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Daily Diary Letter for ${partnerNickname}`,
              text: partnerMessage,
            });
            shared = true;
            haptics.success();
            setShareStatus({ text: `Diary sent to ${partnerNickname}!` });
          }
        } catch {}

        if (!shared) {
          // Direct image download + WhatsApp link
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();

          const cleanPhone = (partner?.phone || "").replace(/[^0-9]/g, "");
          const whatsappUrl = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(partnerMessage)}`
            : `https://wa.me/?text=${encodeURIComponent(partnerMessage)}`;

          window.open(whatsappUrl, "_blank");
          haptics.success();
          setShareStatus({ text: `Card downloaded & WhatsApp opened for ${partnerNickname}!` });
        }
      }
    } catch (err: any) {
      console.error("Diary export failed:", err);
      haptics.warning();
      setShareStatus({ text: "Failed to export card image", error: true });
    } finally {
      setIsExporting(false);
    }
  };

  const activeMoodObj = MOOD_OPTIONS.find((m) => m.label === mood) || MOOD_OPTIONS[0];
  const charLength = content.length;
  const isNearLimit = charLength >= MAX_CHAR_LIMIT * 0.85;
  const isAtLimit = charLength >= MAX_CHAR_LIMIT;

  return (
    <div className="space-y-6 pb-14 animate-in fade-in duration-300">
      {/* Top Navigation & Date Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wider">
              Daily Diary &amp; Partner Letter
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Single note reflection • Study &amp; Hydration Sharing
            </p>
          </div>
        </div>

        {/* Date Selector Chips */}
        <div className="flex items-center gap-1.5 self-stretch sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { label: "Today", date: format(new Date(), "yyyy-MM-dd") },
            { label: "Yesterday", date: format(subDays(new Date(), 1), "yyyy-MM-dd") },
            { label: "2d Ago", date: format(subDays(new Date(), 2), "yyyy-MM-dd") },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => handleDateChange(item.date)}
              className={clsx(
                "px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all active:scale-95 shrink-0",
                selectedDate === item.date && !showDatePicker
                  ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] font-bold"
                  : "bg-white/[0.04] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              haptics.selection();
              setShowDatePicker(!showDatePicker);
            }}
            className={clsx(
              "px-3 py-1.5 rounded-xl text-xs font-mono border transition-all flex items-center gap-1.5 shrink-0",
              showDatePicker ||
                (selectedDate !== format(new Date(), "yyyy-MM-dd") &&
                  selectedDate !== format(subDays(new Date(), 1), "yyyy-MM-dd") &&
                  selectedDate !== format(subDays(new Date(), 2), "yyyy-MM-dd"))
                ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] font-bold"
                : "bg-white/[0.04] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{selectedDate}</span>
          </button>
        </div>
      </div>

      {/* Custom Date Input */}
      {showDatePicker && (
        <div className="p-3 bg-zinc-950 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">
            Select Diary Entry Date:
          </label>
          <input
            type="date"
            max={format(new Date(), "yyyy-MM-dd")}
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
          />
        </div>
      )}

      {/* Main Diary Writing Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: The Editor Form */}
        <Card glow="rose" className="lg:col-span-2 p-4 sm:p-6 bg-zinc-950/90 border-white/10">
          <form onSubmit={handleSaveDiary} className="space-y-5">
            {/* Header: Date + XP reward chip */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  Entry for {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>+25 XP Reflection Yield</span>
              </span>
            </div>

            {/* 1. Mood Vibe Selector */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                How did today feel? (Mood Vibe)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MOOD_OPTIONS.map((m) => {
                  const isSelected = mood === m.label;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setMood(m.label);
                      }}
                      className={clsx(
                        "py-2 px-2.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all active:scale-95",
                        isSelected
                          ? `bg-gradient-to-r ${m.color} shadow-glow font-bold border-white/30 scale-[1.02]`
                          : "bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/15 hover:text-white"
                      )}
                    >
                      <span className="text-base">{m.emoji}</span>
                      <span className="truncate">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive Day Rating (1 to 5 Stars) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Day Rating
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {rating} of 5 Stars
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= rating;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => {
                        haptics.impactLight();
                        setRating(starVal);
                      }}
                      className="p-1 text-zinc-600 hover:text-amber-400 transition-transform active:scale-125"
                    >
                      <Star
                        className={clsx(
                          "w-6 h-6 transition-all",
                          isFilled
                            ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                            : "text-zinc-600"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Study & Water Details Snapshot */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-brand-red" />
                  <span className="text-[11px] font-mono text-zinc-200 uppercase font-bold tracking-wider">
                    Today&apos;s Study &amp; Hydration Progress
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handlePullTelemetry}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/10 text-[10px] font-mono text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1 active:scale-95"
                  title="Pull live metrics from today's logs"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Sync Metrics</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Study Time Metric Card */}
                <div className="p-3 rounded-xl bg-purple-500/[0.06] border border-purple-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-purple-300 block font-semibold">
                        Study &amp; Focus
                      </span>
                      <span className="text-sm font-mono font-bold text-white">
                        {formatDuration(studyMins)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/progress"
                    className="text-[10px] font-mono text-purple-400 hover:underline px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20"
                  >
                    Log Study →
                  </Link>
                </div>

                {/* Water Intake Metric Card with Quick Adjust */}
                <div className="p-3 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-cyan-300 block font-semibold">
                        Water Hydration
                      </span>
                      <span className="text-sm font-mono font-bold text-white">
                        {waterCount} Glasses <span className="text-[10px] text-zinc-400">({waterCount * 250}ml)</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustWater(-1)}
                      className="p-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all active:scale-95"
                      title="Minus 1 glass"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustWater(1)}
                      className="p-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-200 border border-cyan-500/40 font-bold transition-all active:scale-95"
                      title="Add 1 glass"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Single Unified Writing Section with Character Limit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-mono text-zinc-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <span>✍️ Today&apos;s Diary &amp; Reflection Note</span>
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors",
                      isAtLimit
                        ? "bg-red-500/20 text-red-300 border-red-500/40 font-bold"
                        : isNearLimit
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-white/5 text-zinc-400 border-white/10"
                    )}
                  >
                    {charLength} / {MAX_CHAR_LIMIT} chars
                  </span>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={8}
                  maxLength={MAX_CHAR_LIMIT}
                  placeholder={`Write your daily journal, thoughts, key wins, reflections, or note for ${partnerNickname}... (Max ${MAX_CHAR_LIMIT} characters)`}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/15 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-sans leading-relaxed resize-y transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Concise daily entries keep your database fast and lightweight for years.
              </p>
            </div>

            {/* Actions: Save & Share */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  variant="red"
                  size="sm"
                  disabled={saving}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Diary Entry"}</span>
                </Button>

                {savedSuccess && (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share with {partnerNickname}</span>
                </button>
              </div>
            </div>
          </form>
        </Card>

        {/* Right 1 Col: Letter Preview & History */}
        <div className="space-y-6">
          {/* Aesthetic Letter Card Live Preview */}
          <Card glow="rose" className="p-4 bg-black/95 border-purple-500/30">
            <CardHeader className="p-0 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500/20" />
                  <CardTitle className="text-xs uppercase font-mono tracking-wider">
                    Partner Letter Preview
                  </CardTitle>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {format(new Date(selectedDate), "d MMM yyyy")}
                </span>
              </div>
            </CardHeader>

            <div className="mt-3.5 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold bg-white/[0.05] border border-white/10 text-white flex items-center gap-1.5">
                  <span>{activeMoodObj.emoji}</span>
                  <span>{mood}</span>
                </span>
                <span className="text-amber-400 font-mono text-xs">
                  {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                </span>
              </div>

              {/* Telemetry in Preview */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <div>
                    <span className="text-zinc-400 block text-[9px]">Study / Focus</span>
                    <span className="text-white font-bold">{formatDuration(studyMins)}</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-zinc-400 block text-[9px]">Hydration</span>
                    <span className="text-white font-bold">{waterCount} Glasses</span>
                  </div>
                </div>
              </div>

              {/* Written Reflection Note */}
              {content.trim() ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200">
                  <span className="text-[10px] text-rose-400 font-mono uppercase block font-bold mb-1">
                    💌 Reflection &amp; Message:
                  </span>
                  <p className="font-serif italic text-white/90 text-sm leading-relaxed whitespace-pre-line line-clamp-6">
                    &ldquo;{content.trim()}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center text-zinc-500 text-[11px] font-mono">
                  Write your daily reflection on the left to preview the letter here!
                </div>
              )}

              {/* Quick WhatsApp Share Button */}
              <button
                type="button"
                onClick={handleSendToPartnerWhatsApp}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Letter on WhatsApp</span>
              </button>
            </div>
          </Card>

          {/* Past Memories & Timeline */}
          <Card className="p-4 bg-zinc-950/80 border-white/10">
            <CardHeader className="p-0 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  <CardTitle className="text-xs uppercase font-mono tracking-wider">
                    Past Diary Entries
                  </CardTitle>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {pastEntries.length} reflections
                </span>
              </div>
            </CardHeader>

            <div className="mt-3 divide-y divide-white/5 max-h-80 overflow-y-auto space-y-1">
              {pastEntries.length === 0 ? (
                <p className="text-center py-6 text-xs text-zinc-500 font-mono">
                  No diary entries yet. Write today&apos;s first reflection above!
                </p>
              ) : (
                pastEntries.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isCurrent = item.date === selectedDate;
                  const entryText = item.content || item.highlights || item.partnerNote || "";
                  return (
                    <div key={item.id} className="py-2">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleDateChange(item.date)}
                          className="flex items-center gap-2 text-left min-w-0 flex-1 hover:opacity-80 transition-opacity"
                        >
                          <span
                            className={clsx(
                              "text-xs font-mono font-bold",
                              isCurrent ? "text-rose-400" : "text-white"
                            )}
                          >
                            {format(new Date(item.date), "d MMM yyyy")}
                          </span>
                          <span className="text-[11px] text-zinc-400 truncate">
                            {item.mood}
                          </span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 text-[10px] font-mono font-bold">
                            ★{item.rating}
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                            className="p-1 text-zinc-500 hover:text-zinc-300"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5 text-xs text-zinc-300 animate-in fade-in duration-150">
                          {entryText && (
                            <p className="text-[11px] text-zinc-200 italic leading-relaxed">
                              &ldquo;{entryText}&rdquo;
                            </p>
                          )}
                          {item.telemetry && (
                            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 pt-1">
                              <span>⏱️ {formatDuration(item.telemetry.studyMinutes || 0)}</span>
                              <span>💧 {item.telemetry.waterGlasses || 0} glasses</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <button
                              type="button"
                              onClick={() => handleDateChange(item.date)}
                              className="text-[10px] font-mono text-rose-400 hover:underline"
                            >
                              Edit Entry
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDiary(item.id)}
                              className="text-[10px] font-mono text-zinc-500 hover:text-rose-400"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Share to Partner Modal & Printable Letter Card */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Send Diary Letter to {partnerNickname}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aesthetic Printable Letter Card */}
            <div className="my-4 flex justify-center">
              <div
                ref={diaryCardRef}
                className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-5 border border-rose-500/30 text-white shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden font-sans"
              >
                {/* Background Glow Accents */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Letter Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activeMoodObj.emoji}</span>
                    <div>
                      <span className="text-xs font-bold font-mono tracking-wide block">
                        Daily Diary Letter
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="text-amber-400 text-xs font-mono">
                    {"★".repeat(rating)}
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-4 space-y-3 relative z-10 text-xs">
                  {/* Telemetry Snapshot in Letter */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 grid grid-cols-2 gap-2 text-center font-mono text-[10px]">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <span className="text-purple-300 block text-[9px] uppercase font-semibold">Study / Focus</span>
                      <span className="text-white font-bold text-xs">{formatDuration(studyMins)}</span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-cyan-300 block text-[9px] uppercase font-semibold">Hydration</span>
                      <span className="text-cyan-200 font-bold text-xs">{waterCount} Glasses</span>
                    </div>
                  </div>

                  {content.trim() && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200">
                      <span className="text-[9px] font-mono text-rose-400 uppercase font-bold block mb-1">
                        💌 Note for You, {partnerNickname}:
                      </span>
                      <p className="font-serif italic text-white/95 text-sm leading-relaxed whitespace-pre-line">
                        &ldquo;{content.trim()}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Letter Footer */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-500 relative z-10">
                  <span>KunalOS • Discipline &amp; Love</span>
                  <span>Always with You ❤️</span>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            {shareStatus && (
              <div
                className={clsx(
                  "mb-3 p-2.5 rounded-xl text-xs font-mono text-center flex items-center justify-center gap-2",
                  shareStatus.error
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{shareStatus.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleSendToPartnerWhatsApp}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                <Send className="w-4 h-4" />
                <span>WhatsApp Message</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportLetterCard}
                className="py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
              >
                <Download className="w-4 h-4" />
                <span>{isExporting ? "Generating..." : "Export Card PNG"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
