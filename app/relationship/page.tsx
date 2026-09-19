"use client";

import React, { useState, useEffect } from "react";
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
  PhoneCall,
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

  // Custom Message Dispatcher
  const [customMessage, setCustomMessage] = useState("");

  // Live QuoteSlate 5 Love Quotes state (dynamic API, no hardcoded quotes)
  const [quoteSlateQuotes, setQuoteSlateQuotes] = useState<any[]>([]);
  const [quoteSlateLoading, setQuoteSlateLoading] = useState(false);
  const [quoteSlateError, setQuoteSlateError] = useState<string | null>(null);

  // Template Modal
  const [isAddTemplateOpen, setIsAddTemplateOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("LOVE");
  const [newTemplateContent, setNewTemplateContent] = useState("");

  const fetchQuoteSlate = async () => {
    setQuoteSlateLoading(true);
    setQuoteSlateError(null);
    try {
      let quotesData: any[] = [];

      // 1. Attempt direct browser fetch to QuoteSlate API
      try {
        const directRes = await fetch(
          "https://quoteslate.vercel.app/api/quotes/random?tags=love&count=5",
          {
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: AbortSignal.timeout(4500),
          }
        );
        if (directRes.ok) {
          const raw = await directRes.json();
          quotesData = Array.isArray(raw) ? raw : [raw];
        }
      } catch (directErr) {
        console.warn("Direct QuoteSlate API fetch error, querying live upstream database:", directErr);
      }

      // 2. If direct endpoint returned 429 challenge or failed, fetch live from QuoteSlate's dataset on GitHub
      if (quotesData.length === 0) {
        const liveRes = await fetch(
          "https://raw.githubusercontent.com/Musheer360/QuoteSlate/main/data/quotes.json",
          {
            cache: "no-store",
            signal: AbortSignal.timeout(6000),
          }
        );
        if (!liveRes.ok) {
          throw new Error(`QuoteSlate API status ${liveRes.status}`);
        }
        const allQuotes = await liveRes.json();
        const loveList = allQuotes.filter(
          (q: any) => q.tags && q.tags.map((t: string) => t.toLowerCase()).includes("love")
        );
        // Randomly pick 5 live quotes
        const shuffled = [...loveList].sort(() => 0.5 - Math.random());
        quotesData = shuffled.slice(0, 5);
      }

      if (quotesData.length === 0) {
        throw new Error("No love quotes returned from QuoteSlate API");
      }

      setQuoteSlateQuotes(quotesData.slice(0, 5));
    } catch (err: any) {
      console.error("QuoteSlate fetch error:", err);
      setQuoteSlateError(err.message || "Failed to load live love quotes from QuoteSlate API");
      setQuoteSlateQuotes([]);
    } finally {
      setQuoteSlateLoading(false);
    }
  };

  useEffect(() => {
    fetchQuoteSlate();
  }, []);

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

  const fetchRelationshipData = async () => {
    try {
      const res = await fetch("/api/relationship");
      if (res.ok) {
        const json = await res.json();
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
      }
    } catch (err) {
      console.error("Failed to load relationship data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

        <Button
          variant="glass"
          size="sm"
          onClick={() => setIsEditProfileOpen(true)}
        >
          <Edit2 className="w-3.5 h-3.5 text-brand-red" />
          <span>Edit Partner Profile</span>
        </Button>
      </div>

      {/* Partner Banner Glass Card */}
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
                    <a
                      href={`tel:${partner.phone}`}
                      onClick={() => haptics.impactMedium()}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 transition-all flex items-center gap-1 active:scale-95"
                    >
                      <PhoneCall className="w-2.5 h-2.5" />
                      <span>Call {partnerNicknameDisplay}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp("Hello baby ❤️")}
                      className="px-2 py-0.5 rounded-lg bg-brand-red/15 hover:bg-brand-red/25 border border-brand-red/30 text-[10px] font-mono text-brand-red transition-all flex items-center gap-1 active:scale-95"
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

      {/* Love Quotes Studio (QuoteSlate API) */}
      <Card glow="red" className="relative overflow-hidden bg-black/95 border border-brand-red/30 shadow-glow-red-subtle p-5">
        {/* Studio Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-glow-red-subtle flex-shrink-0">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Love Quotes Studio</span>
                <span className="text-[10px] font-mono text-brand-red bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-full">
                  For {partnerNicknameDisplay} ❤️
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full hidden sm:inline-block">
                  Live QuoteSlate API
                </span>
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                5 dynamic romantic quotes on demand • Instant WhatsApp dispatch
              </p>
            </div>
          </div>

          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              haptics.impactMedium();
              fetchQuoteSlate();
            }}
            isLoading={quoteSlateLoading}
            className="text-xs border-brand-red/40 hover:border-brand-red shadow-glow-red-subtle active:scale-95"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 text-brand-red ${quoteSlateLoading ? "animate-spin" : ""}`} />
            <span>Refresh 5 Quotes</span>
          </Button>
        </div>

        {/* Content Area */}
        <div className="mt-4 space-y-4">
          {/* Error State */}
          {quoteSlateError && !quoteSlateLoading && (
            <div className="p-6 rounded-2xl bg-brand-red/10 border border-brand-red/30 space-y-3 text-center">
              <div className="flex items-center justify-center gap-2 text-brand-red font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>QuoteSlate Connection Error</span>
              </div>
              <p className="text-xs text-zinc-300 font-mono max-w-md mx-auto">
                {quoteSlateError}
              </p>
              <Button
                variant="red"
                size="sm"
                onClick={fetchQuoteSlate}
                isLoading={quoteSlateLoading}
                className="text-xs shadow-glow-red font-bold"
              >
                <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Retry Live Fetch</span>
              </Button>
            </div>
          )}

          {/* Loading Skeletons */}
          {quoteSlateLoading && (
            <div className="space-y-3.5">
              {/* Hero Spotlight Skeleton */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse space-y-3">
                <div className="h-4 w-28 bg-white/10 rounded" />
                <div className="h-6 w-11/12 bg-white/15 rounded" />
                <div className="h-4 w-36 bg-white/10 rounded" />
              </div>
              {/* Grid Skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 animate-pulse space-y-2.5">
                    <div className="h-3 w-20 bg-white/10 rounded" />
                    <div className="h-4 w-5/6 bg-white/15 rounded" />
                    <div className="h-3 w-28 bg-white/10 rounded" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loaded 5 Quotes Layout */}
          {!quoteSlateLoading && !quoteSlateError && quoteSlateQuotes.length > 0 && (
            <div className="space-y-4">
              {/* FEATURED QUOTE #1 (Spotlight Hero) */}
              {quoteSlateQuotes[0] && (() => {
                const q = quoteSlateQuotes[0];
                const cardId = `qs-quote-${q.id || 0}`;
                const quoteText = q.quote || q.text || "";
                const authorName = q.author || "Unknown";
                const whatsappMsg = `${partnerNicknameDisplay}... ❤️\n\n"${quoteText}"\n— ${authorName}\n\n— Tera Kunal`;

                return (
                  <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-brand-red/[0.08] via-black to-white/[0.02] border border-brand-red/40 shadow-glow-red-subtle space-y-4">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-2">
                        <span className="text-brand-red font-bold bg-brand-red/20 border border-brand-red/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          <span>Quote #1 Spotlight</span>
                        </span>
                      </div>
                      <span className="text-zinc-500 font-mono">#love #romance</span>
                    </div>

                    <p className="text-lg sm:text-xl font-serif italic text-white leading-relaxed tracking-wide">
                      &ldquo;{quoteText}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-1 text-xs font-mono text-zinc-300">
                      <span className="flex items-center gap-1.5 text-brand-red font-semibold">
                        <Heart className="w-3 h-3 fill-brand-red" />
                        <span>— {authorName}</span>
                      </span>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-end gap-2.5">
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => handleCopyText(cardId, `"${quoteText}" — ${authorName}`)}
                        className="text-xs h-8 px-3"
                      >
                        {copiedId === cardId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1.5" />
                            <span>Copy Quote</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="red"
                        size="sm"
                        onClick={() => handleSendWhatsApp(whatsappMsg)}
                        className="text-xs h-8 px-3.5 shadow-glow-red font-bold active:scale-95"
                      >
                        <Heart className="w-3.5 h-3.5 fill-white mr-1.5" />
                        <span>Send to {partnerNicknameDisplay}</span>
                        <Send className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* QUOTES #2 to #5 (2x2 Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {quoteSlateQuotes.slice(1, 5).map((q: any, index: number) => {
                  const cardId = `qs-quote-${q.id || index + 1}`;
                  const quoteText = q.quote || q.text || "";
                  const authorName = q.author || "Unknown";
                  const whatsappMsg = `${partnerNicknameDisplay}... ❤️\n\n"${quoteText}"\n— ${authorName}\n\n— Tera Kunal`;

                  return (
                    <div
                      key={q.id || index + 1}
                      className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/10 hover:border-brand-red/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-brand-red font-bold bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-full">
                            Quote #{index + 2} of 5
                          </span>
                          <span className="text-zinc-500">
                            {q.tags ? q.tags.map((t: string) => `#${t}`).join(" ") : "#love"}
                          </span>
                        </div>

                        <p className="text-sm sm:text-base font-serif italic text-white leading-relaxed">
                          &ldquo;{quoteText}&rdquo;
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-white/5">
                        <div className="text-xs font-mono text-zinc-400">
                          <span>— {authorName}</span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={() => handleCopyText(cardId, `"${quoteText}" — ${authorName}`)}
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
                            className="text-xs h-7 px-2.5 shadow-glow-red font-bold active:scale-95"
                          >
                            <Heart className="w-3 h-3 fill-white mr-1" />
                            <span>Send to {partnerNicknameDisplay}</span>
                            <Send className="w-2.5 h-2.5 ml-1" />
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
      </Card>

      {/* Quick Custom WhatsApp Compose */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-brand-red" />
            <CardTitle>Instant WhatsApp Message Dispatcher</CardTitle>
          </div>
        </CardHeader>

        <div className="space-y-3">
          <textarea
            rows={2}
            placeholder="Type a custom message or choose a pre-written template below..."
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all font-sans"
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="red"
              size="sm"
              onClick={() => handleSendWhatsApp(customMessage)}
              disabled={!customMessage}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Open in WhatsApp</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Message Templates Library */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase flex items-center gap-2 font-mono">
            <Sparkles className="w-4 h-4 text-brand-red" />
            Message Templates ({templates.length})
          </h3>
          <Button
            variant="glass"
            size="sm"
            onClick={() => {
              haptics.selection();
              setIsAddTemplateOpen(true);
            }}
          >
            <Plus className="w-3.5 h-3.5 text-brand-red" />
            <span>New Template</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <h4 className="text-sm font-bold text-white mb-1.5">
                    {tmpl.title}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed italic">
                    &quot;{tmpl.content}&quot;
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/10">
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
                    <Send className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

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
              <select
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red"
              >
                <option value="LOVE">Love & Sweet</option>
                <option value="CARE">Care & Health</option>
                <option value="NIGHT">Good Night</option>
                <option value="MORNING">Good Morning</option>
                <option value="CUSTOM">Custom</option>
              </select>
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
