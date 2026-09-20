"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { format } from "date-fns";
import clsx from "clsx";
import {
  scheduleWaterReminders,
  cancelWaterReminders,
} from "@/lib/notifications";

const ML_PER_GLASS = 250;
const DEFAULT_TARGET_GLASSES = 8; // 8 x 250 = 2,000 ml

export function WaterTrackerCard() {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const storageCountKey = `kunal_os_water_count_${todayKey}`;
  const storageTargetKey = "kunal_os_water_target_glasses";
  const storageNotifKey = "kunal_os_water_notifications_enabled";

  const [drankGlasses, setDrankGlasses] = useState<number>(0);
  const [targetGlasses, setTargetGlasses] = useState<number>(DEFAULT_TARGET_GLASSES);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [isEditingTarget, setIsEditingTarget] = useState<boolean>(false);

  // Initialize from storage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Load today's count
    const savedCount = localStorage.getItem(storageCountKey);
    if (savedCount !== null) {
      const parsed = parseInt(savedCount, 10);
      if (!isNaN(parsed)) setDrankGlasses(parsed);
    }

    // Load user target
    const savedTarget = localStorage.getItem(storageTargetKey);
    if (savedTarget !== null) {
      const parsed = parseInt(savedTarget, 10);
      if (!isNaN(parsed) && parsed > 0) setTargetGlasses(parsed);
    }

    // Load notification state
    const savedNotif = localStorage.getItem(storageNotifKey);
    setNotificationsEnabled(savedNotif === "true");
  }, [storageCountKey]);

  // Update drank glasses
  const updateDrankGlasses = (newCount: number) => {
    const val = Math.max(0, newCount);
    setDrankGlasses(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageCountKey, val.toString());
    }
    if (val >= targetGlasses && drankGlasses < targetGlasses) {
      haptics.success();
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
    }
    haptics.impactLight();
  };

  // Toggle water reminders
  const handleToggleNotifications = async () => {
    haptics.impactMedium();
    if (notificationsEnabled) {
      await cancelWaterReminders();
      setNotificationsEnabled(false);
    } else {
      const success = await scheduleWaterReminders(2, 9, 21);
      if (success) {
        setNotificationsEnabled(true);
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
                <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono font-normal">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                  Goal Met!
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
      </div>
    </Card>
  );
}
