"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Activity,
  Footprints,
  Timer,
  Scale,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { haptics } from "@/lib/haptics";
import { formatDuration } from "@/lib/formatters";

export function VitalityWidgetCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/vitality");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail for dashboard widget
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);


  if (loading && !data) {
    return null;
  }

  const stepCount = data?.steps?.today?.stepCount || 0;
  const targetSteps = data?.steps?.today?.targetSteps || 10000;
  const stepPercent = Math.min(100, Math.round((stepCount / targetSteps) * 100));

  const activeFast = data?.fasting?.active;
  let elapsedMinutes = 0;
  if (activeFast) {
    const startMs = new Date(activeFast.startTime).getTime();
    elapsedMinutes = Math.floor(Math.max(0, Date.now() - startMs) / (1000 * 60));
  }

  const latestWeight = data?.weight?.latest?.weightKg;
  const latestBmi = data?.weight?.latest?.bmi;

  return (
    <Card className="border border-white/10 bg-zinc-950/70 backdrop-blur-xl relative overflow-hidden group hover:border-brand-red/30 transition-all p-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-white font-bold block">
              Vitality & Health
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">
              Movement • Fasting • Bio-metrics
            </span>
          </div>
        </div>

        <Link
          href="/health"
          onClick={() => haptics.selection()}
          className="text-[11px] font-mono text-zinc-400 hover:text-brand-red flex items-center gap-1 transition-colors group-hover:translate-x-0.5 transform duration-200"
        >
          <span>Open Hub</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Grid of 3 Telemetry Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
        {/* Pillar 1: Steps */}
        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1">
              <Footprints className="w-3 h-3 text-blue-400" />
              Steps
            </span>
            <span className="text-[10px] font-mono text-blue-400 font-bold">
              {stepPercent}%
            </span>
          </div>

          <div>
            <div className="text-lg font-bold font-mono text-white">
              {stepCount.toLocaleString()}
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              of {targetSteps.toLocaleString()} goal
            </div>
          </div>

          <Link
            href="/health"
            onClick={() => haptics.selection()}
            className="w-full py-1 text-center bg-white/5 hover:bg-blue-950/30 border border-white/10 hover:border-blue-500/40 rounded text-[10px] font-mono text-zinc-300 transition-colors block"
          >
            View Activity
          </Link>
        </div>

        {/* Pillar 2: Fasting */}
        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1">
              <Timer className="w-3 h-3 text-emerald-400" />
              Fasting
            </span>
            {activeFast && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </div>

          <div>
            {activeFast ? (
              <>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {formatDuration(elapsedMinutes)}
                </div>
                <div className="text-[9px] font-mono text-zinc-500">
                  {activeFast.protocol} Fasting Active
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold font-mono text-zinc-500">
                  Inactive
                </div>
                <div className="text-[9px] font-mono text-zinc-600">
                  Ready to begin fast
                </div>
              </>
            )}
          </div>

          <Link
            href="/health"
            onClick={() => haptics.selection()}
            className="w-full py-1 text-center bg-white/5 hover:bg-emerald-950/30 border border-white/10 hover:border-emerald-500/40 rounded text-[10px] font-mono text-zinc-300 transition-colors block"
          >
            {activeFast ? "View Fast Stage" : "Start Fast"}
          </Link>
        </div>

        {/* Pillar 3: Weight & BMI */}
        <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 flex items-center gap-1">
              <Scale className="w-3 h-3 text-brand-red" />
              Weight & BMI
            </span>
            {latestBmi && (
              <span className="text-[10px] font-mono text-brand-red font-bold">
                {latestBmi} BMI
              </span>
            )}
          </div>

          <div>
            <div className="text-lg font-bold font-mono text-white">
              {latestWeight ? `${latestWeight.toFixed(1)} kg` : "--"}
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              Target: {data?.settings?.targetWeightKg || 70} kg
            </div>
          </div>

          <Link
            href="/health"
            onClick={() => haptics.selection()}
            className="w-full py-1 text-center bg-white/5 hover:bg-red-950/30 border border-white/10 hover:border-brand-red/40 rounded text-[10px] font-mono text-zinc-300 transition-colors block"
          >
            Log Weight
          </Link>
        </div>
      </div>
    </Card>
  );
}
