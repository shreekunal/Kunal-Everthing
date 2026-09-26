"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate } from "@/lib/formatters";
import {
  GraduationCap,
  Plus,
  TrendingUp,
  Target,
  Download,
  BookOpen,
  Zap,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Heart,
  Pencil,
  Trash2,
  RotateCcw,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Coffee,
  ChevronDown,
  ChevronRight,
  Flame,
  Check,
  Compass,
  Layers,
  Activity,
  Play,
  Pause,
  Square,
  Timer,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

// Helper for elapsed minutes calculation
function computeElapsed(start?: string, end?: string): number | null {
  if (!start || !end || !start.includes(":") || !end.includes(":")) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return Math.max(1, endTotal - startTotal);
}

// Format seconds into HH:MM:SS
function formatStopwatchTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

interface StopwatchPersistedState {
  status: "IDLE" | "RUNNING" | "PAUSED";
  startTimeMs: number | null;
  lastResumeTimeMs: number | null;
  accumulatedSeconds: number;
  startClock: string;
}

const STOPWATCH_STORAGE_KEY = "everything_study_stopwatch";

function ProgressContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [aimsData, setAimsData] = useState<any[]>([]);
  const [partner, setPartner] = useState<{ name: string; nickname: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Active View Tab on Mobile
  const [activeTab, setActiveTab] = useState<"LOG" | "AIMS" | "ANALYTICS">("LOG");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "AIMS" || tabParam === "LOG" || tabParam === "ANALYTICS") {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Study session entry (always logs for today)
  const [manualProject, setManualProject] = useState("");
  const [manualDuration, setManualDuration] = useState("60");
  const [manualCategory, setManualCategory] = useState("Deep Study");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoggingStudy, setIsLoggingStudy] = useState(false);

  // From/To Time, Intention, Reflection, Topic Linking
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [intention, setIntention] = useState<string>("");
  const [reflection, setReflection] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [showAdvancedInputs, setShowAdvancedInputs] = useState(false);

  // ----------------------------------------------------
  // Phone-Lock Resilient Live Focus Stopwatch State
  // ----------------------------------------------------
  const [swStatus, setSwStatus] = useState<"IDLE" | "RUNNING" | "PAUSED">("IDLE");
  const [swActiveSeconds, setSwActiveSeconds] = useState<number>(0);
  const [swStartTimeMs, setSwStartTimeMs] = useState<number | null>(null);
  const [swLastResumeTimeMs, setSwLastResumeTimeMs] = useState<number | null>(null);
  const [swAccumulatedSecs, setSwAccumulatedSecs] = useState<number>(0);
  const [swStartClock, setSwStartClock] = useState<string>("");

  // Study Goal State
  const [dailyTargetHours, setDailyTargetHours] = useState<number>(3);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(21);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [tempDailyInput, setTempDailyInput] = useState<string>("3");

  // Aim Manager State
  const [isAddingAim, setIsAddingAim] = useState(false);
  const [newAimTitle, setNewAimTitle] = useState("");
  const [newAimTargetDate, setNewAimTargetDate] = useState("");
  const [newAimMilestonesInput, setNewAimMilestonesInput] = useState("");
  const [isSavingAim, setIsSavingAim] = useState(false);
  const [expandedAims, setExpandedAims] = useState<Record<string, boolean>>({});
  const [addingTopicMilestoneId, setAddingTopicMilestoneId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  // Share Modal & Image Export states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // ----------------------------------------------------
  // Stopwatch Storage & Hardware Clock Sync
  // ----------------------------------------------------
  const saveStopwatchState = (
    status: "IDLE" | "RUNNING" | "PAUSED",
    startTimeMs: number | null,
    lastResumeTimeMs: number | null,
    accumulatedSeconds: number,
    startClock: string
  ) => {
    if (typeof window === "undefined") return;
    const payload: StopwatchPersistedState = {
      status,
      startTimeMs,
      lastResumeTimeMs,
      accumulatedSeconds,
      startClock,
    };
    localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent("everything-stopwatch-update"));
  };

  const syncStopwatchTick = useCallback(() => {
    if (swStatus === "RUNNING" && swLastResumeTimeMs) {
      const now = Date.now();
      const currentChunkSecs = Math.max(0, Math.floor((now - swLastResumeTimeMs) / 1000));
      setSwActiveSeconds(swAccumulatedSecs + currentChunkSecs);
    } else if (swStatus === "PAUSED") {
      setSwActiveSeconds(swAccumulatedSecs);
    } else if (swStatus === "IDLE") {
      setSwActiveSeconds(0);
    }
  }, [swStatus, swLastResumeTimeMs, swAccumulatedSecs]);

  // Load stopwatch state on mount & add visibility sync listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
      if (raw) {
        const parsed: StopwatchPersistedState = JSON.parse(raw);
        setSwStatus(parsed.status);
        setSwStartTimeMs(parsed.startTimeMs);
        setSwLastResumeTimeMs(parsed.lastResumeTimeMs);
        setSwAccumulatedSecs(parsed.accumulatedSeconds || 0);
        setSwStartClock(parsed.startClock || "");

        if (parsed.status === "RUNNING" && parsed.lastResumeTimeMs) {
          const now = Date.now();
          const currentChunk = Math.max(0, Math.floor((now - parsed.lastResumeTimeMs) / 1000));
          setSwActiveSeconds((parsed.accumulatedSeconds || 0) + currentChunk);
        } else {
          setSwActiveSeconds(parsed.accumulatedSeconds || 0);
        }
      }
    } catch (e) {
      console.warn("Failed to load stopwatch state:", e);
    }
  }, []);

  // Tick loop (every 500ms when running, plus instant resync on app focus/unlock)
  useEffect(() => {
    if (swStatus !== "RUNNING") return;

    syncStopwatchTick();
    const interval = setInterval(syncStopwatchTick, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncStopwatchTick();
      }
    };
    const handleFocus = () => syncStopwatchTick();

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
    };
  }, [swStatus, syncStopwatchTick]);

  // Stopwatch Controls
  const handleStartStopwatch = () => {
    haptics.impactMedium();
    const now = Date.now();
    const nowClock = format(new Date(), "HH:mm");
    setSwStatus("RUNNING");
    setSwStartTimeMs(now);
    setSwLastResumeTimeMs(now);
    setSwAccumulatedSecs(0);
    setSwActiveSeconds(0);
    setSwStartClock(nowClock);
    saveStopwatchState("RUNNING", now, nowClock ? now : null, 0, nowClock);
  };

  const handlePauseStopwatch = () => {
    haptics.selection();
    if (swStatus !== "RUNNING" || !swLastResumeTimeMs) return;
    const now = Date.now();
    const chunkSecs = Math.max(0, Math.floor((now - swLastResumeTimeMs) / 1000));
    const newTotal = swAccumulatedSecs + chunkSecs;
    setSwStatus("PAUSED");
    setSwAccumulatedSecs(newTotal);
    setSwActiveSeconds(newTotal);
    setSwLastResumeTimeMs(null);
    saveStopwatchState("PAUSED", swStartTimeMs, null, newTotal, swStartClock);
  };

  const handleResumeStopwatch = () => {
    haptics.selection();
    if (swStatus !== "PAUSED") return;
    const now = Date.now();
    setSwStatus("RUNNING");
    setSwLastResumeTimeMs(now);
    saveStopwatchState("RUNNING", swStartTimeMs, now, swAccumulatedSecs, swStartClock);
  };

  const handleStopAndFill = () => {
    haptics.success();
    const now = Date.now();
    let finalPureSecs = swAccumulatedSecs;
    if (swStatus === "RUNNING" && swLastResumeTimeMs) {
      finalPureSecs += Math.max(0, Math.floor((now - swLastResumeTimeMs) / 1000));
    }

    const pureMins = Math.max(1, Math.round(finalPureSecs / 60));
    const nowClock = format(new Date(), "HH:mm");

    // Populate form fields
    setManualDuration(String(pureMins));
    if (swStartClock) setStartTime(swStartClock);
    setEndTime(nowClock);

    // Reset Stopwatch
    setSwStatus("IDLE");
    setSwActiveSeconds(0);
    setSwAccumulatedSecs(0);
    setSwStartTimeMs(null);
    setSwLastResumeTimeMs(null);
    setSwStartClock("");
    saveStopwatchState("IDLE", null, null, 0, "");

    // Scroll to logger form smoothly
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const handleResetStopwatch = () => {
    haptics.warning();
    setSwStatus("IDLE");
    setSwActiveSeconds(0);
    setSwAccumulatedSecs(0);
    setSwStartTimeMs(null);
    setSwLastResumeTimeMs(null);
    setSwStartClock("");
    saveStopwatchState("IDLE", null, null, 0, "");
  };

  // Stopwatch telemetry metrics
  const swElapsedWallSecs =
    swStartTimeMs && swStatus !== "IDLE"
      ? Math.max(1, Math.floor((Date.now() - swStartTimeMs) / 1000))
      : 0;
  const swEfficiencyPercent =
    swElapsedWallSecs > 0 && swActiveSeconds > 0
      ? Math.min(100, Math.round((swActiveSeconds / swElapsedWallSecs) * 100))
      : 100;

  // ----------------------------------------------------
  // Fetch Progress & Targets
  // ----------------------------------------------------
  const fetchProgress = async () => {
    try {
      const [progressRes, aimsRes, relRes] = await Promise.all([
        fetch("/api/progress"),
        fetch("/api/aims"),
        fetch("/api/relationship"),
      ]);
      if (progressRes.ok) {
        const json = await progressRes.json();
        setData(json);
      }
      if (aimsRes.ok) {
        const aimsJson = await aimsRes.json();
        setAimsData(aimsJson.aims || []);
        if (aimsJson.aims?.length > 0) {
          setExpandedAims((prev) => {
            if (Object.keys(prev).length === 0) {
              return { [aimsJson.aims[0].id]: true };
            }
            return prev;
          });
        }
      }
      if (relRes.ok) {
        const relJson = await relRes.json();
        if (relJson.partner) {
          setPartner(relJson.partner);
        }
      }
    } catch (err) {
      console.error("Progress fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadTargetHours = () => {
    if (typeof window === "undefined") return;
    const storedWeekly = localStorage.getItem("everthing_weekly_study_goal_hours");
    const storedDaily = localStorage.getItem("everthing_daily_study_goal_hours");

    let weekly = 21;
    if (storedWeekly) {
      const val = parseInt(storedWeekly, 10);
      if (!isNaN(val) && val > 0) weekly = val;
    }
    setWeeklyTargetHours(weekly);

    let daily = Math.max(1, Math.round(weekly / 7));
    if (storedDaily) {
      const val = parseInt(storedDaily, 10);
      if (!isNaN(val) && val > 0) daily = val;
    }
    setDailyTargetHours(daily);
    setTempDailyInput(daily.toString());
  };

  const handleSaveDailyGoal = (newHours: number) => {
    const val = Math.max(1, Math.min(24, Math.round(newHours)));
    setDailyTargetHours(val);
    setTempDailyInput(val.toString());
    if (typeof window !== "undefined") {
      localStorage.setItem("everthing_daily_study_goal_hours", val.toString());
      window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
    }
    setIsEditingGoal(false);
    haptics.success();
  };

  useEffect(() => {
    setMounted(true);
    fetchProgress();
    loadTargetHours();
    window.addEventListener("kunal-os-refresh", loadTargetHours);
    window.addEventListener("storage", loadTargetHours);
    return () => {
      window.removeEventListener("kunal-os-refresh", loadTargetHours);
      window.removeEventListener("storage", loadTargetHours);
    };
  }, []);

  // Calculate live elapsed and efficiency in the form
  const liveElapsedMinutes = computeElapsed(startTime, endTime);
  const liveEfficiency =
    liveElapsedMinutes && liveElapsedMinutes > 0
      ? Math.min(100, Math.round((Number(manualDuration) / liveElapsedMinutes) * 100))
      : null;

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProject.trim() || isLoggingStudy) return;

    setIsLoggingStudy(true);
    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: manualProject.trim(),
          durationMinutes: Number(manualDuration),
          startTime: startTime || null,
          endTime: endTime || null,
          intention: intention.trim() || null,
          reflection: reflection.trim() || null,
          topicId: selectedTopicId || null,
          type: "STUDY",
          notes: manualCategory,
          date: format(new Date(), "yyyy-MM-dd"),
        }),
      });
      haptics.success();
      setManualProject("");
      setStartTime("");
      setEndTime("");
      setIntention("");
      setReflection("");
      setSelectedTopicId("");
      setShowAdvancedInputs(false);
      fetchProgress();
    } catch (err) {
      console.error("Manual study log error:", err);
      haptics.error();
    } finally {
      setIsLoggingStudy(false);
    }
  };

  const handleRepeatSession = (session: any) => {
    haptics.selection();
    setManualProject(session.project || "");
    if (session.notes) setManualCategory(session.notes);
    if (session.durationMinutes) setManualDuration(String(session.durationMinutes));
    if (session.startTime) setStartTime(session.startTime);
    if (session.endTime) setEndTime(session.endTime);
    if (session.topicId) setSelectedTopicId(session.topicId);
    setActiveTab("LOG");
  };

  const handleDeleteSession = async (id: string) => {
    try {
      setDeletingId(id);
      haptics.warning();
      const res = await fetch(`/api/progress?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        haptics.success();
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
      haptics.error();
    } finally {
      setDeletingId(null);
    }
  };

  // Aim Mastery Update Handler
  const handleUpdateMastery = async (topicId: string, currentMastery: string) => {
    const cycleMap: Record<string, string> = {
      NOT_STARTED: "IN_PROGRESS",
      IN_PROGRESS: "CONFIDENT",
      CONFIDENT: "MASTERED",
      MASTERED: "NOT_STARTED",
    };
    const nextMastery = cycleMap[currentMastery] || "IN_PROGRESS";
    haptics.selection();

    setAimsData((prevAims) =>
      prevAims.map((aim) => ({
        ...aim,
        milestones: aim.milestones.map((m: any) => ({
          ...m,
          topics: m.topics.map((t: any) =>
            t.id === topicId ? { ...t, mastery: nextMastery } : t
          ),
        })),
      }))
    );

    try {
      await fetch("/api/aims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TOPIC_MASTERY",
          topicId,
          mastery: nextMastery,
        }),
      });
      fetchProgress();
    } catch (err) {
      console.error("Failed to update topic mastery:", err);
      fetchProgress();
    }
  };

  // Create Aim Handler
  const handleCreateAim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAimTitle.trim() || isSavingAim) return;

    setIsSavingAim(true);
    haptics.impactMedium();
    try {
      const milestones = newAimMilestonesInput
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((title) => ({
          title,
          topics: [{ title: `${title} Fundamentals` }],
        }));

      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAimTitle.trim(),
          targetDate: newAimTargetDate || null,
          milestones: milestones.length > 0 ? milestones : undefined,
        }),
      });
      if (res.ok) {
        haptics.success();
        setNewAimTitle("");
        setNewAimTargetDate("");
        setNewAimMilestonesInput("");
        setIsAddingAim(false);
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to create aim:", err);
      haptics.error();
    } finally {
      setIsSavingAim(false);
    }
  };

  // Create Topic Handler
  const handleCreateTopic = async (milestoneId: string) => {
    if (!newTopicTitle.trim()) return;
    haptics.selection();
    try {
      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TOPIC",
          milestoneId,
          title: newTopicTitle.trim(),
        }),
      });
      if (res.ok) {
        setNewTopicTitle("");
        setAddingTopicMilestoneId(null);
        haptics.success();
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to create topic:", err);
    }
  };

  const { today, thisWeek, last7Days, cognitiveWindows, recentSessions } = data || {};
  const primeWindow = cognitiveWindows?.primeWindow;

  const recentSubjectChips = Array.from(
    new Set(
      (recentSessions || [])
        .map((s: any) => s.project?.trim())
        .filter(Boolean)
    )
  ).slice(0, 4) as string[];
  const defaultSubjectChips = ["Algorithms", "System Design", "Core CS", "Development"];
  const displaySubjectChips = recentSubjectChips.length > 0 ? recentSubjectChips : defaultSubjectChips;

  const todayStudyMinutes = today?.studyMinutes || 0;
  const todayStudySessions = (today?.sessions || []).filter((s: any) => s.type === "STUDY");
  const weekStudyMinutes = thisWeek?.studyMinutes || 0;
  const dailyTargetMinutes = dailyTargetHours * 60;
  const weeklyTargetMinutes = weeklyTargetHours * 60;
  const dailyProgressPercent = Math.min(100, Math.round((todayStudyMinutes / dailyTargetMinutes) * 100));
  const remainingDailyMinutes = Math.max(0, dailyTargetMinutes - todayStudyMinutes);
  const todayEarnedXP = Math.floor(todayStudyMinutes / 5);

  const partnerLabel =
    (partner?.name && partner.name.toLowerCase() !== "kunal" ? partner.name : partner?.nickname) || "Partner";

  // Share Card Generation Handler
  const handleSendToPartner = async () => {
    if (!shareCardRef.current) return;
    setIsExporting(true);
    setShareStatus(null);
    haptics.selection();

    try {
      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: "#09090b",
      });

      const dateStr = format(new Date(), "yyyy-MM-dd");
      const fileName = `Everthing-study-${dateStr}.png`;
      const partnerMessage = `Hey ${partnerLabel}! ❤️ Here's my study update for today on Everthing:\n⏱️ ${formatDuration(todayStudyMinutes)} completed (${todayStudySessions.length} session${todayStudySessions.length === 1 ? "" : "s"})\n⚡ +${todayEarnedXP} XP Discipline Yield\nConsistency is my promise! 🚀`;

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
            title: `Today's Study Report for ${partnerLabel}`,
            text: partnerMessage,
            url: fileResult.uri,
            dialogTitle: `Send Study Report to ${partnerLabel}`,
          });
          haptics.success();
          setShareStatus({ text: `Study report sent to ${partnerLabel}!` });
        } else {
          setShareStatus({ text: `Saved image to cache: ${fileName}` });
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
              title: `Today's Study Report for ${partnerLabel}`,
              text: partnerMessage,
            });
            shared = true;
            haptics.success();
            setShareStatus({ text: `Study report sent to ${partnerLabel}!` });
          }
        } catch (shareErr) {
          console.log("Web share cancelled or unsupported", shareErr);
        }

        if (!shared) {
          const link = document.createElement("a");
          link.download = fileName;
          link.href = dataUrl;
          link.click();

          const cleanPhone = partner?.phone?.replace(/[^0-9]/g, "") || "";
          const encodedText = encodeURIComponent(partnerMessage);
          const whatsappUrl = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${encodedText}`
            : `https://wa.me/?text=${encodedText}`;

          window.open(whatsappUrl, "_blank");
          haptics.success();
          setShareStatus({
            text: `Card downloaded & WhatsApp opened for ${partnerLabel}!`,
          });
        }
      }
    } catch (err: any) {
      console.error("Failed to send study report to partner:", err);
      haptics.warning();
      setShareStatus({ text: "Failed to generate report card.", error: true });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 max-w-2xl mx-auto">
      {/* Sleek Mobile Header */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-brand-red" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight leading-none">
              Study &amp; Focus
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              {format(new Date(), "EEE, dd MMM")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setShareStatus(null);
            setIsShareModalOpen(true);
          }}
          className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-mono text-rose-300 flex items-center gap-1.5 active:scale-95 transition-all"
        >
          <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-400" />
          <span className="text-[11px] font-semibold">{partnerLabel}</span>
        </button>
      </div>

      {/* Hero Stats Pill Banner */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider block">
              Today&apos;s Focus Time
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {formatDuration(todayStudyMinutes)}
              </span>
              <span className="text-[10px] font-mono text-brand-red font-semibold">
                +{todayEarnedXP} XP
              </span>
            </div>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setIsEditingGoal(!isEditingGoal);
              }}
              className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 justify-end"
            >
              <span>Goal: {dailyTargetHours}h</span>
              <Pencil className="w-2.5 h-2.5 text-brand-red" />
            </button>
            <span className="text-xs font-bold font-mono text-brand-red block mt-0.5">
              {dailyProgressPercent}%
            </span>
          </div>
        </div>

        {/* Minimal Progress Bar in Brand Red */}
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-brand-redDark via-brand-red to-brand-redLight shadow-glow-red"
            style={{ width: `${Math.max(3, dailyProgressPercent)}%` }}
          />
        </div>

        {/* Inline Goal Quick Selector */}
        {isEditingGoal && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-1.5 animate-in fade-in duration-150">
            <span className="text-[9px] font-mono text-zinc-400 uppercase">Target:</span>
            <div className="flex items-center gap-1">
              {[2, 3, 4, 5, 6].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleSaveDailyGoal(h)}
                  className={clsx(
                    "px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all",
                    dailyTargetHours === h
                      ? "bg-brand-red text-white border-brand-red font-bold"
                      : "bg-white/[0.03] text-zinc-400 border-white/10"
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Biological Prime Time Pill */}
      {primeWindow && (
        <div className="p-2.5 px-3 rounded-xl bg-zinc-950 border border-brand-red/20 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-3.5 h-3.5 text-brand-red shrink-0" />
            <span className="text-[11px] text-zinc-300 truncate">
              Prime Zone: <strong className="text-white">{primeWindow.label}</strong> ({primeWindow.range})
            </span>
          </div>
          <span className="text-[10px] text-red-300 font-bold shrink-0">
            {primeWindow.studyHours}h logged
          </span>
        </div>
      )}

      {/* Mobile-First Segmented Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("LOG");
          }}
          className={clsx(
            "py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5",
            activeTab === "LOG"
              ? "bg-brand-red text-white shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Timer className="w-3.5 h-3.5" />
          <span>Focus</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("AIMS");
          }}
          className={clsx(
            "py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5",
            activeTab === "AIMS"
              ? "bg-brand-red text-white shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Study ({aimsData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("ANALYTICS");
          }}
          className={clsx(
            "py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5",
            activeTab === "ANALYTICS"
              ? "bg-brand-red text-white shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Analytics</span>
        </button>
      </div>

      {/* TAB 1: Live Stopwatch + Minimalist Study Logger */}
      {activeTab === "LOG" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* PHONE-LOCK RESILIENT LIVE FOCUS STOPWATCH */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-black border border-brand-red/30 shadow-2xl relative overflow-hidden">
            {/* Status Top Bar */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
              <div className="flex items-center gap-1.5">
                <Timer className="w-4 h-4 text-brand-red animate-pulse" />
                <span className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">
                  Live Focus Stopwatch
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {swStatus === "RUNNING" && (
                  <span className="flex items-center gap-1 text-[10px] font-mono text-red-300 font-bold bg-brand-red/15 px-2 py-0.5 rounded-full border border-brand-red/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-ping inline-block" />
                    FLOW STATE
                  </span>
                )}
                {swStatus === "PAUSED" && (
                  <span className="text-[10px] font-mono text-zinc-300 font-bold bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/10">
                    PAUSED
                  </span>
                )}
                {swStatus === "IDLE" && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    READY
                  </span>
                )}
              </div>
            </div>

            {/* Glowing Big Digital Counter */}
            <div className="text-center py-2">
              <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white select-none">
                {formatStopwatchTime(swActiveSeconds)}
              </div>

              {/* Real-Time Session Telemetry */}
              {swStatus !== "IDLE" && swStartClock && (
                <div className="mt-2.5 flex items-center justify-center gap-3 text-[10px] font-mono text-zinc-400 flex-wrap">
                  <span>Started: <strong className="text-white">{swStartClock}</strong></span>
                  <span>•</span>
                  <span>Elapsed: <strong className="text-white">{formatDuration(Math.round(swElapsedWallSecs / 60))}</strong></span>
                  <span>•</span>
                  <span className="text-red-300 font-bold">Eff: {swEfficiencyPercent}%</span>
                </div>
              )}
            </div>

            {/* Touch Controls Grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
              {swStatus === "IDLE" ? (
                <button
                  type="button"
                  onClick={handleStartStopwatch}
                  className="col-span-3 py-2.5 rounded-xl bg-brand-red text-white text-xs font-mono font-bold flex items-center justify-center gap-1.5 shadow-glow-red active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Focus Stopwatch</span>
                </button>
              ) : (
                <>
                  {swStatus === "RUNNING" ? (
                    <button
                      type="button"
                      onClick={handlePauseStopwatch}
                      className="py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                    >
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResumeStopwatch}
                      className="py-2.5 rounded-xl bg-brand-red text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStopAndFill}
                    className="py-2.5 rounded-xl bg-brand-red hover:bg-brand-redDark text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop &amp; Fill</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetStopwatch}
                    className="py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* MANUAL / PRE-FILLED LOG FORM */}
          <form onSubmit={handleManualLog} className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 shadow-md">
            {/* Subject Input with Quick Chips */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                  Subject / Focus Area
                </label>
                {selectedTopicId && (
                  <span className="text-[9px] font-mono text-cyan-400">Linked to Aim Topic</span>
                )}
              </div>

              {/* Quick Chips */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {displaySubjectChips.map((subj) => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setManualProject(subj);
                    }}
                    className={clsx(
                      "text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all active:scale-95",
                      manualProject === subj
                        ? "bg-brand-red/20 text-brand-red border-brand-red/40 font-bold"
                        : "bg-white/[0.02] text-zinc-400 border-white/10 hover:border-white/20 hover:text-zinc-200"
                    )}
                  >
                    {subj}
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                placeholder="e.g. Dynamic Programming, System Design, Physics"
                value={manualProject}
                onChange={(e) => setManualProject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
              />
            </div>

            {/* From & To Time (Wall-Clock Inputs) */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3 text-brand-red" />
                  Wall-Clock Time (From → To)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    const now = new Date();
                    setEndTime(format(now, "HH:mm"));
                    const prior = new Date(now.getTime() - Number(manualDuration) * 60000);
                    setStartTime(format(prior, "HH:mm"));
                  }}
                  className="text-[9px] font-mono text-brand-red hover:underline"
                >
                  Fill Current
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">Start (From)</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">End (To)</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              {/* Real-time Efficiency Output */}
              {liveElapsedMinutes && liveElapsedMinutes > 0 && (
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono border-t border-white/5">
                  <span className="text-zinc-400">
                    Elapsed: <strong className="text-white">{formatDuration(liveElapsedMinutes)}</strong>
                  </span>
                  <span
                    className={clsx(
                      "font-bold",
                      liveEfficiency && liveEfficiency >= 80
                        ? "text-emerald-400"
                        : liveEfficiency && liveEfficiency >= 60
                        ? "text-amber-400"
                        : "text-rose-400"
                    )}
                  >
                    Efficiency: {liveEfficiency}%
                  </span>
                </div>
              )}
            </div>

            {/* Pure Study Duration & Mode */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                  Pure Focus Mins *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={manualDuration}
                  onChange={(e) => setManualDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                  Mode
                </label>
                <Select value={manualCategory} onValueChange={setManualCategory}>
                  <SelectTrigger className="w-full h-9 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deep Study">Deep Study</SelectItem>
                    <SelectItem value="Problem Practice">Problem Practice</SelectItem>
                    <SelectItem value="Revision & Flashcards">Revision</SelectItem>
                    <SelectItem value="Theory & Reading">Theory / Reading</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Pomodoro Duration Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {[25, 45, 60, 120].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setManualDuration(String(mins));
                  }}
                  className={clsx(
                    "py-1.5 rounded-lg text-xs font-mono transition-all border text-center font-medium",
                    Number(manualDuration) === mins
                      ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red"
                      : "bg-white/[0.02] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
                  )}
                >
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>

            {/* Toggle for Target & Bottleneck Prompts */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
                className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
              >
                <span>{showAdvancedInputs ? "− Hide Prompts" : "+ Add Intention & Bottleneck"}</span>
              </button>

              {showAdvancedInputs && (
                <div className="space-y-2.5 pt-2 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-0.5 flex items-center gap-1">
                      <Target className="w-2.5 h-2.5 text-brand-red" />
                      Target (What ONE problem must be solved?)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Solve 3 Medium DP problems"
                      value={intention}
                      onChange={(e) => setIntention(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                      Bottleneck (Hardest roadblock or concept?)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Graph topological sort cycle detection"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              variant="red"
              size="sm"
              type="submit"
              isLoading={isLoggingStudy}
              className="w-full py-2.5 text-xs font-semibold shadow-glow-red mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Focus Session (+{Math.max(2, Math.floor((Number(manualDuration) || 0) / 5))} XP)</span>
            </Button>
          </form>

          {/* Recent Sessions List */}
          <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold">
                Recent Sessions
              </span>
              <span className="text-[9px] font-mono text-zinc-500">
                {recentSessions?.length || 0} logged
              </span>
            </div>

            {!recentSessions || recentSessions.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500 font-mono">
                No study sessions logged yet today.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentSessions.slice(0, 10).map((s: any) => (
                  <div key={s.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white truncate text-xs">{s.project}</span>
                        {s.efficiencyPercent && (
                          <span className="text-[9px] text-emerald-400 font-mono bg-emerald-500/10 px-1 rounded">
                            {s.efficiencyPercent}% Eff
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
                        {s.startTime && s.endTime && (
                          <span>{s.startTime} → {s.endTime}</span>
                        )}
                        <span>•</span>
                        <span>{formatDuration(s.durationMinutes)}</span>
                      </div>
                      {(s.intention || s.reflection) && (
                        <div className="text-[10px] text-zinc-400 font-sans truncate pt-0.5">
                          {s.intention ? `Target: ${s.intention}` : `Bottleneck: ${s.reflection}`}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRepeatSession(s)}
                        className="p-1 rounded-md text-zinc-400 hover:text-white bg-white/[0.04]"
                      >
                        <RotateCcw className="w-3 h-3 text-brand-red" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(s.id)}
                        className="p-1 rounded-md text-zinc-600 hover:text-rose-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Minimalist Aims & Syllabus Matrix */}
      {activeTab === "AIMS" && (
        <div className="space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
              High-Stakes Aims
            </span>
            <Button
              variant="red"
              size="sm"
              onClick={() => setIsAddingAim(!isAddingAim)}
              className="text-[11px] py-1 px-2.5 h-7"
            >
              <Plus className="w-3 h-3" />
              <span>{isAddingAim ? "Close" : "New Aim"}</span>
            </Button>
          </div>

          {/* Add Aim Inline Form */}
          {isAddingAim && (
            <form onSubmit={handleCreateAim} className="p-3.5 rounded-2xl bg-zinc-950 border border-brand-red/30 space-y-2.5 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-white font-mono uppercase">
                Create High-Stakes Aim
              </span>
              <input
                type="text"
                required
                placeholder="Aim Title (e.g. FAANG System Design)"
                value={newAimTitle}
                onChange={(e) => setNewAimTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
              />
              <input
                type="date"
                value={newAimTargetDate}
                onChange={(e) => setNewAimTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
              />
              <textarea
                rows={2}
                placeholder="Milestones (comma separated)"
                value={newAimMilestonesInput}
                onChange={(e) => setNewAimMilestonesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
              />
              <div className="flex justify-end">
                <Button variant="red" size="sm" type="submit" isLoading={isSavingAim} className="text-xs py-1.5 px-3">
                  Save Aim
                </Button>
              </div>
            </form>
          )}

          {/* Aim Cards */}
          {aimsData.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-zinc-950 border border-white/10 text-xs text-zinc-500 font-mono">
              No Aims configured. Tap &quot;New Aim&quot; to build your structured syllabus!
            </div>
          ) : (
            <div className="space-y-3">
              {aimsData.map((aim) => {
                const isExpanded = !!expandedAims[aim.id];
                const stats = aim.stats || {};
                return (
                  <div key={aim.id} className="rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden">
                    <div
                      onClick={() => {
                        haptics.selection();
                        setExpandedAims((prev) => ({ ...prev, [aim.id]: !isExpanded }));
                      }}
                      className="p-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button type="button" className="text-zinc-500">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white font-mono truncate">{aim.title}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {stats.masteredTopics || 0}/{stats.totalTopics || 0} mastered • {formatDuration(stats.totalStudyMinutes || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold font-mono text-red-300">
                          {stats.masteryPercent || 0}%
                        </span>
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-brand-red rounded-full shadow-glow-red-subtle"
                            style={{ width: `${Math.max(4, stats.masteryPercent || 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Topics Checklist */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-white/5 bg-black/40">
                        {aim.milestones.map((m: any) => (
                          <div key={m.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 font-bold">
                              <span>{m.title}</span>
                              <span className="text-[9px] text-zinc-500 font-normal">
                                {m.topics.length} topics
                              </span>
                            </div>

                            <div className="space-y-1">
                              {m.topics.map((t: any) => {
                                const badges: Record<string, { label: string; style: string }> = {
                                  NOT_STARTED: { label: "Queue", style: "bg-white/[0.02] text-zinc-500 border-white/10" },
                                  IN_PROGRESS: { label: "Learning", style: "bg-white/[0.08] text-zinc-200 border-white/20" },
                                  CONFIDENT: { label: "Confident", style: "bg-brand-red/15 text-red-300 border-brand-red/30" },
                                  MASTERED: { label: "Mastered", style: "bg-brand-red text-white border-brand-red shadow-glow-red-subtle font-bold" },
                                };
                                const b = badges[t.mastery] || badges.NOT_STARTED;

                                return (
                                  <div
                                    key={t.id}
                                    className="py-1 px-2 rounded-lg bg-white/[0.02] flex items-center justify-between text-xs font-mono"
                                  >
                                    <span className="text-white truncate text-[11px]">{t.title}</span>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMastery(t.id, t.mastery)}
                                        className={clsx("px-2 py-0.5 rounded text-[9px] font-mono border transition-all active:scale-95", b.style)}
                                      >
                                        <span>{b.label}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          haptics.selection();
                                          setManualProject(t.title);
                                          setSelectedTopicId(t.id);
                                          setActiveTab("LOG");
                                        }}
                                        className="p-1 text-zinc-500 hover:text-brand-red transition-colors"
                                      >
                                        <Zap className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {addingTopicMilestoneId === m.id ? (
                              <div className="flex items-center gap-1.5 pt-1">
                                <input
                                  type="text"
                                  placeholder="New Topic"
                                  value={newTopicTitle}
                                  onChange={(e) => setNewTopicTitle(e.target.value)}
                                  className="flex-1 px-2 py-1 rounded bg-black border border-white/15 text-xs text-white font-mono"
                                />
                                <Button
                                  variant="red"
                                  size="sm"
                                  onClick={() => handleCreateTopic(m.id)}
                                  className="h-7 px-2 text-[10px]"
                                >
                                  Add
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setAddingTopicMilestoneId(null)}
                                  className="text-zinc-500 p-1"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTopicMilestoneId(m.id);
                                  setNewTopicTitle("");
                                }}
                                className="text-[9px] font-mono text-zinc-500 hover:text-brand-red flex items-center gap-1 pt-0.5"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Topic</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Minimalist Analytics & Peak Windows */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* 7-Day Bar Chart */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
                Last 7 Days Study Hours
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Week: {formatDuration(weekStudyMinutes)}
              </span>
            </div>

            <div className="h-48 w-full pt-2">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days || []}>
                    <XAxis dataKey="day" stroke="#71717A" fontSize={10} fontStyle="monospace" />
                    <YAxis stroke="#71717A" fontSize={10} unit="h" fontStyle="monospace" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(0,0,0,0.95)",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "0.75rem",
                        fontSize: "11px",
                      }}
                    />
                    <Bar dataKey="studyHours" name="Study Hours" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Peak Cognitive Windows 6-Zone Matrix */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-brand-red" />
                <span className="text-xs font-mono uppercase text-zinc-400 font-bold">
                  Cognitive Prime Windows
                </span>
              </div>
              {primeWindow && (
                <span className="text-[9px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  {primeWindow.label}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(cognitiveWindows?.windows || []).map((w: any) => {
                const isPrime = primeWindow?.id === w.id;
                return (
                  <div
                    key={w.id}
                    className={clsx(
                      "p-2.5 rounded-xl border text-center font-mono transition-all",
                      isPrime
                        ? "bg-brand-red/15 border-brand-red/50 shadow-glow-red"
                        : w.sessionCount > 0
                        ? "bg-white/[0.03] border-white/10"
                        : "bg-white/[0.01] border-white/5 opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      {w.id === "EARLY_MORNING" && <Sunrise className="w-3 h-3 text-amber-400" />}
                      {w.id === "MORNING" && <Sun className="w-3 h-3 text-yellow-400" />}
                      {w.id === "AFTERNOON" && <Coffee className="w-3 h-3 text-orange-400" />}
                      {w.id === "EVENING" && <Sunset className="w-3 h-3 text-rose-400" />}
                      {w.id === "NIGHT" && <Moon className="w-3 h-3 text-indigo-400" />}
                      {w.id === "LATE_NIGHT" && <Sparkles className="w-3 h-3 text-cyan-400" />}
                      <span className="text-[10px] font-bold text-zinc-300">{w.label}</span>
                    </div>
                    <span className="text-[9px] text-zinc-500 block">{w.range}</span>
                    <div className="mt-1.5 pt-1 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400">{w.studyHours}h</span>
                      <span className="text-emerald-400 font-bold">
                        {w.sessionCount} sess
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Share Today's Study Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-3xl p-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Send to {partnerLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(false)}
                className="p-1 rounded-lg bg-white/5 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {shareStatus && (
              <div
                className={clsx(
                  "my-3 p-2.5 rounded-xl text-xs font-mono flex items-center gap-2",
                  shareStatus.error
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                )}
              >
                {shareStatus.error ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{shareStatus.text}</span>
              </div>
            )}

            {/* Preview Card */}
            <div className="flex justify-center my-3 overflow-hidden">
              <div
                ref={shareCardRef}
                style={{
                  background: "radial-gradient(ellipse at top, #1f1214 0%, #09090b 70%)",
                  boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)",
                }}
                className="w-full border border-red-500/30 rounded-2xl p-5 text-white select-none"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                    <span className="font-mono font-bold tracking-widest text-[11px] text-white">EVERTHING</span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400">{format(new Date(), "dd MMM yyyy")}</span>
                </div>

                <div className="mt-4 mb-3">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 block">
                    Today&apos;s Focus
                  </span>
                  <div className="text-3xl font-black font-mono text-white tracking-tight mt-0.5">
                    {formatDuration(todayStudyMinutes)}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono font-bold">
                    <Zap className="w-2.5 h-2.5 text-brand-red" />
                    <span>+{todayEarnedXP} XP Yield</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-white/10 text-center font-mono">
                  <div className="p-1.5 rounded-lg bg-white/[0.03]">
                    <span className="text-[8px] text-zinc-500 block uppercase">Sessions</span>
                    <span className="text-xs font-bold text-white block mt-0.5">{todayStudySessions.length}</span>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/[0.03]">
                    <span className="text-[8px] text-zinc-500 block uppercase">Week Total</span>
                    <span className="text-xs font-bold text-white block mt-0.5">{formatDuration(weekStudyMinutes)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[8px] font-mono text-zinc-500">
                  <span>Consistency is mastery.</span>
                  <span className="text-rose-400 font-bold">Everthing • {partnerLabel}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="red"
                size="sm"
                disabled={isExporting}
                onClick={handleSendToPartner}
                className="py-2 text-xs font-semibold shadow-glow-red"
              >
                <Heart className="w-3.5 h-3.5 text-rose-300" />
                <span>Send</span>
              </Button>

              <Button
                variant="white"
                size="sm"
                disabled={isExporting}
                onClick={async () => {
                  if (!shareCardRef.current) return;
                  setIsExporting(true);
                  try {
                    const dataUrl = await toPng(shareCardRef.current, { pixelRatio: 2.5, backgroundColor: "#09090b" });
                    const link = document.createElement("a");
                    link.download = `Everthing-study-${format(new Date(), "yyyy-MM-dd")}.png`;
                    link.href = dataUrl;
                    link.click();
                    haptics.success();
                  } catch (e) {
                    haptics.error();
                  } finally {
                    setIsExporting(false);
                  }
                }}
                className="py-2 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-zinc-500 font-mono">
          Loading telemetry &amp; focus metrics...
        </div>
      }
    >
      <ProgressContent />
    </Suspense>
  );
}
