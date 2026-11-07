"use client";

import React, { useState, useEffect } from "react";
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
  Coins,
  History,
  Ticket,
  Lock,
  ChevronRight,
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
  const [deductType, setDeductType] = useState<"UNHEALTHY_FOOD" | "RELAPSE" | "CUSTOM">("UNHEALTHY_FOOD");
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

  const [confirmDeductType, setConfirmDeductType] = useState<"UNHEALTHY_FOOD" | "RELAPSE" | null>(null);
  const [isDeducting, setIsDeducting] = useState(false);
  const [perkToRedeem, setPerkToRedeem] = useState<{ id: string; cost: number; title: string } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleQuickDeduct = (type: "UNHEALTHY_FOOD" | "RELAPSE") => {
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
          subMessage: "Streak reset to Day 0. Tap undo to revert.",
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
          message: `+${rewardPoints} XP awarded`,
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
          message: `Unlocked "${perkToRedeem.title}"`,
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
    <div className="space-y-4 pb-14 max-w-2xl mx-auto px-1 sm:px-0 select-none">
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

      {/* Sleek Mobile Header following Red Theme */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-brand-red" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight leading-none">
              Karma XP
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5 block">
              {format(new Date(), "EEE, dd MMM")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsDeductModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-brand-red/10 border border-white/10 hover:border-brand-red/30 text-xs font-mono text-zinc-300 hover:text-red-300 flex items-center gap-1 active:scale-95 transition-all"
          >
            <Minus className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-[11px] font-semibold">Penalty</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRewardModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/40 text-xs font-mono text-red-200 flex items-center gap-1 active:scale-95 transition-all shadow-glow-red-subtle"
          >
            <Plus className="w-3.5 h-3.5 text-brand-red stroke-[2.5]" />
            <span className="text-[11px] font-semibold">Award</span>
          </button>
        </div>
      </div>

      {/* Hero Stats Pill Banner (All Red Themed) */}
      <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div>
            <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider block">
              Karma XP Balance
            </span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-2xl font-bold font-mono text-white tracking-tight">
                {totalXP.toLocaleString()}
              </span>
              <span className="text-[11px] font-mono font-bold text-brand-red">
                XP
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono mt-1">
              <span className="text-zinc-300 font-medium">+{todayEarned} today</span>
              <span className="text-zinc-600">•</span>
              <span className={todayDeducted > 0 ? "text-brand-red font-semibold" : "text-zinc-500"}>
                -{todayDeducted} lost
              </span>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-red/15 border border-brand-red/30 text-[10px] font-mono font-bold text-red-300">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse" />
              <span>LVL {level}</span>
              <span className="text-zinc-600">•</span>
              <span className="truncate max-w-[90px]">{levelTitle}</span>
            </div>
            <span className="text-xs font-bold font-mono text-white mt-1">
              {progressPercent}%
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              {currentLevelXP}/{nextLevelXP} XP
            </span>
          </div>
        </div>

        {/* Level Progression Progress Bar (Pure Brand Red Gradient) */}
        <div className="w-full h-1.5 bg-white/5 border border-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-redDark via-brand-red to-brand-redLight rounded-full transition-all duration-500 shadow-glow-red"
            style={{ width: `${Math.max(4, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Core Discipline Pillars: Compact 2-Item Row (Red Theme) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-brand-red" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Core Pillars
            </h3>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">
            Tap to record slip
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Pillar 1: Clean Diet */}
          <div className="rounded-2xl bg-zinc-950 border border-white/10 hover:border-brand-red/30 p-3 flex flex-col justify-between gap-2.5 transition-all">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-brand-red/10 border border-brand-red/25 flex items-center justify-center text-brand-red flex-shrink-0">
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">Eat Clean</h4>
                  <p className="text-[9px] text-zinc-500 font-mono">Diet</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {streaks.diet?.graceUsed && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30" title="1 rolling grace day active">
                    🛡️ Grace
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-red/15 text-red-300 border border-brand-red/30 flex-shrink-0">
                  {streaks.diet?.currentStreak || 0}d
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDeduct("UNHEALTHY_FOOD")}
              className="w-full py-1.5 px-2 rounded-xl bg-brand-red/10 hover:bg-brand-red/20 active:scale-95 border border-brand-red/30 text-[10px] font-mono font-bold text-red-300 flex items-center justify-center gap-1 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-brand-red" />
              <span>Ate Junk (-150)</span>
            </button>
          </div>

          {/* Pillar 2: Monk Purity */}
          <div className="rounded-2xl bg-zinc-950 border border-brand-red/25 hover:border-brand-red/40 p-3 flex flex-col justify-between gap-2.5 transition-all">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red flex-shrink-0">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">Monk Purity</h4>
                  <p className="text-[9px] text-zinc-500 font-mono">Purity</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {streaks.purity?.graceUsed && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30" title="1 rolling grace day active">
                    🛡️ Grace
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-brand-red/15 text-red-300 border border-brand-red/30 flex-shrink-0">
                  {streaks.purity?.currentStreak || 0}d
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleQuickDeduct("RELAPSE")}
              className="w-full py-1.5 px-2 rounded-xl bg-brand-red hover:bg-brand-redDark active:scale-95 text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all shadow-glow-red"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Relapse (-300)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guilt-Free Privilege Store */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Ticket className="w-4 h-4 text-brand-red" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Guilt-Free Store
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span className="text-zinc-500">Spendable:</span>
            <span className="font-bold text-brand-red">{totalXP.toLocaleString()} XP</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {rewardItems.map((item: any, idx: number) => {
            const canAfford = totalXP >= item.cost;
            const t = item.title.toLowerCase();

            let IconComponent = Sparkles;
            let passTag = "PRIVILEGE PASS";
            let passNumber = `0${idx + 1}`;

            if (t.includes("junk") || item.icon === "Pizza") {
              IconComponent = Pizza;
              passTag = "CHEAT MEAL EXEMPTION";
              passNumber = "01";
            } else if (t.includes("relapse") || item.icon === "Zap") {
              IconComponent = Zap;
              passTag = "MONK PARDON PROTOCOL";
              passNumber = "02";
            } else if (t.includes("sleep") || item.icon === "Moon") {
              IconComponent = Moon;
              passTag = "DEEP RECOVERY PASS";
              passNumber = "03";
            }

            const progressToUnlock = Math.min(100, Math.round((totalXP / item.cost) * 100));

            return (
              <div
                key={item.id}
                className={clsx(
                  "relative rounded-xl bg-zinc-950 border transition-all overflow-hidden",
                  canAfford
                    ? "border-white/10 hover:border-brand-red/40 shadow-[0_0_15px_rgba(239,68,68,0.05)]"
                    : "border-white/5 opacity-80"
                )}
              >
                {/* Subtle Ambient Red Glow on affordable passes */}
                {canAfford && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-red/10 rounded-full blur-xl pointer-events-none" />
                )}

                <div className="p-2.5 space-y-2 relative z-10">
                  {/* Top Header Row of the Pass */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[8px] font-mono font-bold tracking-wider text-zinc-500 uppercase">
                      PASS #{passNumber} • {passTag}
                    </span>

                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand-red/15 border border-brand-red/30 text-[10px] font-mono font-bold text-red-300">
                      <Coins className="w-2.5 h-2.5 text-brand-red" />
                      <span>{item.cost} XP</span>
                    </div>
                  </div>

                  {/* Pass Body Content */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border transition-colors",
                        canAfford
                          ? "bg-brand-red/10 border-brand-red/30 text-brand-red"
                          : "bg-white/[0.04] border-white/10 text-zinc-500"
                      )}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white tracking-tight leading-tight truncate">
                        {item.title}
                      </h4>
                      <p className="text-[10px] text-zinc-400 font-mono mt-0.5 leading-tight truncate">
                        {t.includes("junk")
                          ? "Planned cheat meal with zero discipline guilt."
                          : t.includes("relapse")
                          ? "Monk forgiveness pass — release without rank demotion."
                          : t.includes("sleep")
                          ? "Guilt-free +1.5h sleep-in or restorative recovery."
                          : item.description}
                      </p>
                    </div>
                  </div>

                  {/* Perforated Divider */}
                  <div className="w-full border-t border-dashed border-white/10" />

                  {/* Pass Footer / Redemption Stub */}
                  <div className="flex items-center justify-between gap-2">
                    {canAfford ? (
                      <div className="flex items-center gap-1 text-[9px] font-mono text-red-300 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-pulse flex-shrink-0" />
                        <span className="truncate">Available</span>
                        {item.timesRedeemed > 0 && (
                          <span className="text-zinc-500 truncate">• Used {item.timesRedeemed}x</span>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500">
                          <Lock className="w-2.5 h-2.5 text-zinc-500" />
                          <span>Need {item.cost - totalXP} XP</span>
                          <span className="text-zinc-600">({progressToUnlock}%)</span>
                        </div>
                        <div className="w-20 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-red/40 rounded-full transition-all"
                            style={{ width: `${progressToUnlock}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleRedeemPerk(item.id, item.cost, item.title)}
                      className={clsx(
                        "py-1 px-2.5 rounded-lg text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 flex-shrink-0",
                        canAfford
                          ? "bg-brand-red hover:bg-brand-redDark text-white shadow-glow-red"
                          : "bg-white/[0.04] text-zinc-500 border border-white/5 cursor-not-allowed"
                      )}
                    >
                      {canAfford ? (
                        <>
                          <span>Redeem</span>
                          <ChevronRight className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <Lock className="w-2.5 h-2.5" />
                          <span>Locked</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity History Ledger (Red Theme) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <History className="w-4 h-4 text-brand-red" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Karma Ledger
            </h4>
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10">
            {(["ALL", "REWARDS", "PENALTIES"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => {
                  haptics.selection();
                  setActiveFilter(filter);
                }}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                  activeFilter === filter
                    ? "bg-brand-red text-white shadow-glow-red"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {filter === "ALL" ? "All" : filter === "REWARDS" ? "+ Gains" : "- Lost"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-950 border border-white/10 divide-y divide-white/5 overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-5 text-center text-xs text-zinc-500 font-mono">
              No entries logged in this view.
            </div>
          ) : (
            filteredLogs.slice(0, 15).map((log: any) => {
              const isGain = log.points > 0;
              return (
                <div
                  key={log.id}
                  className="py-2.5 px-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                        isGain
                          ? "bg-white/[0.05] text-zinc-300 border-white/10"
                          : "bg-brand-red/10 text-brand-red border-brand-red/30"
                      }`}
                    >
                      {isGain ? <Plus className="w-3 h-3 text-red-300" /> : <Minus className="w-3 h-3 text-brand-red" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{log.title}</p>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500">
                        <span>{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                        {log.reason && <span className="text-zinc-400 truncate">• {log.reason}</span>}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${
                      isGain
                        ? "bg-white/[0.05] text-white border-white/10"
                        : "bg-brand-red/15 text-brand-red border-brand-red/30"
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

      {/* Modal: Custom Discipline Deduction (Red Themed) */}
      <Modal
        isOpen={isDeductModalOpen}
        onClose={() => setIsDeductModalOpen(false)}
        title="Log Infraction Penalty"
      >
        <form onSubmit={handleSubmitDeduct} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Infraction Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeductType("UNHEALTHY_FOOD");
                  setDeductPoints("150");
                }}
                className={`p-2 rounded-xl border text-center font-mono text-[11px] transition-all ${
                  deductType === "UNHEALTHY_FOOD"
                    ? "bg-brand-red/20 text-red-300 border-brand-red font-bold shadow-glow-red-subtle"
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
                className={`p-2 rounded-xl border text-center font-mono text-[11px] transition-all ${
                  deductType === "RELAPSE"
                    ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red"
                    : "bg-white/[0.04] text-zinc-400 border-white/10"
                }`}
              >
                ⚡ Relapse (-300)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeductType("CUSTOM");
                  setDeductPoints("50");
                }}
                className={`p-2 rounded-xl border text-center font-mono text-[11px] transition-all ${
                  deductType === "CUSTOM"
                    ? "bg-white/[0.1] text-white border-white font-bold"
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
                className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red font-mono"
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
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
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
              placeholder="What triggered this?"
              rows={2}
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red font-mono"
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
              placeholder="e.g. Cold Shower / 100 Pushups"
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red font-mono"
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
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
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
              className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red font-mono"
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
            : "Log Protocol Relapse"
        }
        message={
          confirmDeductType === "UNHEALTHY_FOOD"
            ? "Log an Eat Junk Food infraction (-150 XP) and reset your Clean Diet streak?"
            : "Log a Monk Protocol Relapse (-300 XP) and reset your Purity streak to Day 0?"
        }
        confirmText={
          confirmDeductType === "UNHEALTHY_FOOD"
            ? "Deduct 150 XP"
            : "Deduct 300 XP"
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
