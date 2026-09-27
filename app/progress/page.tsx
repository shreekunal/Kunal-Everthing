"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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

function getCurrentWindowId(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return "EARLY_MORNING";
  if (hour >= 9 && hour < 12) return "MORNING";
  if (hour >= 12 && hour < 17) return "AFTERNOON";
  if (hour >= 17 && hour < 21) return "EVENING";
  if (hour >= 21 || hour < 1) return "NIGHT";
  return "LATE_NIGHT";
}

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

  // Stopwatch Completion & Direct Save Modal State
  const [showStopwatchModal, setShowStopwatchModal] = useState<boolean>(false);
  const [swModalDuration, setSwModalDuration] = useState<string>("60");
  const [swModalProject, setSwModalProject] = useState<string>("");
  const [swModalTopicId, setSwModalTopicId] = useState<string>("");
  const [swModalCategory, setSwModalCategory] = useState<string>("Deep Work");
  const [swModalIntention, setSwModalIntention] = useState<string>("");
  const [swModalReflection, setSwModalReflection] = useState<string>("");
  const [swModalStartTime, setSwModalStartTime] = useState<string>("");
  const [swModalEndTime, setSwModalEndTime] = useState<string>("");
  const [isSavingSwSession, setIsSavingSwSession] = useState<boolean>(false);

  // Study Goal State (Weekdays vs Weekends)
  const [weekdayTargetHours, setWeekdayTargetHours] = useState<number>(3);
  const [weekendTargetHours, setWeekendTargetHours] = useState<number>(5);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(25);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);

  // Aim Manager State
  const [isAddingAim, setIsAddingAim] = useState(false);
  const [newAimTitle, setNewAimTitle] = useState("");
  const [newAimTargetDate, setNewAimTargetDate] = useState("");
  const [newAimMilestonesInput, setNewAimMilestonesInput] = useState("");
  const [isSavingAim, setIsSavingAim] = useState(false);
  const [expandedAims, setExpandedAims] = useState<Record<string, boolean>>({});
  const [addingTopicMilestoneId, setAddingTopicMilestoneId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  // Edit Aim State
  const [editingAimId, setEditingAimId] = useState<string | null>(null);
  const [editAimTitle, setEditAimTitle] = useState("");
  const [editAimTargetDate, setEditAimTargetDate] = useState("");
  const [isSavingAimEdit, setIsSavingAimEdit] = useState(false);
  const [aimToDelete, setAimToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingAim, setIsDeletingAim] = useState(false);

  // Milestone Add & Edit State
  const [addingMilestoneAimId, setAddingMilestoneAimId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [isSavingMilestoneEdit, setIsSavingMilestoneEdit] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

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

  const handleOpenStopwatchSaveModal = () => {
    haptics.impactMedium();
    const now = Date.now();
    let finalPureSecs = swAccumulatedSecs;
    if (swStatus === "RUNNING" && swLastResumeTimeMs) {
      finalPureSecs += Math.max(0, Math.floor((now - swLastResumeTimeMs) / 1000));
    }

    const pureMins = Math.max(1, Math.round(finalPureSecs / 60));
    const nowClock = format(new Date(), "HH:mm");
    const startClock = swStartClock || format(new Date(now - pureMins * 60000), "HH:mm");

    // Pause the stopwatch so elapsed time is locked while user fills details
    setSwStatus("PAUSED");
    setSwAccumulatedSecs(finalPureSecs);
    setSwActiveSeconds(finalPureSecs);
    setSwLastResumeTimeMs(null);
    saveStopwatchState("PAUSED", swStartTimeMs, null, finalPureSecs, swStartClock);

    // Populate modal fields
    setSwModalDuration(String(pureMins));
    setSwModalStartTime(startClock);
    setSwModalEndTime(nowClock);
    setSwModalProject(manualProject || (aimsData && aimsData.length > 0 ? aimsData[0].title : ""));
    setSwModalTopicId(selectedTopicId || (aimsData && aimsData.length > 0 ? aimsData[0].id : ""));
    setSwModalCategory(manualCategory || "Deep Work");
    setSwModalIntention(intention || "");
    setSwModalReflection("");

    setShowStopwatchModal(true);
  };

  const handleSaveStopwatchSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!swModalProject.trim() || isSavingSwSession) return;

    setIsSavingSwSession(true);
    try {
      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: swModalProject.trim(),
          durationMinutes: Number(swModalDuration) || 1,
          startTime: swModalStartTime || null,
          endTime: swModalEndTime || null,
          intention: swModalIntention.trim() || null,
          reflection: swModalReflection.trim() || null,
          topicId: swModalTopicId || null,
          type: "STUDY",
          notes: swModalCategory,
          date: format(new Date(), "yyyy-MM-dd"),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record study session");
      }

      haptics.success();

      // Reset stopwatch to IDLE
      setSwStatus("IDLE");
      setSwActiveSeconds(0);
      setSwAccumulatedSecs(0);
      setSwStartTimeMs(null);
      setSwLastResumeTimeMs(null);
      setSwStartClock("");
      saveStopwatchState("IDLE", null, null, 0, "");

      // Close modal
      setShowStopwatchModal(false);

      // Refresh progress metrics & aim status
      await fetchProgress();
    } catch (err) {
      console.error("Save stopwatch session error:", err);
      haptics.error();
    } finally {
      setIsSavingSwSession(false);
    }
  };

  const handleStopAndFill = handleOpenStopwatchSaveModal;

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
    const storedWeekday = localStorage.getItem("everthing_weekday_study_goal_hours");
    const storedWeekend = localStorage.getItem("everthing_weekend_study_goal_hours");
    const storedDaily = localStorage.getItem("everthing_daily_study_goal_hours");

    let weekday = 3;
    if (storedWeekday) {
      const val = parseInt(storedWeekday, 10);
      if (!isNaN(val) && val > 0) weekday = val;
    } else if (storedDaily) {
      const val = parseInt(storedDaily, 10);
      if (!isNaN(val) && val > 0) weekday = val;
    }
    setWeekdayTargetHours(weekday);

    let weekend = 5;
    if (storedWeekend) {
      const val = parseInt(storedWeekend, 10);
      if (!isNaN(val) && val > 0) weekend = val;
    } else if (storedDaily) {
      const val = parseInt(storedDaily, 10);
      if (!isNaN(val) && val > 0) weekend = Math.max(val, 5);
    }
    setWeekendTargetHours(weekend);

    const computedWeekly = weekday * 5 + weekend * 2;
    setWeeklyTargetHours(computedWeekly);
  };

  const handleSaveWeekdayGoal = (newHours: number) => {
    const val = Math.max(1, Math.min(24, Math.round(newHours)));
    setWeekdayTargetHours(val);
    const newWeekly = val * 5 + weekendTargetHours * 2;
    setWeeklyTargetHours(newWeekly);
    if (typeof window !== "undefined") {
      localStorage.setItem("everthing_weekday_study_goal_hours", val.toString());
      localStorage.setItem("everthing_weekly_study_goal_hours", newWeekly.toString());
      const isWeekend = [0, 6].includes(new Date().getDay());
      localStorage.setItem("everthing_daily_study_goal_hours", (isWeekend ? weekendTargetHours : val).toString());
      window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
    }
    haptics.selection();
  };

  const handleSaveWeekendGoal = (newHours: number) => {
    const val = Math.max(1, Math.min(24, Math.round(newHours)));
    setWeekendTargetHours(val);
    const newWeekly = weekdayTargetHours * 5 + val * 2;
    setWeeklyTargetHours(newWeekly);
    if (typeof window !== "undefined") {
      localStorage.setItem("everthing_weekend_study_goal_hours", val.toString());
      localStorage.setItem("everthing_weekly_study_goal_hours", newWeekly.toString());
      const isWeekend = [0, 6].includes(new Date().getDay());
      localStorage.setItem("everthing_daily_study_goal_hours", (isWeekend ? val : weekdayTargetHours).toString());
      window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
    }
    haptics.selection();
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

  // Checkpoint Toggle Handler (Completed vs Incomplete)
  const handleToggleTopic = async (topicId: string, currentMastery: string) => {
    const isCompleted = currentMastery === "MASTERED";
    const nextMastery = isCompleted ? "NOT_STARTED" : "MASTERED";
    if (nextMastery === "MASTERED") {
      haptics.success();
    } else {
      haptics.selection();
    }

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
      console.error("Failed to update topic checkpoint:", err);
      fetchProgress();
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    haptics.warning();
    setAimsData((prevAims) =>
      prevAims.map((aim) => ({
        ...aim,
        milestones: aim.milestones.map((m: any) => ({
          ...m,
          topics: m.topics.filter((t: any) => t.id !== topicId),
        })),
      }))
    );

    try {
      await fetch(`/api/aims?topicId=${topicId}`, {
        method: "DELETE",
      });
      fetchProgress();
    } catch (err) {
      console.error("Failed to delete topic checkpoint:", err);
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

  // Edit Aim Handler
  const handleSaveAimEdit = async (aimId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editAimTitle.trim() || isSavingAimEdit) return;

    setIsSavingAimEdit(true);
    haptics.impactMedium();
    try {
      const res = await fetch("/api/aims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_AIM",
          aimId,
          title: editAimTitle.trim(),
          targetDate: editAimTargetDate || null,
        }),
      });
      if (res.ok) {
        haptics.success();
        setEditingAimId(null);
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to update aim:", err);
      haptics.error();
    } finally {
      setIsSavingAimEdit(false);
    }
  };

  const handleExecuteDeleteAim = async () => {
    if (!aimToDelete) return;
    setIsDeletingAim(true);
    try {
      const res = await fetch(`/api/aims?aimId=${aimToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        haptics.success();
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to delete aim:", err);
      haptics.error();
    } finally {
      setIsDeletingAim(false);
      setAimToDelete(null);
    }
  };

  // Milestone Handlers
  const handleCreateMilestone = async (aimId: string) => {
    if (!newMilestoneTitle.trim() || isSavingMilestone) return;
    setIsSavingMilestone(true);
    haptics.selection();
    try {
      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_MILESTONE",
          aimId,
          title: newMilestoneTitle.trim(),
        }),
      });
      if (res.ok) {
        setNewMilestoneTitle("");
        setAddingMilestoneAimId(null);
        haptics.success();
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to create milestone:", err);
      haptics.error();
    } finally {
      setIsSavingMilestone(false);
    }
  };

  const handleSaveMilestoneEdit = async (milestoneId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editMilestoneTitle.trim() || isSavingMilestoneEdit) return;

    setIsSavingMilestoneEdit(true);
    haptics.selection();
    try {
      const res = await fetch("/api/aims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MILESTONE",
          milestoneId,
          title: editMilestoneTitle.trim(),
        }),
      });
      if (res.ok) {
        haptics.success();
        setEditingMilestoneId(null);
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to update milestone:", err);
      haptics.error();
    } finally {
      setIsSavingMilestoneEdit(false);
    }
  };

  const handleExecuteDeleteMilestone = async () => {
    if (!milestoneToDelete) return;
    setIsDeletingMilestone(true);
    try {
      const res = await fetch(`/api/aims?milestoneId=${milestoneToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        haptics.success();
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to delete milestone:", err);
      haptics.error();
    } finally {
      setIsDeletingMilestone(false);
      setMilestoneToDelete(null);
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
  const defaultSubjectChips = ["History", "Geography", "Polity"];
  const displaySubjectChips = recentSubjectChips.length > 0 ? recentSubjectChips : defaultSubjectChips;

  const todayStudyMinutes = today?.studyMinutes || 0;
  const todayStudySessions = (today?.sessions || []).filter((s: any) => s.type === "STUDY");
  const weekStudyMinutes = thisWeek?.studyMinutes || 0;
  const isTodayWeekend = mounted ? [0, 6].includes(new Date().getDay()) : false;
  const dailyTargetHours = isTodayWeekend ? weekendTargetHours : weekdayTargetHours;
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
              className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 justify-end group transition-colors"
            >
              <span>
                Goal: <strong className="text-white">{formatDuration(dailyTargetHours * 60)}</strong>{" "}
                <span className="text-zinc-500">({isTodayWeekend ? "Weekend" : "Weekday"})</span>
              </span>
              <Pencil className="w-2.5 h-2.5 text-brand-red group-hover:scale-110 transition-transform" />
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

        {/* Inline Goal Quick Selector: Weekdays & Weekends */}
        {isEditingGoal && (
          <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2 animate-in fade-in duration-150">
            {/* Weekdays Row */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                <span className={clsx("w-1.5 h-1.5 rounded-full", !isTodayWeekend ? "bg-brand-red animate-pulse" : "bg-zinc-600")} />
                <span>Weekdays (Mon–Fri):</span>
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSaveWeekdayGoal(h)}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all active:scale-95",
                      weekdayTargetHours === h
                        ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red-subtle"
                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Weekends Row */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[9px] font-mono text-zinc-400 uppercase flex items-center gap-1.5">
                <span className={clsx("w-1.5 h-1.5 rounded-full", isTodayWeekend ? "bg-brand-red animate-pulse" : "bg-zinc-600")} />
                <span>Weekends (Sat–Sun):</span>
              </span>
              <div className="flex items-center gap-1">
                {[2, 3, 4, 5, 6, 8].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleSaveWeekendGoal(h)}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all active:scale-95",
                      weekendTargetHours === h
                        ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red-subtle"
                        : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1.5 flex items-center justify-between text-[9px] font-mono text-zinc-500 border-t border-white/5">
              <span>Weekly Pace: <strong className="text-zinc-300 font-bold">{formatDuration(weeklyTargetHours * 60)} / week</strong></span>
              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="text-brand-red hover:underline font-semibold"
              >
                Done
              </button>
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
            {formatDuration(primeWindow.totalStudyMins ?? Math.round((primeWindow.studyHours || 0) * 60))} logged
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
                    onClick={handleOpenStopwatchSaveModal}
                    className="py-2.5 rounded-xl bg-brand-red hover:bg-brand-redDark text-white text-xs font-mono font-bold flex items-center justify-center gap-1 shadow-glow-red active:scale-95 transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Finish &amp; Save</span>
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

          {/* MANUAL / PRE-FILLED LOG FORM - REDESIGNED */}
          <form onSubmit={handleManualLog} className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3.5 shadow-xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

            {/* Form Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-brand-red" />
                <span className="text-xs font-mono uppercase font-bold tracking-wider text-white">
                  Log Focus Session
                </span>
              </div>
              <span className="text-[10px] font-mono text-brand-red font-bold px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/20 shadow-glow-red-subtle">
                +{Math.max(2, Math.floor((Number(manualDuration) || 0) / 5))} XP
              </span>
            </div>

            {/* 1. AIM TARGETS IN COMPACT PILLS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono text-zinc-400 uppercase font-bold tracking-wider">
                  Aim Target
                </label>
                {selectedTopicId && (
                  <span className="text-[9px] font-mono text-red-300 font-bold bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-full">
                    Aim Linked
                  </span>
                )}
              </div>

              {/* High-Stakes Aim Pills Only */}
              {aimsData && aimsData.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {aimsData.map((aim: any) => {
                    const isSelected = selectedTopicId === aim.id || manualProject === aim.title;
                    return (
                      <button
                        key={aim.id}
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          if (isSelected) {
                            setSelectedTopicId("");
                            setManualProject("");
                          } else {
                            setSelectedTopicId(aim.id);
                            setManualProject(aim.title);
                          }
                        }}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-mono border transition-all active:scale-95 flex items-center gap-1.5",
                          isSelected
                            ? "bg-brand-red text-white border-brand-red shadow-glow-red-subtle font-bold"
                            : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                        )}
                      >
                        <Target className="w-3 h-3 text-brand-red" />
                        <span className="truncate max-w-[140px]">{aim.title}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Detail Chapter / Focus Input */}
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Focus Topic / Goal Detail..."
                  value={manualProject}
                  onChange={(e) => setManualProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-mono pr-8"
                />
                {manualProject && (
                  <button
                    type="button"
                    onClick={() => {
                      setManualProject("");
                      setSelectedTopicId("");
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                    title="Clear"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. WALL-CLOCK TIME & REAL-TIME EFFICIENCY */}
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
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">Start Time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">End Time</span>
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
                <div className="pt-1.5 flex items-center justify-between text-[10px] font-mono border-t border-white/5">
                  <span className="text-zinc-400">
                    Elapsed: <strong className="text-white">{formatDuration(liveElapsedMinutes)}</strong>
                  </span>
                  <span
                    className={clsx(
                      "font-bold px-1.5 py-0.2 rounded",
                      liveEfficiency && liveEfficiency >= 80
                        ? "text-red-300 bg-brand-red/10 border border-brand-red/30 shadow-glow-red-subtle"
                        : liveEfficiency && liveEfficiency >= 60
                        ? "text-zinc-300 bg-white/5 border border-white/10"
                        : "text-zinc-500 bg-white/5"
                    )}
                  >
                    Efficiency: {liveEfficiency}%
                  </span>
                </div>
              )}
            </div>

            {/* 3. PURE STUDY DURATION & STUDY MODE */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase font-bold">
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
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase font-bold">
                  Study Mode
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

            {/* 4. INTENTION & BOTTLENECK PROMPTS */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAdvancedInputs(!showAdvancedInputs)}
                className="text-[10px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>{showAdvancedInputs ? "− Hide Prompts" : "+ Add Intention & Bottleneck"}</span>
              </button>

              {showAdvancedInputs && (
                <div className="space-y-2 pt-2 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-0.5 flex items-center gap-1">
                      <Target className="w-2.5 h-2.5 text-brand-red" />
                      Target (What ONE problem must be solved?)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Solve 3 Medium DP problems / 20 Polity MCQs"
                      value={intention}
                      onChange={(e) => setIntention(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-mono text-zinc-400 uppercase mb-0.5 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-brand-red" />
                      Bottleneck (Hardest roadblock or concept?)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Article 356 proclamation criteria"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 5. SUBMIT BUTTON */}
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
                const isEditingThisAim = editingAimId === aim.id;

                return (
                  <div key={aim.id} className="rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden">
                    {/* AIM HEADER ROW OR EDIT FORM */}
                    {isEditingThisAim ? (
                      <form
                        onSubmit={(e) => handleSaveAimEdit(aim.id, e)}
                        className="p-3.5 space-y-2.5 bg-black/60 border-b border-white/10 animate-in fade-in duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase text-brand-red font-bold">
                            Edit Aim
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500">ID: {aim.id.slice(-6)}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 block mb-1">Aim Title *</span>
                            <input
                              type="text"
                              required
                              value={editAimTitle}
                              onChange={(e) => setEditAimTitle(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                              placeholder="e.g. FAANG System Design"
                              autoFocus
                            />
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-zinc-400 block mb-1">Target Date (Optional)</span>
                            <input
                              type="date"
                              value={editAimTargetDate}
                              onChange={(e) => setEditAimTargetDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingAimId(null)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-white"
                          >
                            Cancel
                          </button>
                          <Button
                            variant="red"
                            size="sm"
                            type="submit"
                            isLoading={isSavingAimEdit}
                            className="h-7 px-3 text-[10px]"
                          >
                            Save Changes
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div
                        onClick={() => {
                          haptics.selection();
                          setExpandedAims((prev) => ({ ...prev, [aim.id]: !isExpanded }));
                        }}
                        className="p-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button type="button" className="text-zinc-500">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-white font-mono truncate">{aim.title}</h4>
                              {aim.targetDate && (
                                <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.03] px-1.5 py-0.2 rounded border border-white/5">
                                  {aim.targetDate}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {stats.masteredTopics || 0}/{stats.totalTopics || 0} completed • {formatDuration(stats.totalStudyMinutes || 0)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="text-right">
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

                          <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.selection();
                                setEditingAimId(aim.id);
                                setEditAimTitle(aim.title);
                                setEditAimTargetDate(aim.targetDate || "");
                              }}
                              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
                              title="Edit Aim"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                haptics.warning();
                                setAimToDelete({ id: aim.id, title: aim.title });
                              }}
                              className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-white/[0.05] transition-colors"
                              title="Delete Aim"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Checkpoints Checklist & Milestones */}
                    {isExpanded && (
                      <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-white/5 bg-black/40">
                        {aim.milestones.map((m: any) => {
                          const completedCount = (m.topics || []).filter((t: any) => t.mastery === "MASTERED").length;
                          const totalCount = (m.topics || []).length;
                          const isEditingThisMilestone = editingMilestoneId === m.id;

                          return (
                            <div key={m.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                              {/* Milestone Header / Edit row */}
                              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 font-bold gap-2">
                                {isEditingThisMilestone ? (
                                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={editMilestoneTitle}
                                      onChange={(e) => setEditMilestoneTitle(e.target.value)}
                                      className="flex-1 px-2 py-0.5 rounded bg-black border border-brand-red text-xs text-white font-mono focus:outline-none"
                                      autoFocus
                                      placeholder="Milestone title"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveMilestoneEdit(m.id);
                                        if (e.key === "Escape") setEditingMilestoneId(null);
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveMilestoneEdit(m.id)}
                                      disabled={isSavingMilestoneEdit}
                                      className="p-1 rounded bg-brand-red text-white hover:bg-brand-redDark"
                                      title="Save"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingMilestoneId(null)}
                                      className="p-1 text-zinc-400 hover:text-white"
                                      title="Cancel"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span className="truncate">{m.title}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        haptics.selection();
                                        setEditingMilestoneId(m.id);
                                        setEditMilestoneTitle(m.title);
                                      }}
                                      className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                                      title="Edit Milestone"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        haptics.warning();
                                        setMilestoneToDelete({ id: m.id, title: m.title });
                                      }}
                                      className="p-0.5 text-zinc-600 hover:text-rose-400 transition-colors"
                                      title="Delete Milestone"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                )}

                                <span className="text-[9px] text-zinc-500 font-normal shrink-0">
                                  {completedCount}/{totalCount} completed
                                </span>
                              </div>

                              {/* Topics / Checkpoints List */}
                              <div className="space-y-1">
                                {m.topics.map((t: any) => {
                                  const isDone = t.mastery === "MASTERED";

                                  return (
                                    <div
                                      key={t.id}
                                      className="py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono group hover:border-white/10 transition-colors"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        {/* Tactile Checkbox */}
                                        <button
                                          type="button"
                                          onClick={() => handleToggleTopic(t.id, t.mastery)}
                                          className={clsx(
                                            "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 flex-shrink-0",
                                            isDone
                                              ? "bg-brand-red border-brand-red text-white shadow-glow-red-subtle"
                                              : "border-zinc-700 hover:border-brand-red/80 bg-white/[0.02] hover:bg-brand-red/10 text-transparent"
                                          )}
                                          aria-label={isDone ? "Mark incomplete" : "Mark completed"}
                                        >
                                          <Check className={clsx("w-3 h-3 stroke-[2.5]", isDone ? "opacity-100" : "opacity-0")} />
                                        </button>

                                        <span
                                          className={clsx(
                                            "truncate text-xs transition-all cursor-pointer select-none",
                                            isDone
                                              ? "line-through text-zinc-500 font-normal"
                                              : "text-zinc-200 hover:text-white"
                                          )}
                                          onClick={() => handleToggleTopic(t.id, t.mastery)}
                                        >
                                          {t.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            haptics.selection();
                                            setManualProject(t.title);
                                            setSelectedTopicId(t.id);
                                            setActiveTab("LOG");
                                          }}
                                          className="p-1 text-zinc-500 hover:text-brand-red transition-colors"
                                          title="Quick focus session"
                                        >
                                          <Zap className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteTopic(t.id)}
                                          className="p-1 text-zinc-600 hover:text-rose-400 opacity-60 hover:opacity-100 transition-all"
                                          title="Delete checkpoint"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Add Topic under Milestone */}
                              {addingTopicMilestoneId === m.id ? (
                                <div className="flex items-center gap-1.5 pt-1">
                                  <input
                                    type="text"
                                    placeholder="New Topic"
                                    value={newTopicTitle}
                                    onChange={(e) => setNewTopicTitle(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCreateTopic(m.id);
                                      if (e.key === "Escape") setAddingTopicMilestoneId(null);
                                    }}
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
                          );
                        })}

                        {/* Add Milestone to Aim */}
                        {addingMilestoneAimId === aim.id ? (
                          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-brand-red/30 flex items-center gap-1.5 mt-2 animate-in fade-in duration-150">
                            <input
                              type="text"
                              placeholder="New Milestone Title"
                              value={newMilestoneTitle}
                              onChange={(e) => setNewMilestoneTitle(e.target.value)}
                              className="flex-1 px-2.5 py-1 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateMilestone(aim.id);
                                if (e.key === "Escape") setAddingMilestoneAimId(null);
                              }}
                            />
                            <Button
                              variant="red"
                              size="sm"
                              onClick={() => handleCreateMilestone(aim.id)}
                              isLoading={isSavingMilestone}
                              className="h-7 px-2.5 text-[10px]"
                            >
                              Add Milestone
                            </Button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingMilestoneAimId(null);
                                setNewMilestoneTitle("");
                              }}
                              className="text-zinc-500 hover:text-zinc-300 p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAddingMilestoneAimId(aim.id);
                              setNewMilestoneTitle("");
                            }}
                            className="w-full py-2 rounded-xl border border-dashed border-white/10 hover:border-brand-red/40 text-[10px] font-mono text-zinc-400 hover:text-brand-red transition-all flex items-center justify-center gap-1.5 mt-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Milestone to {aim.title}</span>
                          </button>
                        )}
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
                      formatter={(value: any) => [
                        formatDuration(Math.round(Number(value) * 60)),
                        "Study Focus",
                      ]}
                    />
                    <Bar dataKey="studyHours" name="Study Hours" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* REDESIGNED COGNITIVE PRIME WINDOWS COCKPIT */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3.5 shadow-xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-red/10 border border-brand-red/25 text-brand-red flex-shrink-0">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase font-bold tracking-wider text-white">
                    Cognitive Prime Windows
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Circadian Focus &amp; Productivity Mapping
                  </p>
                </div>
              </div>

              {primeWindow ? (
                <span className="text-[10px] font-mono text-red-300 font-bold px-2 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 flex items-center gap-1 shadow-glow-red-subtle">
                  <Sparkles className="w-2.5 h-2.5 text-brand-red animate-pulse" />
                  <span>{primeWindow.label}</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-500">6 Circadian Zones</span>
              )}
            </div>



            {/* 6-Zone Chronological Telemetry Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(cognitiveWindows?.windows || []).map((w: any) => {
                const isPrime = primeWindow?.id === w.id;
                const isCurrent = getCurrentWindowId() === w.id;
                const maxHours = Math.max(...(cognitiveWindows?.windows || []).map((win: any) => win.studyHours || 0), 1);
                const volumePercent = Math.min(100, Math.round(((w.studyHours || 0) / maxHours) * 100));

                return (
                  <div
                    key={w.id}
                    className={clsx(
                      "p-2.5 rounded-xl border font-mono transition-all relative overflow-hidden flex flex-col justify-between",
                      isPrime
                        ? "bg-brand-red/15 border-brand-red/50 shadow-glow-red"
                        : isCurrent
                        ? "bg-white/[0.04] border-white/20 shadow-sm"
                        : w.sessionCount > 0
                        ? "bg-white/[0.02] border-white/10"
                        : "bg-white/[0.01] border-white/5 opacity-60"
                    )}
                  >
                    {/* Top line: Icon, Label & Status Badge */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <div className={clsx("p-1 rounded-md", isPrime ? "text-brand-red bg-brand-red/20" : "text-zinc-400 bg-white/5")}>
                          {w.id === "EARLY_MORNING" && <Sunrise className="w-3 h-3 text-brand-red" />}
                          {w.id === "MORNING" && <Sun className="w-3 h-3 text-brand-red" />}
                          {w.id === "AFTERNOON" && <Coffee className="w-3 h-3 text-brand-red" />}
                          {w.id === "EVENING" && <Sunset className="w-3 h-3 text-brand-red" />}
                          {w.id === "NIGHT" && <Moon className="w-3 h-3 text-brand-red" />}
                          {w.id === "LATE_NIGHT" && <Sparkles className="w-3 h-3 text-brand-red" />}
                        </div>
                        <span className="text-[10px] font-bold text-white truncate">{w.label}</span>
                      </div>

                      {isPrime ? (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-brand-red text-white shadow-glow-red flex-shrink-0">
                          PRIME
                        </span>
                      ) : isCurrent ? (
                        <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-white/10 border border-white/20 text-white flex items-center gap-1 flex-shrink-0">
                          <span className="w-1 h-1 rounded-full bg-brand-red animate-ping" />
                          NOW
                        </span>
                      ) : null}
                    </div>

                    {/* Time Range */}
                    <div className="text-[9px] text-zinc-500 mb-2">
                      {w.range}
                    </div>

                    {/* Mini Energy / Study Level Indicator Bar */}
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          isPrime ? "bg-gradient-to-r from-brand-redDark to-brand-red shadow-glow-red" : "bg-zinc-600"
                        )}
                        style={{ width: `${Math.max(4, volumePercent)}%` }}
                      />
                    </div>

                    {/* Bottom Stats Row */}
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-white font-bold">{formatDuration(w.totalStudyMins ?? Math.round((w.studyHours || 0) * 60))}</span>
                      <span className="text-zinc-400 text-[9px]">{w.sessionCount} sess</span>
                      <span className={clsx("text-[9px] font-bold", isPrime ? "text-red-300" : "text-zinc-400")}>
                        {w.avgEfficiencyPercent ? `${w.avgEfficiencyPercent}%` : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Strategic Scheduling Recommendation */}
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2 text-[11px] font-mono text-zinc-400">
              <Zap className="w-3.5 h-3.5 text-brand-red flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-white font-bold">Circadian Strategy: </span>
                Schedule core conceptual subjects (Polity Constitutional Articles, History timelines) in your{" "}
                <span className="text-red-300 font-semibold">{primeWindow?.label || "Morning"}</span> window. Reserve secondary windows for Geography mapping and revision drills.
              </div>
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

      {/* PHONE-LOCK FOCUS SESSION COMPLETE & SAVE MODAL */}
      {showStopwatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-brand-red/30 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
            {/* Ambient Red Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-brand-red/15 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-mono uppercase tracking-wider text-white font-bold">
                    Focus Session Complete
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Save session directly to your study history
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-brand-red font-bold px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/20">
                +{Math.max(2, Math.floor((Number(swModalDuration) || 0) / 5))} XP
              </span>
            </div>

            <form onSubmit={handleSaveStopwatchSession} className="space-y-3.5">
              {/* Duration and Wall Clock Summary */}
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-brand-red" />
                    Focus Duration
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setSwModalDuration(String(Math.max(1, Number(swModalDuration) - 5)));
                      }}
                      className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md text-[10px] font-mono text-zinc-300"
                    >
                      -5m
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setSwModalDuration(String(Number(swModalDuration) + 5));
                      }}
                      className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md text-[10px] font-mono text-zinc-300"
                    >
                      +5m
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xl font-black font-mono text-white">
                    {formatDuration(Number(swModalDuration))}
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    <span>{swModalStartTime}</span> → <span className="text-white font-bold">{swModalEndTime}</span>
                  </div>
                </div>
              </div>

              {/* Aim & Project Subject Picker */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                    Subject / Goal Detail <span className="text-brand-red">*</span>
                  </label>
                  {swModalTopicId && (
                    <span className="text-[9px] font-mono text-red-300 font-bold bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded-full">
                      Aim Linked
                    </span>
                  )}
                </div>

                {/* Quick Select Aim Pills */}
                {aimsData && aimsData.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                    {aimsData.map((aim: any) => {
                      const isSelected = swModalProject === aim.title || swModalTopicId === aim.id;
                      return (
                        <button
                          key={aim.id}
                          type="button"
                          onClick={() => {
                            haptics.selection();
                            setSwModalProject(aim.title);
                            setSwModalTopicId(aim.id);
                          }}
                          className={clsx(
                            "px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all active:scale-95 flex items-center gap-1.5",
                            isSelected
                              ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red-subtle"
                              : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                          )}
                        >
                          <Target className="w-3 h-3 text-brand-red" />
                          <span className="truncate max-w-[130px]">{aim.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Physics - Electromagnetism, Cell Biology..."
                    value={swModalProject}
                    onChange={(e) => setSwModalProject(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-brand-red"
                  />
                  {swModalProject && (
                    <button
                      type="button"
                      onClick={() => {
                        setSwModalProject("");
                        setSwModalTopicId("");
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Focus Category Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  Focus Type
                </span>
                <div className="flex flex-wrap gap-1">
                  {["Deep Work", "Revision", "Practice", "Lecture", "Reading"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        setSwModalCategory(cat);
                      }}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all",
                        swModalCategory === cat
                          ? "bg-brand-red/25 text-red-300 border-brand-red font-bold shadow-glow-red-subtle"
                          : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accomplishment / Notes */}
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Session Notes / Checkpoint <span className="text-zinc-600">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Key concepts mastered or problems solved..."
                  value={swModalReflection}
                  onChange={(e) => setSwModalReflection(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-brand-red"
                />
              </div>

              {/* Save & Cancel Actions */}
              <div className="pt-2 space-y-2">
                <Button
                  type="submit"
                  variant="red"
                  size="sm"
                  disabled={isSavingSwSession || !swModalProject.trim()}
                  className="w-full py-2.5 text-xs font-mono font-bold shadow-glow-red flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingSwSession ? "Saving to Database..." : "Save Session Immediately"}</span>
                </Button>

                <div className="flex items-center justify-between px-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.selection();
                      setShowStopwatchModal(false);
                    }}
                    className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
                  >
                    Keep Timing (Cancel)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      haptics.warning();
                      setShowStopwatchModal(false);
                      handleResetStopwatch();
                    }}
                    className="text-[11px] font-mono text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    Discard Session
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aim Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(aimToDelete)}
        onClose={() => setAimToDelete(null)}
        onConfirm={handleExecuteDeleteAim}
        isLoading={isDeletingAim}
        title="Delete Aim"
        message={`Are you sure you want to delete "${aimToDelete?.title}"? All milestones, topics, and study links for this aim will be removed.`}
        confirmText="Delete Aim"
        confirmVariant="red"
        iconType="danger"
      />

      {/* Milestone Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(milestoneToDelete)}
        onClose={() => setMilestoneToDelete(null)}
        onConfirm={handleExecuteDeleteMilestone}
        isLoading={isDeletingMilestone}
        title="Delete Milestone"
        message={`Are you sure you want to delete milestone "${milestoneToDelete?.title}"? All checkpoints within this milestone will be removed.`}
        confirmText="Delete Milestone"
        confirmVariant="red"
        iconType="danger"
      />
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
