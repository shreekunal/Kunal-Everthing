"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Trophy,
  Award,
  Flame,
  ShieldAlert,
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
  ShoppingBag,
  Gamepad2,
  Pizza,
  Film,
  Droplets,
} from "lucide-react";
import { format } from "date-fns";
import { haptics } from "@/lib/haptics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RewardsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isDeductModalOpen, setIsDeductModalOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [isAddPerkModalOpen, setIsAddPerkModalOpen] = useState(false);

  // Form states
  const [deductType, setDeductType] = useState<"UNHEALTHY_FOOD" | "FAP" | "CUSTOM">("UNHEALTHY_FOOD");
  const [deductPoints, setDeductPoints] = useState("50");
  const [deductReason, setDeductReason] = useState("");
  const [deductTitle, setDeductTitle] = useState("");

  const [rewardPoints, setRewardPoints] = useState("30");
  const [rewardTitle, setRewardTitle] = useState("");
  const [rewardReason, setRewardReason] = useState("");

  const [newPerkTitle, setNewPerkTitle] = useState("");
  const [newPerkCost, setNewPerkCost] = useState("250");
  const [newPerkCategory, setNewPerkCategory] = useState("LEISURE");

  const [activeFilter, setActiveFilter] = useState<"ALL" | "REWARDS" | "PENALTIES">("ALL");
  const [actionMessage, setActionMessage] = useState<{ text: string; error?: boolean } | null>(null);

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

  const [confirmDeductType, setConfirmDeductType] = useState<"UNHEALTHY_FOOD" | "FAP" | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const [perkToRedeem, setPerkToRedeem] = useState<{ id: string; cost: number; title: string } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleQuickDeduct = (type: "UNHEALTHY_FOOD" | "FAP") => {
    setConfirmDeductType(type);
  };

  const handleExecuteQuickDeduct = async () => {
    if (!confirmDeductType) return;
    const isFood = confirmDeductType === "UNHEALTHY_FOOD";
    setIsDeducting(true);
    haptics.warning();
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isFood ? "PENALTY_UNHEALTHY_FOOD" : "PENALTY_FAP",
          points: isFood ? 50 : 100,
        }),
      });

      if (res.ok) {
        setActionMessage({
          text: isFood
            ? "🍔 50 XP deducted. Clean Diet streak reset."
            : "⚡ 100 XP deducted. Purity streak reset. Stay focused!",
          error: true,
        });
        setConfirmDeductType(null);
        setTimeout(() => setActionMessage(null), 4000);
        fetchRewards();
      }
    } catch {
      alert("Failed to log infraction");
    } finally {
      setIsDeducting(false);
    }
  };

  const handleSubmitDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let payload: any = {};
      if (deductType === "UNHEALTHY_FOOD") {
        payload = {
          action: "PENALTY_UNHEALTHY_FOOD",
          points: Number(deductPoints) || 50,
          notes: deductReason,
        };
      } else if (deductType === "FAP") {
        payload = {
          action: "PENALTY_FAP",
          points: Number(deductPoints) || 100,
          notes: deductReason,
        };
      } else {
        payload = {
          action: "PENALTY_CUSTOM",
          title: deductTitle || "Custom Discipline Penalty",
          points: Number(deductPoints) || 30,
          notes: deductReason,
        };
      }

      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsDeductModalOpen(false);
        setDeductReason("");
        setDeductTitle("");
        setActionMessage({ text: "Discipline penalty recorded.", error: true });
        setTimeout(() => setActionMessage(null), 4000);
        fetchRewards();
      }
    } catch {
      alert("Failed to record deduction");
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (res.ok) {
        setIsRewardModalOpen(false);
        setRewardTitle("");
        setRewardReason("");
        setActionMessage({ text: `🌟 +${rewardPoints} XP awarded! Keep up the greatness.` });
        setTimeout(() => setActionMessage(null), 4000);
        fetchRewards();
      }
    } catch {
      alert("Failed to award custom points");
    }
  };

  const handleRedeemPerk = (itemId: string, cost: number, title: string) => {
    setPerkToRedeem({ id: itemId, cost, title });
  };

  const handleExecuteRedeemPerk = async () => {
    if (!perkToRedeem) return;
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
      } else {
        setActionMessage({ text: `🎉 Unlocked "${perkToRedeem.title}"! Enjoy guilt-free.` });
        setPerkToRedeem(null);
        setTimeout(() => setActionMessage(null), 4000);
        fetchRewards();
      }
    } catch {
      alert("Redemption error");
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleAddCustomPerk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/rewards/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPerkTitle,
          cost: Number(newPerkCost),
          category: newPerkCategory,
        }),
      });

      if (res.ok) {
        setIsAddPerkModalOpen(false);
        setNewPerkTitle("");
        setNewPerkCost("250");
        fetchRewards();
      }
    } catch {
      alert("Failed to add reward perk");
    }
  };

  const {
    totalXP = 0,
    lifetimeXP = 0,
    monthlyXP = 0,
    season,
    level = 1,
    title: levelTitle = "Novice Disciple",
    currentLevelXP = 0,
    nextLevelXP = 100,
    progressPercent = 0,
    isPetDead = false,
    todayEarned = 0,
    todayDeducted = 0,
    streaks = { purity: { currentStreak: 0, bestStreak: 0 }, diet: { currentStreak: 0, bestStreak: 0 } },
    recentLogs = [],
    rewardItems = [],
  } = data || {};

  const filteredLogs = recentLogs.filter((log: any) => {
    if (activeFilter === "REWARDS") return log.points > 0;
    if (activeFilter === "PENALTIES") return log.points < 0;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-red" />
            Discipline Karma & Reward System
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Earn XP for streaks & completed todos • Enforce strict penalties for infractions
          </p>
        </div>

        {/* Quick Action Suite */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
            className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <UtensilsCrossed className="w-3.5 h-3.5 text-brand-red" />
            <span>Ate Junk Food (-50 XP)</span>
          </Button>

          <Button
            variant="red"
            size="sm"
            onClick={() => handleQuickDeduct("FAP")}
            className="text-xs shadow-glow-red"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Relapse  (-100 XP)</span>
          </Button>

          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsRewardModalOpen(true)}
            className="text-xs text-zinc-300"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>Custom Reward</span>
          </Button>
        </div>
      </div>

      {/* Global Alert Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 text-xs font-mono transition-all animate-in ${actionMessage.error
              ? "bg-red-500/10 border-red-500/30 text-brand-red"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.error ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
        </div>
      )}

      {/* Hero Level & XP Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main XP Card */}
        <Card glow="red" className="lg:col-span-2 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-pulse" />
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                  Discipline Rank & Karma {season && `• ${season.name} (${season.daysRemaining}d left)`}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>{levelTitle}</span>
              </h3>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Level {level} • Season:{" "}
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
              <span className="text-zinc-300">Deep Work / Focus Session</span>
              <span className="font-bold text-emerald-400">+1 XP / min</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Complete High Task</span>
              <span className="font-bold text-emerald-400">+50 XP</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Complete Daily Habit</span>
              <span className="font-bold text-emerald-400">+30 XP</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Unhealthy Food Penalty</span>
              <span className="font-bold text-brand-red">-50 XP</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-zinc-300">Relapse  Penalty</span>
              <span className="font-bold text-brand-red">-100 XP</span>
            </div>
          </div>
        </Card>
      </div>

      {/* 2 Major Discipline Streak Trackers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Purity / NoFap Tracker */}
        <Card glow="red" className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-glow-red">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Monk Purity Protocol (No-Fap)</h4>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Consecutive clean days without relapse
                </p>
              </div>
            </div>
            <Badge variant="red" size="sm">
              High Focus
            </Badge>
          </div>

          <div className="my-5 flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight">
              {streaks.purity.currentStreak}
            </span>
            <span className="text-sm font-mono text-zinc-400 uppercase">Days Clean</span>
            <span className="text-xs font-mono text-zinc-500 ml-auto">
              Record: <strong className="text-white">{streaks.purity.bestStreak}d</strong>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => handleQuickDeduct("FAP")}
              className="w-full text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Log Relapse & Reset (-100 XP)</span>
            </Button>
          </div>
        </Card>

        {/* Clean Diet Tracker */}
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Clean Diet & Nutrition Protocol</h4>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Consecutive clean days without junk/fast food
                </p>
              </div>
            </div>
            <Badge variant="glass" size="sm">
              Nutrition
            </Badge>
          </div>

          <div className="my-5 flex items-baseline gap-2">
            <span className="text-4xl font-black font-mono text-white tracking-tight">
              {streaks.diet.currentStreak}
            </span>
            <span className="text-sm font-mono text-zinc-400 uppercase">Days Clean</span>
            <span className="text-xs font-mono text-zinc-500 ml-auto">
              Record: <strong className="text-white">{streaks.diet.bestStreak}d</strong>
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
              className="w-full text-xs text-red-400 border-red-500/30 hover:bg-red-500/10 gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ate Junk Food & Reset (-50 XP)</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Reward Perk Store */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-brand-red" />
            <CardTitle>Guilt-Free Rewards Store</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            Discipline Passes
          </Badge>
        </CardHeader>

        <p className="text-xs text-zinc-400 -mt-2 mb-4">
          Redeem earned discipline XP to take planned, guilt-free breaks without sacrificing long-term streaks.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rewardItems.map((item: any) => {
            const canAfford = totalXP >= item.cost;
            const isJunk = item.title.toLowerCase().includes("junk");
            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col justify-between gap-4 hover:border-brand-red/30 transition-all shadow-glass-card"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red">
                      {isJunk ? <Pizza className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                    </div>
                    <span className="font-bold text-base font-mono text-brand-red">
                      {item.cost} XP
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-white leading-snug">{item.title}</h5>
                  <p className="text-xs text-zinc-400 font-mono mt-1">
                    {isJunk
                      ? "One guilt-free cheat meal or junk food pass."
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
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-colors ${activeFilter === filter
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
                    className={`text-xs font-mono font-bold px-2 py-1 rounded-lg border ${isReward
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
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeductType("UNHEALTHY_FOOD");
                  setDeductPoints("50");
                }}
                className={`p-2.5 rounded-xl border text-center font-mono ${deductType === "UNHEALTHY_FOOD"
                    ? "bg-brand-red text-white border-brand-red font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                  }`}
              >
                🍔 Junk Food
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("FAP");
                  setDeductPoints("100");
                }}
                className={`p-2.5 rounded-xl border text-center font-mono ${deductType === "FAP"
                    ? "bg-brand-red text-white border-brand-red font-bold"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                  }`}
              >
                ⚡ Relapse
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("CUSTOM");
                  setDeductPoints("30");
                }}
                className={`p-2.5 rounded-xl border text-center font-mono ${deductType === "CUSTOM"
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
                placeholder="e.g. Skipped Gym / Late Night Screen Time"
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
            <Button type="submit" variant="red">
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
              placeholder="e.g. Read 20 Pages of Book / Cold Shower"
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
            <Button type="submit" variant="red">
              Award XP
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Reward Perk */}
      <Modal
        isOpen={isAddPerkModalOpen}
        onClose={() => setIsAddPerkModalOpen(false)}
        title="Add Reward Store Perk"
      >
        <form onSubmit={handleAddCustomPerk} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Perk Title
            </label>
            <input
              type="text"
              value={newPerkTitle}
              onChange={(e) => setNewPerkTitle(e.target.value)}
              placeholder="e.g. 2 Hours Weekend Gaming Pass"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              XP Cost to Unlock
            </label>
            <input
              type="number"
              value={newPerkCost}
              onChange={(e) => setNewPerkCost(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Category
            </label>
            <Select value={newPerkCategory} onValueChange={setNewPerkCategory}>
              <SelectTrigger className="w-full h-10 rounded-xl bg-black/60 border-white/10 text-xs text-white font-mono">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LEISURE">Leisure & Relax</SelectItem>
                <SelectItem value="ENTERTAINMENT">Entertainment & Movies</SelectItem>
                <SelectItem value="FOOD">Cheat Meal & Treats</SelectItem>
                <SelectItem value="BUY">Purchase / Shopping</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button type="button" variant="glass" onClick={() => setIsAddPerkModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="red">
              Add to Store
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
        title={confirmDeductType === "UNHEALTHY_FOOD" ? "Log Junk Food Infraction" : "Log Protocol Relapse"}
        message={
          confirmDeductType === "UNHEALTHY_FOOD"
            ? "Log an Unhealthy / Junk Food infraction (-50 XP) and reset your Clean Diet streak?"
            : "Log a Monk Protocol Relapse (-100 XP) and reset your Purity streak to Day 0?"
        }
        confirmText={confirmDeductType === "UNHEALTHY_FOOD" ? "Deduct 50 XP" : "Deduct 100 XP"}
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
