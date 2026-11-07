"use client";

import React, { useState, useEffect } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  Clock,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";

function computeElapsed(start?: string, end?: string): number | null {
  if (!start || !end || !start.includes(":") || !end.includes(":")) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return Math.max(1, endTotal - startTotal);
}

export interface SaveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDiscard: () => void;
  onSave: (session: {
    duration: number;
    project: string;
    topicId?: string | null;
    startTime?: string | null;
    endTime?: string | null;
  }) => Promise<void>;
  initialDuration: string;
  initialStartTime: string;
  initialEndTime: string;
  initialProject: string;
  initialTopicId: string;
  aimsData: any[];
}

export function SaveSessionModal({
  isOpen,
  onClose,
  onDiscard,
  onSave,
  initialDuration,
  initialStartTime,
  initialEndTime,
  initialProject,
  initialTopicId,
  aimsData,
}: SaveSessionModalProps) {
  const [duration, setDuration] = useState<string>(initialDuration);
  const [project, setProject] = useState<string>(initialProject);
  const [topicId, setTopicId] = useState<string>(initialTopicId);
  const [startTime, setStartTime] = useState<string>(initialStartTime);
  const [endTime, setEndTime] = useState<string>(initialEndTime);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDuration(initialDuration);
      setProject(initialProject);
      setTopicId(initialTopicId);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
    }
  }, [isOpen, initialDuration, initialProject, initialTopicId, initialStartTime, initialEndTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project.trim() || isSaving) return;

    const rawDur = Number(duration) || 1;
    const modalElapsed = computeElapsed(startTime, endTime);
    const finalDuration = modalElapsed && modalElapsed > 0 ? Math.min(rawDur, modalElapsed) : rawDur;

    setIsSaving(true);
    try {
      await onSave({
        duration: finalDuration,
        project: project.trim(),
        topicId: topicId || null,
        startTime: startTime || null,
        endTime: endTime || null,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save focus session:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const modalElapsed = computeElapsed(startTime, endTime);
  const isAtMax = Boolean(modalElapsed && Number(duration) >= modalElapsed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-brand-red/30 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Ambient Red Glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-brand-red/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red shadow-glow-red-subtle">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-mono uppercase tracking-wider text-white font-bold">
                Focus Session Complete
              </h3>
              <p className="text-[10px] text-zinc-400 font-mono">
                Save session directly to your study history
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-brand-red font-bold px-2 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/20">
            +{Math.max(2, Math.floor((Number(duration) || 0) / 5))} XP
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Duration and Wall Clock Summary */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-brand-red" />
                Focus Duration
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setDuration(String(Math.max(1, Number(duration) - 5)));
                  }}
                  className="px-2 py-0.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-md text-[10px] font-mono text-zinc-300"
                >
                  -5m
                </button>
                <button
                  type="button"
                  disabled={isAtMax}
                  onClick={() => {
                    haptics.selection();
                    const current = Number(duration) || 1;
                    const next = current + 5;
                    setDuration(String(modalElapsed && modalElapsed > 0 ? Math.min(next, modalElapsed) : next));
                  }}
                  className={clsx(
                    "px-2 py-0.5 border rounded-md text-[10px] font-mono",
                    isAtMax
                      ? "bg-white/[0.01] border-white/5 text-zinc-600 opacity-40 cursor-not-allowed"
                      : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-zinc-300"
                  )}
                >
                  +5m
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xl font-black font-mono text-white">
                {formatDuration(Number(duration))}
              </div>
              <div className="text-xs font-mono text-zinc-400">
                <span>{startTime}</span> → <span className="text-white font-bold">{endTime}</span>
                {modalElapsed ? <span className="text-zinc-500 ml-1.5">({modalElapsed}m elapsed)</span> : null}
              </div>
            </div>
          </div>

          {/* Aim & Project Subject Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Subject / Goal Detail <span className="text-brand-red">*</span>
              </label>
              {topicId && (
                <span className="text-[9px] font-mono text-red-300 font-bold bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded-full">
                  Aim Linked
                </span>
              )}
            </div>

            {/* Quick Select Aim Pills */}
            {aimsData && aimsData.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
                {aimsData.map((aim: any) => {
                  const isSelected = project === aim.title;
                  return (
                    <button
                      key={aim.id}
                      type="button"
                      onClick={() => {
                        haptics.selection();
                        if (isSelected) {
                          setProject("");
                          setTopicId("");
                        } else {
                          setProject(aim.title);
                          setTopicId("");
                        }
                      }}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all active:scale-95 flex items-center gap-1.5",
                        isSelected
                          ? "bg-brand-red text-white border-brand-red font-bold shadow-glow-red-subtle"
                          : "bg-white/[0.03] text-zinc-400 border-white/10 hover:border-white/20 hover:text-white"
                      )}
                    >
                      <Target className="w-3 h-3 text-brand-red" />
                      <span className="truncate max-w-[130px]">{aim.title}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Physics - Electromagnetism, Cell Biology..."
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-brand-red"
              />
              {project && (
                <button
                  type="button"
                  onClick={() => {
                    setProject("");
                    setTopicId("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Save & Cancel Actions */}
          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              variant="red"
              size="sm"
              disabled={isSaving || !project.trim()}
              className="w-full py-2.5 text-xs font-mono font-bold shadow-glow-red flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? "Saving to Database..." : "Save Session Immediately"}</span>
            </Button>

            <div className="flex items-center justify-between px-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  haptics.selection();
                  onClose();
                }}
                className="text-[11px] font-mono text-zinc-400 hover:text-white transition-colors"
              >
                Keep Timing (Cancel)
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.warning();
                  onClose();
                  onDiscard();
                }}
                className="text-[11px] font-mono text-zinc-600 hover:text-red-400 transition-colors"
              >
                Discard Session
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
