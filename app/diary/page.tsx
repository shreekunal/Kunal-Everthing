"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  BookOpen,
  Heart,
  Sparkles,
  Calendar,
  Send,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  Droplets,
  Clock,
  X,
  ChevronRight,
  Edit3,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import clsx from "clsx";

const MAX_CHAR_LIMIT = 1000;

export default function DailyDiaryPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form State: Single Writing Section & Telemetry
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
          const existingText = match.content || match.highlights || match.partnerNote || "";
          setContent(existingText.slice(0, MAX_CHAR_LIMIT));
          setTelemetrySnapshot(match.telemetry);
        } else {
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

  // Quick water increment/decrement
  const handleAdjustWater = async (delta: number) => {
    haptics.selection();
    const currentGlasses =
      telemetrySnapshot?.waterGlasses ?? todayLiveTelemetry?.waterGlasses ?? 0;
    const newCount = Math.max(0, currentGlasses + delta);

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

  // Generate clean WhatsApp message
  const generateWhatsAppMessage = () => {
    let msg = `Daily Diary & Update • ${format(new Date(selectedDate), "EEEE, MMMM d")} ❤️\n\n`;
    msg += `📊 Discipline:\n`;
    msg += `⏱️ Study / Focus: ${formatDuration(studyMins)}\n`;
    msg += `💧 Hydration: ${waterCount} glasses (${waterCount * 250}ml)\n`;
    if (activeTelemetry?.tasksCompleted || activeTelemetry?.habitsDone) {
      msg += `✅ Tasks: ${activeTelemetry?.tasksCompleted || 0} done | 🔥 Habits: ${activeTelemetry?.habitsDone || 0} done\n`;
    }

    if (content.trim()) {
      msg += `\n📝 Note:\n"${content.trim()}"\n`;
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
            title: `Daily Diary • ${selectedDate}`,
            text: partnerMessage,
            url: fileResult.uri,
            dialogTitle: `Send Diary to ${partnerNickname}`,
          });
          haptics.success();
          setShareStatus({ text: `Diary sent to ${partnerNickname}!` });
        } else {
          setShareStatus({ text: `Card image saved: ${fileName}` });
          haptics.success();
        }
      } else {
        let shared = false;
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Daily Diary for ${partnerNickname}`,
              text: partnerMessage,
            });
            shared = true;
            haptics.success();
            setShareStatus({ text: `Diary sent to ${partnerNickname}!` });
          }
        } catch {}

        if (!shared) {
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
          setShareStatus({ text: `Downloaded card & opened WhatsApp!` });
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

  const charLength = content.length;
  const isNearLimit = charLength >= MAX_CHAR_LIMIT * 0.85;
  const isAtLimit = charLength >= MAX_CHAR_LIMIT;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 pb-28 px-1 animate-in fade-in duration-300">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-mono tracking-wide">
              Daily Diary
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">
              Reflection &amp; Daily Log
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>+25 XP</span>
        </span>
      </div>

      {/* Mobile Scrollable Date Selector */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
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
              "px-3.5 py-2 rounded-xl text-xs font-mono font-medium border transition-all active:scale-95 shrink-0 min-h-[38px]",
              selectedDate === item.date && !showDatePicker
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)] font-bold"
                : "bg-white/[0.03] text-zinc-400 border-white/5 hover:text-white"
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
            "px-3.5 py-2 rounded-xl text-xs font-mono border transition-all flex items-center gap-1.5 shrink-0 min-h-[38px]",
            showDatePicker ||
              (selectedDate !== format(new Date(), "yyyy-MM-dd") &&
                selectedDate !== format(subDays(new Date(), 1), "yyyy-MM-dd") &&
                selectedDate !== format(subDays(new Date(), 2), "yyyy-MM-dd"))
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)] font-bold"
              : "bg-white/[0.03] text-zinc-400 border-white/5 hover:text-white"
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{selectedDate}</span>
        </button>
      </div>

      {/* Custom Date Input */}
      {showDatePicker && (
        <div className="p-3 bg-zinc-950 border border-white/10 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1.5">
            Select Date:
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

      {/* Main Journal Canvas Card */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-2xl shadow-glass-panel space-y-4">
        {/* Date Label */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
          </span>
        </div>

        {/* Sleek Mobile Metrics Row (Study & Water) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Study / Focus Pill */}
          <Link
            href="/progress"
            className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-purple-500/30 transition-all flex flex-col justify-between gap-1 active:scale-98"
          >
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="mt-1">
              <span className="text-[9px] font-mono uppercase text-zinc-400 block font-medium">
                Study &amp; Focus
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {formatDuration(studyMins)}
              </span>
            </div>
          </Link>

          {/* Water Intake Pill with Quick +/- Buttons */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustWater(-1)}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/5 flex items-center justify-center transition-all active:scale-90"
                  title="Minus 1 glass"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustWater(1)}
                  className="w-7 h-7 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-bold transition-all active:scale-90"
                  title="Add 1 glass"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="mt-1">
              <span className="text-[9px] font-mono uppercase text-zinc-400 block font-medium">
                Hydration
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {waterCount} <span className="text-xs font-normal text-zinc-400">gl</span>{" "}
                <span className="text-[10px] text-zinc-500 font-normal">
                  ({waterCount * 250}ml)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Single Writing Section Form */}
        <form onSubmit={handleSaveDiary} className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Edit3 className="w-3 h-3 text-rose-400" />
                <span>Reflection &amp; Note</span>
              </label>

              <span
                className={clsx(
                  "text-[9px] font-mono px-2 py-0.5 rounded-full border transition-colors",
                  isAtLimit
                    ? "bg-red-500/20 text-red-300 border-red-500/40 font-bold"
                    : isNearLimit
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-white/5 text-zinc-400 border-white/10"
                )}
              >
                {charLength} / {MAX_CHAR_LIMIT}
              </span>
            </div>

            <textarea
              rows={8}
              maxLength={MAX_CHAR_LIMIT}
              placeholder={`Write freely about your day, wins, learnings, or notes for ${partnerNickname}...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 font-sans leading-relaxed resize-y transition-all"
            />
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all min-h-[44px]"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Entry"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              className="py-3 px-3.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 active:scale-98 text-purple-300 border border-purple-500/30 text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
              title={`Share with ${partnerNickname}`}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </form>
      </div>

      {/* Past Diary Entries Timeline (Mobile First with generous spacing) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/70 border border-white/[0.08] space-y-3">
        {/* Header with clear spacing so Title and Count NEVER touch */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">
              Past Diary Entries
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/5">
            {pastEntries.length} {pastEntries.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {/* Entries List */}
        <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
          {pastEntries.length === 0 ? (
            <p className="text-center py-6 text-xs text-zinc-500 font-mono">
              No previous entries found. Write your first reflection above!
            </p>
          ) : (
            pastEntries.map((item) => {
              const isCurrent = item.date === selectedDate;
              const entryText = item.content || item.highlights || item.partnerNote || "";

              return (
                <div
                  key={item.id}
                  className={clsx(
                    "py-3 px-2 rounded-2xl transition-colors flex items-start justify-between gap-3",
                    isCurrent ? "bg-rose-500/[0.05]" : "hover:bg-white/[0.02]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleDateChange(item.date)}
                    className="min-w-0 flex-1 text-left active:opacity-70"
                  >
                    <span
                      className={clsx(
                        "text-xs font-mono font-bold block",
                        isCurrent ? "text-rose-400" : "text-white"
                      )}
                    >
                      {format(new Date(item.date), "EEE, d MMM yyyy")}
                    </span>

                    {entryText && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                        &ldquo;{entryText}&rdquo;
                      </p>
                    )}
                  </button>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleDateChange(item.date)}
                      className="text-[11px] font-mono text-rose-400 hover:text-rose-300 p-1"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDiary(item.id)}
                      className="p-1 rounded-lg text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Mobile Share & Export Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Send to {partnerNickname}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Aesthetic Minimalist Letter Card */}
            <div className="my-3 flex justify-center">
              <div
                ref={diaryCardRef}
                className="w-full rounded-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-4 border border-rose-500/30 text-white shadow-[0_0_30px_rgba(244,63,94,0.15)] relative overflow-hidden font-sans"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <div>
                    <span className="text-xs font-bold font-mono tracking-wide block">
                      Daily Diary
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
                    </span>
                  </div>
                  <BookOpen className="w-4 h-4 text-rose-400" />
                </div>

                {/* Metrics */}
                <div className="py-2.5 space-y-2.5 text-xs">
                  <div className="p-2 rounded-xl bg-white/[0.03] border border-white/10 grid grid-cols-2 gap-2 text-center font-mono text-[10px]">
                    <div className="p-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <span className="text-purple-300 block text-[9px] uppercase font-semibold">
                        Study / Focus
                      </span>
                      <span className="text-white font-bold text-xs">
                        {formatDuration(studyMins)}
                      </span>
                    </div>
                    <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-cyan-300 block text-[9px] uppercase font-semibold">
                        Hydration
                      </span>
                      <span className="text-cyan-200 font-bold text-xs">
                        {waterCount} Glasses
                      </span>
                    </div>
                  </div>

                  {content.trim() && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-200">
                      <span className="text-[9px] font-mono text-rose-400 uppercase font-bold block mb-1">
                        Note:
                      </span>
                      <p className="font-serif italic text-white/95 text-xs leading-relaxed whitespace-pre-line">
                        &ldquo;{content.trim()}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span>KunalOS</span>
                  <span>Always with you ❤️</span>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            {shareStatus && (
              <div
                className={clsx(
                  "mb-3 p-2 rounded-xl text-xs font-mono text-center flex items-center justify-center gap-1.5",
                  shareStatus.error
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{shareStatus.text}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleSendToPartnerWhatsApp}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.25)] min-h-[42px]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportLetterCard}
                className="py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(168,85,247,0.25)] min-h-[42px]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting ? "Exporting..." : "Export PNG"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
