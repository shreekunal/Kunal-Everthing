"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  BookOpen,
  Heart,
  Sparkles,
  Calendar,
  Share2,
  Trash2,
  CheckCircle2,
  X,
  Edit3,
  PenTool,
  History,
  RotateCcw,
  Copy,
  Search,
  Flame,
  Palette,
  Check,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import clsx from "clsx";

const MAX_WORD_LIMIT = 35;
const DRAFT_STORAGE_KEY = "everything_diary_draft";

const REFLECTION_PROMPTS = [
  "What was the highlight of your day?",
  "One small victory or lesson today?",
  "Something unexpected that made you smile?",
  "A peaceful moment I appreciated today...",
  "What gave you the most energy today?",
  "A challenge I faced and overcame today...",
  "A kind word or moment shared with someone...",
];

type DiaryTheme = "parchment" | "midnight" | "minimal";

export default function DailyDiaryPage() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [activeTab, setActiveTab] = useState<"write" | "history">("write");
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Form State
  const [content, setContent] = useState("");
  const [pastEntries, setPastEntries] = useState<any[]>([]);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Search & Prompt State
  const [searchQuery, setSearchQuery] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);

  // Export / Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [diaryTheme, setDiaryTheme] = useState<DiaryTheme>("parchment");
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
        const entries = dJson.entries || [];
        setPastEntries(entries);

        const match = entries.find((e: any) => e.date === dateToFetch);
        if (match) {
          const existingText = match.content || match.highlights || match.partnerNote || "";
          const words = existingText.trim().split(/\s+/).filter(Boolean);
          setContent(words.slice(0, MAX_WORD_LIMIT).join(" "));
        } else if (dateToFetch === todayStr) {
          // Restore auto-draft if available
          const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
          if (savedDraft) {
            setContent(savedDraft);
          } else {
            setContent("");
          }
        } else {
          setContent("");
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
  }, [todayStr]);

  useEffect(() => {
    fetchDiaryData(selectedDate);
  }, [fetchDiaryData, selectedDate]);

  // Auto-Draft saving for today
  useEffect(() => {
    if (selectedDate === todayStr && content) {
      localStorage.setItem(DRAFT_STORAGE_KEY, content);
    }
  }, [content, selectedDate, todayStr]);

  const handleSelectDateForEdit = (dateStr: string) => {
    haptics.selection();
    setSelectedDate(dateStr);
    setActiveTab("write");
    fetchDiaryData(dateStr);
  };

  const handleResetToToday = () => {
    haptics.selection();
    setSelectedDate(todayStr);
    fetchDiaryData(todayStr);
  };

  // Word count computation and input handling (35-word limit)
  const wordsArray = content.trim() ? content.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = wordsArray.length;
  const isNearLimit = wordCount >= MAX_WORD_LIMIT * 0.85;
  const isAtLimit = wordCount >= MAX_WORD_LIMIT;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const newWords = val.trim() ? val.trim().split(/\s+/).filter(Boolean) : [];

    if (newWords.length <= MAX_WORD_LIMIT || val.length < content.length) {
      setContent(val);
    } else {
      const trimmedVal = newWords.slice(0, MAX_WORD_LIMIT).join(" ");
      setContent(trimmedVal);
      haptics.warning();
    }
  };

  const handleSaveOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (saving) return; // Prevent double submission

    setSaving(true);
    haptics.selection();

    const trimmedWords = content.trim() ? content.trim().split(/\s+/).filter(Boolean) : [];
    const cleanContent = trimmedWords.slice(0, MAX_WORD_LIMIT).join(" ");

    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          content: cleanContent,
        }),
      });

      if (res.ok) {
        haptics.success();
        setSavedSuccess(true);
        if (selectedDate === todayStr) {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
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

  const handleCopyText = async () => {
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content.trim());
      haptics.success();
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenShareModal = () => {
    haptics.selection();
    setIsShareModalOpen(true);
  };

  const handleDeleteDiary = async (id: string) => {
    if (saving) return;
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

  const handleOpenExportForEntry = (entry: any) => {
    haptics.selection();
    setSelectedDate(entry.date);
    const existingText = entry.content || entry.highlights || entry.partnerNote || "";
    setContent(existingText);
    setIsShareModalOpen(true);
  };

  const handleCyclePrompt = () => {
    haptics.selection();
    setPromptIndex((prev) => (prev + 1) % REFLECTION_PROMPTS.length);
  };

  // Streak calculation
  const streakCount = useMemo(() => {
    if (!pastEntries.length) return 0;
    const sortedDates = [...pastEntries]
      .map((e) => e.date)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    let checkDate = new Date();

    // If today has no entry yet, start checking from yesterday
    const todayHasEntry = sortedDates.includes(todayStr);
    if (!todayHasEntry) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < sortedDates.length; i++) {
      const targetStr = format(checkDate, "yyyy-MM-dd");
      if (sortedDates.includes(targetStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [pastEntries, todayStr]);

  // Filtered entries for search
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return pastEntries;
    const q = searchQuery.toLowerCase().trim();
    return pastEntries.filter((e) => {
      const text = (e.content || e.highlights || e.partnerNote || "").toLowerCase();
      const date = (e.date || "").toLowerCase();
      return text.includes(q) || date.includes(q);
    });
  }, [pastEntries, searchQuery]);

  // Direct PNG Image Export
  const handleExportPng = async () => {
    if (!diaryCardRef.current || isExporting) return;
    setIsExporting(true);
    setShareStatus(null);
    haptics.selection();

    try {
      const bgColor =
        diaryTheme === "midnight"
          ? "#09090b"
          : diaryTheme === "minimal"
          ? "#ffffff"
          : "#fffdf7";

      const dataUrl = await toPng(diaryCardRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: bgColor,
      });

      const fileName = `Everything-Diary-${selectedDate}.png`;

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

  const partnerNickname = partner?.nickname || partner?.name || "Partner";
  const currentPrompt = REFLECTION_PROMPTS[promptIndex];

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

        <div className="flex items-center gap-2">
          {streakCount > 0 && (
            <span className="text-[10px] font-mono font-medium px-2 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{streakCount}d Streak</span>
            </span>
          )}
          <span className="text-[10px] font-mono font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>+5 XP</span>
          </span>
        </div>
      </div>

      {/* 2-Segment Tab Switcher: Write & History */}
      <div className="grid grid-cols-2 p-1 rounded-2xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("write");
          }}
          className={clsx(
            "py-2.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[40px]",
            activeTab === "write"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <PenTool className="w-3.5 h-3.5" />
          <span>Write</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("history");
          }}
          className={clsx(
            "py-2.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 min-h-[40px]",
            activeTab === "history"
              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <History className="w-3.5 h-3.5" />
          <span>History ({pastEntries.length})</span>
        </button>
      </div>

      {/* WRITE TAB VIEW */}
      {activeTab === "write" && (
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-2xl shadow-glass-panel space-y-3.5 animate-in fade-in duration-200">
          {/* Header Bar with Date & Past-Edit Badge */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
              </span>
              {selectedDate !== todayStr && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Editing Past Entry
                </span>
              )}
            </div>

            {selectedDate !== todayStr && (
              <button
                type="button"
                onClick={handleResetToToday}
                className="text-[10px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Today</span>
              </button>
            )}
          </div>

          {/* Optional Spark / Prompt Inspiration Chip */}
          {!content.trim() && (
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <p className="text-[11px] text-zinc-300 font-sans italic truncate">
                  &ldquo;{currentPrompt}&rdquo;
                </p>
              </div>
              <button
                type="button"
                onClick={handleCyclePrompt}
                className="shrink-0 text-[10px] font-mono text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 active:scale-95"
              >
                Next Spark
              </button>
            </div>
          )}

          {/* 35 Words Writing Canvas Form */}
          <form onSubmit={handleSaveOnly} className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Edit3 className="w-3 h-3 text-rose-400" />
                  <span>{selectedDate !== todayStr ? "Past Entry Content" : "Today's Reflection"}</span>
                </label>

                {/* 35 Words Counter */}
                <span
                  className={clsx(
                    "text-[10px] font-mono px-2.5 py-0.5 rounded-full border transition-colors",
                    isAtLimit
                      ? "bg-red-500/20 text-red-300 border-red-500/40 font-bold"
                      : isNearLimit
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-medium"
                      : "bg-white/5 text-zinc-400 border-white/10"
                  )}
                >
                  {wordCount} / {MAX_WORD_LIMIT} words
                </span>
              </div>

              <textarea
                rows={6}
                placeholder={`Write freely about your day or reflections for ${partnerNickname}... (Max 35 words)`}
                value={content}
                onChange={handleContentChange}
                className="w-full px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 font-sans leading-relaxed resize-y transition-all min-h-[140px]"
              />
            </div>

            {/* Quick Actions & Save Protection Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyText}
                disabled={!content.trim()}
                className="py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 text-zinc-300 text-[11px] font-mono flex items-center gap-1.5 border border-white/5 active:scale-95 transition-all"
              >
                {copiedText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenShareModal}
                disabled={!content.trim()}
                className="py-2 px-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 disabled:opacity-40 active:scale-95 text-purple-300 border border-purple-500/30 font-mono text-[11px] flex items-center gap-1.5 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-300" />
                <span>Share PNG</span>
              </button>
            </div>

            {/* Primary Save / Update Button with Free-Tier Lock & Loading state */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={saving || loading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:opacity-95 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all min-h-[46px]"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{selectedDate !== todayStr ? "Updating Entry..." : "Saving Entry..."}</span>
                  </>
                ) : savedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>{selectedDate !== todayStr ? "Updated!" : "Saved!"}</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 text-rose-200 fill-rose-300/20" />
                    <span>{selectedDate !== todayStr ? "Update Entry" : "Save Entry"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTORY TAB VIEW */}
      {activeTab === "history" && (
        <div className="p-4 sm:p-5 rounded-3xl bg-zinc-950/80 border border-white/[0.08] space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-300 font-bold">
                Recorded Entries
              </h2>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/5">
              {pastEntries.length} {pastEntries.length === 1 ? "entry" : "entries"}
            </span>
          </div>

          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search past reflections or dates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500/50 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-xs text-zinc-500 font-mono">
                  {searchQuery ? "No matching diary entries found." : "No diary entries found."}
                </p>
                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setActiveTab("write");
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold active:scale-95"
                  >
                    Write Today&apos;s Entry →
                  </button>
                )}
              </div>
            ) : (
              filteredEntries.map((item) => {
                const entryText = item.content || item.highlights || item.partnerNote || "";
                const words = entryText.trim() ? entryText.trim().split(/\s+/).filter(Boolean) : [];

                return (
                  <div
                    key={item.id}
                    className="py-3.5 px-2.5 rounded-2xl transition-colors flex items-start justify-between gap-3 hover:bg-white/[0.02]"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectDateForEdit(item.date)}
                      className="min-w-0 flex-1 text-left active:opacity-70"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-white block">
                          {format(new Date(item.date), "EEEE, d MMM yyyy")}
                        </span>
                        <span className="text-[9px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-white/5">
                          {words.length} / {MAX_WORD_LIMIT}w
                        </span>
                      </div>

                      {entryText && (
                        <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed font-sans">
                          &ldquo;{entryText}&rdquo;
                        </p>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenExportForEntry(item)}
                        className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                        title="Share PNG"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDateForEdit(item.date)}
                        className="text-[11px] font-mono text-rose-400 hover:text-rose-300 p-1 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDiary(item.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
      )}

      {/* Aesthetic Real Diary Page PNG Share Modal with Themes */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-2xl my-auto space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
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

            {/* Theme Selector Pills */}
            <div className="flex items-center justify-between gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/5">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setDiaryTheme("parchment");
                }}
                className={clsx(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all",
                  diaryTheme === "parchment"
                    ? "bg-amber-100 text-amber-950 shadow"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Parchment
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setDiaryTheme("midnight");
                }}
                className={clsx(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all",
                  diaryTheme === "midnight"
                    ? "bg-zinc-800 text-amber-300 border border-amber-500/30 shadow"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Midnight
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setDiaryTheme("minimal");
                }}
                className={clsx(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-mono font-semibold transition-all",
                  diaryTheme === "minimal"
                    ? "bg-white text-zinc-900 shadow"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Minimal
              </button>
            </div>

            {/* Rendered Diary Card */}
            <div className="my-2 flex justify-center">
              <div
                ref={diaryCardRef}
                className={clsx(
                  "w-full rounded-2xl p-5 shadow-2xl relative overflow-hidden font-serif transition-all",
                  diaryTheme === "parchment" && "bg-[#fffdf7] text-zinc-900 border border-[#e5dfd3]",
                  diaryTheme === "midnight" && "bg-[#09090b] text-zinc-100 border border-zinc-800 shadow-[0_0_20px_rgba(0,0,0,0.8)]",
                  diaryTheme === "minimal" && "bg-white text-zinc-900 border border-zinc-200"
                )}
                style={{
                  backgroundImage:
                    diaryTheme === "parchment"
                      ? "radial-gradient(#d8d0c2 0.75px, transparent 0.75px)"
                      : diaryTheme === "midnight"
                      ? "radial-gradient(#27272a 0.75px, transparent 0.75px)"
                      : "none",
                  backgroundSize: "14px 14px",
                }}
              >
                {/* Vertical Margin Line */}
                <div
                  className={clsx(
                    "absolute top-0 bottom-0 left-7 w-[1.5px] pointer-events-none",
                    diaryTheme === "parchment" && "bg-rose-400/60",
                    diaryTheme === "midnight" && "bg-amber-500/50",
                    diaryTheme === "minimal" && "bg-zinc-300"
                  )}
                />

                {/* Header */}
                <div
                  className={clsx(
                    "pl-5 pb-2.5 border-b-2 flex items-center justify-between gap-2",
                    diaryTheme === "midnight" ? "border-zinc-800" : "border-zinc-300/80"
                  )}
                >
                  <div>
                    <span
                      className={clsx(
                        "text-[9px] font-mono tracking-widest uppercase block font-semibold",
                        diaryTheme === "midnight" ? "text-amber-400" : "text-zinc-500"
                      )}
                    >
                      Daily Journal • Everything
                    </span>
                    <h4
                      className={clsx(
                        "text-xs font-bold font-serif mt-0.5",
                        diaryTheme === "midnight" ? "text-white" : "text-zinc-900"
                      )}
                    >
                      {format(new Date(selectedDate), "EEEE, d MMMM yyyy")}
                    </h4>
                  </div>
                  <BookOpen
                    className={clsx(
                      "w-4 h-4",
                      diaryTheme === "midnight" ? "text-amber-400" : "text-zinc-700"
                    )}
                  />
                </div>

                {/* Ruled Lines Writing Body (Max 35 words) */}
                <div className="pl-5 pt-3 pb-3 min-h-[110px] relative">
                  <div
                    className={clsx(
                      "text-xs font-serif italic whitespace-pre-line leading-[26px]",
                      diaryTheme === "midnight" ? "text-zinc-200" : "text-zinc-800"
                    )}
                    style={{
                      backgroundImage:
                        diaryTheme === "midnight"
                          ? "repeating-linear-gradient(transparent, transparent 25px, #27272a 25px, #27272a 26px)"
                          : "repeating-linear-gradient(transparent, transparent 25px, #e8e2d4 25px, #e8e2d4 26px)",
                      lineHeight: "26px",
                    }}
                  >
                    {content.trim() || "A day of quiet reflection, focus, and continuous growth."}
                  </div>
                </div>

                {/* Bottom Signoff */}
                <div
                  className={clsx(
                    "pl-5 pt-2.5 border-t flex items-center justify-between text-[10px] font-serif italic",
                    diaryTheme === "midnight"
                      ? "border-zinc-800 text-zinc-400"
                      : "border-zinc-300/80 text-zinc-600"
                  )}
                >
                  <span>With all my love ❤️</span>
                  <span className="font-mono text-[9px] opacity-70">Everything</span>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            {shareStatus && (
              <div
                className={clsx(
                  "p-2 rounded-xl text-xs font-mono text-center flex items-center justify-center gap-1.5",
                  shareStatus.error
                    ? "bg-red-500/10 border border-red-500/20 text-red-400"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{shareStatus.text}</span>
              </div>
            )}

            {/* Export Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyText}
                className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-white text-xs font-mono font-semibold flex items-center justify-center gap-1.5 border border-white/10"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedText ? "Copied!" : "Copy Text"}</span>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportPng}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 hover:opacity-95 text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share PNG</span>
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
