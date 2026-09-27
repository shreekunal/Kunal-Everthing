"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Scale,
  TrendingDown,
  TrendingUp,
  Target,
  Plus,
  Trash2,
  Sliders,
  CheckCircle2,
  Info,
  Calendar,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format, parseISO } from "date-fns";

interface WeightBmiSectionProps {
  weightData: {
    latest: {
      id: string;
      weightKg: number;
      bmi: number | null;
      notes: string | null;
      date: string;
    } | null;
    history: Array<{
      id: string;
      weightKg: number;
      bmi: number | null;
      notes: string | null;
      date: string;
    }>;
  };
  settings: {
    heightCm: number;
    targetWeightKg?: number;
  };
  onRefresh: () => Promise<void>;
}

export function WeightBmiSection({
  weightData,
  settings,
  onRefresh,
}: WeightBmiSectionProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [inputWeight, setInputWeight] = useState("");
  const [inputNotes, setInputNotes] = useState("");
  const [inputHeight, setInputHeight] = useState((settings?.heightCm || 175).toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Height & Medically Recognized Ideal Weight Span Calculations
  const heightCm = settings?.heightCm || 175;
  const heightM = heightCm / 100;

  // WHO Standard Healthy BMI bounds (18.5 to 24.9)
  const minIdealWeight = Number((18.5 * heightM * heightM).toFixed(1));
  const maxIdealWeight = Number((24.9 * heightM * heightM).toFixed(1));

  // Determine if actual weight has ever been logged
  const hasLog = Boolean(weightData?.latest && typeof weightData.latest.weightKg === "number");
  const currentWeight = hasLog ? weightData.latest!.weightKg : null;
  const currentBmi = hasLog
    ? (weightData.latest!.bmi ?? Number((currentWeight! / (heightM * heightM)).toFixed(1)))
    : null;

  // Comparison with previous weigh-in entry
  const prevLog = weightData?.history && weightData.history.length > 1 ? weightData.history[1] : null;
  const changeFromPrev = hasLog && prevLog
    ? Number((currentWeight! - prevLog.weightKg).toFixed(1))
    : null;

  // WHO BMI Classification with KunalOS-compliant status styling
  const getBmiCategory = (bmi: number | null) => {
    if (bmi === null) {
      return {
        label: "Pending Weigh-In",
        color: "text-zinc-500 border-white/10 bg-white/[0.02]",
        description: "Log your weight to calculate BMI",
      };
    }
    if (bmi < 18.5) {
      return {
        label: "Underweight",
        color: "text-amber-400 border-amber-500/30 bg-amber-950/20",
        description: `Below healthy threshold (< 18.5). Standard healthy span: ${minIdealWeight}–${maxIdealWeight} kg.`,
      };
    }
    if (bmi <= 24.9) {
      return {
        label: "Optimal / Healthy",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20",
        description: `Within medically optimal range (18.5 – 24.9 BMI).`,
      };
    }
    if (bmi <= 29.9) {
      return {
        label: "Overweight",
        color: "text-amber-400 border-amber-500/30 bg-amber-950/20",
        description: `Above optimal threshold (25.0 – 29.9). Standard healthy span: ${minIdealWeight}–${maxIdealWeight} kg.`,
      };
    }
    return {
      label: "Obese",
      color: "text-brand-red border-brand-red/30 bg-red-950/20",
      description: `Significantly above threshold (≥ 30.0). Standard healthy span: ${minIdealWeight}–${maxIdealWeight} kg.`,
    };
  };

  const bmiCat = getBmiCategory(currentBmi);

  // Position on BMI spectrum (range 15 to 35 for realistic human spectrum)
  const gaugePercent = currentBmi !== null
    ? Math.min(100, Math.max(0, ((currentBmi - 15) / (35 - 15)) * 100))
    : null;

  // Log weight submission
  const handleLogWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(inputWeight);
    if (isNaN(w) || w <= 0) return;

    haptics.impactMedium();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "LOG_WEIGHT",
          weightKg: w,
          notes: inputNotes.trim() || null,
        }),
      });
      if (res.ok) {
        haptics.success();
        setShowLogModal(false);
        setInputWeight("");
        setInputNotes("");
        await onRefresh();
      }
    } catch (err) {
      console.error("Log weight error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Settings submission (Height only)
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(inputHeight);
    if (isNaN(h) || h <= 0) return;

    haptics.impactMedium();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SETTINGS",
          heightCm: h,
        }),
      });
      if (res.ok) {
        haptics.success();
        setShowSettingsModal(false);
        await onRefresh();
      }
    } catch (err) {
      console.error("Update settings error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete weight entry
  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("Delete this weight record?")) return;
    haptics.impactLight();
    try {
      const res = await fetch(`/api/vitality?type=weight&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        haptics.selection();
        await onRefresh();
      }
    } catch (err) {
      console.error("Delete log error:", err);
    }
  };

  // Prepare chart data (chronological order)
  const chartData = (weightData?.history || [])
    .slice()
    .reverse()
    .map((h) => ({
      date: format(parseISO(h.date), "MMM d"),
      weight: h.weightKg,
      bmi: h.bmi,
    }));

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-white font-bold leading-tight">
              Weight &amp; Body Metrics
            </h2>
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
              <span>Height: {heightCm} cm</span>
              <span>•</span>
              <span>Healthy Span: {minIdealWeight}–{maxIdealWeight} kg</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setInputHeight(heightCm.toString());
              setShowSettingsModal(true);
            }}
            className="h-7 px-2 text-[10px] font-mono border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 gap-1 rounded-md"
            title="Configure Height"
          >
            <Sliders className="w-3 h-3 text-zinc-400" />
            <span className="hidden sm:inline">Height</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (currentWeight) setInputWeight(currentWeight.toString());
              setShowLogModal(true);
            }}
            className="h-7 px-2.5 text-[10px] font-mono border border-brand-red/30 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red gap-1 rounded-md shadow-glow-red-subtle"
          >
            <Plus className="w-3 h-3" />
            <span>Log Weight</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Main 2-Column Telemetry Cards (Weight vs BMI) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* CARD 1: Current Weight & Change */}
          <div className="bg-black/60 border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                <Scale className="w-3 h-3 text-brand-red" />
                Current Weight
              </span>
              {hasLog && weightData.latest?.date && (
                <span className="text-[9px] font-mono text-zinc-500">
                  {format(parseISO(weightData.latest.date), "MMM d, yyyy")}
                </span>
              )}
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {hasLog && currentWeight !== null ? currentWeight.toFixed(1) : "--"}
                </span>
                <span className="text-xs font-mono text-zinc-400 font-bold">kg</span>
              </div>

              {/* Trend vs Previous Entry */}
              {changeFromPrev !== null && (
                <div
                  className={`flex items-center gap-0.5 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    changeFromPrev < 0
                      ? "text-emerald-400 bg-emerald-950/30 border-emerald-500/20"
                      : changeFromPrev > 0
                      ? "text-red-400 bg-red-950/30 border-red-500/20"
                      : "text-zinc-400 bg-white/[0.03] border-white/10"
                  }`}
                >
                  {changeFromPrev < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : changeFromPrev > 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : null}
                  <span>
                    {changeFromPrev > 0 ? `+${changeFromPrev}` : changeFromPrev} kg
                  </span>
                </div>
              )}
            </div>

            {/* Natural Healthy Range Reference */}
            <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
              {hasLog && currentWeight !== null ? (
                <span>
                  {currentWeight > maxIdealWeight ? (
                    <>
                      <strong className="text-amber-400 font-bold">
                        +{(currentWeight - maxIdealWeight).toFixed(1)} kg
                      </strong>{" "}
                      above normal BMI threshold ({maxIdealWeight} kg)
                    </>
                  ) : currentWeight < minIdealWeight ? (
                    <>
                      <strong className="text-amber-400 font-bold">
                        -{(minIdealWeight - currentWeight).toFixed(1)} kg
                      </strong>{" "}
                      below normal BMI threshold ({minIdealWeight} kg)
                    </>
                  ) : (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Within healthy BMI span ({minIdealWeight} – {maxIdealWeight} kg)
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-zinc-500 text-[10px]">
                  Standard healthy span: {minIdealWeight} – {maxIdealWeight} kg. Log a weigh-in to begin tracking.
                </span>
              )}
            </div>
          </div>

          {/* CARD 2: Body Mass Index & Normal Weight Range */}
          <div className="bg-black/60 border border-white/5 p-3.5 rounded-2xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold flex items-center gap-1">
                <Target className="w-3 h-3 text-brand-red" />
                Body Mass Index (BMI)
              </span>
              <Badge variant="outline" className={`text-[10px] px-2 py-0 font-mono font-bold ${bmiCat.color}`}>
                {bmiCat.label}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {currentBmi !== null ? currentBmi : "--"}
                </span>
                <span className="text-xs font-mono text-zinc-400 font-bold">BMI</span>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-mono uppercase text-zinc-500 block">Optimal Range</span>
                <span className="text-xs font-mono text-zinc-300 font-bold">
                  {minIdealWeight} – {maxIdealWeight} kg
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-500 leading-tight">
              {bmiCat.description}
            </div>
          </div>
        </div>

        {/* Minimalist Precision BMI Spectrum Gauge */}
        <div className="bg-black/40 border border-white/5 p-3 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            <span>BMI Scale (15 – 35)</span>
            <span className="text-zinc-400 font-bold">
              {currentBmi !== null ? `Current: ${currentBmi} BMI` : "Weigh-in required"}
            </span>
          </div>

          {/* Precision Track */}
          <div className="relative pt-2 pb-1">
            <div className="h-2 w-full rounded-full overflow-hidden flex bg-zinc-900 border border-white/10">
              <div className="w-[17.5%] bg-amber-500/40" title="Underweight (<18.5)" />
              <div className="w-[32%] bg-emerald-500/70" title="Healthy (18.5–24.9)" />
              <div className="w-[25%] bg-amber-500/50" title="Overweight (25–29.9)" />
              <div className="w-[25.5%] bg-brand-red/70" title="Obese (≥30)" />
            </div>

            {/* Needle Pointer */}
            {gaugePercent !== null && (
              <div
                className="absolute top-0 transform -translate-x-1/2 transition-all duration-500 ease-out flex flex-col items-center"
                style={{ left: `${gaugePercent}%` }}
              >
                <div className="w-2.5 h-2.5 bg-white rounded-full border border-black shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              </div>
            )}
          </div>

          <div className="flex justify-between text-[8px] font-mono text-zinc-500 pt-0.5">
            <span>&lt; 18.5 (Under)</span>
            <span className="text-emerald-400/90 font-bold">18.5 – 24.9 (Healthy)</span>
            <span>25.0 – 29.9 (Over)</span>
            <span>30+ (Obese)</span>
          </div>
        </div>

        {/* Weight Progress Curve */}
        {chartData.length >= 2 ? (
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Weight Progress Curve</span>
              <span className="text-zinc-500">History Trend</span>
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    stroke="#52525b"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#52525b"
                    fontSize={9}
                    domain={["dataMin - 1", "dataMax + 1"]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid rgba(239,68,68,0.25)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                    formatter={(val: any) => [`${val} kg`, "Weight"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={{ fill: "#EF4444", r: 3 }}
                    activeDot={{ r: 5, fill: "#FFFFFF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {/* Recent Weight Logs Table */}
        {weightData.history && weightData.history.length > 0 && (
          <div className="pt-2 border-t border-white/5 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
              Recent Weigh-Ins
            </span>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
              {weightData.history.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-white/5 text-xs font-mono group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{log.weightKg.toFixed(1)} kg</span>
                    {log.bmi && (
                      <span className="text-zinc-500 text-[10px]">({log.bmi} BMI)</span>
                    )}
                    {log.notes && (
                      <span className="text-zinc-400 text-[10px] truncate max-w-[130px]">
                        • {log.notes}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500">
                      {format(parseISO(log.date), "MMM d")}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteLog(log.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-brand-red transition-opacity"
                      title="Delete log"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Log Weight Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-brand-red/30 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-brand-red" />
                Record Body Weight
              </h3>
              <span className="text-[10px] font-mono text-zinc-500">
                {format(new Date(), "MMM d, yyyy")}
              </span>
            </div>

            <form onSubmit={handleLogWeight} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Weight (kg) <span className="text-brand-red">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    autoFocus
                    required
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    placeholder="e.g. 72.5"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-base font-mono text-white focus:outline-none focus:border-brand-red pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Context / Notes <span className="text-zinc-600">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="e.g. Fasted morning weigh-in, post-workout"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 text-xs font-mono border border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !inputWeight}
                  className="flex-1 text-xs font-mono bg-brand-red hover:bg-brand-redDark text-white font-bold shadow-glow-red"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal (Height Only) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-brand-red/30 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative overflow-hidden">
            {/* Ambient Red Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-xs font-mono uppercase tracking-wider text-white font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-brand-red" />
                Physical Height Baseline
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Height (cm) - used for BMI &amp; Healthy Range calculation
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={inputHeight}
                    onChange={(e) => setInputHeight(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-brand-red pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 pointer-events-none">
                    cm
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-[10px] font-mono text-zinc-400">
                <span className="text-zinc-300 font-bold block">WHO Healthy BMI Reference</span>
                <p className="text-[9px] text-zinc-500 leading-relaxed">
                  For a height of {inputHeight || 175} cm, the normal BMI range (18.5 – 24.9) medically spans from{" "}
                  <strong className="text-zinc-300 font-bold">
                    {((18.5 * Math.pow((parseFloat(inputHeight) || 175) / 100, 2))).toFixed(1)} kg
                  </strong>{" "}
                  to{" "}
                  <strong className="text-zinc-300 font-bold">
                    {((24.9 * Math.pow((parseFloat(inputHeight) || 175) / 100, 2))).toFixed(1)} kg
                  </strong>.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 text-xs font-mono border border-white/10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-xs font-mono bg-brand-red hover:bg-brand-redDark text-white font-bold shadow-glow-red"
                >
                  Save Height
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
