"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InputDate } from "@/components/ui/InputDate";
import { formatDate } from "@/lib/formatters";
import {
  Heart,
  Send,
  Copy,
  Check,
  Calendar,
  Gift,
  Phone,
  Sparkles,
  Edit2,
  MessageCircle,
  Cake,
  Plus,
  Trash2,
  Shuffle,
  BookOpen,
  Quote,
  RotateCw,
  AlertCircle,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";
import { offlineCache } from "@/lib/offlineCache";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function RelationshipPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("");
  const [partnerBirthday, setPartnerBirthday] = useState("");
  const [partnerAnniversary, setPartnerAnniversary] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerPreferences, setPartnerPreferences] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");

  // Tab Selection: "AI" vs "TEMPLATES"
  const [activeTab, setActiveTab] = useState<"AI" | "TEMPLATES">("AI");
  const [customTopic, setCustomTopic] = useState("");

  // Custom Message Dispatcher
  const [customMessage, setCustomMessage] = useState("");

  // Groq AI 5 Love Messages state (On-demand generation, no token waste on page open)
  const [loveMessages, setLoveMessages] = useState<any[]>([]);
  const [loveMessagesLoading, setLoveMessagesLoading] = useState(false);
  const [loveMessagesError, setLoveMessagesError] = useState<string | null>(null);

  // Template Modal
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("LOVE");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  // Restore cached messages on mount if available (0 API calls, 0 token waste)
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kunal_love_messages_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLoveMessages(parsed);
          }
        }
      } catch (err) {
        console.warn("Failed to load cached love messages:", err);
      }
    }
  }, []);

  const generateLoveMessages = async (topicArg?: string) => {
    setLoveMessagesLoading(true);
    setLoveMessagesError(null);
    try {
      haptics.impactMedium();
      const targetTopic = typeof topicArg === "string" ? topicArg : customTopic;
      const res = await fetch("/api/relationship/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: targetTopic }),
        cache: "no-store",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Generation failed (${res.status})`);
      }

      const json = await res.json();
      const msgs = json.messages || [];
      if (msgs.length === 0) {
        throw new Error("No messages returned from Groq API");
      }

      setLoveMessages(msgs);
      haptics.success();

      if (typeof window !== "undefined") {
        localStorage.setItem("kunal_love_messages_cache", JSON.stringify(msgs));
      }
    } catch (err: any) {
      console.error("Groq love messages generation error:", err);
      setLoveMessagesError(err.message || "Failed to generate love messages with Groq API");
      haptics.warning();
    } finally {
      setLoveMessagesLoading(false);
    }
  };

  const getNextOccurrence = (dateString?: string) => {
    if (!dateString) return null;
    const parts = dateString.split("-");
    if (parts.length < 3) return null;
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const now = new Date();
    let next = new Date(now.getFullYear(), month, day);
    next.setHours(0, 0, 0, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (next < today) {
      next = new Date(now.getFullYear() + 1, month, day);
    }
    const diffDays = Math.round(
      (next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return { date: next, days: diffDays };
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateContent) return;
    try {
      const res = await fetch("/api/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_TEMPLATE",
          title: newTemplateTitle || "Custom Message",
          category: newTemplateCategory,
          content: newTemplateContent,
        }),
      });
      if (res.ok) {
        haptics.success();
        setNewTemplateTitle("");
        setNewTemplateContent("");
        setIsAddTemplateOpen(false);
        fetchRelationshipData();
      }
    } catch (err) {
      console.error("Create template error:", err);
    }
  };

  const [templateToDelete, setTemplateToDelete] = useState<any | null>(null);
  const [isDeletingTemplate, setIsDeletingTemplate] = useState(false);

  const handleExecuteDeleteTemplate = async () => {
    if (!templateToDelete) return;
    setIsDeletingTemplate(true);
    haptics.warning();
    try {
      await fetch("/api/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "DELETE_TEMPLATE",
          templateId: templateToDelete.id,
        }),
      });
      setTemplateToDelete(null);
      fetchRelationshipData();
    } catch (err) {
      console.error("Delete template error:", err);
    } finally {
      setIsDeletingTemplate(false);
    }
  };

  const applyRelationshipData = (json: any) => {
    if (!json) return;
    setData(json);
    if (json.partner) {
      setPartnerName(json.partner.name || "");
      setPartnerNickname(json.partner.nickname || "");
      setPartnerBirthday(json.partner.birthday || "");
      setPartnerAnniversary(json.partner.anniversary || "");
      setPartnerPhone(json.partner.phone || "");
      setPartnerPreferences(json.partner.preferences || "");
      setPartnerNotes(json.partner.notes || "");
    }
    setLoading(false);
  };

  const fetchRelationshipData = async () => {
    try {
      await offlineCache.swr(
        "partner_hub_data",
        async () => {
          const res = await fetch("/api/relationship", { cache: "no-store" });
          if (!res.ok) throw new Error("Failed to load relationship data");
          return res.json();
        },
        (cached) => {
          applyRelationshipData(cached);
        }
      ).then((fresh) => {
        if (fresh) applyRelationshipData(fresh);
      });
    } catch (err) {
      console.error("Failed to load relationship data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = offlineCache.get<any>("partner_hub_data");
    if (cached) {
      applyRelationshipData(cached);
    }
    fetchRelationshipData();
  }, []);

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPSERT_PARTNER",
          name: partnerName,
          nickname: partnerNickname,
          birthday: partnerBirthday || null,
          anniversary: partnerAnniversary || null,
          phone: partnerPhone,
          preferences: partnerPreferences,
          notes: partnerNotes,
        }),
      });
      if (res.ok) {
        haptics.success();
        const json = await res.json();
        if (json?.partner) {
          setData((prev: any) => {
            const next = { ...prev, partner: json.partner };
            offlineCache.set("partner_hub_data", next);
            return next;
          });
        }
        setIsEditProfileOpen(false);
        fetchRelationshipData();
      }
    } catch (err) {
      console.error("Save partner error:", err);
    }
  };

  const handleSendWhatsApp = (text: string) => {
    if (!text) return;
    haptics.impactMedium();
    const phone = data?.partner?.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleCopyText = (id: string, text: string) => {
    haptics.impactLight();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const partner = data?.partner;
  const partnerNicknameDisplay = partner?.nickname || partner?.name || "My Love";
  const templates = data?.templates || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-brand-red fill-brand-red" />
            Relationship & Partner Hub
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-1">
            Special dates, anniversary countdowns, preferences, and instant WhatsApp dispatcher
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/partner"
            onClick={() => haptics.selection()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/20 to-pink-500/20 hover:from-rose-500/30 hover:to-pink-500/30 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Partner Progress</span>
          </Link>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsEditProfileOpen(true)}
          >
            <Edit2 className="w-3.5 h-3.5 text-brand-red" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* Partner Banner Glass Card */}
      {loading && !data ? (
        <Card glow="red" className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red">
                <Heart className="w-7 h-7 fill-brand-red/30" />
              </div>
              <div className="space-y-2">
                <div className="w-40 h-6 bg-white/10 rounded-lg" />
                <div className="w-28 h-3.5 bg-white/5 rounded-md" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-white/[0.02] p-4 rounded-xl border border-white/10 w-full md:w-auto min-w-[240px]">
              <div className="space-y-1.5">
                <div className="w-14 h-2.5 bg-white/5 rounded" />
                <div className="w-24 h-4 bg-white/10 rounded" />
              </div>
              <div className="space-y-1.5">
                <div className="w-14 h-2.5 bg-white/5 rounded" />
                <div className="w-24 h-4 bg-white/10 rounded" />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card glow="red" className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-glow-red">
              <Heart className="w-7 h-7 fill-brand-red" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">
                  {partner?.nickname || partner?.name || "Partner Profile"}
                </h3>
                {partner?.nickname && partner?.name && (
                  <span className="text-xs text-zinc-400 font-mono">({partner.name})</span>
                )}
              </div>
              <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                <p className="text-xs text-zinc-300 font-mono flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-brand-red" />
                  {partner?.phone || "No phone number configured"}
                </p>
                {partner?.phone && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp("Hello baby ❤️")}
                      className="px-2.5 py-0.5 rounded-lg bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/30 text-[10px] font-mono text-brand-red transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                    >
                      <span>Direct Chat</span>
                      <Send className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-white/[0.02] p-4 rounded-xl border border-white/10">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                Birthday
              </span>
              <span className="text-xs font-semibold text-white font-mono">
                {partner?.birthday ? formatDate(partner.birthday) : "Not set"}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-mono block">
                Anniversary
              </span>
              <span className="text-xs font-semibold text-brand-red font-mono">
                {partner?.anniversary ? formatDate(partner.anniversary) : "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* Live Birthday & Anniversary Countdowns */}
        {(() => {
          const nextBday = getNextOccurrence(partner?.birthday);
          const nextAnniv = getNextOccurrence(partner?.anniversary);
          if (!nextBday && !nextAnniv) return null;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
              {nextBday && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                      <Cake className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-400 block">
                        Birthday Countdown
                      </span>
                      <span className="text-xs font-bold text-white font-mono">
                        {nextBday.days === 0
                          ? "🎉 Today is her Birthday!"
                          : `${nextBday.days} days remaining`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatDate(nextBday.date.toISOString())}
                  </span>
                </div>
              )}

              {nextAnniv && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red">
                      <Heart className="w-4 h-4 fill-brand-red" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-400 block">
                        Anniversary Countdown
                      </span>
                      <span className="text-xs font-bold text-brand-red font-mono">
                        {nextAnniv.days === 0
                          ? "❤️ Happy Anniversary!"
                          : `${nextAnniv.days} days remaining`}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatDate(nextAnniv.date.toISOString())}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Partner Preferences & Notes */}
        {(partner?.preferences || partner?.notes) && (
          <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {partner.preferences && (
              <div className="flex items-start gap-2.5 bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
                <Gift className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block mb-0.5 font-mono">
                    Preferences & Wishlist:
                  </span>
                  <p className="text-zinc-300 leading-relaxed">{partner.preferences}</p>
                </div>
              </div>
            )}
            {partner.notes && (
              <div className="flex items-start gap-2.5 bg-white/[0.02] p-3.5 rounded-xl border border-white/10">
                <Sparkles className="w-4 h-4 text-brand-red flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block mb-0.5 font-mono">
                    Notes & Reminders:
                  </span>
                  <p className="text-zinc-300 leading-relaxed">{partner.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    )}

      {/* Two Tabs: AI Messages vs Templates */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-950/80 border border-white/10 w-full sm:w-auto self-start">
        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("AI");
          }}
          className={clsx(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all active:scale-95",
            activeTab === "AI"
              ? "bg-brand-red text-white shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Messages</span>
          {loveMessages.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
              {loveMessages.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            haptics.selection();
            setActiveTab("TEMPLATES");
          }}
          className={clsx(
            "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all active:scale-95",
            activeTab === "TEMPLATES"
              ? "bg-brand-red text-white shadow-glow-red"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Templates</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-zinc-300 font-mono">
            {templates.length}
          </span>
        </button>
      </div>

      {/* TAB 1: AI Messages */}
      {activeTab === "AI" && (
        <div className="space-y-4">
          {/* Minimal Custom Prompt & Occasion Bar */}
          <div className="p-3 sm:p-4 rounded-2xl bg-zinc-950/80 border border-white/10 shadow-sm space-y-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      generateLoveMessages(customTopic);
                    }
                  }}
                  placeholder="Custom occasion (e.g. Birthday, exam wish, missing her, cheer up)..."
                  className="w-full h-10 px-3.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-brand-red transition-all"
                />
                {customTopic && (
                  <button
                    type="button"
                    onClick={() => setCustomTopic("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-zinc-500 hover:text-white px-1.5 py-0.5 rounded bg-white/5"
                  >
                    Clear
                  </button>
                )}
              </div>

              <Button
                variant="red"
                size="sm"
                onClick={() => generateLoveMessages(customTopic)}
                isLoading={loveMessagesLoading}
                className="h-10 px-4 text-xs font-mono font-bold shadow-glow-red flex-shrink-0 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                <span>{loveMessages.length > 0 ? "Generate 5 More" : "Create 5 Messages"}</span>
              </Button>
            </div>

            {/* Quick Occasion Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
              <span className="text-zinc-500 text-[10px] uppercase mr-0.5">Quick:</span>
              {[
                { label: "Romantic ❤️", topic: "" },
                { label: "Birthday 🎂", topic: "Birthday wish with lots of love" },
                { label: "Exam 🍀", topic: "Best of luck for her exam, calm her stress and believe in her" },
                { label: "Good Morning ☀️", topic: "Sweet affectionate morning message" },
                { label: "Good Night 🌙", topic: "Tender and comforting night message" },
                { label: "Missing Her 🥺", topic: "Missing her deeply and longing to hold her" },
                { label: "Cheer Up 💖", topic: "Cheering her up on a tiring or stressful day" },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    haptics.selection();
                    setCustomTopic(chip.topic);
                    generateLoveMessages(chip.topic);
                  }}
                  className={clsx(
                    "px-2 py-0.5 rounded-lg border text-[10px] transition-all active:scale-95",
                    customTopic === chip.topic
                      ? "bg-brand-red/15 border-brand-red/40 text-brand-red font-bold"
                      : "bg-white/[0.02] hover:bg-white/[0.06] border-white/5 text-zinc-400 hover:text-white"
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {loveMessagesError && !loveMessagesLoading && (
            <div className="p-4 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-brand-red font-mono font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{loveMessagesError}</span>
              </div>
              <Button
                variant="red"
                size="sm"
                onClick={() => generateLoveMessages(customTopic)}
                className="h-7 text-[11px] px-2.5 font-bold"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {loveMessagesLoading && (
            <div className="space-y-3.5">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse space-y-3">
                <div className="h-4 w-28 bg-white/10 rounded" />
                <div className="h-6 w-11/12 bg-white/15 rounded" />
                <div className="h-4 w-36 bg-white/10 rounded" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[1, 2, 3, 4].map((idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse space-y-2.5">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-4 w-5/6 bg-white/15 rounded" />
                    <div className="h-3 w-28 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generated 5 Love Messages */}
          {!loveMessagesLoading && !loveMessagesError && loveMessages.length > 0 && (
            <div className="space-y-4">
              {/* Message #1 Spotlight Hero */}
              {loveMessages[0] && (() => {
                const m = loveMessages[0];
                const cardId = `love-msg-${m.id || 0}`;
                const msgText = m.text || "";
                const mood = m.mood || "Tender";
                const whatsappMsg = msgText;

                return (
                  <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-brand-red/[0.08] via-black to-white/[0.02] border border-brand-red/40 shadow-glow-red-subtle space-y-3.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-red font-bold bg-brand-red/20 border border-brand-red/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Spotlight</span>
                        </span>
                        <span className="text-zinc-400 font-mono text-[10px] bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
                          {mood}
                        </span>
                      </div>
                      <span className="text-zinc-500 font-mono text-[10px]">#love</span>
                    </div>

                    <p className="text-base sm:text-lg font-serif italic text-white leading-relaxed">
                      &ldquo;{msgText}&rdquo;
                    </p>

                    <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
                      <span className="text-xs font-mono text-brand-red font-semibold flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-brand-red" />
                        <span>—Kunal ❤️</span>
                      </span>

                      <div className="flex items-center gap-2 ml-auto">
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => handleCopyText(cardId, msgText)}
                          className="text-xs h-7 px-2.5"
                        >
                          {copiedId === cardId ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400 mr-1" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              <span>Copy</span>
                            </>
                          )}
                        </Button>

                        <Button
                          variant="red"
                          size="sm"
                          onClick={() => handleSendWhatsApp(whatsappMsg)}
                          className="text-xs h-7 px-3 shadow-glow-red font-bold active:scale-95"
                        >
                          <Heart className="w-3 h-3 fill-white mr-1" />
                          <span>Send to {partnerNicknameDisplay}</span>
                          <Send className="w-2.5 h-2.5 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Messages #2 to #5 (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {loveMessages.slice(1, 5).map((m: any, index: number) => {
                  const cardId = `love-msg-${m.id || index + 1}`;
                  const msgText = m.text || "";
                  const mood = m.mood || "Sweet";
                  const whatsappMsg = msgText;

                  return (
                    <div
                      key={m.id || index + 1}
                      className="p-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/60 border border-white/10 hover:border-brand-red/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-brand-red font-bold text-[10px]">
                            #{index + 2}
                          </span>
                          <span className="text-zinc-400 text-[10px] bg-white/[0.03] px-2 py-0.5 rounded border border-white/5">
                            {mood}
                          </span>
                        </div>

                        <p className="text-sm font-serif italic text-white leading-relaxed">
                          &ldquo;{msgText}&rdquo;
                        </p>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-zinc-500">
                          —Kunal
                        </span>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={() => handleCopyText(cardId, msgText)}
                            className="text-[11px] h-6 px-2"
                          >
                            {copiedId === cardId ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>

                          <Button
                            variant="red"
                            size="sm"
                            onClick={() => handleSendWhatsApp(whatsappMsg)}
                            className="text-[11px] h-6 px-2.5 shadow-glow-red font-bold active:scale-95"
                          >
                            <Send className="w-2.5 h-2.5 mr-1" />
                            <span>Send</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Templates */}
      {activeTab === "TEMPLATES" && (
        <div className="space-y-4">
          {/* Quick Custom WhatsApp Compose */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <MessageCircle className="w-4 h-4 text-brand-red" />
              <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Instant WhatsApp Message
              </h4>
            </div>

            <div className="space-y-2.5">
              <textarea
                rows={2}
                placeholder="Type a custom message or pick a pre-written template below..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red transition-all font-sans"
              />

              <div className="flex justify-end gap-2">
                <Button
                  variant="red"
                  size="sm"
                  onClick={() => handleSendWhatsApp(customMessage)}
                  disabled={!customMessage}
                  className="h-8 text-xs font-mono font-bold"
                >
                  <Send className="w-3 h-3 mr-1.5" />
                  <span>Send in WhatsApp</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Templates Header & Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white tracking-wider uppercase flex items-center gap-2 font-mono">
                <BookOpen className="w-4 h-4 text-brand-red" />
                Templates ({templates.length})
              </h3>
              <Button
                variant="glass"
                size="sm"
                onClick={() => {
                  haptics.selection();
                  setIsAddTemplateOpen(true);
                }}
                className="text-xs h-7 px-2.5"
              >
                <Plus className="w-3.5 h-3.5 text-brand-red" />
                <span>New Template</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {templates.map((tmpl: any) => {
                const isCopied = copiedId === tmpl.id;

                return (
                  <Card key={tmpl.id} className="p-4 flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="red" size="sm">
                          {tmpl.category}
                        </Badge>
                        {!tmpl.isDefault && (
                          <button
                            onClick={() => {
                              haptics.warning();
                              setTemplateToDelete(tmpl);
                            }}
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 text-zinc-500 hover:text-brand-red transition-all active:scale-90"
                            title="Delete template"
                            aria-label="Delete Template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">
                        {tmpl.title}
                      </h4>
                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        &quot;{tmpl.content}&quot;
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10">
                      <Button
                        variant="glass"
                        size="sm"
                        className="text-[11px] h-7 px-2.5"
                        onClick={() => handleCopyText(tmpl.id, tmpl.content)}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-brand-red" />
                            <span className="text-brand-red">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-zinc-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="red"
                        size="sm"
                        className="text-[11px] h-7 px-2.5"
                        onClick={() => handleSendWhatsApp(tmpl.content)}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        <span>WhatsApp</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        title="Edit Partner Profile"
      >
        <form onSubmit={handleSavePartner} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Partner Name *
              </label>
              <input
                type="text"
                required
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Nickname / Pet Name
              </label>
              <input
                type="text"
                value={partnerNickname}
                onChange={(e) => setPartnerNickname(e.target.value)}
                placeholder="Babu ❤️"
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              WhatsApp Phone Number (with Country Code)
            </label>
            <input
              type="text"
              placeholder="+919876543210"
              value={partnerPhone}
              onChange={(e) => setPartnerPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
            />
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Birthday
              </label>
              <InputDate
                value={partnerBirthday}
                onChange={(e) => setPartnerBirthday(e.target.value)}
                placeholder="Pick birthday..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Anniversary Date
              </label>
              <InputDate
                value={partnerAnniversary}
                onChange={(e) => setPartnerAnniversary(e.target.value)}
                placeholder="Pick anniversary..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              Preferences / Favorites / Gift Wishlist
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Loves lilies, dark chocolate, favorite perfumes, restaurants..."
              value={partnerPreferences}
              onChange={(e) => setPartnerPreferences(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
              Notes & Reminders
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Inside jokes, special memories, reminders..."
              value={partnerNotes}
              onChange={(e) => setPartnerNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit">
              Save Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Message Template Modal */}
      <Modal
        isOpen={isAddTemplateOpen}
        onClose={() => setIsAddTemplateOpen(false)}
        title="Create Message Template"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Good Morning Babu"
                value={newTemplateTitle}
                onChange={(e) => setNewTemplateTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
                Category
              </label>
              <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                <SelectTrigger className="w-full h-10 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOVE">Love & Sweet</SelectItem>
                  <SelectItem value="CARE">Care & Health</SelectItem>
                  <SelectItem value="NIGHT">Good Night</SelectItem>
                  <SelectItem value="MORNING">Good Morning</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-1.5 uppercase">
              Message Content *
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. I love you so much ❤️ Have a great day!"
              value={newTemplateContent}
              onChange={(e) => setNewTemplateContent(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-sans"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
            <Button
              variant="glass"
              size="sm"
              type="button"
              onClick={() => setIsAddTemplateOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="red" size="sm" type="submit">
              Save Template
            </Button>
          </div>
        </form>
      </Modal>

      {/* Message Template Deletion Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(templateToDelete)}
        onClose={() => setTemplateToDelete(null)}
        onConfirm={handleExecuteDeleteTemplate}
        isLoading={isDeletingTemplate}
        title="Delete Custom Message Template"
        message={`Are you sure you want to delete template "${templateToDelete?.title}"?`}
        confirmText="Delete Template"
        confirmVariant="red"
        iconType="danger"
      />
    </div>
  );
}
