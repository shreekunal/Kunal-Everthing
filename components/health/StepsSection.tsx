"use client";

import React, { useState } from "react";
import { Footprints, Flame, MapPin, Clock, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";
import { formatDuration } from "@/lib/formatters";
import {
  fetchHealthConnectSteps,
  requestHealthConnectPermission,
  checkHealthConnectPermission,
  isHealthConnectSupported,
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
  const [isHealthSyncing, setIsHealthSyncing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);

  const baseSteps = stepsData?.today?.stepCount ?? 0;
  const currentSteps = Math.max(0, baseSteps);
  const targetSteps = stepsData?.today?.targetSteps || 10000;
  const progressPercent = Math.min(100, Math.round((currentSteps / targetSteps) * 100));
  const activeMinutes = Math.floor(currentSteps / 100);

  const distanceKm =
    stepsData?.today?.distanceKm !== undefined
      ? Number(stepsData.today.distanceKm)
      : Number((currentSteps * 0.00078).toFixed(2));

  const calories =
    stepsData?.today?.calories !== undefined
      ? stepsData.today.calories
      : Math.round(currentSteps * 0.035);

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

      const result = await fetchHealthConnectSteps(true);
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

  // Chart data format
  const chartData = (stepsData?.history || []).map((h) => {
    let dayLabel = "Day";
    try {
      dayLabel = format(parseISO(h.date), "EEE");
    } catch {
      dayLabel = h.date || "";
    }
    const barSteps = h.stepCount;

    return {
      day: dayLabel,
      steps: barSteps,
      target: h.targetSteps || targetSteps,
    };
  });

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
              {stepsData?.today?.syncSource === "HEALTH_CONNECT" && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  • Health Connect
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleHealthSync}
          disabled={isHealthSyncing}
          className="h-7 px-2.5 text-[10px] font-mono border border-brand-red/30 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red gap-1 rounded-md shadow-glow-red-subtle flex items-center transition-all disabled:opacity-50"
        >
          <RefreshCw className={clsx("w-3 h-3", isHealthSyncing && "animate-spin")} />
          <span>{isHealthSyncing ? "Syncing..." : healthStatus || "Sync Health"}</span>
        </button>
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
                {distanceKm.toFixed(2)}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
                km walked
              </span>
            </div>

            <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl flex flex-col items-center justify-center text-center">
              <Flame className="w-3.5 h-3.5 text-amber-500 mb-1" />
              <span className="text-xs font-mono font-bold text-white">
                {calories}
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

    </div>
  );
}
