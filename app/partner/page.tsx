"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Heart,
  Droplets,
  Clock,
  CheckSquare,
  Flame,
  Crown,
  Sparkles,
  ArrowLeft,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  UtensilsCrossed,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Edit2,
  Gift,
  BookOpen,
  Send,
  X,
  Phone,
  Cake,
  Check,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { PixelPet } from "@/components/discipline/PixelPet";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import { offlineCache } from "@/lib/offlineCache";
import clsx from "clsx";

export default function UnifiedPartnerHubPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [localWaterCount, setLocalWaterCount] = useState<number | null>(null);

  // Quick message composer state
  const [quickMessage, setQuickMessage] = useState("");

  // Edit Partner Profile Modal state
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNickname, setEditNickname] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [editAnniversary, setEditAnniversary] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPreferences, setEditPreferences] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const applyPartnerData = useCallback((json: any) => {
    if (!json) return;
    setData(json);

    if (json.partner) {
      setEditName(json.partner.name || "");
      setEditNickname(json.partner.nickname || "");
      setEditBirthday(json.partner.birthday || "");
      setEditAnniversary(json.partner.anniversary || "");
      setEditPhone(json.partner.phone || "");
      setEditPreferences(json.partner.preferences || "");
      setEditNotes(json.partner.notes || "");
    }

    // Read client-side local storage if available for same-device profile switching
    if (typeof window !== "undefined" && json.partner?.id) {
      const todayKey = format(new Date(), "yyyy-MM-dd");
      const localKey = `kunal_os_water_count_${json.partner.id}_${todayKey}`;
      const savedCount = localStorage.getItem(localKey);
      if (savedCount !== null) {
        const parsed = parseInt(savedCount, 10);
        if (!isNaN(parsed)) {
          setLocalWaterCount(parsed);
        }
      }
    }
  }, []);

  const fetchProgress = useCallback(async () => {
    try {
      await offlineCache.swr(
        "partner_progress_cache",
        async () => {
          const res = await fetch("/api/partner/progress", { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to fetch partner progress");
          return res.json();
        },
        (cached) => {
          applyPartnerData(cached);
          setLoading(false);
        }
      ).then((fresh) => {
        if (fresh) {
          applyPartnerData(fresh);
        }
      });
    } catch (err) {
      console.error("Failed to load partner progress:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applyPartnerData]);

  useEffect(() => {
    const cached = offlineCache.get<any>("partner_progress_cache");
    if (cached) {
      applyPartnerData(cached);
      setLoading(false);
    }

    fetchProgress();

    const handleRefresh = () => fetchProgress();
    window.addEventListener("kunal-os-refresh", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      window.removeEventListener("kunal-os-refresh", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [fetchProgress, applyPartnerData]);

  const handleManualRefresh = () => {
    haptics.impactLight();
    setRefreshing(true);
    fetchProgress();
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    haptics.selection();
    try {
      const res = await fetch("/api/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          nickname: editNickname.trim(),
          birthday: editBirthday || null,
          anniversary: editAnniversary || null,
          phone: editPhone.trim() || null,
          preferences: editPreferences.trim() || null,
          notes: editNotes.trim() || null,
        }),
      });
      if (res.ok) {
        haptics.success();
        setIsEditProfileOpen(false);
        fetchProgress();
      }
    } catch (err) {
      console.error("Failed to update partner profile:", err);
      haptics.error();
    } finally {
      setSavingProfile(false);
    }
  };

  const partner = data?.partner;
  const isFemale = partner?.gender === "FEMALE";
  const partnerNickname = partner?.nickname || partner?.name || "Partner";

  // Days until birthday / anniversary calculation
  const getDaysUntil = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const targetDate = new Date(dateStr);
      if (isNaN(targetDate.getTime())) return null;
      const today = new Date();
      const currentYear = today.getFullYear();
      let nextDate = new Date(currentYear, targetDate.getMonth(), targetDate.getDate());
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      if (nextDate < todayZero) {
        nextDate = new Date(currentYear + 1, targetDate.getMonth(), targetDate.getDate());
      }
      const diffTime = nextDate.getTime() - todayZero.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        daysLeft: diffDays,
        formattedDate: format(nextDate, "d MMM"),
        isToday: diffDays === 0,
      };
    } catch {
      return null;
    }
  };

  const birthdayInfo = getDaysUntil(partner?.birthday);
  const anniversaryInfo = getDaysUntil(partner?.anniversary);

  // Direct WhatsApp sender
  const handleSendWhatsApp = (customText?: string) => {
    haptics.impactMedium();
    const cleanPhone = (partner?.phone || "").replace(/[^0-9]/g, "");
    const message =
      customText?.trim() ||
      quickMessage.trim() ||
      `Hey ${partnerNickname}! Just checked your progress today ❤️ Proud of you!`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
    if (!customText && quickMessage) {
      setQuickMessage("");
    }
  };

  // Water Hydration Telemetry
  const serverWater = data?.water || {
    glasses: 0,
    target: 8,
    ml: 0,
    targetMl: 2000,
    percent: 0,
    goalMet: false,
    week: { totalGlasses: 0, avgGlasses: 0, daysMetGoal: 0, days: [] },
  };
  const finalGlasses = localWaterCount !== null ? Math.max(localWaterCount, serverWater.glasses) : serverWater.glasses;
  const finalTarget = serverWater.target || 8;
  const finalMl = finalGlasses * 250;
  const finalTargetMl = finalTarget * 250;
  const finalPercent = Math.min(100, Math.round((finalGlasses / Math.max(1, finalTarget)) * 100));
  const isGoalMet = finalGlasses >= finalTarget;
  const weeklyTrack = serverWater.week?.days || [];

  // Focus & Study Time
  const focus = data?.focus || {
    todayTotalMinutes: 0,
    todayWorkMinutes: 0,
    todayStudyMinutes: 0,
    todayPersonalMinutes: 0,
    weekTotalMinutes: 0,
    sessionsCountToday: 0,
    recentSessions: [],
  };

  // Pending & Completed Tasks
  const tasks = data?.tasks || {
    pendingCount: 0,
    completedTodayCount: 0,
    pending: [],
    completedToday: [],
  };

  // Habits & Streaks
  const habits = data?.habits || {
    totalCount: 0,
    completedTodayCount: 0,
    completionRate: 0,
    list: [],
  };

  // Discipline & Pet
  const discipline = data?.discipline;
  const latestDiary = data?.latestDiary;

  return (
    <PullToRefresh onRefresh={fetchProgress}>
      <div className="space-y-6 pb-12 animate-in fade-in duration-300">
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Heart className="w-4 h-4 fill-rose-500/20" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Partner Hub
              </h1>
              <p className="text-[10px] text-zinc-500 font-mono">
                Real-time connection &amp; shared discipline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/10 transition-colors"
              title="Refresh Partner Stream"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", refreshing && "animate-spin text-rose-400")} />
            </button>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-zinc-400 bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Stream</span>
            </div>
          </div>
        </div>

        {/* Partner Profile Header Glass Banner */}
        <Card
          glow={isFemale ? "rose" : "red"}
          className="relative overflow-hidden bg-gradient-to-r from-zinc-950 via-black to-zinc-950 border border-white/10 p-4 sm:p-6"
        >
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ProfileAvatar
                name={partner?.name || "Partner"}
                gender={isFemale ? "FEMALE" : "MALE"}
                size="lg"
                isSelected
              />
              <div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {partner?.name || "Partner"}
                  </h2>
                  {partner?.nickname && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      ❤️ {partner.nickname}
                    </span>
                  )}
                </div>

                {/* Milestone Countdowns (Birthday & Anniversary) */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 font-mono text-[11px]">
                  {birthdayInfo ? (
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all",
                        birthdayInfo.isToday
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-bold"
                          : "bg-white/[0.03] text-zinc-300 border-white/10"
                      )}
                    >
                      <Cake className="w-3.5 h-3.5 text-rose-400" />
                      <span>
                        {birthdayInfo.isToday
                          ? "🎉 Birthday is Today!"
                          : `Birthday in ${birthdayInfo.daysLeft}d (${birthdayInfo.formattedDate})`}
                      </span>
                    </span>
                  ) : null}

                  {anniversaryInfo ? (
                    <span
                      className={clsx(
                        "px-2.5 py-1 rounded-xl border flex items-center gap-1.5 transition-all",
                        anniversaryInfo.isToday
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse font-bold"
                          : "bg-white/[0.03] text-zinc-300 border-white/10"
                      )}
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {anniversaryInfo.isToday
                          ? "💍 Anniversary Today!"
                          : `Anniversary in ${anniversaryInfo.daysLeft}d (${anniversaryInfo.formattedDate})`}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Quick Contact & Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(true)}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white text-xs font-mono transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendWhatsApp()}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <Link
                href="/diary"
                onClick={() => haptics.selection()}
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold transition-all flex items-center gap-1.5 active:scale-95"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Daily Diary</span>
              </Link>
            </div>
          </div>

          {/* Preferences / Wishlist / Notes Snippet if available */}
          {(partner?.preferences || partner?.notes) && (
            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              {partner.preferences && (
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-rose-400 block uppercase font-bold mb-0.5">
                    🎁 Wishlist &amp; Favorites:
                  </span>
                  <p className="text-zinc-300 line-clamp-2">{partner.preferences}</p>
                </div>
              )}
              {partner.notes && (
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-[10px] text-amber-400 block uppercase font-bold mb-0.5">
                    📝 Relationship Notes:
                  </span>
                  <p className="text-zinc-300 line-clamp-2">{partner.notes}</p>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 1-Tap Quick WhatsApp Dispatch Bar */}
        <Card className="p-3 sm:p-4 bg-zinc-950/80 border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendWhatsApp();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                placeholder={`Send a quick message to ${partnerNickname} via WhatsApp...`}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-sans"
              />
            </div>
            <Button
              type="submit"
              variant="emerald"
              size="sm"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </Button>
          </form>
        </Card>

        {/* Today's Daily Diary Preview Card (if written) */}
        {latestDiary && (
          <Card
            glow="rose"
            className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/30 via-zinc-950 to-purple-950/30 border border-rose-500/25"
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Today&apos;s Daily Diary • {latestDiary.mood || "✨ Positive"}
                </h3>
              </div>
              <div className="flex items-center gap-1 text-amber-400 text-xs font-mono">
                {"★".repeat(latestDiary.rating || 5)}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {(latestDiary.highlights || latestDiary.highlight) && (
                <p className="text-xs text-zinc-300 font-sans italic">
                  &ldquo;{latestDiary.highlights || latestDiary.highlight}&rdquo;
                </p>
              )}
              {latestDiary.partnerNote && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 font-mono">
                  💌 <strong className="text-white">Note for {partnerNickname}:</strong>{" "}
                  {latestDiary.partnerNote}
                </div>
              )}
            </div>

            <div className="mt-3.5 pt-2.5 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">
                Logged for {format(new Date(latestDiary.date), "MMMM d, yyyy")}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const diaryMsg = `Dear ${partnerNickname} ❤️ Here is my Daily Diary for today:\n⭐ Rating: ${latestDiary.rating}/5\n✨ Highlight: ${latestDiary.highlight || "A productive day!"}\n🙏 Gratitude: ${latestDiary.gratitude || "Grateful for us"}${latestDiary.partnerNote ? `\n💌 Note for you: ${latestDiary.partnerNote}` : ""}`;
                    handleSendWhatsApp(diaryMsg);
                  }}
                  className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>Share via WhatsApp</span>
                </button>
                <span className="text-zinc-600">•</span>
                <Link
                  href="/diary"
                  className="text-[11px] font-mono text-rose-400 hover:text-rose-300 font-bold"
                >
                  View Diary →
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* 5 Rich Telemetry Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

          {/* 1. Water Drinking Record with 7-Day Track */}
          <Card glow="cyan" className="relative overflow-hidden bg-black/90 border border-cyan-500/30 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <Droplets className="w-4 h-4 fill-cyan-400/20" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Hydration &amp; Water Log
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                {isGoalMet ? "Goal Achieved 🎉" : `${finalPercent}% Today`}
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-cyan-400 tracking-tight">
                  {finalGlasses}{" "}
                  <span className="text-xs sm:text-sm font-normal text-zinc-400">
                    / {finalTarget} Glasses
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {finalMl.toLocaleString()} ml of {finalTargetMl.toLocaleString()} ml consumed today
                </p>
              </div>

              {isGoalMet ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold animate-pulse">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Goal Met (+30 XP)</span>
                </div>
              ) : (
                <div className="text-xs font-mono text-zinc-400 text-right">
                  <span>{Math.max(0, finalTarget - finalGlasses)} glasses left</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-3.5 w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]"
                style={{ width: `${Math.max(4, finalPercent)}%` }}
              />
            </div>

            {/* 7-Day Water Track History */}
            {weeklyTrack.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase">
                    Past 7 Days Hydration:
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    Avg: {serverWater.week?.avgGlasses || 0} glasses/day
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {weeklyTrack.map((day: any) => {
                    const isToday = day.date === format(new Date(), "yyyy-MM-dd");
                    return (
                      <div
                        key={day.date}
                        className={clsx(
                          "flex flex-col items-center p-1.5 rounded-xl border text-center font-mono transition-all",
                          isToday
                            ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold"
                            : day.goalMet
                            ? "bg-emerald-500/10 border-emerald-500/20 text-zinc-300"
                            : "bg-white/[0.02] border-white/5 text-zinc-400"
                        )}
                      >
                        <span className="text-[9px] text-zinc-500 block uppercase">
                          {day.dayLabel}
                        </span>
                        <span className="text-xs font-bold text-white my-0.5">
                          {day.count}
                        </span>
                        <span
                          className={clsx(
                            "w-2 h-2 rounded-full",
                            day.goalMet ? "bg-cyan-400" : "bg-zinc-700"
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* 2. Focus & Deep Work Time */}
          <Card glow="red" className="relative overflow-hidden bg-black/90 border border-purple-500/30 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Focus &amp; Study Time
                </h3>
              </div>
              <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-500/10 border border-purple-500/25 px-2 py-0.5 rounded-full">
                {focus.sessionsCountToday} Sessions Today
              </span>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                  {formatDuration(focus.todayTotalMinutes)}
                </div>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Work: {formatDuration(focus.todayWorkMinutes)} • Study: {formatDuration(focus.todayStudyMinutes)}
                </p>
              </div>
              <div className="text-right font-mono text-xs text-zinc-400">
                <span className="text-purple-400 font-bold">{formatDuration(focus.weekTotalMinutes)}</span>
                <span className="block text-[10px] text-zinc-500">This Week</span>
              </div>
            </div>

            {/* Recent Sessions Snippet */}
            <div className="mt-3.5 pt-3 border-t border-white/5 space-y-1.5">
              {focus.recentSessions.length === 0 ? (
                <p className="text-[11px] font-mono text-zinc-500 py-1">
                  No focus sessions logged today yet.
                </p>
              ) : (
                focus.recentSessions.slice(0, 2).map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-[11px] font-mono text-zinc-300 py-1 px-2 rounded-lg bg-white/[0.02]"
                  >
                    <span className="truncate max-w-[200px]">{s.project}</span>
                    <span className="text-purple-300 font-bold">{formatDuration(s.durationMinutes)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 3. Pending Tasks */}
          <Card glow="red" className="relative overflow-hidden bg-black/90 border border-white/10 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-brand-red">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Pending Tasks
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold">
                {tasks.completedTodayCount} Completed Today
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs font-mono text-zinc-400">
                Active Queue: <strong className="text-white">{tasks.pendingCount}</strong> tasks remaining
              </span>
            </div>

            <div className="mt-2.5 space-y-2 max-h-56 overflow-y-auto">
              {tasks.pending.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                  ✨ All clear! No pending tasks right now.
                </div>
              ) : (
                tasks.pending.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full bg-brand-red flex-shrink-0" />
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 font-mono text-[10px]">
                      {task.priority === "HIGH" && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
                          Urgent
                        </span>
                      )}
                      {task.category && (
                        <span className="text-zinc-500 hidden sm:inline">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* 4. Daily Habits & Dynamic Streaks */}
          <Card glow="red" className="relative overflow-hidden bg-black/90 border border-amber-500/30 p-4 sm:p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400/20" />
                </div>
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  Habits &amp; Streaks
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-full font-bold">
                {habits.completedTodayCount}/{habits.totalCount} Done ({habits.completionRate}%)
              </span>
            </div>

            <div className="mt-3.5 space-y-2 max-h-56 overflow-y-auto">
              {habits.list.length === 0 ? (
                <div className="text-center py-6 text-xs text-zinc-500 font-mono">
                  No habits registered yet.
                </div>
              ) : (
                habits.list.map((routine: any) => (
                  <div
                    key={routine.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      routine.completedToday
                        ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                        : "bg-white/[0.02] border-white/5 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          routine.completedToday
                            ? "bg-emerald-500 text-black"
                            : "border border-zinc-700 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="text-xs font-medium truncate">{routine.name}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 font-mono text-xs">
                      <span className="text-red-400 font-bold flex items-center gap-0.5">
                        <Flame className="w-3 h-3 fill-red-400" />
                        {routine.currentStreak}d
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          routine.completedToday
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {routine.completedToday ? "Done" : "Pending"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 5. Companion & Karma Hub */}
        {discipline ? (
          <Card
            glow={isFemale ? "rose" : "red"}
            className="relative overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 border border-brand-red/30 shadow-[0_0_30px_rgba(239,68,68,0.12)] p-4 sm:p-6"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-red/15 border border-brand-red/30 text-brand-red">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase font-mono tracking-wider">
                    {partnerNickname}&apos;s Companion &amp; Karma
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${discipline.isPetDead ? "bg-zinc-800 text-zinc-400" : "bg-brand-red text-white"}`}>
                  {discipline.isPetDead ? "R.I.P." : `LVL ${discipline.level}`}
                </span>
                {discipline.season && (
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                    • {discipline.season.name}
                  </span>
                )}
              </div>
            </div>

            {/* Companion Character + Stats */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 py-4">
              <div className="flex-shrink-0 flex justify-center sm:justify-start">
                <PixelPet
                  level={discipline.level}
                  totalXP={discipline.totalXP}
                  isPetDead={discipline.isPetDead}
                  purityStreak={discipline.streaks?.purity?.currentStreak || 0}
                  dietStreak={discipline.streaks?.diet?.currentStreak || 0}
                  todayDeducted={discipline.todayDeducted}
                  userName={partner?.name || "Partner"}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      {discipline.totalXP.toLocaleString()} XP
                    </span>
                    <span className="text-xs text-zinc-400 truncate">{discipline.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold">
                      +{discipline.todayEarned} Today
                    </span>
                    {discipline.todayDeducted > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold">
                        -{discipline.todayDeducted}
                      </span>
                    )}
                  </div>
                </div>

                {/* Laser Progress Bar */}
                <div>
                  <div className="w-full h-2 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-brand-red to-orange-500 rounded-full transition-all duration-500 shadow-glow-red"
                      style={{ width: `${Math.max(5, discipline.progressPercent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 mt-1">
                    <span>Level {discipline.level}</span>
                    <span>
                      {discipline.progressPercent}% ({discipline.currentLevelXP || discipline.totalXP}/{discipline.nextLevelXP} XP)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Discipline Streaks Chips */}
            <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.08]">
              <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-red flex-shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">Monk Purity</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">
                  {discipline.streaks?.purity?.currentStreak || 0}d
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="text-[11px] font-mono text-zinc-300 truncate">Clean Diet</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">
                  {discipline.streaks?.diet?.currentStreak || 0}d
                </span>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Edit Partner Profile Modal */}
        <Modal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          title="Edit Partner Profile"
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Partner Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Mradul"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Nickname / Pet Name
                </label>
                <input
                  type="text"
                  value={editNickname}
                  onChange={(e) => setEditNickname(e.target.value)}
                  placeholder="e.g. Bubba / Honey"
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Birthday (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={editBirthday}
                  onChange={(e) => setEditBirthday(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-400 mb-1">
                  Anniversary (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  value={editAnniversary}
                  onChange={(e) => setEditAnniversary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                WhatsApp Phone Number (with country code)
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Wishlist &amp; Preferences
              </label>
              <textarea
                value={editPreferences}
                onChange={(e) => setEditPreferences(e.target.value)}
                rows={2}
                placeholder="Favorite flowers, food, perfumes, gifts..."
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-sans resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1">
                Special Notes &amp; Memories
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="Important memories, promises, reminders..."
                className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-rose-500 font-sans resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditProfileOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="red"
                size="sm"
                disabled={savingProfile}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </PullToRefresh>
  );
}
