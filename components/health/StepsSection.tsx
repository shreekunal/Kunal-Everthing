"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Footprints, Flame, MapPin, Clock, Plus, RefreshCw } from "lucide-react";
import { haptics } from "@/lib/haptics";
import { formatDuration } from "@/lib/formatters";
import {
  fetchHealthConnectSteps,
  requestHealthConnectPermission,
  checkHealthConnectPermission,
  isHealthConnectSupported,
  openHealthConnect,
} from "@/lib/healthSync";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface StepsSectionProps {
  stepsData: {
    today: {
      date: string;
      stepCount: number;
      targetSteps: number;
      distanceKm: number;
      calories: number;
      syncSource: string;
    };
    history: Array<{
      date: string;
      stepCount: number;
      targetSteps: number;
      distanceKm: number;
      calories: number;
    }>;
  };
  onRefresh: () => Promise<void>;
}

export function StepsSection({ stepsData, onRefresh }: StepsSectionProps) {
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCount, setManualCount] = useState(stepsData.today.stepCount.toString());
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  const currentSteps = stepsData.today.stepCount;
  const targetSteps = stepsData.today.targetSteps || 10000;
  const progressPercent = Math.min(100, Math.round((currentSteps / targetSteps) * 100));
  const activeMinutes = Math.floor(currentSteps / 100);

  const handleHealthSync = async () => {
    setIsHealthSyncing(true);
    setHealthStatus(null);
    haptics.impactLight();
    try {
      const isSupported = await isHealthConnectSupported();
      if (!isSupported) {
        setHealthStatus("Available on Android app");
        return;
      }

      const hasPerm = await checkHealthConnectPermission();
      if (!hasPerm) {
        const granted = await requestHealthConnectPermission();
        if (!granted) {
          setHealthStatus("Permission required");
          return;
        }
      }

      const result = await fetchHealthConnectSteps();
      if (result.success) {
        haptics.success();
        await onRefresh();
      } else {
        setHealthStatus(result.message || "Sync failed");
      }
    } catch {
      setHealthStatus("Sync error");
    } finally {
      setIsHealthSyncing(false);
    }
  };

  // Quick increment handler
  const handleIncrement = async (delta: number) => {
    haptics.impactLight();
    setIsIncrementing(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "INCREMENT_STEPS", delta }),
      });
      if (res.ok) {
        haptics.selection();
        await onRefresh();
      }
    } catch (err) {
      console.error("Increment steps error:", err);
    } finally {
      setIsIncrementing(false);
    }
  };

  // Direct manual save
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(manualCount, 10);
    if (isNaN(count) || count < 0) return;

    haptics.impactMedium();
    setIsIncrementing(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOG_STEPS",
          stepCount: count,
          syncSource: "MANUAL",
        }),
      });
      if (res.ok) {
        haptics.success();
        setShowManualModal(false);
        await onRefresh();
      }
    } catch (err) {
      console.error("Save manual steps error:", err);
    } finally {
      setIsIncrementing(false);
    }
  };

  // Chart data format
  const chartData = stepsData.history.map((h) => ({
    day: format(parseISO(h.date), "EEE"),
    steps: h.stepCount,
    target: h.targetSteps,
  }));

  // Circular progress calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
            <Footprints className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Daily Movement &amp; Steps
            </h2>
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5">
              <span>Target: {targetSteps.toLocaleString()}</span>
              {stepsData.today.syncSource === "HEALTH_CONNECT" ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  Health Connect
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleHealthSync}
                  disabled={isHealthSyncing}
                  className="text-brand-red hover:underline font-bold flex items-center gap-1"
                >
                  • {isHealthSyncing ? "Syncing..." : (healthStatus || "Sync Health")}
                </button>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setManualCount(currentSteps.toString());
            setShowManualModal(true);
          }}
          className="h-7 px-2.5 text-[10px] font-mono border border-brand-red/30 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red gap-1 rounded-md shadow-glow-red-subtle"
        >
          <Plus className="w-3 h-3" />
          <span>Log Steps</span>
        </Button>
      </div>

      <div className="space-y-4">
        {/* Main Progress Ring & Telemetry */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Radial Progress Ring */}
          <div className="relative flex items-center justify-center w-36 h-36 flex-shrink-0">
            <svg className="w-36 h-36 -rotate-90 transform" viewBox="0 0 128 128">
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-zinc-900"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="64"
                cy="64"
                r={radius}
                className="stroke-brand-red transition-all duration-700 ease-out"
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.45))",
                }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {currentSteps.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">
                {progressPercent}% Met
              </span>
            </div>
          </div>

          {/* Derived Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 w-full">
            <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
              <MapPin className="w-3.5 h-3.5 text-brand-red mb-1" />
              <span className="text-xs font-mono font-bold text-white">
                {stepsData.today.distanceKm.toFixed(2)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                km walked
              </span>
            </div>

            <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
              <Flame className="w-3.5 h-3.5 text-amber-500 mb-1" />
              <span className="text-xs font-mono font-bold text-white">
                {stepsData.today.calories}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                kcal burned
              </span>
            </div>

            <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
              <Clock className="w-3.5 h-3.5 text-zinc-400 mb-1" />
              <span className="text-xs font-mono font-bold text-white">
                {formatDuration(activeMinutes)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                active time
              </span>
            </div>
          </div>
        </div>

        {/* Quick Increment Buttons (Fallback & on-the-go logging) */}
        <div>
          <div className="mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
              Quick Add Steps
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {[500, 1000, 2500, 5000].map((delta) => (
              <button
                key={delta}
                type="button"
                disabled={isIncrementing}
                onClick={() => handleIncrement(delta)}
                className="py-1.5 px-2 bg-black/60 hover:bg-brand-red/10 border border-white/10 hover:border-brand-red/30 rounded-lg text-xs font-mono text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-1 active:scale-95"
              >
                <Plus className="w-3 h-3 text-brand-red" />
                <span>{delta >= 1000 ? `${delta / 1000}k` : delta}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 7-Day History Movement Chart */}
        {chartData.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
              7-Day Activity Trend
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="day"
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} steps`, "Steps"]}
                  />
                  <ReferenceLine
                    y={targetSteps}
                    stroke="#71717a"
                    strokeDasharray="3 3"
                    strokeOpacity={0.6}
                  />
                  <Bar
                    dataKey="steps"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                    opacity={0.85}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Log Daily Steps Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-brand-red/30 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
                  <Footprints className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
                    Log Daily Steps
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    Set or adjust your count for today
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Today&apos;s Step Count
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    min="0"
                    max="150000"
                    value={manualCount}
                    onChange={(e) => setManualCount(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-brand-red pr-16"
                    placeholder="e.g. 8500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 pointer-events-none">
                    steps
                  </span>
                </div>
              </div>

              {/* Quick Add Increment Chips within modal */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
                  Quick Adjust
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {[500, 1000, 2500, 5000].map((delta) => (
                    <button
                      key={delta}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        const current = parseInt(manualCount, 10) || 0;
                        setManualCount(String(current + delta));
                      }}
                      className="py-1 px-1.5 bg-white/[0.04] hover:bg-brand-red/10 border border-white/10 hover:border-brand-red/30 rounded-lg text-[10px] font-mono text-zinc-300 hover:text-white transition-all text-center"
                    >
                      +{delta >= 1000 ? `${delta / 1000}k` : delta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 text-xs font-mono border border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isIncrementing}
                  className="flex-1 text-xs font-mono bg-brand-red hover:bg-brand-redDark text-white font-bold shadow-glow-red"
                >
                  Save Steps
                </Button>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Google Health Connect</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleHealthSync();
                      setShowManualModal(false);
                    }}
                    disabled={isHealthSyncing}
                    className="text-brand-red hover:underline flex items-center gap-1 font-semibold"
                  >
                    <RefreshCw className={`w-3 h-3 ${isHealthSyncing ? "animate-spin" : ""}`} />
                    <span>{isHealthSyncing ? "Syncing..." : "Sync Now"}</span>
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => openHealthConnect()}
                    className="text-[9px] font-mono text-zinc-600 hover:text-zinc-400"
                  >
                    Health Connect Permissions ↗
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
