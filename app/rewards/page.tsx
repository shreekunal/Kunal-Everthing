"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UndoToast } from "@/components/ui/UndoToast";
import {
  Trophy,
  ShieldCheck,
  Zap,
  Plus,
  Minus,
  UtensilsCrossed,
  RotateCcw,
  Sparkles,
  Pizza,
  Moon,
  Droplets,
  Coins,
  Flame,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";

export default function RewardsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isDeductModalOpen, setIsDeductModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);

  // Form states
  const [deductType, setDeductType] = useState<"UNHEALTHY_FOOD" | "RELAPSE" | "SLEEP" | "CUSTOM">("UNHEALTHY_FOOD");
  const [deductPoints, setDeductPoints] = useState("150");
  const [deductReason, setDeductReason] = useState("");
  const [deductTitle, setDeductTitle] = useState("");

  const [rewardPoints, setRewardPoints] = useState("10");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardReason, setRewardReason] = useState("");

  const [isSubmittingDeduct, setIsSubmittingDeduct] = useState(false);
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);

  const [activeFilter, setActiveFilter] = useState<"ALL" | "REWARDS" | "PENALTIES">("ALL");

  // Undo Toast state
  const [undoState, setUndoState] = useState<{
    isOpen: boolean;
    logId: string;
    message: string;
    subMessage?: string;
    isError?: boolean;
  }>({
    isOpen: false,
    logId: "",
    message: "",
    isError: false,
  });

  const fetchRewards = async () => {
    try {
      const res = await fetch("/api/rewards", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch rewards:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
    window.addEventListener("kunal-os-refresh", fetchRewards);
    return () => window.removeEventListener("kunal-os-refresh", fetchRewards);
  }, []);

  const [confirmDeductType, setConfirmDeductType] = useState<"UNHEALTHY_FOOD" | "RELAPSE" | "SLEEP" | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const [perkToRedeem, setPerkToRedeem] = useState<{ id: string; cost: number; title: string } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleQuickDeduct = (type: "UNHEALTHY_FOOD" | "RELAPSE" | "SLEEP") => {
    setConfirmDeductType(type);
  };

  const handleExecuteQuickDeduct = async () => {
    if (!confirmDeductType) return;
    setIsDeducting(true);
    haptics.warning();

    let action = "PENALTY_UNHEALTHY_FOOD";
    let points = 150;
    let label = "🍔 Eat Junk Food (-150 XP)";

    if (confirmDeductType === "RELAPSE") {
      action = "PENALTY_RELAPSE";
      points = 300;
      label = "⚡ Relapse (-300 XP)";
    } else if (confirmDeductType === "SLEEP") {
      action = "PENALTY_SLEEP";
      points = 100;
      label = "🌙 Broke Sleep (-100 XP)";
    }

    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, points }),
      });

      const resData = await res.json();
      if (res.ok && resData.log) {
        setConfirmDeductType(null);
        setUndoState({
          isOpen: true,
          logId: resData.log.id,
          message: `${label} logged`,
          subMessage: "Discipline streak reset. Tap undo to revert.",
          isError: true,
        });
        fetchRewards();
      }
    } catch {
      alert("Failed to log infraction");
    } finally {
      setIsDeducting(false);
    }
  };

  const handleUndo = async () => {
    if (!undoState.logId) return;
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UNDO_REWARD",
          logId: undoState.logId,
        }),
      });

      if (res.ok) {
        haptics.success();
        fetchRewards();
      }
    } catch {
      alert("Failed to undo action");
    }
  };

  const handleSubmitDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDeduct) return;

    setIsSubmittingDeduct(true);
    try {
      let payload: any = {};
      if (deductType === "UNHEALTHY_FOOD") {
        payload = {
          action: "PENALTY_UNHEALTHY_FOOD",
          points: Number(deductPoints) || 150,
          notes: deductReason,
        };
      } else if (deductType === "RELAPSE") {
        payload = {
          action: "PENALTY_RELAPSE",
          points: Number(deductPoints) || 300,
          notes: deductReason,
        };
      } else if (deductType === "SLEEP") {
        payload = {
          action: "PENALTY_SLEEP",
          points: Number(deductPoints) || 100,
          notes: deductReason,
        };
      } else {
        payload = {
          action: "PENALTY_CUSTOM",
          title: deductTitle || "Custom Discipline Penalty",
          points: Number(deductPoints) || 50,
          notes: deductReason,
        };
      }

      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (res.ok && resData.log) {
        setIsDeductModalOpen(false);
        setDeductReason("");
        setDeductTitle("");
        setUndoState({
          isOpen: true,
          logId: resData.log.id,
          message: `Penalty applied (-${deductPoints} XP)`,
          subMessage: "Discipline penalty recorded.",
          isError: true,
        });
        fetchRewards();
      }
    } catch {
      alert("Failed to record deduction");
    } finally {
      setIsSubmittingDeduct(false);
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReward) return;

    setIsSubmittingReward(true);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REWARD_CUSTOM",
          title: rewardTitle,
          points: Number(rewardPoints),
          notes: rewardReason,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.log) {
        setIsRewardModalOpen(false);
        setRewardTitle("");
        setRewardReason("");
        setUndoState({
          isOpen: true,
          logId: resData.log.id,
          message: `🌟 +${rewardPoints} XP awarded!`,
          subMessage: rewardTitle,
          isError: false,
        });
        fetchRewards();
      }
    } catch {
      alert("Failed to award custom points");
    } finally {
      setIsSubmittingReward(false);
    }
  };

  const handleRedeemPerk = (itemId: string, cost: number, title: string) => {
    setPerkToRedeem({ id: itemId, cost, title });
  };

  const handleExecuteRedeemPerk = async () => {
    if (!perkToRedeem || isRedeeming) return;
    setIsRedeeming(true);
    haptics.success();
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REDEEM_REWARD",
          itemId: perkToRedeem.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to redeem perk");
      } else if (json.log) {
        setPerkToRedeem(null);
        setUndoState({
          isOpen: true,
          logId: json.log.id,
          message: `🎉 Unlocked "${perkToRedeem.title}"!`,
          subMessage: `Spent ${perkToRedeem.cost} XP guilt-free.`,
          isError: false,
        });
        fetchRewards();
      }
    } catch {
      alert("Redemption error");
    } finally {
      setIsRedeeming(false);
    }
  };

  const {
    totalXP = 0,
    lifetimeXP = 0,
    season,
    level = 1,
    title: levelTitle = "Novice Disciple",
    currentLevelXP = 0,
    nextLevelXP = 100,
    progressPercent = 0,
    todayEarned = 0,
    todayDeducted = 0,
    streaks = {
      purity: { currentStreak: 0, bestStreak: 0 },
      diet: { currentStreak: 0, bestStreak: 0 },
      sleep: { currentStreak: 0, bestStreak: 0 },
    },
    recentLogs = [],
    rewardItems = [],
  } = data || {};

  const filteredLogs = recentLogs.filter((log: any) => {
    if (activeFilter === "REWARDS") return log.points > 0;
    if (activeFilter === "PENALTIES") return log.points < 0;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-16 px-1 sm:px-0 select-none">
      {/* 10-Second Undo Safety Toast */}
      <UndoToast
        isOpen={undoState.isOpen}
        message={undoState.message}
        subMessage={undoState.subMessage}
        isError={undoState.isError}
        durationSeconds={10}
        onUndo={handleUndo}
        onClose={() => setUndoState((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Hero Master Cockpit: Obsidian Hologram Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900/90 via-black to-black border border-white/10 p-6 sm:p-7 shadow-2xl">
        {/* Ambient Glow Orbs */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left: Level Rank & Massive Karma XP */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/15 border border-brand-red/30 text-xs font-mono font-bold text-red-300">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-ping" />
                <span>LEVEL {level}</span>
                <span className="text-zinc-500">•</span>
                <span>{levelTitle}</span>
              </div>
              {season && (
                <span className="text-[11px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/5">
                  {season.name} ({season.daysRemaining}d left)
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-sm">
                {totalXP.toLocaleString()}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-brand-red uppercase tracking-wider">
                Karma XP
              </span>
            </div>

            <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
              <span>Spendable Coins: <strong className="text-white font-bold">{totalXP}</strong></span>
              <span>•</span>
              <span>Lifetime Earned: <strong className="text-zinc-300">{lifetimeXP} XP</strong></span>
            </p>
          </div>

          {/* Right: Daily Gain/Loss Telemetry & Quick Action Pill */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 flex-shrink-0">
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
              <div className="px-3 py-1 text-left">
                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Today Earned</span>
                <span className="text-xs font-bold font-mono text-emerald-400">+{todayEarned} XP</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="px-3 py-1 text-left">
                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Today Lost</span>
                <span className="text-xs font-bold font-mono text-brand-red">-{todayDeducted} XP</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setIsDeductModalOpen(true)}
                className="text-xs text-zinc-300 hover:text-white border-white/10"
              >
                <span>Custom Penalty</span>
              </Button>
              <Button
                variant="glass"
                size="sm"
                onClick={() => setIsRewardModalOpen(true)}
                className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Award XP</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="relative z-10 mt-6 pt-4 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-red" />
              <span>Level {level} Advancement</span>
            </span>
            <span className="text-white font-bold">
              {currentLevelXP} / {nextLevelXP} XP ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-full transition-all duration-500 shadow-glow-red"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Core Discipline Protocols (Clean Bento Layout) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-red" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              Core Discipline Pillars
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Streak safeguards &amp; strict penalties
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Pillar 1: Clean Diet & Nutrition */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-500/[0.05] via-zinc-950/80 to-black border border-amber-500/20 hover:border-amber-500/40 p-5 flex flex-col justify-between gap-5 transition-all shadow-lg hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Diet
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Eat Clean Protocol</h4>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Zero junk food, sweets or processed snacks
              </p>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {streaks.diet?.currentStreak || 0}
                </span>
                <span className="text-xs font-mono text-zinc-500 uppercase">Days Clean</span>
                <span className="text-xs font-mono text-zinc-400 ml-auto">
                  Best: <strong className="text-white">{streaks.diet?.bestStreak || 0}d</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
              className="w-full py-2.5 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 text-xs font-mono font-bold text-amber-300 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ate Junk Food (-150 XP)</span>
            </button>
          </div>

          {/* Pillar 2: Monk Purity (No-Fap) */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-red-500/[0.08] via-zinc-950/80 to-black border border-brand-red/30 hover:border-brand-red/50 p-5 flex flex-col justify-between gap-5 transition-all shadow-lg hover:shadow-[0_0_25px_rgba(239,68,68,0.2)]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-glow-red">
                <Zap className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-brand-red/20 text-red-300 border border-brand-red/40">
                Purity
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Monk Purity Protocol</h4>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Mental clarity &amp; sexual discipline
              </p>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {streaks.purity?.currentStreak || 0}
                </span>
                <span className="text-xs font-mono text-zinc-500 uppercase">Days Clean</span>
                <span className="text-xs font-mono text-zinc-400 ml-auto">
                  Best: <strong className="text-white">{streaks.purity?.bestStreak || 0}d</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDeduct("RELAPSE")}
              className="w-full py-2.5 px-3 rounded-2xl bg-brand-red hover:bg-brand-redDark active:scale-95 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-glow-red"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Log Relapse (-300 XP)</span>
            </button>
          </div>

          {/* Pillar 3: Sleep & Rest */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-indigo-500/[0.05] via-zinc-950/80 to-black border border-indigo-500/20 hover:border-indigo-500/40 p-5 flex flex-col justify-between gap-5 transition-all shadow-lg hover:shadow-[0_0_25px_rgba(99,102,241,0.15)]">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Moon className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                Sleep
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white tracking-tight">Sleep &amp; Recovery</h4>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Strict bedtime &amp; wake-up consistency
              </p>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tracking-tight">
                  {streaks.sleep?.currentStreak || 0}
                </span>
                <span className="text-xs font-mono text-zinc-500 uppercase">Days Clean</span>
                <span className="text-xs font-mono text-zinc-400 ml-auto">
                  Best: <strong className="text-white">{streaks.sleep?.bestStreak || 0}d</strong>
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDeduct("SLEEP")}
              className="w-full py-2.5 px-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 active:scale-95 border border-indigo-500/30 text-xs font-mono font-bold text-indigo-300 flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Broke Sleep (-100 XP)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guilt-Free Store (3 Passes Only) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-brand-red" />
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              Guilt-Free Privilege Store
            </h3>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            Redeem XP for planned passes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {rewardItems.map((item: any) => {
            const canAfford = totalXP >= item.cost;
            const t = item.title.toLowerCase();

            let IconComponent = Sparkles;
            let iconColor = "text-brand-red";
            let accentBorder = "border-white/10 hover:border-brand-red/40";
            let badgeBg = "bg-white/[0.04] text-zinc-300";

            if (t.includes("junk") || item.icon === "Pizza") {
              IconComponent = Pizza;
              iconColor = "text-amber-400";
              accentBorder = "border-amber-500/20 hover:border-amber-500/40";
              badgeBg = "bg-amber-500/10 text-amber-300 border-amber-500/30";
            } else if (t.includes("relapse") || item.icon === "Zap") {
              IconComponent = Zap;
              iconColor = "text-red-400";
              accentBorder = "border-red-500/30 hover:border-red-500/50";
              badgeBg = "bg-red-500/10 text-red-300 border-red-500/30";
            } else if (t.includes("sleep") || item.icon === "Moon") {
              IconComponent = Moon;
              iconColor = "text-indigo-400";
              accentBorder = "border-indigo-500/20 hover:border-indigo-500/40";
              badgeBg = "bg-indigo-500/10 text-indigo-300 border-indigo-500/30";
            }

            return (
              <div
                key={item.id}
                className={`relative overflow-hidden rounded-3xl bg-black/80 backdrop-blur-xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-md ${accentBorder}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                      <IconComponent className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono font-bold text-white">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>{item.cost} XP</span>
                    </div>
                  </div>

                  <h5 className="text-sm font-bold text-white leading-snug">{item.title}</h5>
                  <p className="text-xs text-zinc-400 font-mono mt-1 leading-relaxed">
                    {t.includes("junk")
                      ? "One planned, guilt-free cheat meal or junk treat."
                      : t.includes("relapse")
                      ? "Controlled forgiveness protocol without long-term streak demotion."
                      : t.includes("sleep")
                      ? "Guilt-free +1.5 hour extra sleep-in or restorative recovery day."
                      : "Controlled release protocol without streak penalty."}
                  </p>

                  {item.timesRedeemed > 0 && (
                    <span className="text-[10px] text-zinc-500 font-mono block mt-2">
                      Redeemed {item.timesRedeemed}x
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={!canAfford}
                  onClick={() => handleRedeemPerk(item.id, item.cost, item.title)}
                  className={`w-full py-2.5 px-3 rounded-2xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    canAfford
                      ? "bg-brand-red hover:bg-brand-redDark text-white shadow-glow-red"
                      : "bg-white/[0.03] text-zinc-500 border border-white/5 cursor-not-allowed"
                  }`}
                >
                  <span>{canAfford ? `Unlock ${item.title}` : `Need ${item.cost - totalXP} More XP`}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity History Ledger */}
      <div className="rounded-3xl bg-black/80 backdrop-blur-xl border border-white/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brand-red" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Discipline Karma Ledger
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/5">
            {(["ALL", "REWARDS", "PENALTIES"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  haptics.selection();
                  setActiveFilter(filter);
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                  activeFilter === filter
                    ? "bg-brand-red text-white shadow-glow-red"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {filter === "ALL" ? "All" : filter === "REWARDS" ? "+ Gains" : "- Penalties"}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-white/5 max-h-80 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No entries logged in this view.
            </div>
          ) : (
            filteredLogs.map((log: any) => {
              const isGain = log.points > 0;
              return (
                <div
                  key={log.id}
                  className="py-3 px-1 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                        isGain
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/10 text-brand-red border-red-500/30"
                      }`}
                    >
                      {isGain ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{log.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-zinc-500">
                        <span>{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                        {log.reason && <span className="text-zinc-400 truncate">• {log.reason}</span>}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2.5 py-1 rounded-xl border flex-shrink-0 ${
                      isGain
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-red-500/10 text-brand-red border-red-500/30"
                    }`}
                  >
                    {isGain ? `+${log.points}` : `${log.points}`} XP
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Custom Discipline Deduction */}
      <Modal
        isOpen={isDeductModalOpen}
        onClose={() => setIsDeductModalOpen(false)}
        title="Log Custom Discipline Infraction"
      >
        <form onSubmit={handleSubmitDeduct} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Infraction Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeductType("UNHEALTHY_FOOD");
                  setDeductPoints("150");
                }}
                className={`p-2.5 rounded-2xl border text-center font-mono ${
                  deductType === "UNHEALTHY_FOOD"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500 font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                🍔 Eat Junk (-150)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("RELAPSE");
                  setDeductPoints("300");
                }}
                className={`p-2.5 rounded-2xl border text-center font-mono ${
                  deductType === "RELAPSE"
                    ? "bg-brand-red text-white border-brand-red font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                ⚡ Relapse (-300)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("SLEEP");
                  setDeductPoints("100");
                }}
                className={`p-2.5 rounded-2xl border text-center font-mono ${
                  deductType === "SLEEP"
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500 font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                🌙 Broke Sleep (-100)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("CUSTOM");
                  setDeductPoints("50");
                }}
                className={`p-2.5 rounded-2xl border text-center font-mono ${
                  deductType === "CUSTOM"
                    ? "bg-white/[0.1] text-white border-white font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                ⚠️ Other Custom
              </button>
            </div>
          </div>

          {deductType === "CUSTOM" && (
            <div>
              <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                Title / Action
              </label>
              <input
                type="text"
                value={deductTitle}
                onChange={(e) => setDeductTitle(e.target.value)}
                placeholder="e.g. Skipped Workout / Late Night Screen Time"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-red font-mono"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              XP Penalty Deducted
            </label>
            <input
              type="number"
              value={deductPoints}
              onChange={(e) => setDeductPoints(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-2xl text-white font-mono focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Reflection Notes (Optional)
            </label>
            <textarea
              value={deductReason}
              onChange={(e) => setDeductReason(e.target.value)}
              placeholder="What triggered this? What will you do differently next time?"
              rows={2}
              className="w-full px-3.5 py-2 bg-black/60 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-red font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="glass" onClick={() => setIsDeductModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="red" isLoading={isSubmittingDeduct}>
              Apply Penalty
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Custom Reward Points */}
      <Modal
        isOpen={isRewardModalOpen}
        onClose={() => setIsRewardModalOpen(false)}
        title="Award Custom Karma XP"
      >
        <form onSubmit={handleSubmitReward} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Achievement / Good Deed
            </label>
            <input
              type="text"
              value={rewardTitle}
              onChange={(e) => setRewardTitle(e.target.value)}
              placeholder="e.g. Cold Shower / 30m Intense Exercise / 100 Pushups"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-red font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Points Awarded (+XP)
            </label>
            <input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-2xl text-white font-mono focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Notes (Optional)
            </label>
            <textarea
              value={rewardReason}
              onChange={(e) => setRewardReason(e.target.value)}
              placeholder="Reflections or details..."
              rows={2}
              className="w-full px-3.5 py-2 bg-black/60 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-brand-red font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="glass" onClick={() => setIsRewardModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="red" isLoading={isSubmittingReward}>
              Award XP
            </Button>
          </div>
        </form>
      </Modal>

      {/* Quick Deduct Infraction Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeductType)}
        onClose={() => setConfirmDeductType(null)}
        onConfirm={handleExecuteQuickDeduct}
        isLoading={isDeducting}
        title={
          confirmDeductType === "UNHEALTHY_FOOD"
            ? "Log Eat Junk Infraction"
            : confirmDeductType === "RELAPSE"
            ? "Log Protocol Relapse"
            : "Log Sleep Infraction"
        }
        message={
          confirmDeductType === "UNHEALTHY_FOOD"
            ? "Log an Eat Junk Food infraction (-150 XP) and reset your Clean Diet streak?"
            : confirmDeductType === "RELAPSE"
            ? "Log a Monk Protocol Relapse (-300 XP) and reset your Purity streak to Day 0?"
            : "Log a Sleep Schedule infraction (-100 XP) and reset your Sleep streak?"
        }
        confirmText={
          confirmDeductType === "UNHEALTHY_FOOD"
            ? "Deduct 150 XP"
            : confirmDeductType === "RELAPSE"
            ? "Deduct 300 XP"
            : "Deduct 100 XP"
        }
        confirmVariant="red"
        iconType="danger"
      />

      {/* Perk Redemption Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(perkToRedeem)}
        onClose={() => setPerkToRedeem(null)}
        onConfirm={handleExecuteRedeemPerk}
        isLoading={isRedeeming}
        title="Redeem Karma Perk"
        message={`Redeem "${perkToRedeem?.title}" by spending ${perkToRedeem?.cost} XP from your hard-earned discipline balance?`}
        confirmText={`Unlock for ${perkToRedeem?.cost} XP`}
        confirmVariant="red"
        iconType="warning"
      />
    </div>
  );
}
