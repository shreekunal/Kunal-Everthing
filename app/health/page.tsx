"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Activity, Footprints, Timer, Scale } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { FastingSection } from "@/components/health/FastingSection";
import { StepsSection } from "@/components/health/StepsSection";
import { WeightBmiSection } from "@/components/health/WeightBmiSection";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { fetchHealthConnectSteps } from "@/lib/healthSync";

export default function HealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/vitality");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (typeof window !== "undefined") {
          localStorage.setItem("everything_vitality_cache", JSON.stringify(json));
        }
      }
    } catch (err) {
      console.error("Failed to fetch vitality data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial auto-sync Health Connect once on native Android if available
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      fetchHealthConnectSteps().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("everything_vitality_cache");
        if (cached) {
          setData(JSON.parse(cached));
          setLoading(false);
        }
      } catch (e) {
        // Fallback
      }
    }
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white p-4 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Activity className="w-8 h-8 text-brand-red animate-pulse" />
          <span className="text-xs font-mono tracking-widest uppercase text-zinc-500">
            Loading Vitality...
          </span>
        </div>
      </div>
    );
  }

  // Quick summary badges
  const stepCount = data?.steps?.today?.stepCount || 0;
  const targetSteps = data?.settings?.defaultStepGoal || 10000;
  const stepProgress = Math.min(100, Math.round((stepCount / targetSteps) * 100));

  const hasActiveFast = Boolean(data?.fasting?.active);
  const activeProtocol = data?.fasting?.active?.protocol || data?.settings?.fastingProtocol || "16:8";

  const latestWeight = data?.weight?.latest?.weightKg;

  return (
    <PullToRefresh onRefresh={fetchData}>
      <div className="min-h-screen bg-black text-white px-3.5 py-4 sm:px-6 max-w-4xl mx-auto space-y-4 pb-28">
        {/* Sticky Mobile Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-mono tracking-wider uppercase text-white leading-tight">
                Vitality
              </h1>
              <span className="text-[10px] text-zinc-500 font-mono block -mt-0.5">
                Bio-telemetry, fasting & movement
              </span>
            </div>
          </div>

          {/* Quick Header Badges */}
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-0.5 rounded-full bg-zinc-950 border border-white/10 text-[10px] font-mono flex items-center gap-1">
              <Footprints className="w-2.5 h-2.5 text-brand-red" />
              <span className="text-zinc-300 font-bold">{stepProgress}%</span>
            </div>

            {hasActiveFast ? (
              <div className="px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/25 text-[10px] font-mono text-red-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
                <span>{activeProtocol}</span>
              </div>
            ) : null}

            {latestWeight && (
              <div className="px-2 py-0.5 rounded-full bg-zinc-950 border border-white/10 text-[10px] font-mono text-zinc-300">
                {latestWeight.toFixed(1)} kg
              </div>
            )}
          </div>
        </div>

        {/* Unified Health Feed (Zero Redundant Tabs) */}
        {data && (
          <div className="space-y-4">
            {/* 1. Intermittent Fasting Hero Module */}
            <FastingSection
              fastingData={data.fasting}
              preferredProtocol={data.settings.fastingProtocol}
              onRefresh={fetchData}
            />

            {/* 2. Daily Movement & Steps Module */}
            <StepsSection
              stepsData={data.steps}
              onRefresh={fetchData}
            />

            {/* 3. Weight & Body Mass Index Module */}
            <WeightBmiSection
              weightData={data.weight}
              settings={data.settings}
              onRefresh={fetchData}
            />
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
