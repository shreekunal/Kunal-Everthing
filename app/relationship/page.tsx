"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
} from "lucide-react";

export default function RelationshipPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerNickname, setPartnerNickname] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerBirthday, setPartnerBirthday] = useState("");
  const [partnerAnniversary, setPartnerAnniversary] = useState("");
  const [partnerPreferences, setPartnerPreferences] = useState("");
  const [partnerNotes, setPartnerNotes] = useState("");

  // Custom Message Dispatcher
  const [customMessage, setCustomMessage] = useState("");

  const fetchRelationshipData = async () => {
    try {
      const res = await fetch("/api/relationship");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.partner) {
          setPartnerName(json.partner.name || "");
          setPartnerNickname(json.partner.nickname || "");
          setPartnerPhone(json.partner.phone || "");
          setPartnerBirthday(json.partner.birthday || "");
          setPartnerAnniversary(json.partner.anniversary || "");
          setPartnerPreferences(json.partner.preferences || "");
          setPartnerNotes(json.partner.notes || "");
        }
      }
    } catch (err) {
      console.error("Fetch relationship error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationshipData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/relationship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: partnerName,
          nickname: partnerNickname,
          phone: partnerPhone,
          birthday: partnerBirthday,
          anniversary: partnerAnniversary,
          preferences: partnerPreferences,
          notes: partnerNotes,
        }),
      });
      setIsEditProfileOpen(false);
      fetchRelationshipData();
    } catch (err) {
      console.error("Save partner error:", err);
    }
  };

  const handleSendWhatsApp = (text: string) => {
    if (!text) return;
    const phone = data?.partner?.phone || "";
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(text);
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const partner = data?.partner;
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
              <p className="text-xs text-zinc-300 font-mono mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3 h-3 text-brand-red" />
                {partner?.phone || "No phone number configured"}
              </p>
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
        <h3 className="text-sm font-semibold text-white tracking-wide uppercase mb-3 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-brand-red" />
          Pre-Composed Message Templates ({templates.length})
        </h3>

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
        <form onSubmit={handleSaveProfile} className="space-y-4">
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
              <input
                type="date"
                value={partnerBirthday}
                onChange={(e) => setPartnerBirthday(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 font-mono">
                Anniversary Date
              </label>
              <input
                type="date"
                value={partnerAnniversary}
                onChange={(e) => setPartnerAnniversary(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm text-white font-mono focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all"
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
    </div>
  );
}
