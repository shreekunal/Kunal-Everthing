"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { format, parseISO } from "date-fns";
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

  // Claim XP reward from API
  const claimReward = async (showToast = true) => {
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REWARD_WATER", points: 30 }),
      });
      const data = await res.json();
      if (res.ok) {
        setHasClaimedReward(true);
        if (showToast) {
          setRewardMessage(data.message || "+30 Monk Karma XP Earned!");
          setShowRewardToast(true);
          setTimeout(() => setShowRewardToast(false), 4500);
        }
        if (typeof window !== "undefined") {
          localStorage.setItem(storageRewardKey, "true");
          window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
        }
      }
    } catch (err) {
      console.error("Failed to claim water reward:", err);
    }
  };

  // Revert reward if user drops below target
  const revertReward = async () => {
    try {
      setHasClaimedReward(false);
      setShowRewardToast(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(storageRewardKey);
      }
      await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REVERT_WATER" }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
      }
    } catch (err) {
      console.error("Failed to revert water reward:", err);
    }
  };

  // Test instant water reminder
  const handleTestWaterAlert = async () => {
    setTestingNotif(true);
    haptics.impactLight();
    setNotifFeedback("Sending test alert (fires in 2s)...");
    const ok = await sendTestWaterNotification();
    setTestingNotif(false);
    if (ok) {
      setNotifFeedback("✓ Test notification scheduled! Check your notification shade in 2s.");
      setTimeout(() => setNotifFeedback(null), 5000);
    } else {
      setNotifFeedback("⚠️ Could not trigger notification. Ensure notifications are allowed.");
      setTimeout(() => setNotifFeedback(null), 5000);
    }
  };

  // Initialize from storage & fetch weekly data on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    let initialGlasses = 0;
    let currentTarget = DEFAULT_TARGET_GLASSES;

    // Load today's count
    let savedCount = localStorage.getItem(storageCountKey);
    if (savedCount === null && (activeUserId === "default" || activeUserId.startsWith("kunal"))) {
      savedCount = localStorage.getItem(`kunal_os_water_count_${todayKey}`);
    }
    if (savedCount !== null) {
      const parsed = parseInt(savedCount, 10);
      if (!isNaN(parsed)) {
        initialGlasses = parsed;
        setDrankGlasses(parsed);
      }
    } else {
      setDrankGlasses(0);
    }

    // Load user target
    let savedTarget = localStorage.getItem(storageTargetKey);
    if (savedTarget === null && (activeUserId === "default" || activeUserId.startsWith("kunal"))) {
      savedTarget = localStorage.getItem("kunal_os_water_target_glasses");
    }
    if (savedTarget !== null) {
      const parsed = parseInt(savedTarget, 10);
      if (!isNaN(parsed)) {
        currentTarget = parsed;
        setTargetGlasses(parsed);
      }
    } else {
      setTargetGlasses(DEFAULT_TARGET_GLASSES);
    }

    // Load notification state
    const savedNotif = localStorage.getItem(storageNotifKey);
    setNotificationsEnabled(savedNotif === "true");
    areWaterNotificationsActive().then((active) => {
      if (active) setNotificationsEnabled(true);
    });

    // Load reward claimed state
    const savedReward = localStorage.getItem(storageRewardKey);
    if (savedReward === "true") {
      setHasClaimedReward(true);
    } else {
      setHasClaimedReward(false);
      if (initialGlasses >= currentTarget) {
        claimReward(false);
      }
    }

    fetchWaterData();
  }, [storageCountKey, storageTargetKey, storageNotifKey, storageRewardKey, activeUserId, todayKey, fetchWaterData]);

  // Sync claimed state with server rewards on mount
  useEffect(() => {
    fetch("/api/rewards")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.recentLogs) {
          const claimed = data.recentLogs.some(
            (log: any) => log.referenceId === `water_${todayKey}`
          );
          if (claimed) {
            setHasClaimedReward(true);
            if (typeof window !== "undefined") {
              localStorage.setItem(storageRewardKey, "true");
            }
          }
        }
      })
      .catch(() => {});
  }, [todayKey, storageRewardKey]);

  // Update drank glasses
  const updateDrankGlasses = (newCount: number) => {
    const val = Math.max(0, newCount);
    const prevCount = drankGlasses;
    setDrankGlasses(val);

    if (typeof window !== "undefined") {
      localStorage.setItem(storageCountKey, val.toString());
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
      claimReward(true);
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
    <Card glow="cyan" className="relative overflow-hidden group border-cyan-500/20">
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Droplets className="w-4 h-4 fill-cyan-400/20" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              Hydration & Water
              {isGoalAchieved && (
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Goal Met • +30 XP!
                </span>
              )}
            </CardTitle>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Notifications Toggle */}
          <button
            type="button"
            onClick={handleToggleNotifications}
            title={notificationsEnabled ? "Disable 2h Reminders" : "Enable 2h Reminders"}
            className={clsx(
              "p-1.5 rounded-lg border transition-all active:scale-90",
              notificationsEnabled
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "bg-white/[0.03] border-white/10 text-zinc-500 hover:text-zinc-300"
            )}
          >
            {notificationsEnabled ? (
              <Bell className="w-3.5 h-3.5" />
            ) : (
              <BellOff className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Target Glasses Edit Trigger */}
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              setIsEditingTarget(!isEditingTarget);
            }}
            className="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300"
          >
            {isEditingTarget ? "Done" : `${targetGlasses} Glasses`}
          </button>
        </div>
      </CardHeader>

      <div className="space-y-4">
        {/* Celebratory Reward Notification Toast */}
        {showRewardToast && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/90 via-emerald-950/80 to-cyan-950/90 border border-cyan-400/50 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2 duration-300 shadow-[0_0_25px_rgba(6,182,212,0.35)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-white flex items-center gap-1.5 text-xs">
                  Hydration Target Completed!
                  <span className="text-emerald-400 font-mono font-bold">+30 XP</span>
                </p>
                <p className="text-[11px] text-zinc-300 font-mono">
                  {rewardMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowRewardToast(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Notification Status / Feedback Banner */}
        {notifFeedback && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center justify-between animate-in fade-in duration-200">
            <span className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 animate-pulse" />
              <span>{notifFeedback}</span>
            </span>
            <button
              type="button"
              onClick={() => setNotifFeedback(null)}
              className="text-zinc-400 hover:text-white p-0.5 ml-2 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Metric & Liquid Progress Bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono tracking-tight text-white">
                {drankGlasses}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                / {targetGlasses} glasses ({drankMl} / {targetMl} ml)
              </span>
            </div>
            <span className="text-xs font-mono font-semibold text-cyan-400">
              {progressPercent}%
            </span>
          </div>

          <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden p-0.5">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500 ease-out",
                isGoalAchieved
                  ? "bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Target Stepper Editor (Visible when user taps target badge) */}
        {isEditingTarget && (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-xs animate-in fade-in duration-200">
            <span className="text-zinc-300 font-mono">Set Daily Target:</span>
            <div className="flex items-center gap-2 font-mono">
              <button
                type="button"
                onClick={() => updateTargetGlasses(targetGlasses - 1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90"
              >
                -
              </button>
              <span className="w-8 text-center font-bold text-cyan-300">
                {targetGlasses}
              </span>
              <button
                type="button"
                onClick={() => updateTargetGlasses(targetGlasses + 1)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Interactive Visual Glass Grid */}
        <div className="grid grid-cols-8 sm:grid-cols-8 gap-1.5 py-1">
          {Array.from({ length: Math.max(targetGlasses, drankGlasses) }).map((_, idx) => {
            const isFilled = idx < drankGlasses;
            const isExtra = idx >= targetGlasses;
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
                  "h-10 rounded-xl border flex flex-col items-center justify-center transition-all duration-200 active:scale-90 group/glass relative",
                  isFilled
                    ? isExtra
                      ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                      : "bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                    : "bg-white/[0.03] border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400"
                )}
              >
                <Droplets
                  className={clsx(
                    "w-4 h-4 transition-transform group-hover/glass:scale-110",
                    isFilled ? "fill-current" : "fill-transparent"
                  )}
                />
                <span className="text-[9px] font-mono leading-none mt-0.5 opacity-75">
                  {idx + 1}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => updateDrankGlasses(drankGlasses - 1)}
            disabled={drankGlasses === 0}
            className="flex-1 text-xs border-white/10 hover:bg-white/10"
          >
            <Minus className="w-3.5 h-3.5 mr-1" />
            1 Glass
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => updateDrankGlasses(drankGlasses + 1)}
            className="flex-[2] text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-cyan-400/30 text-white font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="w-4 h-4 mr-1 stroke-[2.5]" />
            Drank 1 Glass (+250ml)
          </Button>

          {drankGlasses > 0 && (
            <button
              type="button"
              onClick={() => {
                haptics.warning();
                updateDrankGlasses(0);
              }}
              title="Reset Today"
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 7-Day Rolling Weekly Hydration Track */}
        <div className="pt-3 border-t border-white/[0.08]">
          <div className="flex items-center justify-between text-[11px] font-mono mb-2">
            <span className="text-zinc-300 flex items-center gap-1.5 font-bold">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>7-Day Hydration Track</span>
            </span>
            <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              {weeklyData.daysMetGoal}/7 Days Goal Met • {((weeklyData.totalGlasses * 250) / 1000).toFixed(1)}L Total
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
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
                    "p-2 rounded-xl border flex flex-col items-center justify-between transition-all",
                    isToday
                      ? "bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                      : isMet
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-white/[0.02] border-white/5 text-zinc-400"
                  )}
                >
                  <span className="text-[9px] font-mono uppercase text-zinc-400">
                    {day.dayLabel}
                  </span>
                  <span className="text-xs font-mono font-bold text-white mt-0.5">
                    {day.dayNumber || ""}
                  </span>

                  {/* Micro Cylinder Level Indicator */}
                  <div className="w-full h-8 bg-black/40 border border-white/10 rounded-md overflow-hidden relative my-1.5 p-0.5 flex flex-col justify-end">
                    <div
                      className={clsx(
                        "w-full rounded-sm transition-all duration-500",
                        isMet
                          ? "bg-gradient-to-t from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-gradient-to-t from-cyan-600 to-cyan-400"
                      )}
                      style={{ height: `${Math.max(6, pct)}%` }}
                    />
                  </div>

                  <span className="text-[9px] font-mono font-semibold">
                    {isMet ? "✓" : `${count}/${target}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notification Status & 1-Click Verification Trigger */}
        <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <span
              className={clsx(
                "w-2 h-2 rounded-full transition-all",
                notificationsEnabled
                  ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  : "bg-zinc-600"
              )}
            />
            <span>
              {notificationsEnabled
                ? "2h Reminders (9 AM – 9 PM)"
                : "Reminders Disabled"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleTestWaterAlert}
            disabled={testingNotif}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 active:scale-95 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono transition-all flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.15)] disabled:opacity-50"
            title="Fire an instant water notification in 2 seconds"
          >
            <Bell className="w-3.5 h-3.5 text-cyan-400" />
            <span>{testingNotif ? "Scheduling..." : "Test Alert (2s)"}</span>
          </button>
        </div>
      </div>
    </Card>
  );
}
