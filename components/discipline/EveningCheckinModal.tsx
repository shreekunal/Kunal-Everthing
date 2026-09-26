"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, UtensilsCrossed, Moon, Trophy, Check, Sparkles } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface EveningCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
  todayEarned?: number;
  todayDeducted?: number;
}

export function EveningCheckinModal({
  isOpen,
  onClose,
  onCompleted,
  todayEarned = 0,
  todayDeducted = 0,
}: EveningCheckinModalProps) {
  const [cleanDiet, setCleanDiet] = useState(true);
  const [monkPurity, setMonkPurity] = useState(true);
  const [reflectionNotes, setReflectionNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!cleanDiet || !monkPurity) {
      setError("Evening check-in bonus requires completing the day without diet or purity infractions.");
      haptics.warning();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "EVENING_CHECKIN",
          notes: reflectionNotes || "Bedtime reflection verified: Spotless diet and monk purity.",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete check-in");
      }

      haptics.success();
      setSuccess(true);
      if (onCompleted) onCompleted();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to complete check-in");
      haptics.warning();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🌙 Evening Monk Check-in">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subtitle */}
        <p className="text-xs text-zinc-400 font-mono -mt-2">
          Verify your daily discipline, lock in your day, and claim your bedtime karma bonus.
        </p>

        {/* Daily Delta Pill */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brand-red" />
            <span className="text-zinc-300">Today&apos;s Delta:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">+{todayEarned} XP</span>
            {todayDeducted > 0 && (
              <span className="text-brand-red font-bold">-{todayDeducted} XP</span>
            )}
          </div>
        </div>

        {/* Affirmation Cards */}
        <div className="space-y-2.5">
          <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider">
            Daily Integrity Verification
          </label>

          {/* Clean Diet Checkbox */}
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              setCleanDiet(!cleanDiet);
            }}
            className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              cleanDiet
                ? "bg-emerald-500/10 border-emerald-500/40 text-white"
                : "bg-white/[0.02] border-white/10 text-zinc-400 opacity-60"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                cleanDiet
                  ? "bg-emerald-500 text-black shadow-sm"
                  : "border border-white/20 bg-transparent"
              }`}
            >
              {cleanDiet && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clean Nutrition Preserved</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                No junk food or processed snacks consumed today.
              </p>
            </div>
          </button>

          {/* Monk Purity Checkbox */}
          <button
            type="button"
            onClick={() => {
              haptics.impactLight();
              setMonkPurity(!monkPurity);
            }}
            className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
              monkPurity
                ? "bg-brand-red/10 border-brand-red/40 text-white shadow-glow-red-subtle"
                : "bg-white/[0.02] border-white/10 text-zinc-400 opacity-60"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                monkPurity
                  ? "bg-brand-red text-white shadow-glow-red-subtle"
                  : "border border-white/20 bg-transparent"
              }`}
            >
              {monkPurity && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-red" />
                <span>Monk Purity Kept (No Relapse)</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Maintained discipline, mental clarity, and focus throughout the day.
              </p>
            </div>
          </button>
        </div>

        {/* Reflection Note */}
        <div>
          <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
            Bedtime Reflection / Gratitude (Optional)
          </label>
          <input
            type="text"
            placeholder="Today was productive, mind was steady..."
            value={reflectionNotes}
            onChange={(e) => setReflectionNotes(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-mono"
          />
        </div>

        {/* Error / Success feedback */}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-400 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>Daily Karma locked in! +10 XP awarded. Good night!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            variant="glass"
            size="sm"
            type="button"
            onClick={onClose}
            className="order-2 sm:order-1"
          >
            Dismiss
          </Button>
          <Button
            variant="red"
            size="sm"
            type="submit"
            isLoading={loading}
            disabled={!cleanDiet || !monkPurity}
            className="order-1 sm:order-2 py-2.5 font-bold shadow-glow-red"
          >
            <Moon className="w-4 h-4" />
            <span>Lock in Daily Karma (+10 XP)</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
