"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDuration, formatDate } from "@/lib/formatters";
import {
  GraduationCap,
  Plus,
  TrendingUp,
  Target,
  Share2,
  Download,
  BookOpen,
  Award,
  Zap,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Heart,
  Pencil,
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
  Legend,
} from "recharts";
import { toPng } from "html-to-image";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { format } from "date-fns";
import clsx from "clsx";

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [partner, setPartner] = useState<{ name: string; nickname: string; phone: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Manual study session entry
  const [manualProject, setManualProject] = useState("");
  const [manualDuration, setManualDuration] = useState("45");
  const [manualCategory, setManualCategory] = useState("Deep Study");

  // Study Goal State (Daily & Weekly)
  const [dailyTargetHours, setDailyTargetHours] = useState<number>(3);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(21);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalModeTab, setGoalModeTab] = useState<"DAILY" | "WEEKLY">("DAILY");
  const [tempDailyInput, setTempDailyInput] = useState<string>("3");
  const [tempWeeklyInput, setTempWeeklyInput] = useState<string>("21");

  // Share Modal & Image Export states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareStatus, setShareStatus] = useState<{ text: string; error?: boolean } | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const fetchProgress = async () => {
    try {
      const [progressRes, relRes] = await Promise.all([
        fetch("/api/progress"),
        fetch("/api/relationship"),
      ]);
      if (progressRes.ok) {
        const json = await progressRes.json();
        setData(json);
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
    setTempWeeklyInput(weekly.toString());

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

  const handleSaveWeeklyGoal = (newHours: number) => {
    const val = Math.max(1, Math.min(168, Math.round(newHours)));
    setWeeklyTargetHours(val);
    setTempWeeklyInput(val.toString());
    if (typeof window !== "undefined") {
      localStorage.setItem("everthing_weekly_study_goal_hours", val.toString());
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

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualProject.trim()) return;

    try {
      await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: manualProject.trim(),
          durationMinutes: Number(manualDuration),
          type: "STUDY",
          notes: manualCategory,
        }),
      });
      haptics.success();
      setManualProject("");
      fetchProgress();
    } catch (err) {
      console.error("Manual study log error:", err);
      haptics.error();
    }
  };

  const { today, thisWeek, last7Days, recentSessions } = data || {};

  const todayStudyMinutes = today?.studyMinutes || 0;
  const todayStudySessions = (today?.sessions || []).filter((s: any) => s.type === "STUDY");
  const weekStudyMinutes = thisWeek?.studyMinutes || 0;
  const dailyTargetMinutes = dailyTargetHours * 60;
  const weeklyTargetMinutes = weeklyTargetHours * 60;
  const dailyProgressPercent = Math.min(
    100,
    Math.round((todayStudyMinutes / dailyTargetMinutes) * 100)
  );
  const weekProgressPercent = Math.min(
    100,
    Math.round((weekStudyMinutes / weeklyTargetMinutes) * 100)
  );
  const remainingDailyMinutes = Math.max(0, dailyTargetMinutes - todayStudyMinutes);
  const remainingWeeklyMinutes = Math.max(0, weeklyTargetMinutes - weekStudyMinutes);
  const todayEarnedXP = todayStudyMinutes;

  const partnerLabel =
    (partner?.name && partner.name.toLowerCase() !== "kunal"
      ? partner.name
      : partner?.nickname) || "Partner";

  // Send Today's Study to Partner Handler (Native Android Share / WhatsApp / Web Share API)
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
        // Web platform: Try Web Share API first
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
          // Direct WhatsApp web fallback + image download
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

  // Direct Image Download Handler
  const handleDownloadImage = async () => {
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

      if (Capacitor.isNativePlatform()) {
        const base64Data = dataUrl.split(",")[1];
        let fileResult;
        try {
          fileResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Documents,
          });
        } catch {
          fileResult = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });
        }

        // Open native share sheet so user can choose to Save to Photos / Drive
        try {
          const canShare = await Share.canShare();
          if (canShare.value) {
            await Share.share({
              title: "Today's Study Report • Everthing",
              url: fileResult.uri,
              dialogTitle: "Save Study Summary Image",
            });
          }
        } catch { }

        haptics.success();
        setShareStatus({ text: `Image saved to device: ${fileName}` });
      } else {
        const link = document.createElement("a");
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        haptics.success();
        setShareStatus({ text: "Study image downloaded!" });
      }
    } catch (err: any) {
      console.error("Failed to download image:", err);
      haptics.error();
      setShareStatus({ text: "Failed to export image.", error: true });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-red" />
            Study & Focus Analytics
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Daily & weekly study telemetry, subject rollups, and session logging
          </p>
        </div>

        <Button
          variant="red"
          size="sm"
          onClick={() => {
            haptics.selection();
            setShareStatus(null);
            setIsShareModalOpen(true);
          }}
          className="flex items-center gap-2 shadow-glow-red self-start sm:self-auto py-2.5 px-4 font-semibold"
        >
          <Heart className="w-4 h-4 text-rose-300 fill-rose-500/30" />
          <span>Send to {partnerLabel}</span>
        </Button>
      </div>

      {/* Hero Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card glow="red">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Today&apos;s Study Time
          </span>
          <p className="text-xl sm:text-2xl font-bold text-brand-red font-mono mt-1">
            {formatDuration(todayStudyMinutes)}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block truncate">
            {todayStudyMinutes >= dailyTargetMinutes
              ? `🎯 Daily Goal Met (${dailyTargetHours}h)!`
              : `${formatDuration(remainingDailyMinutes)} left to ${dailyTargetHours}h goal`}
          </span>
        </Card>

        <Card>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            This Week Total
          </span>
          <p className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">
            {formatDuration(weekStudyMinutes)}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block truncate">
            {weekProgressPercent}% of {weeklyTargetHours}h target
          </span>
        </Card>

        <Card>
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Today&apos;s Sessions
          </span>
          <p className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">
            {todayStudySessions.length}
          </p>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block truncate">
            Avg: {todayStudySessions.length > 0 ? Math.round(todayStudyMinutes / todayStudySessions.length) : 0}m / session
          </span>
        </Card>

        <Card glow="red">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block">
            Study XP Yield
          </span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-1">
            +{todayEarnedXP} XP
          </p>
          <span className="text-[10px] text-zinc-400 font-mono mt-1 block truncate">
            Feeds Companion & Karma
          </span>
        </Card>
      </div>

      {/* Study Target Progress (Daily & Weekly Customizable Goals) */}
      <Card glow="red" className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Target className="w-4 h-4 text-brand-red shrink-0" />
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Study Targets & Progress
            </span>
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                setIsEditingGoal(!isEditingGoal);
              }}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-brand-red/50 text-[10px] font-mono text-zinc-300 hover:text-white flex items-center gap-1 transition-all active:scale-95"
              title="Configure Daily & Weekly Study Goals"
            >
              <Pencil className="w-2.5 h-2.5 text-brand-red" />
              <span>{isEditingGoal ? "Close Editor" : "Set Goals"}</span>
            </button>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className={clsx("font-bold", todayStudyMinutes >= dailyTargetMinutes ? "text-emerald-400" : "text-brand-red")}>
              Today: {dailyProgressPercent}%
            </span>
            <span className="text-zinc-600">|</span>
            <span className={clsx("font-bold", weekStudyMinutes >= weeklyTargetMinutes ? "text-emerald-400" : "text-zinc-300")}>
              Week: {weekProgressPercent}%
            </span>
          </div>
        </div>

        {/* Inline Goal Customizer */}
        {isEditingGoal && (
          <div className="my-3 p-3.5 rounded-2xl bg-black/80 border border-brand-red/30 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Mode Switcher: Daily vs Weekly */}
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-white/[0.04] border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setGoalModeTab("DAILY");
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all min-h-[36px]",
                    goalModeTab === "DAILY"
                      ? "bg-brand-red text-white shadow-glow-red"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Daily Goal ({dailyTargetHours}h/d)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setGoalModeTab("WEEKLY");
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all min-h-[36px]",
                    goalModeTab === "WEEKLY"
                      ? "bg-brand-red text-white shadow-glow-red"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  Weekly Goal ({weeklyTargetHours}h/w)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingGoal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {goalModeTab === "DAILY" ? (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  Select Daily Study Target Hours (shown on Home Tile):
                </span>
                {/* Presets Chips - touch friendly */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-3">
                  {[1, 2, 3, 4, 5, 6, 8].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSaveDailyGoal(preset)}
                      className={clsx(
                        "h-11 rounded-xl text-xs font-mono font-bold border flex items-center justify-center transition-all active:scale-95",
                        dailyTargetHours === preset
                          ? "bg-brand-red text-white border-brand-red shadow-glow-red"
                          : "bg-white/[0.04] text-zinc-300 border-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {preset}h/day
                    </button>
                  ))}
                </div>

                {/* Custom Daily Hours Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const num = Number(tempDailyInput);
                    if (!isNaN(num) && num > 0) {
                      handleSaveDailyGoal(num);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      value={tempDailyInput}
                      onChange={(e) => setTempDailyInput(e.target.value)}
                      placeholder="Custom daily hours"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white focus:outline-none focus:border-brand-red font-mono h-11"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500">
                      Hours/day
                    </span>
                  </div>
                  <Button variant="red" size="sm" type="submit" className="h-11 px-4 text-xs font-semibold">
                    Save Daily Goal
                  </Button>
                </form>
              </div>
            ) : (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-2">
                  Select Weekly Study Target Hours:
                </span>
                {/* Presets Chips - touch friendly */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3">
                  {[10, 15, 20, 25, 30, 40].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSaveWeeklyGoal(preset)}
                      className={clsx(
                        "h-11 rounded-xl text-xs font-mono font-bold border flex items-center justify-center transition-all active:scale-95",
                        weeklyTargetHours === preset
                          ? "bg-brand-red text-white border-brand-red shadow-glow-red"
                          : "bg-white/[0.04] text-zinc-300 border-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      {preset}h/wk
                    </button>
                  ))}
                </div>

                {/* Custom Weekly Hours Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const num = Number(tempWeeklyInput);
                    if (!isNaN(num) && num > 0) {
                      handleSaveWeeklyGoal(num);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={tempWeeklyInput}
                      onChange={(e) => setTempWeeklyInput(e.target.value)}
                      placeholder="Custom weekly hours"
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white focus:outline-none focus:border-brand-red font-mono h-11"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500">
                      Hours/week
                    </span>
                  </div>
                  <Button variant="red" size="sm" type="submit" className="h-11 px-4 text-xs font-semibold">
                    Save Weekly Goal
                  </Button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Dual Progress Bars: Daily & Weekly */}
        <div className="space-y-3 pt-1">
          {/* Daily Track */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-zinc-400">
                Daily Goal: <strong className="text-white">{formatDuration(todayStudyMinutes)}</strong> / {dailyTargetHours}h
              </span>
              <span className={clsx("font-bold", todayStudyMinutes >= dailyTargetMinutes ? "text-emerald-400" : "text-brand-red")}>
                {todayStudyMinutes >= dailyTargetMinutes ? "🎯 Done!" : `${formatDuration(remainingDailyMinutes)} left`}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  todayStudyMinutes >= dailyTargetMinutes ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-brand-red shadow-glow-red"
                )}
                style={{ width: `${Math.max(3, dailyProgressPercent)}%` }}
              />
            </div>
          </div>

          {/* Weekly Track */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-zinc-400">
                Weekly Goal: <strong className="text-white">{formatDuration(weekStudyMinutes)}</strong> / {weeklyTargetHours}h
              </span>
              <span className={clsx("font-bold", weekStudyMinutes >= weeklyTargetMinutes ? "text-emerald-400" : "text-zinc-400")}>
                {weekStudyMinutes >= weeklyTargetMinutes ? "🎯 Smashed!" : `${formatDuration(remainingWeeklyMinutes)} left`}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  weekStudyMinutes >= weeklyTargetMinutes ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-gradient-to-r from-red-600 to-rose-500"
                )}
                style={{ width: `${Math.max(3, weekProgressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mt-2.5 pt-2 border-t border-white/5">
          <span>
            {todayStudyMinutes >= dailyTargetMinutes
              ? "✨ Daily target achieved — keep crushing it!"
              : `${formatDuration(remainingDailyMinutes)} needed today to reach ${dailyTargetHours}h`}
          </span>
          <span>
            Pace: {Math.round(((weekStudyMinutes / (new Date().getDay() || 7)) / 60) * 10) / 10}h / day
          </span>
        </div>
      </Card>

      {/* Grid: Manual Log + 7-Day Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Activity Entry */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          <div>
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-brand-red" />
                <CardTitle>Log Study Session</CardTitle>
              </div>
            </CardHeader>

            <form onSubmit={handleManualLog} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                  Subject / Focus Area *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Algorithms, System Design, Physics"
                  value={manualProject}
                  onChange={(e) => setManualProject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                    Study Mode
                  </label>
                  <Select
                    value={manualCategory}
                    onValueChange={setManualCategory}
                  >
                    <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
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
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              {/* Quick Pomodoro Chips */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="block text-[10px] font-mono text-zinc-500 uppercase">
                    Quick Pomodoro Presets
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    +{Math.max(5, Number(manualDuration) || 0)} XP Yield
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 45, 60, 90].map((mins) => {
                    const isSelected = Number(manualDuration) === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          haptics.selection();
                          setManualDuration(String(mins));
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-mono transition-all border text-center flex flex-col items-center justify-center ${isSelected
                          ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red"
                          : "bg-white/[0.03] text-zinc-400 border-white/5 hover:border-white/20 hover:text-white"
                          }`}
                      >
                        <span>{mins}m</span>
                        <span className={`text-[9px] ${isSelected ? "text-white/90" : "text-emerald-400"}`}>
                          +{mins}XP
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <Button variant="red" size="sm" type="submit" className="w-full py-2.5 font-semibold">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Study Session (+{Math.max(5, Number(manualDuration) || 0)} XP)</span>
                </Button>
              </div>
            </form>
          </div>
        </Card>

        {/* 7-Day Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-red" />
              <CardTitle>Last 7 Days Study Hours</CardTitle>
            </div>
          </CardHeader>

          <div className="h-64 min-h-[256px] w-full pt-4">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days || []}>
                  <XAxis dataKey="day" stroke="#71717A" fontSize={11} fontStyle="monospace" />
                  <YAxis stroke="#71717A" fontSize={11} unit="h" fontStyle="monospace" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.95)",
                      borderColor: "rgba(255,255,255,0.15)",
                      borderRadius: "1rem",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px", fontFamily: "monospace" }} />
                  <Bar dataKey="studyHours" name="Study Hours" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                Loading study analytics...
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-red" />
            <CardTitle>Recent Study Sessions</CardTitle>
          </div>
        </CardHeader>

        <div className="divide-y divide-white/5">
          {!recentSessions || recentSessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 font-mono">
              No study sessions logged yet. Record your first deep study session above!
            </div>
          ) : (
            recentSessions.map((s: any) => (
              <div
                key={s.id}
                className="py-3.5 px-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Badge variant="red" size="sm">
                    STUDY
                  </Badge>
                  <div>
                    <span className="font-bold text-white block">{s.project}</span>
                    {s.notes && (
                      <span className="text-[10px] text-zinc-400 font-mono block">
                        {s.notes}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-zinc-400 font-mono">
                  <span className="text-white font-bold">
                    {formatDuration(s.durationMinutes)}
                  </span>
                  <span>{formatDate(s.date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Share Today's Study Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Send Today&apos;s Study to {partnerLabel}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  setIsShareModalOpen(false);
                }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Subtitle */}
            <p className="text-xs text-zinc-400 font-mono mt-3 mb-4">
              Preview high-resolution study report card and send directly to {partnerLabel} with personalized progress stats.
            </p>

            {/* Status Alert if any */}
            {shareStatus && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${shareStatus.error
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
              >
                {shareStatus.error ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{shareStatus.text}</span>
              </div>
            )}

            {/* Centered Preview Card (This exact element is exported to PNG) */}
            <div className="flex justify-center my-3 overflow-hidden">
              <div
                ref={shareCardRef}
                style={{
                  background: "radial-gradient(ellipse at top, #1f1214 0%, #09090b 70%)",
                  boxShadow: "0 0 40px rgba(239, 68, 68, 0.15)",
                }}
                className="w-full max-w-[400px] border border-red-500/30 rounded-3xl p-6 text-white select-none"
              >
                {/* Card Top Brand Row */}
                <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse shadow-glow-red" />
                    <div>
                      <span className="font-mono font-bold tracking-widest text-xs text-white block">
                        EVERTHING
                      </span>
                      <span className="font-mono text-[9px] text-red-400 tracking-wider block -mt-0.5">
                        DEEP STUDY PROTOCOL
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-zinc-400 block">
                      {format(new Date(), "EEE, dd MMM yyyy")}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold block">
                      DISCIPLINE ACTIVE
                    </span>
                  </div>
                </div>

                {/* Main Hero Study Time */}
                <div className="mt-5 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 block">
                    Today&apos;s Deep Study Time
                  </span>
                  <div className="text-5xl font-black font-mono text-white tracking-tight mt-1 flex items-baseline gap-2">
                    <span>{formatDuration(todayStudyMinutes)}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-bold">
                    <Zap className="w-3 h-3 text-brand-red" />
                    <span>+{todayEarnedXP} Discipline XP Yield</span>
                  </div>
                </div>

                {/* 3 Telemetry Pods */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/10 text-center font-mono">
                  <div className="p-2 rounded-xl bg-white/[0.03]">
                    <span className="text-[9px] text-zinc-500 block uppercase">Sessions</span>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      {todayStudySessions.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03]">
                    <span className="text-[9px] text-zinc-500 block uppercase">Week Total</span>
                    <span className="text-sm font-bold text-white block mt-0.5">
                      {formatDuration(weekStudyMinutes)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/[0.03]">
                    <span className="text-[9px] text-zinc-500 block uppercase">Week Goal</span>
                    <span className="text-sm font-bold text-red-400 block mt-0.5">
                      {weekProgressPercent}%
                    </span>
                  </div>
                </div>

                {/* Today's Subjects Breakdown */}
                <div className="mt-3.5 space-y-1.5">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block mb-1">
                    Today&apos;s Subject Breakdown
                  </span>
                  {todayStudySessions.length === 0 ? (
                    <div className="text-[11px] font-mono text-zinc-500 italic py-2 text-center">
                      Deep study session in progress
                    </div>
                  ) : (
                    todayStudySessions.slice(0, 4).map((s: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1 border-b border-white/5 font-mono"
                      >
                        <span className="text-zinc-200 truncate pr-2 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red inline-block shrink-0" />
                          <span className="truncate">{s.project}</span>
                        </span>
                        <span className="text-white font-bold shrink-0">
                          {formatDuration(s.durationMinutes)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Card Footer / Philosophy Watermark */}
                <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-zinc-500">
                  <span>Consistency is the algorithm of mastery.</span>
                  <span className="text-rose-400/90 font-bold font-mono">Everthing • {partnerLabel}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
              <Button
                variant="red"
                size="sm"
                disabled={isExporting}
                onClick={handleSendToPartner}
                className="py-2.5 flex items-center justify-center gap-2 font-semibold shadow-glow-red"
              >
                <Heart className="w-4 h-4 text-rose-300 fill-rose-500/30" />
                <span>{isExporting ? "Sending..." : `Send to ${partnerLabel}`}</span>
              </Button>

              <Button
                variant="white"
                size="sm"
                disabled={isExporting}
                onClick={handleDownloadImage}
                className="py-2.5 flex items-center justify-center gap-2 font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download PNG</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
