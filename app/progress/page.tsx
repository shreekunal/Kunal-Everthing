"use client";

import React, { useState, useEffect, Suspense } from "react";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  GraduationCap,
  Heart,
  Pencil,
  Flame,
  Timer,
  Layers,
  Activity,
} from "lucide-react";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { PartnerFocusBroadcast } from "@/components/progress/PartnerFocusBroadcast";
import { FocusLogTab } from "@/components/progress/FocusLogTab";
import { AimsTab } from "@/components/progress/AimsTab";
import { AnalyticsTab } from "@/components/progress/AnalyticsTab";
import { ShareTodayStudyModal } from "@/components/progress/ShareTodayStudyModal";
import { SaveSessionModal } from "@/components/progress/SaveSessionModal";
import type { DecayingTopic } from "@/components/progress/KnowledgeDecayRadar";
import type { HeatmapDay, HeatmapStats } from "@/components/progress/ConsistencyHeatmap60d";

function ProgressContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [aimsData, setAimsData] = useState<any[]>([]);
  const [partner, setPartner] = useState<{ name: string; nickname: string; phone: string | null } | null>(null);
  const [, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Active View Tab on Mobile
  const [activeTab, setActiveTab] = useState<"LOG" | "AIMS" | "ANALYTICS">("LOG");

  useEffect(() => {
    const tabParam = searchParams.get("tab")?.toUpperCase();
    if (tabParam === "AIMS" || tabParam === "AIM" || tabParam === "STUDY") {
      setActiveTab("AIMS");
    } else if (tabParam === "LOG" || tabParam === "FOCUS") {
      setActiveTab("LOG");
    } else if (tabParam === "ANALYTICS") {
      setActiveTab("ANALYTICS");
    }
  }, [searchParams]);

  // Study session entry (always logs for today)
  const [manualProject, setManualProject] = useState("");
  const [manualDuration, setManualDuration] = useState("60");
  const [, setDeletingId] = useState<string | null>(null);
  const [isLoggingStudy, setIsLoggingStudy] = useState(false);

  // From/To Time, Topic Linking
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  // Stopwatch Completion & Direct Save Modal State
  const [showStopwatchModal, setShowStopwatchModal] = useState<boolean>(false);
  const [swModalDuration, setSwModalDuration] = useState<string>("60");
  const [swModalProject, setSwModalProject] = useState<string>("");
  const [swModalTopicId, setSwModalTopicId] = useState<string>("");
  const [swModalStartTime, setSwModalStartTime] = useState<string>("");
  const [swModalEndTime, setSwModalEndTime] = useState<string>("");

  // 🐾 Co-Study Companion Mode State
  const [isCompanionMode, setIsCompanionMode] = useState<boolean>(true);

  // 📡 Spaced Repetition Knowledge Decay State
  const [decayingTopics, setDecayingTopics] = useState<DecayingTopic[]>([]);

  // 🟩 60-Day Consistency Heatmap State
  const [heatmapDays, setHeatmapDays] = useState<HeatmapDay[]>([]);
  const [heatmapStats, setHeatmapStats] = useState<HeatmapStats | null>(null);

  // Study Goal State (Weekdays vs Weekends)
  const [weekdayTargetHours, setWeekdayTargetHours] = useState<number>(3);
  const [weekendTargetHours, setWeekendTargetHours] = useState<number>(5);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(25);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);

  // Share Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 💖 Live Broadcast to Partner
  const broadcastFocus = (
    status: "RUNNING" | "PAUSED" | "COMPLETED" | "IDLE",
    remSecs?: number,
    totSecs?: number
  ) => {
    try {
      fetch("/api/progress/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          project: manualProject || (aimsData && aimsData.length > 0 ? aimsData[0].title : "Focus Flow"),
          topicTitle: selectedTopicId
            ? aimsData.flatMap((a: any) => a.milestones?.flatMap((m: any) => m.topics || []) || []).find((t: any) => t.id === selectedTopicId)?.title || null
            : null,
          mode: timerState.focusMode,
          remainingSeconds: remSecs !== undefined ? remSecs : timerState.timerRemainingSeconds,
          totalSeconds: totSecs !== undefined ? totSecs : timerState.timerTotalSeconds,
        }),
      }).catch(() => {});
    } catch {}
  };

  const timerState = useFocusTimer({
    onBroadcast: broadcastFocus,
  });

  // ⚡ 1-Tap Spaced Repetition Review
  const handleReviewDecayingTopic = (t: DecayingTopic) => {
    setSelectedTopicId(t.topicId);
    setManualProject(`${t.aimTitle} - ${t.topicTitle}`);
    setActiveTab("LOG");
    haptics.selection();
  };

  const handleOpenTimerSaveModal = () => {
    haptics.impactMedium();
    const now = Date.now();
    const pureSecs = timerState.swStatus === "COMPLETED" ? timerState.timerTotalSeconds : Math.max(1, timerState.timerTotalSeconds - timerState.timerRemainingSeconds);
    const pureMins = Math.max(1, Math.round(pureSecs / 60));
    const nowClock = format(new Date(), "HH:mm");
    const startClock = timerState.swStartClock || format(new Date(now - pureMins * 60000), "HH:mm");

    timerState.handlePauseTimer();

    setSwModalDuration(String(pureMins));
    setSwModalStartTime(startClock);
    setSwModalEndTime(nowClock);
    setSwModalProject(manualProject || (aimsData && aimsData.length > 0 ? aimsData[0].title : ""));
    setSwModalTopicId(selectedTopicId || "");
    setShowStopwatchModal(true);
  };

  const handleOpenStopwatchSaveModal = () => {
    haptics.impactMedium();
    const now = Date.now();
    let finalPureSecs = timerState.swAccumulatedSecs;
    if (timerState.swStatus === "RUNNING" && timerState.swLastResumeTimeMs) {
      finalPureSecs += Math.max(0, Math.floor((now - timerState.swLastResumeTimeMs) / 1000));
    }

    const pureMins = Math.max(1, Math.round(finalPureSecs / 60));
    const nowClock = format(new Date(), "HH:mm");
    const startClock = timerState.swStartClock || format(new Date(now - pureMins * 60000), "HH:mm");

    timerState.handlePauseStopwatch();

    setSwModalDuration(String(pureMins));
    setSwModalStartTime(startClock);
    setSwModalEndTime(nowClock);
    setSwModalProject(manualProject || (aimsData && aimsData.length > 0 ? aimsData[0].title : ""));
    setSwModalTopicId(selectedTopicId || "");
    setShowStopwatchModal(true);
  };

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
        if (json.last60Days) setHeatmapDays(json.last60Days);
        if (json.heatmapStats) setHeatmapStats(json.heatmapStats);
      }
      if (aimsRes.ok) {
        const aimsJson = await aimsRes.json();
        setAimsData(aimsJson.aims || []);
        if (aimsJson.decayingTopics) setDecayingTopics(aimsJson.decayingTopics);
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

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProject.trim() || isLoggingStudy) return;

    setIsLoggingStudy(true);
    try {
      const rawDur = Number(manualDuration) || 1;

      const res = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: manualProject.trim(),
          durationMinutes: rawDur,
          startTime: startTime || null,
          endTime: endTime || null,
          topicId: selectedTopicId || null,
          type: "STUDY",
          date: format(new Date(), "yyyy-MM-dd"),
          isCompanionMode,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to log focus session");
      }

      haptics.success();
      setManualProject("");
      setStartTime("");
      setEndTime("");
      setSelectedTopicId("");
      await fetchProgress();
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

  const { today, thisWeek, last7Days, cognitiveWindows, recentSessions } = data || {};
  const primeWindow = cognitiveWindows?.primeWindow;

  const todayStudyMinutes = today?.studyMinutes || 0;
  const todayStudySessions = (today?.sessions || []).filter((s: any) => s.type === "STUDY");
  const weekStudyMinutes = thisWeek?.studyMinutes || 0;
  const isTodayWeekend = mounted ? [0, 6].includes(new Date().getDay()) : false;
  const dailyTargetHours = isTodayWeekend ? weekendTargetHours : weekdayTargetHours;
  const dailyTargetMinutes = dailyTargetHours * 60;
  const weeklyTargetMinutes = weeklyTargetHours * 60;
  const dailyProgressPercent = Math.min(100, Math.round((todayStudyMinutes / dailyTargetMinutes) * 100));
  const todayEarnedXP = Math.floor(todayStudyMinutes / 5);

  const partnerLabel =
    (partner?.name && partner.name.toLowerCase() !== "kunal" ? partner.name : partner?.nickname) || "Partner";

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

      {/* 💖 Partner Live Focus Broadcast Beacon */}
      <PartnerFocusBroadcast />

      {/* Mobile-First Segmented Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("LOG");
          }}
          className={clsx(
            "py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 outline-none focus:outline-none focus-visible:outline-none select-none",
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
            "py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 outline-none focus:outline-none focus-visible:outline-none select-none",
            activeTab === "AIMS"
              ? "bg-brand-red text-white shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Aim ({aimsData.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("ANALYTICS");
          }}
          className={clsx(
            "py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 outline-none focus:outline-none focus-visible:outline-none select-none",
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
        <FocusLogTab
          timerState={timerState}
          isCompanionMode={isCompanionMode}
          onToggleCompanionMode={() => setIsCompanionMode(!isCompanionMode)}
          partnerLabel={partnerLabel}
          onOpenTimerSaveModal={handleOpenTimerSaveModal}
          onOpenStopwatchSaveModal={handleOpenStopwatchSaveModal}
          manualProject={manualProject}
          setManualProject={setManualProject}
          manualDuration={manualDuration}
          setManualDuration={setManualDuration}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          selectedTopicId={selectedTopicId}
          setSelectedTopicId={setSelectedTopicId}
          isLoggingStudy={isLoggingStudy}
          onManualLog={handleManualLog}
          aimsData={aimsData}
          recentSessions={recentSessions}
          onRepeatSession={handleRepeatSession}
          onDeleteSession={handleDeleteSession}
        />
      )}

      {/* TAB 2: Minimalist Aims & Syllabus Matrix */}
      {activeTab === "AIMS" && (
        <AimsTab
          aimsData={aimsData}
          setAimsData={setAimsData}
          decayingTopics={decayingTopics}
          onReviewTopic={handleReviewDecayingTopic}
          onRefresh={fetchProgress}
          onSelectTopicForFocus={(topicTitle, topicId) => {
            setManualProject(topicTitle);
            setSelectedTopicId(topicId);
            setActiveTab("LOG");
          }}
        />
      )}

      {/* TAB 3: Minimalist Analytics & Peak Windows */}
      {activeTab === "ANALYTICS" && (
        <AnalyticsTab
          heatmapDays={heatmapDays}
          heatmapStats={heatmapStats}
          decayingTopics={decayingTopics}
          onReviewTopic={handleReviewDecayingTopic}
          weekStudyMinutes={weekStudyMinutes}
          mounted={mounted}
          last7Days={last7Days}
          cognitiveWindows={cognitiveWindows}
          primeWindow={primeWindow}
          recentSessions={recentSessions}
          aimsData={aimsData}
        />
      )}

      {/* Share Today's Study Modal */}
      <ShareTodayStudyModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        partnerLabel={partnerLabel}
        partnerPhone={partner?.phone}
        todayStudyMinutes={todayStudyMinutes}
        todayEarnedXP={todayEarnedXP}
        todayStudySessionsCount={todayStudySessions.length}
        weekStudyMinutes={weekStudyMinutes}
      />

      {/* PHONE-LOCK FOCUS SESSION COMPLETE & SAVE MODAL */}
      <SaveSessionModal
        isOpen={showStopwatchModal}
        onClose={() => setShowStopwatchModal(false)}
        onDiscard={() => {
          setShowStopwatchModal(false);
          timerState.handleResetStopwatch();
        }}
        onSave={async (session) => {
          const res = await fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: session.project,
              durationMinutes: session.duration,
              startTime: session.startTime,
              endTime: session.endTime,
              topicId: session.topicId,
              type: "STUDY",
              date: format(new Date(), "yyyy-MM-dd"),
              isCompanionMode,
            }),
          });
          if (!res.ok) throw new Error("Failed to record study session");
          broadcastFocus("COMPLETED", 0, timerState.timerTotalSeconds);
          haptics.success();
          timerState.resetAfterSave(timerState.focusMode);
          await fetchProgress();
        }}
        initialDuration={swModalDuration}
        initialStartTime={swModalStartTime}
        initialEndTime={swModalEndTime}
        initialProject={swModalProject}
        initialTopicId={swModalTopicId}
        aimsData={aimsData}
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
