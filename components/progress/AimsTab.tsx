"use client";

import React, { useState } from "react";
import clsx from "clsx";
import {
  Plus,
  Zap,
  Check,
  X,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDuration } from "@/lib/formatters";
import { haptics } from "@/lib/haptics";
import {
  KnowledgeDecayRadar,
  type DecayingTopic,
} from "@/components/progress/KnowledgeDecayRadar";

export interface AimsTabProps {
  aimsData: any[];
  setAimsData: React.Dispatch<React.SetStateAction<any[]>>;
  decayingTopics: DecayingTopic[];
  onReviewTopic: (topic: DecayingTopic) => void;
  onRefresh: () => void;
  onSelectTopicForFocus?: (topicTitle: string, topicId: string) => void;
}

export function AimsTab({
  aimsData,
  setAimsData,
  decayingTopics,
  onReviewTopic,
  onRefresh,
  onSelectTopicForFocus,
}: AimsTabProps) {
  // Aim Manager State
  const [isAddingAim, setIsAddingAim] = useState(false);
  const [newAimTitle, setNewAimTitle] = useState("");
  const [newAimTargetDate, setNewAimTargetDate] = useState("");
  const [newAimMilestonesInput, setNewAimMilestonesInput] = useState("");
  const [isSavingAim, setIsSavingAim] = useState(false);
  const [expandedAims, setExpandedAims] = useState<Record<string, boolean>>(() => {
    if (aimsData.length > 0) {
      return { [aimsData[0].id]: true };
    }
    return {};
  });
  const [addingTopicMilestoneId, setAddingTopicMilestoneId] = useState<string | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState("");

  // Edit Aim State
  const [editingAimId, setEditingAimId] = useState<string | null>(null);
  const [editAimTitle, setEditAimTitle] = useState("");
  const [editAimTargetDate, setEditAimTargetDate] = useState("");
  const [isSavingAimEdit, setIsSavingAimEdit] = useState(false);
  const [aimToDelete, setAimToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingAim, setIsDeletingAim] = useState(false);

  // Milestone Add & Edit State
  const [addingMilestoneAimId, setAddingMilestoneAimId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [isSavingMilestone, setIsSavingMilestone] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMilestoneTitle, setEditMilestoneTitle] = useState("");
  const [isSavingMilestoneEdit, setIsSavingMilestoneEdit] = useState(false);
  const [milestoneToDelete, setMilestoneToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingMilestone, setIsDeletingMilestone] = useState(false);

  // Range generator state in Aim creation
  const [showAimRangeGen, setShowAimRangeGen] = useState<boolean>(false);
  const [aimRangePrefix, setAimRangePrefix] = useState<string>("Lecture");
  const [aimRangeStart, setAimRangeStart] = useState<number>(1);
  const [aimRangeEnd, setAimRangeEnd] = useState<number>(20);
  const [aimRangeMilestoneTitle, setAimRangeMilestoneTitle] = useState<string>("Lectures");
  const [aimRangeMode, setAimRangeMode] = useState<"TOPICS" | "MILESTONES">("TOPICS");
  const [generatedAimMilestones, setGeneratedAimMilestones] = useState<any[] | null>(null);
  const [, setAimRangeAppliedCount] = useState<number>(0);

  // Aim-Level Module Range Creator State
  const [batchRangeAimId, setBatchRangeAimId] = useState<string | null>(null);
  const [aimModuleTitle, setAimModuleTitle] = useState<string>("Lectures");
  const [aimModulePrefix, setAimModulePrefix] = useState<string>("Lecture");
  const [aimModuleStart, setAimModuleStart] = useState<number>(1);
  const [aimModuleEnd, setAimModuleEnd] = useState<number>(25);
  const [isSavingAimModuleRange, setIsSavingAimModuleRange] = useState<boolean>(false);

  // Batch Range State for Aims (Lecture / Chapter fill)
  const [batchRangeMilestoneId, setBatchRangeMilestoneId] = useState<string | null>(null);
  const [rangePrefix, setRangePrefix] = useState<string>("Lecture");
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(20);
  const [isSavingBatchRange, setIsSavingBatchRange] = useState<boolean>(false);

  const handleApplyAimRange = () => {
    const start = Math.min(Number(aimRangeStart) || 1, Number(aimRangeEnd) || 1);
    const end = Math.max(Number(aimRangeStart) || 1, Number(aimRangeEnd) || 1);
    if (end - start > 100) {
      alert("Maximum range limit is 100 at a time.");
      return;
    }
    const prefix = aimRangePrefix.trim() || "Lecture";
    const items: string[] = [];
    for (let i = start; i <= end; i++) {
      items.push(`${prefix} ${i}`);
    }

    if (aimRangeMode === "TOPICS") {
      const mTitle = aimRangeMilestoneTitle.trim() || `${prefix}s (${start}–${end})`;
      setGeneratedAimMilestones([
        {
          title: mTitle,
          topics: items.map((t) => ({ title: t })),
        },
      ]);
      setNewAimMilestonesInput(`${items.length} ${prefix.toLowerCase()}s ready under "${mTitle}"`);
    } else {
      setGeneratedAimMilestones(
        items.map((title) => ({
          title,
          topics: [{ title: `${title} Overview` }],
        }))
      );
      setNewAimMilestonesInput(items.join(", "));
    }

    setAimRangeAppliedCount(items.length);
    setShowAimRangeGen(false);
    haptics.success();
  };

  const handleCreateAimRange = async (aimId: string) => {
    const start = Math.min(Number(aimModuleStart) || 1, Number(aimModuleEnd) || 1);
    const end = Math.max(Number(aimModuleStart) || 1, Number(aimModuleEnd) || 1);
    if (end - start > 100) {
      alert("Maximum range limit is 100 items at a time.");
      return;
    }
    const prefix = aimModulePrefix.trim() || "Lecture";
    const titles: string[] = [];
    for (let i = start; i <= end; i++) {
      titles.push(`${prefix} ${i}`);
    }
    if (titles.length === 0 || isSavingAimModuleRange) return;

    setIsSavingAimModuleRange(true);
    haptics.impactMedium();
    try {
      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_MILESTONE_WITH_RANGE",
          aimId,
          milestoneTitle: aimModuleTitle.trim() || `${prefix}s (${start}–${end})`,
          titles,
        }),
      });
      if (res.ok) {
        haptics.success();
        setBatchRangeAimId(null);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to create aim module range:", err);
      haptics.error();
    } finally {
      setIsSavingAimModuleRange(false);
    }
  };

  const handleCreateTopicsBatch = async (milestoneId: string) => {
    const start = Math.min(Number(rangeStart) || 1, Number(rangeEnd) || 1);
    const end = Math.max(Number(rangeStart) || 1, Number(rangeEnd) || 1);
    if (end - start > 100) {
      alert("Maximum range limit is 100 at a time.");
      return;
    }
    const prefix = rangePrefix.trim() || "Lecture";
    const titles: string[] = [];
    for (let i = start; i <= end; i++) {
      titles.push(`${prefix} ${i}`);
    }
    if (titles.length === 0 || isSavingBatchRange) return;

    setIsSavingBatchRange(true);
    haptics.impactMedium();
    try {
      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TOPICS_BATCH",
          milestoneId,
          titles,
        }),
      });
      if (res.ok) {
        haptics.success();
        setBatchRangeMilestoneId(null);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to batch create topics:", err);
      haptics.error();
    } finally {
      setIsSavingBatchRange(false);
    }
  };

  const handleToggleTopic = async (topicId: string, currentMastery: string) => {
    const isCompleted = currentMastery === "MASTERED";
    const nextMastery = isCompleted ? "NOT_STARTED" : "MASTERED";
    if (nextMastery === "MASTERED") {
      haptics.success();
    } else {
      haptics.selection();
    }

    setAimsData((prevAims) =>
      prevAims.map((aim) => ({
        ...aim,
        milestones: aim.milestones.map((m: any) => ({
          ...m,
          topics: m.topics.map((t: any) =>
            t.id === topicId ? { ...t, mastery: nextMastery } : t
          ),
        })),
      }))
    );

    try {
      await fetch("/api/aims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_TOPIC_MASTERY",
          topicId,
          mastery: nextMastery,
        }),
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to update topic checkpoint:", err);
      onRefresh();
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    haptics.warning();
    setAimsData((prevAims) =>
      prevAims.map((aim) => ({
        ...aim,
        milestones: aim.milestones.map((m: any) => ({
          ...m,
          topics: m.topics.filter((t: any) => t.id !== topicId),
        })),
      }))
    );

    try {
      await fetch(`/api/aims?topicId=${topicId}`, {
        method: "DELETE",
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to delete topic checkpoint:", err);
      onRefresh();
    }
  };

  const handleCreateAim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAimTitle.trim() || isSavingAim) return;

    setIsSavingAim(true);
    haptics.impactMedium();
    try {
      let milestones: any[] | undefined = undefined;

      if (generatedAimMilestones && generatedAimMilestones.length > 0) {
        milestones = generatedAimMilestones;
      } else if (newAimMilestonesInput.trim()) {
        milestones = newAimMilestonesInput
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((title) => ({
            title,
            topics: [{ title: `${title} Overview` }],
          }));
      }

      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAimTitle.trim(),
          targetDate: newAimTargetDate || null,
          milestones: milestones && milestones.length > 0 ? milestones : undefined,
        }),
      });
      if (res.ok) {
        haptics.success();
        setNewAimTitle("");
        setNewAimTargetDate("");
        setNewAimMilestonesInput("");
        setGeneratedAimMilestones(null);
        setAimRangeAppliedCount(0);
        setShowAimRangeGen(false);
        setIsAddingAim(false);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to create aim:", err);
      haptics.error();
    } finally {
      setIsSavingAim(false);
    }
  };

  const handleCreateTopic = async (milestoneId: string) => {
    if (!newTopicTitle.trim()) return;
    haptics.selection();
    try {
      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TOPIC",
          milestoneId,
          title: newTopicTitle.trim(),
        }),
      });
      if (res.ok) {
        setNewTopicTitle("");
        setAddingTopicMilestoneId(null);
        haptics.success();
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to create topic:", err);
    }
  };

  const handleSaveAimEdit = async (aimId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editAimTitle.trim() || isSavingAimEdit) return;

    setIsSavingAimEdit(true);
    haptics.impactMedium();
    try {
      const res = await fetch("/api/aims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_AIM",
          aimId,
          title: editAimTitle.trim(),
          targetDate: editAimTargetDate || null,
        }),
      });
      if (res.ok) {
        haptics.success();
        setEditingAimId(null);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update aim:", err);
      haptics.error();
    } finally {
      setIsSavingAimEdit(false);
    }
  };

  const handleExecuteDeleteAim = async () => {
    if (!aimToDelete) return;
    setIsDeletingAim(true);
    try {
      const res = await fetch(`/api/aims?aimId=${aimToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        haptics.success();
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to delete aim:", err);
      haptics.error();
    } finally {
      setIsDeletingAim(false);
      setAimToDelete(null);
    }
  };

  const handleCreateMilestone = async (aimId: string) => {
    if (!newMilestoneTitle.trim() || isSavingMilestone) return;
    setIsSavingMilestone(true);
    haptics.selection();
    try {
      const res = await fetch("/api/aims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_MILESTONE",
          aimId,
          title: newMilestoneTitle.trim(),
        }),
      });
      if (res.ok) {
        setNewMilestoneTitle("");
        setAddingMilestoneAimId(null);
        haptics.success();
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to create milestone:", err);
      haptics.error();
    } finally {
      setIsSavingMilestone(false);
    }
  };

  const handleSaveMilestoneEdit = async (milestoneId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editMilestoneTitle.trim() || isSavingMilestoneEdit) return;

    setIsSavingMilestoneEdit(true);
    haptics.selection();
    try {
      const res = await fetch("/api/aims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE_MILESTONE",
          milestoneId,
          title: editMilestoneTitle.trim(),
        }),
      });
      if (res.ok) {
        haptics.success();
        setEditingMilestoneId(null);
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to update milestone:", err);
      haptics.error();
    } finally {
      setIsSavingMilestoneEdit(false);
    }
  };

  const handleExecuteDeleteMilestone = async () => {
    if (!milestoneToDelete) return;
    setIsDeletingMilestone(true);
    try {
      const res = await fetch(`/api/aims?milestoneId=${milestoneToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        haptics.success();
        onRefresh();
      }
    } catch (err) {
      console.error("Failed to delete milestone:", err);
      haptics.error();
    } finally {
      setIsDeletingMilestone(false);
      setMilestoneToDelete(null);
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-150">
      {/* 📡 Spaced Repetition Knowledge Decay Radar */}
      <KnowledgeDecayRadar
        decayingTopics={decayingTopics}
        onReviewTopic={onReviewTopic}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-zinc-300 uppercase">
          High-Stakes Aims
        </span>
        <Button
          variant="red"
          size="sm"
          onClick={() => setIsAddingAim(!isAddingAim)}
          className="text-[11px] py-1 px-2.5 h-7"
        >
          <Plus className="w-3 h-3" />
          <span>{isAddingAim ? "Close" : "New Aim"}</span>
        </Button>
      </div>

      {/* Add Aim Inline Form */}
      {isAddingAim && (
        <form onSubmit={handleCreateAim} className="p-3.5 rounded-2xl bg-zinc-950 border border-brand-red/30 space-y-2.5 animate-in fade-in duration-150">
          <span className="text-xs font-bold text-white font-mono uppercase">
            Create High-Stakes Aim
          </span>
          <input
            type="text"
            required
            placeholder="Aim Title (e.g. FAANG System Design / GATE CSE)"
            value={newAimTitle}
            onChange={(e) => setNewAimTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
          />
          <input
            type="date"
            value={newAimTargetDate}
            onChange={(e) => setNewAimTargetDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
          />

          {/* Range Generator Toggle */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] font-mono text-zinc-400">Milestones / Modules:</span>
            <button
              type="button"
              onClick={() => setShowAimRangeGen(!showAimRangeGen)}
              className="text-[10px] font-mono font-bold text-brand-red hover:underline flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              <span>{showAimRangeGen ? "Close Range Tool" : "⚡ Fill Lecture / Chapter Range"}</span>
            </button>
          </div>

          {showAimRangeGen && (
            <div className="p-3 rounded-xl bg-black/70 border border-brand-red/40 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 font-bold">
                <span className="flex items-center gap-1.5 text-red-300">
                  <Zap className="w-3.5 h-3.5 text-brand-red" />
                  Sequential Range Tool
                </span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {Math.max(0, Math.max(Number(aimRangeStart) || 1, Number(aimRangeEnd) || 1) - Math.min(Number(aimRangeStart) || 1, Number(aimRangeEnd) || 1) + 1)} items
                </span>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setAimRangeMode("TOPICS")}
                  className={clsx(
                    "py-1 rounded font-bold transition-all",
                    aimRangeMode === "TOPICS" ? "bg-brand-red text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  Single Module (Topics)
                </button>
                <button
                  type="button"
                  onClick={() => setAimRangeMode("MILESTONES")}
                  className={clsx(
                    "py-1 rounded font-bold transition-all",
                    aimRangeMode === "MILESTONES" ? "bg-brand-red text-white" : "text-zinc-400 hover:text-white"
                  )}
                >
                  Separate Milestones
                </button>
              </div>

              {aimRangeMode === "TOPICS" && (
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 block mb-0.5">Parent Module Name</span>
                  <input
                    type="text"
                    value={aimRangeMilestoneTitle}
                    onChange={(e) => setAimRangeMilestoneTitle(e.target.value)}
                    placeholder="e.g. Video Lectures / Core Syllabus"
                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">Prefix</span>
                  <input
                    type="text"
                    value={aimRangePrefix}
                    onChange={(e) => setAimRangePrefix(e.target.value)}
                    placeholder="Lecture"
                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">Start #</span>
                  <input
                    type="number"
                    min="1"
                    value={aimRangeStart}
                    onChange={(e) => setAimRangeStart(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
                <div>
                  <span className="text-[9px] font-mono text-zinc-500 block mb-0.5">End #</span>
                  <input
                    type="number"
                    min="1"
                    value={aimRangeEnd}
                    onChange={(e) => setAimRangeEnd(Number(e.target.value))}
                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyAimRange}
                className="w-full py-1.5 rounded-lg bg-brand-red hover:bg-brand-redDark text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1.5 transition-colors shadow-glow-red-subtle active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>Apply Range to Aim</span>
              </button>
            </div>
          )}

          <textarea
            rows={2}
            placeholder="Milestones (e.g. Lecture 1, Lecture 2, ... or Chapter 1, Chapter 2)"
            value={newAimMilestonesInput}
            onChange={(e) => setNewAimMilestonesInput(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
          />
          <div className="flex justify-end">
            <Button variant="red" size="sm" type="submit" isLoading={isSavingAim} className="text-xs py-1.5 px-3">
              Save Aim
            </Button>
          </div>
        </form>
      )}

      {/* Aim Cards */}
      {aimsData.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-zinc-950 border border-white/10 text-xs text-zinc-500 font-mono">
          No Aims configured. Tap &quot;New Aim&quot; to build your structured syllabus!
        </div>
      ) : (
        <div className="space-y-3">
          {aimsData.map((aim) => {
            const isExpanded = !!expandedAims[aim.id];
            const stats = aim.stats || {};
            const isEditingThisAim = editingAimId === aim.id;

            return (
              <div key={aim.id} className="rounded-2xl bg-zinc-950 border border-white/10 overflow-hidden">
                {/* AIM HEADER ROW OR EDIT FORM */}
                {isEditingThisAim ? (
                  <form
                    onSubmit={(e) => handleSaveAimEdit(aim.id, e)}
                    className="p-3.5 space-y-2.5 bg-black/60 border-b border-white/10 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-brand-red font-bold">
                        Edit Aim
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500">ID: {aim.id.slice(-6)}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-mono text-zinc-400 block mb-1">Aim Title *</span>
                        <input
                          type="text"
                          required
                          value={editAimTitle}
                          onChange={(e) => setEditAimTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                          placeholder="e.g. FAANG System Design"
                          autoFocus
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-zinc-400 block mb-1">Target Date (Optional)</span>
                        <input
                          type="date"
                          value={editAimTargetDate}
                          onChange={(e) => setEditAimTargetDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingAimId(null)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono text-zinc-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <Button
                        variant="red"
                        size="sm"
                        type="submit"
                        isLoading={isSavingAimEdit}
                        className="h-7 px-3 text-[10px]"
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div
                    onClick={() => {
                      haptics.selection();
                      setExpandedAims((prev) => ({ ...prev, [aim.id]: !isExpanded }));
                    }}
                    className="p-3.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button type="button" className="text-zinc-500">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white font-mono truncate">{aim.title}</h4>
                          {aim.targetDate && (
                            <span className="text-[9px] font-mono text-zinc-500 bg-white/[0.03] px-1.5 py-0.2 rounded border border-white/5">
                              {aim.targetDate}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {stats.masteredTopics || 0}/{stats.totalTopics || 0} completed • {formatDuration(stats.totalStudyMinutes || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono text-red-300">
                          {stats.masteryPercent || 0}%
                        </span>
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-brand-red rounded-full shadow-glow-red-subtle"
                            style={{ width: `${Math.max(4, stats.masteryPercent || 0)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            haptics.selection();
                            setEditingAimId(aim.id);
                            setEditAimTitle(aim.title);
                            setEditAimTargetDate(aim.targetDate || "");
                          }}
                          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors"
                          title="Edit Aim"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            haptics.warning();
                            setAimToDelete({ id: aim.id, title: aim.title });
                          }}
                          className="p-1 rounded text-zinc-600 hover:text-rose-400 hover:bg-white/[0.05] transition-colors"
                          title="Delete Aim"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Checkpoints Checklist & Milestones */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 border-t border-white/5 bg-black/40">
                    {aim.milestones.map((m: any) => {
                      const completedCount = (m.topics || []).filter((t: any) => t.mastery === "MASTERED").length;
                      const totalCount = (m.topics || []).length;
                      const isEditingThisMilestone = editingMilestoneId === m.id;

                      return (
                        <div key={m.id} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                          {/* Milestone Header / Edit row */}
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 font-bold gap-2">
                            {isEditingThisMilestone ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editMilestoneTitle}
                                  onChange={(e) => setEditMilestoneTitle(e.target.value)}
                                  className="flex-1 px-2 py-0.5 rounded bg-black border border-brand-red text-xs text-white font-mono focus:outline-none"
                                  autoFocus
                                  placeholder="Milestone title"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveMilestoneEdit(m.id);
                                    if (e.key === "Escape") setEditingMilestoneId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveMilestoneEdit(m.id)}
                                  disabled={isSavingMilestoneEdit}
                                  className="p-1 rounded bg-brand-red text-white hover:bg-brand-redDark"
                                  title="Save"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingMilestoneId(null)}
                                  className="p-1 text-zinc-400 hover:text-white"
                                  title="Cancel"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="truncate">{m.title}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    haptics.selection();
                                    setEditingMilestoneId(m.id);
                                    setEditMilestoneTitle(m.title);
                                  }}
                                  className="p-0.5 text-zinc-500 hover:text-white transition-colors"
                                  title="Edit Milestone"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    haptics.warning();
                                    setMilestoneToDelete({ id: m.id, title: m.title });
                                  }}
                                  className="p-0.5 text-zinc-600 hover:text-rose-400 transition-colors"
                                  title="Delete Milestone"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}

                            <span className="text-[9px] text-zinc-500 font-normal shrink-0">
                              {completedCount}/{totalCount} completed
                            </span>
                          </div>

                          {/* Topics / Checkpoints List */}
                          <div className="space-y-1">
                            {m.topics.map((t: any) => {
                              const isDone = t.mastery === "MASTERED";

                              return (
                                <div
                                  key={t.id}
                                  className="py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs font-mono group hover:border-white/10 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    {/* Tactile Checkbox */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleTopic(t.id, t.mastery)}
                                      className={clsx(
                                        "w-4 h-4 rounded-md border flex items-center justify-center transition-all duration-150 active:scale-90 flex-shrink-0",
                                        isDone
                                          ? "bg-brand-red border-brand-red text-white shadow-glow-red-subtle"
                                          : "border-zinc-700 hover:border-brand-red/80 bg-white/[0.02] hover:bg-brand-red/10 text-transparent"
                                      )}
                                      aria-label={isDone ? "Mark incomplete" : "Mark completed"}
                                    >
                                      <Check className={clsx("w-3 h-3 stroke-[2.5]", isDone ? "opacity-100" : "opacity-0")} />
                                    </button>

                                    <span
                                      className={clsx(
                                        "truncate text-xs transition-all cursor-pointer select-none",
                                        isDone
                                          ? "line-through text-zinc-500 font-normal"
                                          : "text-zinc-200 hover:text-white"
                                      )}
                                      onClick={() => handleToggleTopic(t.id, t.mastery)}
                                    >
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 ml-2">
                                    {onSelectTopicForFocus && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          haptics.selection();
                                          onSelectTopicForFocus(t.title, t.id);
                                        }}
                                        className="p-1 text-zinc-500 hover:text-brand-red transition-colors"
                                        title="Quick focus session"
                                      >
                                        <Zap className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTopic(t.id)}
                                      className="p-1 text-zinc-600 hover:text-rose-400 opacity-60 hover:opacity-100 transition-all"
                                      title="Delete checkpoint"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Add Topic under Milestone */}
                          {addingTopicMilestoneId === m.id ? (
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                placeholder="New Topic"
                                value={newTopicTitle}
                                onChange={(e) => setNewTopicTitle(e.target.value)}
                                className="flex-1 px-2 py-1 rounded bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleCreateTopic(m.id);
                                  if (e.key === "Escape") setAddingTopicMilestoneId(null);
                                }}
                              />
                              <Button
                                variant="red"
                                size="sm"
                                onClick={() => handleCreateTopic(m.id)}
                                className="h-7 px-2 text-[10px]"
                              >
                                Add
                              </Button>
                              <button
                                type="button"
                                onClick={() => setAddingTopicMilestoneId(null)}
                                className="text-zinc-500 p-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : batchRangeMilestoneId === m.id ? (
                            <div className="p-2.5 rounded-xl bg-black/70 border border-brand-red/40 space-y-2 pt-2 my-1 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-300">
                                <span className="flex items-center gap-1 text-red-300">
                                  <Zap className="w-3 h-3 text-brand-red" />
                                  Fill Range (Lectures / Chapters)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setBatchRangeMilestoneId(null)}
                                  className="text-zinc-500 hover:text-white p-0.5"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <span className="text-[8px] font-mono text-zinc-400 block mb-0.5">Prefix</span>
                                  <input
                                    type="text"
                                    value={rangePrefix}
                                    onChange={(e) => setRangePrefix(e.target.value)}
                                    placeholder="Lecture"
                                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                                  />
                                </div>
                                <div>
                                  <span className="text-[8px] font-mono text-zinc-400 block mb-0.5">Start #</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={rangeStart}
                                    onChange={(e) => setRangeStart(Number(e.target.value))}
                                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                                  />
                                </div>
                                <div>
                                  <span className="text-[8px] font-mono text-zinc-400 block mb-0.5">End #</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={rangeEnd}
                                    onChange={(e) => setRangeEnd(Number(e.target.value))}
                                    className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[9px] font-mono text-zinc-500">
                                  {Math.max(0, (Math.max(Number(rangeStart), Number(rangeEnd)) - Math.min(Number(rangeStart), Number(rangeEnd)) + 1))} items to add
                                </span>
                                <Button
                                  variant="red"
                                  size="sm"
                                  onClick={() => handleCreateTopicsBatch(m.id)}
                                  isLoading={isSavingBatchRange}
                                  className="h-6 px-2.5 text-[9px]"
                                >
                                  Add Range
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTopicMilestoneId(m.id);
                                  setNewTopicTitle("");
                                  setBatchRangeMilestoneId(null);
                                }}
                                className="text-[9px] font-mono text-zinc-500 hover:text-brand-red flex items-center gap-1"
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Topic</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBatchRangeMilestoneId(m.id);
                                  setAddingTopicMilestoneId(null);
                                  setRangePrefix("Lecture");
                                  setRangeStart(1);
                                  setRangeEnd(20);
                                }}
                                className="text-[9px] font-mono text-brand-red hover:underline flex items-center gap-1 font-bold"
                              >
                                <Zap className="w-2.5 h-2.5" />
                                <span>Fill Range (Start-End)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Milestone to Aim */}
                    {addingMilestoneAimId === aim.id ? (
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-brand-red/30 flex items-center gap-1.5 mt-2 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder="New Milestone Title"
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          className="flex-1 px-2.5 py-1 rounded-lg bg-black border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleCreateMilestone(aim.id);
                            if (e.key === "Escape") setAddingMilestoneAimId(null);
                          }}
                        />
                        <Button
                          variant="red"
                          size="sm"
                          onClick={() => handleCreateMilestone(aim.id)}
                          isLoading={isSavingMilestone}
                          className="h-7 px-2.5 text-[10px]"
                        >
                          Add Milestone
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddingMilestoneAimId(null);
                            setNewMilestoneTitle("");
                          }}
                          className="text-zinc-500 hover:text-zinc-300 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : batchRangeAimId === aim.id ? (
                      <div className="p-3 rounded-xl bg-black/70 border border-brand-red/40 space-y-2.5 mt-2 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 font-bold">
                          <span className="flex items-center gap-1.5 text-red-300">
                            <Zap className="w-3.5 h-3.5 text-brand-red" />
                            Add Lecture / Chapter Range Module
                          </span>
                          <button
                            type="button"
                            onClick={() => setBatchRangeAimId(null)}
                            className="text-zinc-500 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-zinc-400 block mb-0.5">Module / Milestone Name</span>
                          <input
                            type="text"
                            value={aimModuleTitle}
                            onChange={(e) => setAimModuleTitle(e.target.value)}
                            placeholder="e.g. Lectures 1–25"
                            className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <span className="text-[8px] font-mono text-zinc-400 block mb-0.5">Prefix</span>
                            <input
                              type="text"
                              value={aimModulePrefix}
                              onChange={(e) => setAimModulePrefix(e.target.value)}
                              placeholder="Lecture"
                              className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] font-mono text-zinc-400 block mb-0.5">Start #</span>
                            <input
                              type="number"
                              min="1"
                              value={aimModuleStart}
                              onChange={(e) => setAimModuleStart(Number(e.target.value))}
                              className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>
                          <div>
                            <span className="text-[8px] font-mono text-zinc-400 block mb-0.5">End #</span>
                            <input
                              type="number"
                              min="1"
                              value={aimModuleEnd}
                              onChange={(e) => setAimModuleEnd(Number(e.target.value))}
                              className="w-full px-2 py-1 rounded-md bg-white/[0.04] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-brand-red"
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] font-mono text-zinc-500">
                            {Math.max(0, Math.max(Number(aimModuleStart) || 1, Number(aimModuleEnd) || 1) - Math.min(Number(aimModuleStart) || 1, Number(aimModuleEnd) || 1) + 1)} lectures will be added
                          </span>
                          <Button
                            variant="red"
                            size="sm"
                            onClick={() => handleCreateAimRange(aim.id)}
                            isLoading={isSavingAimModuleRange}
                            className="h-6 px-2.5 text-[9px]"
                          >
                            Create Module Range
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAddingMilestoneAimId(aim.id);
                            setNewMilestoneTitle("");
                            setBatchRangeAimId(null);
                          }}
                          className="py-1.5 px-2 rounded-xl border border-dashed border-white/10 hover:border-brand-red/40 text-[10px] font-mono text-zinc-400 hover:text-brand-red transition-all flex items-center justify-center gap-1 active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Milestone</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBatchRangeAimId(aim.id);
                            setAimModuleTitle("Lectures");
                            setAimModulePrefix("Lecture");
                            setAimModuleStart(1);
                            setAimModuleEnd(25);
                            setAddingMilestoneAimId(null);
                          }}
                          className="py-1.5 px-2 rounded-xl border border-dashed border-brand-red/25 hover:border-brand-red/60 text-[10px] font-mono text-red-300 hover:text-white bg-brand-red/[0.03] transition-all flex items-center justify-center gap-1 font-bold active:scale-95 shadow-glow-red-subtle"
                        >
                          <Zap className="w-3 h-3 text-brand-red" />
                          <span>Fill Lecture Range</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Aim Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(aimToDelete)}
        onClose={() => setAimToDelete(null)}
        onConfirm={handleExecuteDeleteAim}
        isLoading={isDeletingAim}
        title="Delete Aim"
        message={`Are you sure you want to delete "${aimToDelete?.title}"? All milestones, topics, and study links for this aim will be removed.`}
        confirmText="Delete Aim"
        confirmVariant="red"
        iconType="danger"
      />

      {/* Milestone Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(milestoneToDelete)}
        onClose={() => setMilestoneToDelete(null)}
        onConfirm={handleExecuteDeleteMilestone}
        isLoading={isDeletingMilestone}
        title="Delete Milestone"
        message={`Are you sure you want to delete milestone "${milestoneToDelete?.title}"? All checkpoints within this milestone will be removed.`}
        confirmText="Delete Milestone"
        confirmVariant="red"
        iconType="danger"
      />
    </div>
  );
}
