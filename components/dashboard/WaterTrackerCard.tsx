"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Droplets,
  Plus,
  Minus,
  Bell,
  BellOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  Trophy,
  Calendar,
  Sliders,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { format } from "date-fns";
import clsx from "clsx";
import {
  scheduleWaterReminders,
  cancelWaterReminders,
  sendTestWaterNotification,
  areWaterNotificationsActive,
} from "@/lib/notifications";

const ML_PER_GLASS = 250;
const DEFAULT_TARGET_GLASSES = 8; // 8 x 250 = 2,000 ml

export function WaterTrackerCard({ userId }: { userId?: string } = {}) {
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    if (userId) return userId;
    if (typeof window !== "undefined") {
      return localStorage.getItem("kunal_os_current_user_id") || "default";
    }
    return "default";
  });

  useEffect(() => {
    if (userId) {
      setActiveUserId(userId);
    } else if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kunal_os_current_user_id");
      if (stored) setActiveUserId(stored);
    }
  }, [userId]);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const storageCountKey = `kunal_os_water_count_${activeUserId}_${todayKey}`;
  const storageTargetKey = `kunal_os_water_target_glasses_${activeUserId}`;
  const storageNotifKey = `kunal_os_water_notifications_enabled_${activeUserId}`;
  const storageRewardKey = `kunal_os_water_reward_claimed_${activeUserId}_${todayKey}`;

  const [drankGlasses, setDrankGlasses] = useState<number>(0);
  const [targetGlasses, setTargetGlasses] = useState<number>(DEFAULT_TARGET_GLASSES);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);
  const [hasClaimedReward, setHasClaimedReward] = useState<boolean>(false);
  const [showRewardToast, setShowRewardToast] = useState<boolean>(false);
  const [rewardMessage, setRewardMessage] = useState<string>("+30 Monk Karma XP Earned!");
  const [testingNotif, setTestingNotif] = useState<boolean>(false);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  // Weekly Hydration Track State
  const [weeklyData, setWeeklyData] = useState<{
    totalGlasses: number;
    avgGlasses: number;
    daysMetGoal: number;
    days: Array<{
      date: string;
      dayLabel: string;
      dayNumber: string;
      count: number;
      target: number;
      goalMet: boolean;
      percent: number;
    }>;
  }>({
    totalGlasses: 0,
    avgGlasses: 0,
    daysMetGoal: 0,
    days: [],
  });

  // Fetch weekly hydration data from API
  const fetchWaterData = useCallback(async () => {
    try {
      const res = await fetch(`/api/water?userId=${encodeURIComponent(activeUserId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.week) {
          setWeeklyData(json.week);
        }
      }
    } catch (err) {
      console.error("Failed to load weekly water telemetry:", err);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load today's count
    let storedCount = localStorage.getItem(storageCountKey);
    if (storedCount === null && (activeUserId === "default" || activeUserId.startsWith("kunal"))) {
      storedCount = localStorage.getItem(`kunal_os_water_count_${todayKey}`);
    }
    if (storedCount !== null) {
      const val = parseInt(storedCount, 10);
      if (!isNaN(val)) setDrankGlasses(val);
    }

    // Load target
    let storedTarget = localStorage.getItem(storageTargetKey);
    if (storedTarget === null && (activeUserId === "default" || activeUserId.startsWith("kunal"))) {
      storedTarget = localStorage.getItem("kunal_os_water_target_glasses");
    }
    if (storedTarget !== null) {
      const val = parseInt(storedTarget, 10);
      if (!isNaN(val) && val > 0) setTargetGlasses(val);
    }

    // Load reward state
    const storedReward = localStorage.getItem(storageRewardKey);
    if (storedReward === "true") {
      setHasClaimedReward(true);
    }

    // Verify background notifications active state
    areWaterNotificationsActive().then((isActive) => {
      setNotificationsEnabled(isActive);
      localStorage.setItem(storageNotifKey, isActive ? "true" : "false");
    });

    fetchWaterData();

    const handleRefresh = () => {
      let refreshedCount = localStorage.getItem(storageCountKey);
      if (refreshedCount === null && (activeUserId === "default" || activeUserId.startsWith("kunal"))) {
        refreshedCount = localStorage.getItem(`kunal_os_water_count_${todayKey}`);
      }
      if (refreshedCount !== null) {
        const val = parseInt(refreshedCount, 10);
        if (!isNaN(val)) setDrankGlasses(val);
      }
      fetchWaterData();
    };

    window.addEventListener("kunal-os-refresh", handleRefresh);
    window.addEventListener("storage", handleRefresh);

    return () => {
      window.removeEventListener("kunal-os-refresh", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
    };
  }, [activeUserId, storageCountKey, storageTargetKey, storageRewardKey, storageNotifKey, todayKey, fetchWaterData]);

  // Claim 30 XP discipline reward once per day
  const claimReward = async () => {
    if (hasClaimedReward) return;

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REWARD_WATER_GOAL",
          points: 30,
          userId: activeUserId,
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        setHasClaimedReward(true);
        if (typeof window !== "undefined") {
          localStorage.setItem(storageRewardKey, "true");
          window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
        }
        setRewardMessage(json.message || "+30 Monk Karma XP Earned!");
        setShowRewardToast(true);
        haptics.success();
        setTimeout(() => setShowRewardToast(false), 5000);
      }
    } catch (err) {
      console.error("Failed to claim water goal reward:", err);
    }
  };

  // Revert reward if user drops below target after achieving
  const revertReward = async () => {
    if (!hasClaimedReward) return;

    try {
      await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVERT_WATER_GOAL",
          points: 30,
          userId: activeUserId,
        }),
      });

      setHasClaimedReward(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageRewardKey);
        window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
      }
    } catch (err) {
      console.error("Failed to revert water reward:", err);
    }
  };

  // Instant notification test
  const handleTestWaterAlert = async () => {
    setTestingNotif(true);
    haptics.impactLight();
    try {
      const scheduled = await sendTestWaterNotification();
      if (scheduled) {
        setNotifFeedback("✓ Test notification scheduled! Check your lock screen in 2s.");
      } else {
        setNotifFeedback("⚠️ Permission denied or notification not scheduled. Check browser permissions.");
      }
    } catch (e: any) {
      setNotifFeedback(`Error: ${e?.message || "Failed to trigger"}`);
    } finally {
      setTestingNotif(false);
      setTimeout(() => setNotifFeedback(null), 5000);
    }
  };

  // Update drank glasses count
  const updateDrankGlasses = (newCount: number) => {
    const val = Math.max(0, Math.min(32, newCount));
    const prevCount = drankGlasses;
    setDrankGlasses(val);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageCountKey, val.toString());
      if (activeUserId === "default" || activeUserId.startsWith("kunal")) {
        localStorage.setItem(`kunal_os_water_count_${todayKey}`, val.toString());
      }
      window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
    }

    // Optimistically update weekly track today item
    setWeeklyData((prev) => {
      const days = (prev.days || []).map((d) => {
        if (d.date === todayKey) {
          return {
            ...d,
            count: val,
            goalMet: val >= d.target,
            percent: Math.min(100, Math.round((val / Math.max(1, d.target)) * 100)),
          };
        }
        return d;
      });
      const total = days.reduce((acc, d) => acc + d.count, 0);
      const met = days.filter((d) => d.goalMet).length;
      return {
        ...prev,
        days,
        totalGlasses: total,
        daysMetGoal: met,
        avgGlasses: Number((total / Math.max(1, days.length)).toFixed(1)),
      };
    });

    // Sync to database for telemetry
    fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: val, target: targetGlasses, date: todayKey }),
    }).catch(() => {});

    const wasAchieved = prevCount >= targetGlasses;
    const isNowAchieved = val >= targetGlasses;

    if (isNowAchieved && (!wasAchieved || !hasClaimedReward)) {
      haptics.success();
      claimReward();
    } else if (!isNowAchieved && wasAchieved && hasClaimedReward) {
      haptics.warning();
      revertReward();
    } else {
      haptics.selection();
    }
  };

  // Update target glasses
  const updateTargetGlasses = (newTarget: number) => {
    const val = Math.max(1, Math.min(24, newTarget));
    setTargetGlasses(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageTargetKey, val.toString());
      window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
    }
    fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: drankGlasses, target: val, date: todayKey }),
    }).catch(() => {});
    haptics.impactLight();
  };

  // Toggle water reminders
  const handleToggleNotifications = async () => {
    haptics.impactMedium();
    if (notificationsEnabled) {
      await cancelWaterReminders();
      setNotificationsEnabled(false);
      setNotifFeedback("Hydration reminders cancelled.");
      setTimeout(() => setNotifFeedback(null), 3000);
    } else {
      const success = await scheduleWaterReminders(2, 9, 21);
      if (success) {
        setNotificationsEnabled(true);
        setNotifFeedback("✓ 2h Hydration Reminders Active (9:00 AM – 9:00 PM)!");
        setTimeout(() => setNotifFeedback(null), 4000);
      } else {
        setNotifFeedback("⚠️ Permission denied. Please enable notifications in Android Settings.");
        setTimeout(() => setNotifFeedback(null), 5000);
      }
    }
  };

  const drankMl = drankGlasses * ML_PER_GLASS;
  const targetMl = targetGlasses * ML_PER_GLASS;
  const progressPercent = Math.min(100, Math.round((drankGlasses / targetGlasses) * 100));
  const isGoalAchieved = drankGlasses >= targetGlasses;

  return (
    <Card glow="red" className="relative overflow-hidden group border-white/10 hover:border-brand-red/30 p-3.5 sm:p-4">
      {/* Background Subtle Red Ambient Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Ultra-Clean, Non-Wrapping Minimalist Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        {/* Left: Section Identity */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-red/10 border border-brand-red/25 text-brand-red flex-shrink-0">
            <Droplets className="w-3.5 h-3.5 fill-brand-red/20" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              Hydration
              {notificationsEnabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red shadow-glow-red animate-pulse" />
              )}
            </h3>
          </div>
        </div>

        {/* Right: Clean Utility Controls (Never wraps) */}
        <div className="flex items-center gap-1.5">
          {/* 2h Reminder Notification Toggle */}
          <button
            type="button"
            onClick={handleToggleNotifications}
            title={notificationsEnabled ? "2h Reminders Active (Tap to disable)" : "Enable 2h Reminders"}
            className={clsx(
              "p-1.5 rounded-lg border transition-all active:scale-95 flex items-center gap-1 text-[10px] font-mono",
              notificationsEnabled
                ? "bg-brand-red/15 border-brand-red/40 text-red-300 shadow-glow-red-subtle"
                : "bg-white/[0.03] border-white/10 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {notificationsEnabled ? (
              <Bell className="w-3.5 h-3.5 text-brand-red" />
            ) : (
              <BellOff className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Target Config Stepper Toggle */}
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              setIsEditingTarget(!isEditingTarget);
            }}
            className={clsx(
              "px-2 py-1 rounded-lg border text-[11px] font-mono transition-all flex items-center gap-1",
              isEditingTarget
                ? "bg-brand-red/20 border-brand-red/40 text-white font-bold"
                : "bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-zinc-400"
            )}
          >
            <Sliders className="w-3 h-3 text-brand-red" />
            <span>{targetGlasses}G</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 pt-3">
        {/* Celebratory Reward Notification Toast (Slides gracefully below header) */}
        {showRewardToast && (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-zinc-950 via-red-950/70 to-zinc-950 border border-brand-red/50 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-300 shadow-glow-red">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-red-300 flex-shrink-0">
                <Trophy className="w-3.5 h-3.5 text-brand-red animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-white flex items-center gap-1 text-[11px]">
                  Daily Goal Achieved!
                  <span className="text-red-300 font-mono font-bold">+30 XP</span>
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {rewardMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRewardToast(false)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/10 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Feedback / Status Alert */}
        {notifFeedback && (
          <div className="p-2 rounded-xl bg-brand-red/10 border border-brand-red/30 text-[11px] font-mono text-red-300 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-1.5 truncate">
              <Bell className="w-3 h-3 text-brand-red flex-shrink-0 animate-pulse" />
              <span className="truncate">{notifFeedback}</span>
            </span>
            <button
              type="button"
              onClick={() => setNotifFeedback(null)}
              className="text-zinc-400 hover:text-white p-0.5 ml-2 transition-colors flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* Target Stepper Accordion (Visible when user taps target pill) */}
        {isEditingTarget && (
          <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-brand-red/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
            <span className="text-zinc-400 font-mono text-[11px]">Daily Target:</span>
            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={() => updateTargetGlasses(targetGlasses - 1)}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90"
              >
                -
              </button>
              <span className="w-16 text-center font-bold text-red-300 text-xs">
                {targetGlasses} ({targetMl}ml)
              </span>
              <button
                type="button"
                onClick={() => updateTargetGlasses(targetGlasses + 1)}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTarget(false)}
                className="ml-2 text-[10px] text-zinc-400 hover:text-white underline"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* 2. Cockpit Metric & Status Row */}
        <div>
          <div className="flex items-end justify-between mb-1.5">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
                  {drankGlasses}
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  / {targetGlasses} <span className="hidden sm:inline">glasses</span>
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  ({drankMl} ml)
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              {isGoalAchieved ? (
                <span className="flex items-center gap-1 text-[10px] text-red-300 font-mono font-bold px-2 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 shadow-glow-red-subtle mb-1">
                  <Sparkles className="w-2.5 h-2.5 text-brand-red animate-pulse" />
                  GOAL MET (+30 XP)
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400 mb-1">
                  {targetGlasses - drankGlasses} left
                </span>
              )}
              <span className="text-xs font-mono font-bold text-red-300">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Fluid Laser Progress Bar */}
          <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-brand-redDark via-brand-red to-brand-redLight shadow-glow-red"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 3. Sleek Segmented Glass Reservoir */}
        <div className="grid grid-cols-8 gap-1 py-0.5">
          {Array.from({ length: Math.max(targetGlasses, drankGlasses) }).map((_, idx) => {
            const isFilled = idx < drankGlasses;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (idx === drankGlasses - 1) {
                    updateDrankGlasses(drankGlasses - 1);
                  } else {
                    updateDrankGlasses(idx + 1);
                  }
                }}
                title={`Glass ${idx + 1} (250ml)`}
                aria-label={`Glass ${idx + 1}`}
                className={clsx(
                  "h-8 rounded-lg border flex flex-col items-center justify-center transition-all duration-200 active:scale-95 group/glass relative",
                  isFilled
                    ? "bg-brand-red/15 border-brand-red/40 text-red-300 shadow-glow-red-subtle"
                    : "bg-white/[0.02] border-white/5 text-zinc-600 hover:border-white/20 hover:text-zinc-400"
                )}
              >
                <Droplets
                  className={clsx(
                    "w-3 h-3 transition-transform group-hover/glass:scale-110",
                    isFilled ? "fill-brand-red/30 text-brand-red" : "fill-transparent text-zinc-600"
                  )}
                />
                <span className="text-[8px] font-mono leading-none mt-0.5 opacity-80">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Quick Action Controls */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => updateDrankGlasses(drankGlasses - 1)}
            disabled={drankGlasses === 0}
            className="flex-1 text-[11px] h-8 border-white/10 hover:bg-white/10"
          >
            <Minus className="w-3 h-3 mr-1" />
            1 Glass
          </Button>

          <Button
            type="button"
            variant="red"
            size="sm"
            onClick={() => updateDrankGlasses(drankGlasses + 1)}
            className="flex-[2] text-[11px] h-8 font-bold shadow-glow-red"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            +1 Glass (250ml)
          </Button>

          {drankGlasses > 0 && (
            <button
              type="button"
              onClick={() => {
                haptics.warning();
                updateDrankGlasses(0);
              }}
              title="Reset Today"
              className="h-8 w-8 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 5. Minimalist 7-Day Rolling Weekly Telemetry */}
        <div className="pt-2.5 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
            <span className="text-zinc-400 flex items-center gap-1 font-semibold uppercase tracking-wider">
              <Calendar className="w-3 h-3 text-brand-red" />
              <span>7-Day Track</span>
            </span>
            <span className="text-red-300 font-bold bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.2 rounded-full text-[9px]">
              {weeklyData.daysMetGoal}/7 Met • {((weeklyData.totalGlasses * 250) / 1000).toFixed(1)}L Total
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {(weeklyData.days.length > 0 ? weeklyData.days : Array.from({ length: 7 }).map((_, i) => ({
              date: "",
              dayLabel: ["M", "T", "W", "T", "F", "S", "S"][i],
              dayNumber: "",
              count: 0,
              target: 8,
              goalMet: false,
              percent: 0,
            }))).map((day, idx) => {
              const isToday = day.date === todayKey;
              const isMet = isToday ? drankGlasses >= targetGlasses : day.goalMet;
              const count = isToday ? drankGlasses : day.count;
              const target = isToday ? targetGlasses : day.target;
              const pct = Math.min(100, Math.round((count / Math.max(1, target)) * 100));

              return (
                <div
                  key={day.date || idx}
                  className={clsx(
                    "p-1.5 rounded-lg border flex flex-col items-center justify-between transition-all",
                    isToday
                      ? "bg-brand-red/15 border-brand-red/40 shadow-glow-red-subtle"
                      : isMet
                      ? "bg-white/[0.04] border-brand-red/25 text-red-300"
                      : "bg-white/[0.015] border-white/5 text-zinc-500"
                  )}
                >
                  <span className="text-[8px] font-mono uppercase text-zinc-400">
                    {day.dayLabel}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-white">
                    {day.dayNumber || ""}
                  </span>

                  {/* Micro Cylinder Level Indicator */}
                  <div className="w-full h-5 bg-black/40 border border-white/5 rounded-sm overflow-hidden relative my-1 p-0.2 flex flex-col justify-end">
                    <div
                      className={clsx(
                        "w-full rounded-[1px] transition-all duration-500",
                        isMet
                          ? "bg-gradient-to-t from-brand-redDark to-brand-red shadow-glow-red-subtle"
                          : "bg-brand-red/40"
                      )}
                      style={{ height: `${Math.max(8, pct)}%` }}
                    />
                  </div>

                  <span className="text-[8px] font-mono font-semibold">
                    {isMet ? "✓" : `${count}/${target}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Footer: Status & Test Alert Trigger */}
        <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between text-[10px] font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full transition-all",
                notificationsEnabled
                  ? "bg-brand-red shadow-glow-red animate-pulse"
                  : "bg-zinc-600"
              )}
            />
            <span>
              {notificationsEnabled ? "2h Reminders (9 AM – 9 PM)" : "Reminders Off"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleTestWaterAlert}
            disabled={testingNotif}
            className="px-2 py-0.5 rounded-md bg-brand-red/10 hover:bg-brand-red/20 active:scale-95 text-red-300 border border-brand-red/25 text-[9px] font-mono transition-all flex items-center gap-1 shadow-glow-red-subtle disabled:opacity-50"
            title="Fire an instant water notification in 2 seconds"
          >
            <Bell className="w-2.5 h-2.5 text-brand-red" />
            <span>{testingNotif ? "Sending..." : "Test Alert (2s)"}</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
