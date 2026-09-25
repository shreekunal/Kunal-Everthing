"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { format, subDays } from "date-fns";
import {
  BookOpen,
  Heart,
  Sparkles,
  Calendar,
  Download,
  Share2,
  Trash2,
  CheckCircle2,
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

  // Form State
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

  const handleSaveAndShare = async (e: React.FormEvent) => {
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
        // Prompt with Option to Share as PNG
        setIsShareModalOpen(true);
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

  // Export & Share PNG Image only
  const handleExportPng = async () => {
    if (!diaryCardRef.current) return;
    setIsExporting(true);
    setShareStatus(null);
    haptics.selection();

    try {
      const dataUrl = await toPng(diaryCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "#fffdf7",
      });

      const fileName = `KunalOS-Diary-${selectedDate}.png`;

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
            title: `Diary Page • ${selectedDate}`,
            url: fileResult.uri,
            dialogTitle: `Share Diary Page PNG`,
          });
          haptics.success();
          setShareStatus({ text: `Diary page shared successfully!` });
        } else {
          setShareStatus({ text: `Diary PNG saved: ${fileName}` });
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
              title: `Daily Diary • ${selectedDate}`,
            });
            shared = true;
            haptics.success();
            setShareStatus({ text: `Diary PNG shared!` });
          }
        } catch {}

        if (!shared) {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();
          haptics.success();
          setShareStatus({ text: `Diary page PNG downloaded!` });
        }
      }
    } catch (err: any) {
      console.error("Diary PNG export failed:", err);
      haptics.warning();
      setShareStatus({ text: "Failed to export diary PNG", error: true });
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
              Reflection &amp; Daily Journal
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
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
        {/* Date Title */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
          </span>
        </div>

        {/* Clean Discipline Stats Display (Study & Water without +/- buttons) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Study Focus Stat */}
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

          {/* Water Intake Stat */}
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                <Droplets className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1">
              <span className="text-[9px] font-mono uppercase text-zinc-400 block font-medium">
                Hydration
              </span>
              <span className="text-sm font-mono font-bold text-white">
                {waterCount} <span className="text-xs font-normal text-zinc-400">Glasses</span>{" "}
                <span className="text-[10px] text-zinc-500 font-normal">
                  ({waterCount * 250}ml)
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Single Writing Section Form with Single "Save & Share" Button */}
        <form onSubmit={handleSaveAndShare} className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <Edit3 className="w-3 h-3 text-rose-400" />
                <span>Today&apos;s Diary Note</span>
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
              placeholder={`Write freely about your day, wins, learnings, thoughts, or notes for ${partnerNickname}...`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 font-sans leading-relaxed resize-y transition-all"
            />
          </div>

          {/* Single Save & Share Button */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:opacity-95 active:scale-98 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all min-h-[46px]"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving &amp; Preparing PNG...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Heart className="w-4 h-4 text-rose-200 fill-rose-300/20" />
                  <span>Save &amp; Share</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Past Diary Entries Timeline */}
      <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/70 border border-white/[0.08] space-y-3">
        {/* Header with clear spacing so Title and Count NEVER touch */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">
              Past Diary Entries
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/5">
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

      {/* Aesthetic Real Diary Page PNG Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Share Diary Page PNG
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

            {/* Authentic Aesthetic Ruled Diary Page Component */}
            <div className="my-3 flex justify-center">
              <div
                ref={diaryCardRef}
                className="w-full rounded-2xl bg-[#fffdf7] text-zinc-900 p-5 shadow-2xl relative overflow-hidden font-serif border border-[#e5dfd3]"
                style={{
                  backgroundImage: "radial-gradient(#d8d0c2 0.75px, transparent 0.75px)",
                  backgroundSize: "14px 14px",
                }}
              >
                {/* Vertical Red Margin Line */}
                <div className="absolute top-0 bottom-0 left-7 w-[1.5px] bg-rose-400/60 pointer-events-none" />

                {/* Top Header of Diary Page */}
                <div className="pl-5 pb-2.5 border-b-2 border-zinc-300/80 flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase block font-semibold">
                      Daily Journal • KunalOS
                    </span>
                    <h4 className="text-xs font-bold text-zinc-900 font-serif mt-0.5">
                      {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
                    </h4>
                  </div>

                  {/* Stamp Seals for Study & Water */}
                  <div className="flex flex-col items-end gap-1 font-mono text-[9px]">
                    <span className="px-2 py-0.5 rounded bg-purple-100/90 text-purple-900 border border-purple-200 font-semibold tracking-tight">
                      ⏱️ {formatDuration(studyMins)} Focus
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-100/90 text-cyan-900 border border-cyan-200 font-semibold tracking-tight">
                      💧 {waterCount} Glasses ({waterCount * 250}ml)
                    </span>
                  </div>
                </div>

                {/* Ruled Lines Writing Body */}
                <div className="pl-5 pt-3 pb-3 min-h-[140px] relative">
                  <div
                    className="text-xs text-zinc-800 font-serif italic whitespace-pre-line leading-[26px]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(transparent, transparent 25px, #e8e2d4 25px, #e8e2d4 26px)",
                      lineHeight: "26px",
                    }}
                  >
                    {content.trim() || "A day of discipline, focus, and continuous growth."}
                  </div>
                </div>

                {/* Bottom Diary Signoff */}
                <div className="pl-5 pt-2.5 border-t border-zinc-300/80 flex items-center justify-between text-[10px] font-serif text-zinc-600 italic">
                  <span>With all my love ❤️</span>
                  <span className="font-mono text-[9px] text-zinc-400 font-medium">Kunal &amp; Mradul</span>
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

            {/* Direct PNG Export Action Button */}
            <div className="pt-1">
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportPng}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:opacity-95 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-98 shadow-[0_0_15px_rgba(168,85,247,0.3)] min-h-[44px]"
              >
                {isExporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting PNG...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>Share PNG Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
