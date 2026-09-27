"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
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
  Check,
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
    targetWeightKg: number;
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
  const [inputHeight, setInputHeight] = useState(settings.heightCm.toString());
  const [inputTargetWeight, setInputTargetWeight] = useState(
    settings.targetWeightKg.toString()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentWeight = weightData.latest?.weightKg ?? settings.targetWeightKg ?? 70;
  const heightM = (settings.heightCm || 175) / 100;
  const currentBmi = weightData.latest?.bmi ?? Number((currentWeight / (heightM * heightM)).toFixed(1));

  // WHO BMI Classification
  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return { label: "Underweight", color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/20" };
    if (bmi < 25.0) return { label: "Normal Weight", color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/20" };
    if (bmi < 30.0) return { label: "Overweight", color: "text-amber-400 border-amber-500/30 bg-amber-950/20" };
    return { label: "Obese", color: "text-brand-red border-brand-red/30 bg-red-950/20" };
  };

  const bmiCat = getBmiCategory(currentBmi);

  // Ideal weight range based on normal BMI (18.5 to 24.9)
  const minIdealWeight = Number((18.5 * heightM * heightM).toFixed(1));
  const maxIdealWeight = Number((24.9 * heightM * heightM).toFixed(1));

  // Delta to target
  const targetWeight = settings.targetWeightKg || 70;
  const weightDelta = Number((currentWeight - targetWeight).toFixed(1));

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
          notes: inputNotes,
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

  // Update Settings submission
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(inputHeight);
    const tw = parseFloat(inputTargetWeight);
    if (isNaN(h) || isNaN(tw) || h <= 0 || tw <= 0) return;

    haptics.impactMedium();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/vitality", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_SETTINGS",
          heightCm: h,
          targetWeightKg: tw,
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

  // Delete weight log
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

  // Prepare chart data
  const chartData = weightData.history.map((h) => ({
    date: format(parseISO(h.date), "MMM d"),
    weight: h.weightKg,
    bmi: h.bmi,
  }));

  // Gauge position percentage (mapped from BMI 15 to 35)
  const gaugePercent = Math.min(
    100,
    Math.max(0, ((currentBmi - 15) / (35 - 15)) * 100)
  );

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-950 via-black to-black p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-red-500/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-mono uppercase tracking-wider text-white font-bold">
              Weight & Body Mass Index
            </h2>
            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
              <span>Height: {settings.heightCm} cm</span>
              <span>• Target: {targetWeight} kg</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettingsModal(true)}
            className="h-7 px-2 text-[10px] font-mono border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 gap-1 rounded-md"
            title="Configure Height & Target Weight"
          >
            <Sliders className="w-3 h-3 text-zinc-400" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLogModal(true)}
            className="h-7 px-2.5 text-[10px] font-mono border border-brand-red/30 bg-brand-red/10 hover:bg-brand-red/20 text-brand-red gap-1 rounded-md"
          >
            <Plus className="w-3 h-3" />
            <span>Weight</span>
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Current Weight */}
          <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Current Weight
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {weightData.latest?.weightKg ? weightData.latest.weightKg.toFixed(1) : "--"}
              </span>
              <span className="text-xs font-mono text-zinc-500">kg</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">
              {weightData.latest ? format(parseISO(weightData.latest.date), "MMM d") : "No logs yet"}
            </span>
          </div>

          {/* Current BMI */}
          <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Body Mass Index
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {currentBmi}
              </span>
              <span className="text-xs font-mono text-zinc-500">BMI</span>
            </div>
            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 w-fit ${bmiCat.color}`}>
              {bmiCat.label}
            </Badge>
          </div>

          {/* Target Delta */}
          <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Target Delta
            </span>
            <div className="flex items-baseline gap-1 my-1">
              <span className="text-2xl font-bold font-mono text-white">
                {weightDelta > 0 ? `+${weightDelta}` : weightDelta}
              </span>
              <span className="text-xs font-mono text-zinc-500">kg</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-500">
              Goal: {targetWeight} kg
            </span>
          </div>

          {/* Ideal Range */}
          <div className="bg-black/50 border border-white/5 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
              Normal BMI Range
            </span>
            <div className="my-1">
              <span className="text-sm font-bold font-mono text-white">
                {minIdealWeight} – {maxIdealWeight}
              </span>
              <span className="text-xs font-mono text-zinc-500 ml-1">kg</span>
            </div>
            <span className="text-[9px] font-mono text-zinc-600">
              BMI 18.5 – 24.9
            </span>
          </div>
        </div>

        {/* Visual BMI Gauge Needle */}
        <div className="bg-black/50 border border-white/5 p-3.5 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            <span>BMI Scale Indicator</span>
            <span className="text-zinc-500 font-bold">{currentBmi}</span>
          </div>

          {/* Track Bar */}
          <div className="relative pt-2 pb-1">
            <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-zinc-900 border border-white/5">
              <div className="w-[17.5%] bg-cyan-600/80" title="Underweight (<18.5)" />
              <div className="w-[32%] bg-emerald-500" title="Normal (18.5-24.9)" />
              <div className="w-[25%] bg-amber-500" title="Overweight (25-29.9)" />
              <div className="w-[25.5%] bg-red-600" title="Obese (≥30)" />
            </div>

            {/* Needle Pointer */}
            <div
              className="absolute top-0 transform -translate-x-1/2 transition-all duration-500 ease-out flex flex-col items-center"
              style={{ left: `${gaugePercent}%` }}
            >
              <div className="w-2.5 h-2.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] border border-black" />
            </div>
          </div>

          <div className="flex justify-between text-[9px] font-mono text-zinc-600 pt-1">
            <span>&lt; 18.5 (Under)</span>
            <span>18.5–24.9 (Normal)</span>
            <span>25.0–29.9 (Over)</span>
            <span>30+ (Obese)</span>
          </div>
        </div>

        {/* 30-Day Trend Chart */}
        {chartData.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
              <span>30-Day Weight Progress</span>
              <span className="text-zinc-600">Green line = Target</span>
            </div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                    domain={["dataMin - 2", "dataMax + 2"]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#09090b",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                    formatter={(val: any) => [`${val} kg`, "Weight"]}
                  />
                  <ReferenceLine
                    y={targetWeight}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeOpacity={0.7}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", r: 3 }}
                    activeDot={{ r: 5, fill: "#fff" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent Weight Entries Table */}
        {weightData.history.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
              Recent Logs
            </span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {weightData.history.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/5 text-xs font-mono group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{log.weightKg.toFixed(1)} kg</span>
                    {log.bmi && (
                      <span className="text-zinc-500 text-[10px]">({log.bmi} BMI)</span>
                    )}
                    {log.notes && (
                      <span className="text-zinc-400 text-[10px] truncate max-w-[120px]">
                        • {log.notes}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">
                      {format(parseISO(log.date), "MMM d, yyyy")}
                    </span>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition-opacity"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-mono uppercase tracking-wider text-white">
              Log Today's Weight
            </h3>
            <form onSubmit={handleLogWeight} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  autoFocus
                  required
                  value={inputWeight}
                  onChange={(e) => setInputWeight(e.target.value)}
                  placeholder="e.g. 72.5"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="e.g. Morning fasted weigh-in"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex gap-2 pt-2">
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
                  disabled={isSubmitting}
                  className="flex-1 text-xs font-mono bg-brand-red hover:bg-brand-red/90 text-white"
                >
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal (Height & Target) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-white/10 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-mono uppercase tracking-wider text-white">
              Health Baseline Settings
            </h3>
            <form onSubmit={handleSaveSettings} className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Height (cm) - for accurate BMI
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={inputHeight}
                  onChange={(e) => setInputHeight(e.target.value)}
                  placeholder="e.g. 175"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block mb-1">
                  Target Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={inputTargetWeight}
                  onChange={(e) => setInputTargetWeight(e.target.value)}
                  placeholder="e.g. 70"
                  className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex gap-2 pt-2">
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
                  className="flex-1 text-xs font-mono bg-brand-red hover:bg-brand-red/90 text-white"
                >
                  Save Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
