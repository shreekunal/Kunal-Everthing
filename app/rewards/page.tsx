"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UndoToast } from "@/components/ui/UndoToast";
import {
  Trophy,
  Shield,
  ShieldCheck,
  Zap,
  Plus,
  Minus,
  UtensilsCrossed,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Gift,
  History,
  Sparkles,
  Pizza,
  Moon,
  Droplets,
  BedDouble,
} from "lucide-react";
import { format } from "date-fns";
import { haptics } from "@/lib/haptics";

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
    <div className="space-y-6 max-w-6xl mx-auto w-full pb-10">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-red" />
            Discipline Karma &amp; Reward System
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Core 3-Pillar Protocols: Clean Diet, Monk Purity &amp; Sleep Schedule
          </p>
        </div>

        {/* 3-Pillar Quick Action Suite */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
            className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-1.5"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-amber-400" />
            <span>Eat Junk (-150 XP)</span>
          </Button>

          <Button
            variant="red"
            size="sm"
            onClick={() => handleQuickDeduct("RELAPSE")}
            className="text-xs shadow-glow-red gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Relapse (-300 XP)</span>
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => handleQuickDeduct("SLEEP")}
            className="text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 gap-1.5"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400" />
            <span>Sleep (-100 XP)</span>
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsRewardModalOpen(true)}
            className="text-xs text-zinc-300"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Custom</span>
          </Button>
        </div>
      </div>

      {/* Hero Level & XP Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main XP Card */}
        <Card glow="red" className="lg:col-span-2 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                  Discipline Rank &amp; Karma {season && `• ${season.name} (${season.daysRemaining}d left)`}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{levelTitle}</span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Level {level} • Spendable Karma:{" "}
                <strong className={`font-bold ${totalXP < 0 ? "text-red-400" : "text-white"}`}>{totalXP} XP</strong>
                <span className="text-zinc-500 ml-2">Lifetime: {lifetimeXP} XP</span>
              </p>
            </div>

            {/* Today XP Summary Pill */}
            <div className="flex items-center gap-2 bg-black/60 border border-white/10 p-2.5 rounded-2xl">
              <div className="px-2.5 py-1 text-center">
                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Today Gained</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">+{todayEarned} XP</span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div className="px-2.5 py-1 text-center">
                <span className="text-[9px] text-zinc-500 font-mono block uppercase">Today Lost</span>
                <span className="text-xs font-bold text-brand-red font-mono">-{todayDeducted} XP</span>
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-400">Level {level} Progress</span>
              <span className="text-white font-semibold">
                {currentLevelXP} / {nextLevelXP} XP ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-brand-red rounded-full transition-all duration-500 shadow-glow-red"
                style={{ width: `${Math.max(5, progressPercent)}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Quick Rules & Point System */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Discipline Matrix</CardTitle>
            <Badge variant="glass" size="sm">Rulebook</Badge>
          </CardHeader>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Deep Work Sprint</span>
              <span className="font-bold text-emerald-400">+1 XP / 5m</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Eat Junk Infraction</span>
              <span className="font-bold text-amber-400">-150 XP</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Relapse Infraction</span>
              <span className="font-bold text-brand-red">-300 XP</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Broke Sleep Schedule</span>
              <span className="font-bold text-indigo-400">-100 XP</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 3 Core Discipline Protocols */}
      <Card glow="red" className="relative overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-red" />
            <CardTitle>Core Discipline Protocols (3 Pillars)</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            Live Streaks
          </Badge>
        </CardHeader>

        <p className="text-xs text-zinc-400 -mt-2 mb-4">
          Consecutive clean days maintained without infraction across Eat Junk, Relapse &amp; Sleep.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pillar 1: Clean Diet (Eat Junk) */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-amber-500/20 flex flex-col justify-between gap-3 hover:border-amber-500/40 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Clean Diet &amp; Nutrition</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    No junk / processed food
                  </p>
                </div>
              </div>
              <Badge variant="glass" size="sm" className="border-amber-500/30 text-amber-300">
                Diet
              </Badge>
            </div>

            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {streaks.diet.currentStreak}
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase">Days Clean</span>
              <span className="text-xs font-mono text-zinc-500 ml-auto">
                Record: <strong className="text-white">{streaks.diet.bestStreak}d</strong>
              </span>
            </div>

            <Button
              variant="glass"
              size="sm"
              onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
              className="w-full text-xs text-amber-400 border-amber-500/30 hover:bg-amber-500/10 gap-1.5 py-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Eat Junk &amp; Reset (-150 XP)</span>
            </Button>
          </div>

          {/* Pillar 2: Monk Purity (Relapse) */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-brand-red/30 flex flex-col justify-between gap-3 hover:border-brand-red/50 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-glow-red flex-shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Monk Purity Protocol</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Consecutive days clean
                  </p>
                </div>
              </div>
              <Badge variant="red" size="sm">
                Purity
              </Badge>
            </div>

            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {streaks.purity.currentStreak}
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase">Days Clean</span>
              <span className="text-xs font-mono text-zinc-500 ml-auto">
                Record: <strong className="text-white">{streaks.purity.bestStreak}d</strong>
              </span>
            </div>

            <Button
              variant="glass"
              size="sm"
              onClick={() => handleQuickDeduct("RELAPSE")}
              className="w-full text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5 py-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Relapse &amp; Reset (-300 XP)</span>
            </Button>
          </div>

          {/* Pillar 3: Sleep Schedule */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-indigo-500/20 flex flex-col justify-between gap-3 hover:border-indigo-500/40 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Sleep &amp; Recovery</h4>
                  <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                    Consistent sleep schedule
                  </p>
                </div>
              </div>
              <Badge variant="glass" size="sm" className="border-indigo-500/30 text-indigo-300">
                Sleep
              </Badge>
            </div>

            <div className="my-2 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white tracking-tight">
                {streaks.sleep?.currentStreak || 0}
              </span>
              <span className="text-xs font-mono text-zinc-400 uppercase">Days Clean</span>
              <span className="text-xs font-mono text-zinc-500 ml-auto">
                Record: <strong className="text-white">{streaks.sleep?.bestStreak || 0}d</strong>
              </span>
            </div>

            <Button
              variant="glass"
              size="sm"
              onClick={() => handleQuickDeduct("SLEEP")}
              className="w-full text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 gap-1.5 py-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Broke Sleep &amp; Reset (-100 XP)</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Guilt-Free Store (3 Items Only: Eat Junk, Relapse & Sleep) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-brand-red" />
            <CardTitle>Guilt-Free Rewards Store (3 Passes)</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            Discipline Passes ({rewardItems.length})
          </Badge>
        </CardHeader>

        <p className="text-xs text-zinc-400 -mt-2 mb-4">
          Redeem discipline karma to take planned, guilt-free breaks for Eat Junk, Relapse, or Sleep.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rewardItems.map((item: any) => {
            const canAfford = totalXP >= item.cost;
            const t = item.title.toLowerCase();

            let IconComponent = Gift;
            let iconColor = "text-brand-red";
            let borderStyle = "hover:border-brand-red/30";
            if (t.includes("junk") || item.icon === "Pizza") {
              IconComponent = Pizza;
              iconColor = "text-amber-400";
              borderStyle = "hover:border-amber-500/40";
            } else if (t.includes("relapse") || item.icon === "Zap") {
              IconComponent = Zap;
              iconColor = "text-red-400";
              borderStyle = "hover:border-red-500/40";
            } else if (t.includes("sleep") || item.icon === "Moon") {
              IconComponent = Moon;
              iconColor = "text-indigo-400";
              borderStyle = "hover:border-indigo-500/40";
            }

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between gap-4 transition-all shadow-glass-card ${borderStyle}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                      <IconComponent className={`w-5 h-5 ${iconColor}`} />
                    </div>
                    <span className="font-bold text-base font-mono text-brand-red">
                      {item.cost} XP
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-white leading-snug">{item.title}</h5>
                  <p className="text-xs text-zinc-400 font-mono mt-1 leading-relaxed">
                    {t.includes("junk")
                      ? "One planned, guilt-free cheat meal or junk food treat."
                      : t.includes("relapse")
                      ? "Controlled forgiveness release protocol without long-term streak demotion."
                      : t.includes("sleep")
                      ? "Guilt-free +1.5 hour extra sleep-in or deep restorative rest day."
                      : "Controlled release protocol without streak penalty."}
                  </p>
                  {item.timesRedeemed > 0 && (
                    <span className="text-[10px] text-zinc-500 font-mono block mt-2">
                      Redeemed {item.timesRedeemed}x
                    </span>
                  )}
                </div>

                <Button
                  variant={canAfford ? "red" : "glass"}
                  size="sm"
                  disabled={!canAfford}
                  onClick={() => handleRedeemPerk(item.id, item.cost, item.title)}
                  className="w-full text-xs font-semibold py-2.5"
                >
                  {canAfford ? `Redeem ${item.title}` : `Need ${item.cost - totalXP} More XP`}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Activity Ledger / Audit Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-red" />
            <CardTitle>Discipline Karma Ledger</CardTitle>
          </div>

          <div className="flex items-center gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            {(["ALL", "REWARDS", "PENALTIES"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-colors ${
                  activeFilter === filter
                    ? "bg-brand-red text-white font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </CardHeader>

        <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-mono">
              No discipline logs found for the selected filter.
            </div>
          ) : (
            filteredLogs.map((log: any) => {
              const isReward = log.points > 0;
              return (
                <div
                  key={log.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        log.type === "REWARD_WATER"
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                          : isReward
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-brand-red border border-red-500/20"
                      }`}
                    >
                      {log.type === "REWARD_WATER" ? (
                        <Droplets className="w-4 h-4 fill-cyan-400/20" />
                      ) : isReward ? (
                        <Plus className="w-4 h-4" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-white">{log.title}</h5>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {format(new Date(log.createdAt), "MMM d, h:mm a")}
                        </span>
                        {log.reason && (
                          <span className="text-[10px] text-zinc-400">• {log.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-1 rounded-lg border ${
                      isReward
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-brand-red border-red-500/20"
                    }`}
                  >
                    {isReward ? `+${log.points}` : `${log.points}`} XP
                  </span>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Modal: Custom Discipline Deduction */}
      <Modal
        isOpen={isDeductModalOpen}
        onClose={() => setIsDeductModalOpen(false)}
        title="Log Discipline Infraction"
      >
        <form onSubmit={handleSubmitDeduct} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Infraction Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeductType("UNHEALTHY_FOOD");
                  setDeductPoints("150");
                }}
                className={`p-2.5 rounded-xl border text-center font-mono ${
                  deductType === "UNHEALTHY_FOOD"
                    ? "bg-brand-red text-white border-brand-red font-bold"
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
                className={`p-2.5 rounded-xl border text-center font-mono ${
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
                className={`p-2.5 rounded-xl border text-center font-mono ${
                  deductType === "SLEEP"
                    ? "bg-brand-red text-white border-brand-red font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                🌙 Sleep (-100)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("CUSTOM");
                  setDeductPoints("50");
                }}
                className={`p-2.5 rounded-xl border text-center font-mono ${
                  deductType === "CUSTOM"
                    ? "bg-brand-red text-white border-brand-red font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                ⚠️ Custom
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
                placeholder="e.g. Skipped Workout"
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
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
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Notes / Triggers (Optional)
            </label>
            <textarea
              value={deductReason}
              onChange={(e) => setDeductReason(e.target.value)}
              placeholder="What triggered this? What will you do differently next time?"
              rows={2}
              className="w-full px-3.5 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
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
        title="Award Custom XP"
      >
        <form onSubmit={handleSubmitReward} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Achievement / Deed Title
            </label>
            <input
              type="text"
              value={rewardTitle}
              onChange={(e) => setRewardTitle(e.target.value)}
              placeholder="e.g. Cold Shower / 30m Exercise"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
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
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
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
              className="w-full px-3.5 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
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
