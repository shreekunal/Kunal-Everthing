"use client";

import React from "react";
import { AlertCircle, Clock, CheckCircle2, ArrowRight, Zap, BookOpen, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { haptics } from "@/lib/haptics";

export interface DecayingTopic {
  aimId: string;
  aimTitle: string;
  milestoneId: string;
  milestoneTitle: string;
  topicId: string;
  topicTitle: string;
  mastery: string;
  lastStudiedDate: string | null;
  daysSinceLastStudied: number;
}

interface KnowledgeDecayRadarProps {
  decayingTopics: DecayingTopic[];
  onReviewTopic: (topic: DecayingTopic) => void;
}

export function KnowledgeDecayRadar({
  decayingTopics,
  onReviewTopic,
}: KnowledgeDecayRadarProps) {
  const count = decayingTopics.length;

  return (
    <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 shadow-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              "w-7 h-7 rounded-lg flex items-center justify-center border",
              count > 0
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
            )}
          >
            {count > 0 ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono text-white tracking-tight flex items-center gap-1.5">
              <span>Spaced Repetition Decay Radar</span>
              {count > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30 font-bold">
                  {count} Need Review
                </span>
              )}
            </h3>
            <p className="text-[10px] font-mono text-zinc-400">
              {count > 0
                ? "Topics unreviewed for 7+ days risk memory decay. 1-tap review to solidify retention."
                : "Optimal retention: All active chapters revised within the last 7 days."}
            </p>
          </div>
        </div>
      </div>

      {/* Decaying Topics List */}
      {count > 0 ? (
        <div className="space-y-2">
          {decayingTopics.slice(0, 5).map((t) => (
            <div
              key={t.topicId}
              className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between gap-2 transition-all group"
            >
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-400">
                    {t.aimTitle}
                  </span>
                  <span className="text-[9px] font-mono text-amber-400 font-semibold flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {t.daysSinceLastStudied}d since last study
                  </span>
                </div>
                <span className="text-xs font-semibold text-white truncate mt-0.5">
                  {t.topicTitle}
                </span>
                <span className="text-[10px] font-mono text-zinc-500 truncate">
                  {t.milestoneTitle}
                </span>
              </div>

              {/* 1-Tap Review Action */}
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  onReviewTopic(t);
                }}
                className="shrink-0 px-2.5 py-1.5 rounded-xl bg-brand-red/15 hover:bg-brand-red text-brand-red hover:text-white border border-brand-red/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all active:scale-95 shadow-glow-red-subtle"
                title="Launch a 25m focus review block on this topic"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Review Today</span>
              </button>
            </div>
          ))}

          {count > 5 && (
            <div className="text-center pt-1">
              <span className="text-[10px] font-mono text-zinc-500">
                +{count - 5} more topics in need of review
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2 text-xs font-mono text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Memory curve is solid. All curriculum topics have been actively reviewed.</span>
        </div>
      )}
    </div>
  );
}
