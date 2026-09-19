"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InputDate } from "@/components/ui/InputDate";
import {
  Settings,
  Shield,
  Moon,
  Globe,
  Download,
  Smartphone,
  Key,
  CheckCircle2,
  Lock,
  Fingerprint,
  Trash2,
  AlertCircle,
  Bell,
  Clock,
  Sparkles,
  Layers,
  Wallet,
  CreditCard as CreditCardIcon,
  Heart,
  CheckSquare,
  Users,
} from "lucide-react";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { ProfileSwitcherModal } from "@/components/profile/ProfileSwitcherModal";
import { enrollDeviceBiometrics, checkDeviceBiometrics } from "@/lib/biometrics";
import { haptics } from "@/lib/haptics";
import {
  scheduleCoreDailyNotifications,
  cancelCoreNotifications,
  sendTestNotification,
} from "@/lib/notifications";

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Quick Setup Modal & Form states
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupSubmitting, setSetupSubmitting] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [setupError, setSetupError] = useState("");

  const [setupForm, setSetupForm] = useState({
    bankName: "",
    bankBalance: "",
    investmentName: "",
    investmentBalance: "",
    cardName: "",
    cardExpiry: "",
    cardNumber: "",
    cardCvv: "",
    cardLimit: "",
    cardOutstanding: "",
    cardDueDate: "",
    partnerName: "",
    partnerNickname: "",
    partnerPhone: "",
    partnerBirthday: "",
    partnerAnniversary: "",
    partnerPreferences: "",
    taskTitles: "",
    routineNames: "",
  });

  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // Destructive Confirmation States
  const [isConfirmWipeOpen, setIsConfirmWipeOpen] = useState(false);
  const [isConfirmRemoveBioOpen, setIsConfirmRemoveBioOpen] = useState(false);

  const handleExecuteWipeData = async () => {
    setClearing(true);
    haptics.warning();
    try {
      const res = await fetch("/api/seed", { method: "DELETE" });
      if (res.ok) {
        setClearSuccess(true);
        setIsConfirmWipeOpen(false);
        setTimeout(() => setClearSuccess(false), 3000);
        window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
      }
    } finally {
      setClearing(false);
    }
  };


  // PIN & Biometrics State
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Biometrics & Multi-Profile States
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMessage, setBioMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("Kunal");
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);

  // Fetch initial security status
  useEffect(() => {
    async function loadSecurityStatus() {
      try {
        const status = await checkDeviceBiometrics();
        setBiometricsSupported(status.isAvailable);

        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          setHasBiometrics(!!data.hasBiometrics);
          if (data.userId) setCurrentUserId(data.userId);
          if (data.userName) setCurrentUserName(data.userName);
          if (data.profiles) setAvailableProfiles(data.profiles);
        }

        if (typeof window !== "undefined") {
          setNotificationsEnabled(
            localStorage.getItem("everything_notifications_enabled") === "true"
          );
        }
      } catch {
        // Silently handle
      }
    }
    loadSecurityStatus();
  }, []);

  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    setNotifMessage(null);
    try {
      if (!notificationsEnabled) {
        const success = await scheduleCoreDailyNotifications();
        if (success) {
          setNotificationsEnabled(true);
          setNotifMessage("Scheduled: 8:00 AM Morning Briefing & 9:00 PM Streak Defender");
          haptics.success();
        } else {
          setNotifMessage("Notification permission was denied or not supported on this device.");
          haptics.warning();
        }
      } else {
        await cancelCoreNotifications();
        setNotificationsEnabled(false);
        setNotifMessage("Daily device alarms disabled.");
        haptics.impactLight();
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTestNotification = async () => {
    haptics.impactLight();
    const sent = await sendTestNotification();
    if (sent) {
      setNotifMessage("Test alert scheduled! Check your notification tray in 3 seconds.");
      haptics.success();
    } else {
      setNotifMessage("Test notification failed. Ensure notification permissions are granted.");
      haptics.warning();
    }
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (!/^\d{4}$/.test(newPin)) {
      setPinError("New PIN must be exactly 4 numeric digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("New PIN and confirmation PIN do not match.");
      return;
    }

    setIsUpdatingPin(true);
    try {
      const res = await fetch("/api/auth/pin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin,
          newPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Failed to update PIN");
      } else {
        setPinSuccess(true);
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
        setTimeout(() => {
          setPinSuccess(false);
          setIsPinModalOpen(false);
        }, 1500);
      }
    } catch {
      setPinError("Failed to update PIN. Please try again.");
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleRegisterBiometrics = async () => {
    setBioLoading(true);
    setBioMessage(null);
    try {
      await enrollDeviceBiometrics();
      setHasBiometrics(true);
      setBioMessage({ text: "Fingerprint / Biometric credential enrolled successfully!" });
    } catch (err: any) {
      setBioMessage({ text: err.message || "Failed to enroll biometrics", error: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleExecuteRemoveBiometrics = async () => {
    setBioLoading(true);
    try {
      const res = await fetch("/api/auth/biometrics", { method: "DELETE" });
      if (res.ok) {
        setHasBiometrics(false);
        setIsConfirmRemoveBioOpen(false);
        setBioMessage({ text: "Biometric authentication removed." });
      }
    } catch {
      setBioMessage({ text: "Failed to remove biometrics.", error: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleLockNow = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupSubmitting(true);
    setSetupError("");
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupForm),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to feed setup data");
      }

      setSetupSuccess(true);
      haptics.success();
      setTimeout(() => {
        setSetupSuccess(false);
        setIsSetupModalOpen(false);
        window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
      }, 1500);
    } catch (err: any) {
      console.error("Setup error:", err);
      setSetupError(err.message || "Failed to save setup data");
      haptics.warning();
    } finally {
      setSetupSubmitting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [dash, tasks, routines, money, dates] = await Promise.all([
        fetch("/api/dashboard").then((r) => r.json()),
        fetch("/api/tasks").then((r) => r.json()),
        fetch("/api/routines").then((r) => r.json()),
        fetch("/api/money").then((r) => r.json()),
        fetch("/api/dates").then((r) => r.json()),
      ]);

      const exportBlob = {
        exportDate: new Date().toISOString(),
        version: "2.0",
        data: {
          dashboard: dash,
          tasks: tasks.tasks,
          routines: routines.routines,
          finances: money,
          importantDates: dates.dates,
        },
      };

      const jsonStr = JSON.stringify(exportBlob, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kunal-os-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export backup data.");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-red" />
          System Settings & Security Controls
        </h2>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          App configuration, PIN & biometric lock, account preferences, and full-stack data backups
        </p>
      </div>

      {/* Prime Video Dual-Profile Profiles */}
      <Card glow="red">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-red" />
            <CardTitle>Dual-Profile Workspaces (Prime Video Style)</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            Current: {currentUserName}
          </Badge>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <p className="text-zinc-400 font-mono text-[11px]">
            Two independent profiles (Mradul & Kunal) with isolated tasks, routines, cards, and wallets.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {availableProfiles.map((p) => {
              const isCurrent = p.id === currentUserId || p.name === currentUserName;
              return (
                <div
                  key={p.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                    isCurrent
                      ? "bg-white/[0.04] border-brand-red/40 shadow-glow-red-subtle"
                      : "bg-white/[0.02] border-white/10 hover:border-white/20"
                  }`}
                >
                  <ProfileAvatar
                    name={p.name}
                    gender={p.gender}
                    size="md"
                    isSelected={isCurrent}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono text-sm">
                        {p.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-red/20 text-brand-red font-mono font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-400 font-mono block truncate">
                      {p.role === "PRIMARY" ? "Primary / Master Profile" : "Partner Profile"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
            <span className="text-zinc-400 font-mono text-[11px]">
              Switch to the other profile workspace:
            </span>
            <Button
              variant="glass"
              size="sm"
              onClick={() => setIsProfileSwitcherOpen(true)}
              className="text-xs gap-1.5"
            >
              <span>Switch Profile (PIN Required)</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Device Lock & Biometrics */}
      <Card glow="red">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-red" />
            <CardTitle>Master PIN & Biometric Lock Security ({currentUserName})</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            Lock Screen Active
          </Badge>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 4-Digit PIN Status */}
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-zinc-500 font-mono block mb-1 uppercase text-[10px]">
                  Master 4-Digit PIN
                </span>
                <span className="font-bold text-white font-mono text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Active & Protected
                </span>
              </div>
              <div className="mt-3">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setIsPinModalOpen(true)}
                  className="w-full text-xs"
                >
                  <Key className="w-3.5 h-3.5 text-brand-red" />
                  <span>Change Master PIN</span>
                </Button>
              </div>
            </div>

            {/* Biometric Status */}
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10 flex flex-col justify-between">
              <div>
                <span className="text-zinc-500 font-mono block mb-1 uppercase text-[10px]">
                  Fingerprint / Biometrics
                </span>
                <span className="font-bold text-white font-mono text-sm flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hasBiometrics ? "bg-emerald-400 shadow-glow-red-subtle" : "bg-zinc-500"
                    }`}
                  />
                  {hasBiometrics ? "Enrolled & Ready" : "Not Configured"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleRegisterBiometrics}
                  isLoading={bioLoading}
                  className="flex-1 text-xs"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-brand-red" />
                  <span>{hasBiometrics ? "Re-enroll Fingerprint" : "Enroll Fingerprint"}</span>
                </Button>
                {hasBiometrics && (
                  <button
                    onClick={() => {
                      haptics.warning();
                      setIsConfirmRemoveBioOpen(true);
                    }}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/10 transition-colors"
                    title="Remove Biometric Credential"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {bioMessage && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-mono ${
                bioMessage.error
                  ? "bg-red-500/10 border-red-500/30 text-brand-red"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {bioMessage.error ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{bioMessage.text}</span>
            </div>
          )}

          {/* Quick Lock Button */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
            <span className="text-zinc-400">Lock your portal immediately:</span>
            <Button variant="red" size="sm" onClick={handleLockNow}>
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Everything Now</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Smart Device Alarms & Notifications */}
      <Card glow="red">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand-red" />
            <CardTitle>Smart Device Alarms &amp; Notifications</CardTitle>
          </div>
          <Badge variant={notificationsEnabled ? "red" : "outline"} size="sm">
            {notificationsEnabled ? "Scheduled & Active" : "Disabled"}
          </Badge>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <p className="text-zinc-400 font-mono">
            Autonomous native Android alarms running directly on your phone hardware with zero cloud delay.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Morning Briefing */}
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-brand-red flex-shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white font-mono block">Morning Briefing (8:00 AM)</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Daily focus call: review tasks, pending routines, and daily objectives.
                </p>
              </div>
            </div>

            {/* Streak Defender */}
            <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white font-mono block">Streak Defender (9:00 PM)</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Monk integrity alert: ensures clean diet and purity streaks stay intact.
                </p>
              </div>
            </div>
          </div>

          {notifMessage && (
            <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-xs font-mono text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-red flex-shrink-0" />
              <span>{notifMessage}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
            <span className="text-zinc-400">Manage device alarms:</span>
            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="sm"
                onClick={handleTestNotification}
                className="text-xs"
              >
                <span>Send Test Alert (3s)</span>
              </Button>
              <Button
                variant={notificationsEnabled ? "glass" : "red"}
                size="sm"
                onClick={handleToggleNotifications}
                isLoading={notifLoading}
                className="text-xs"
              >
                <span>{notificationsEnabled ? "Disable Alarms" : "Enable Daily Alarms"}</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Backup & Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-brand-red" />
            <CardTitle>Data Backup & System Reset</CardTitle>
          </div>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-white/10">
            <div>
              <p className="font-semibold text-white">Download Full JSON Backup</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Export all tasks, routines, credit cards, bank accounts, and dates to an offline JSON file.
              </p>
            </div>
            <Button variant="red" size="sm" onClick={handleExportData}>
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-brand-red/[0.03] rounded-xl border border-brand-red/30 shadow-glow-red-subtle">
            <div>
              <p className="font-semibold text-white flex items-center gap-2">
                <span>Quick Setup &amp; One-Form Feeder</span>
                <span className="text-[10px] font-mono text-brand-red bg-brand-red/10 border border-brand-red/20 px-2 py-0.5 rounded-full">
                  Fast Feed
                </span>
              </p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Feed your bank accounts, credit card, partner details, tasks, and routines in a single unified form.
              </p>
            </div>
            <Button
              variant="red"
              size="sm"
              onClick={() => {
                haptics.selection();
                setIsSetupModalOpen(true);
              }}
              className="shadow-glow-red whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-white" />
              <span>Open Setup Form</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-500/[0.03] rounded-xl border border-red-500/20">
            <div>
              <p className="font-semibold text-red-400">Purge &amp; Wipe All Portal Data</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Clear all tasks, routines, credit cards, bank accounts, and reward logs for a clean personal start.
              </p>
            </div>
            <Button
              variant="red"
              size="sm"
              onClick={() => {
                haptics.warning();
                setIsConfirmWipeOpen(true);
              }}
              isLoading={clearing}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wipe All Data</span>
            </Button>
          </div>

          {clearSuccess && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-center gap-2 text-xs text-brand-red font-mono">
              <CheckCircle2 className="w-4 h-4 text-brand-red" />
              <span>All portal data has been completely wiped clean!</span>
            </div>
          )}
        </div>
      </Card>

      {/* Unified One-Form Setup Modal */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => {
          setIsSetupModalOpen(false);
          setSetupError("");
          setSetupSuccess(false);
        }}
        title="Everything Portal — Quick Setup Feeder"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveSetup} className="space-y-5 font-sans text-xs max-h-[75vh] overflow-y-auto px-1 pr-2 scrollbar-thin">
          {setupError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-brand-red font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{setupError}</span>
            </div>
          )}

          {setupSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Data successfully saved across all modules!</span>
            </div>
          )}

          {/* Section 1: Financial Accounts */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2 text-brand-red font-mono font-bold text-xs">
              <Wallet className="w-4 h-4" />
              <span>1. BANK &amp; INVESTMENT ACCOUNTS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Primary Bank Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Salary Account"
                  value={setupForm.bankName}
                  onChange={(e) => setSetupForm({ ...setupForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Bank Balance (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 50000"
                  value={setupForm.bankBalance}
                  onChange={(e) => setSetupForm({ ...setupForm, bankBalance: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Investment / Mutual Funds
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zerodha Portfolio"
                  value={setupForm.investmentName}
                  onChange={(e) => setSetupForm({ ...setupForm, investmentName: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Investment Value (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 150000"
                  value={setupForm.investmentBalance}
                  onChange={(e) => setSetupForm({ ...setupForm, investmentBalance: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Credit Card */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2 text-brand-red font-mono font-bold text-xs">
              <CreditCardIcon className="w-4 h-4" />
              <span>2. PRIMARY CREDIT CARD</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Card Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Millennia / ICICI Amazon Pay"
                  value={setupForm.cardName}
                  onChange={(e) => setSetupForm({ ...setupForm, cardName: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Expiry Date (MM/YY)
                </label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="MM/YY (e.g. 08/29)"
                  value={setupForm.cardExpiry}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                    const formatted = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                    setSetupForm({ ...setupForm, cardExpiry: formatted });
                  }}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Card Number (16 Digits)
                </label>
                <input
                  type="text"
                  maxLength={19}
                  placeholder="4111 2222 3333 4444"
                  value={setupForm.cardNumber}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                    setSetupForm({ ...setupForm, cardNumber: formatted });
                  }}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white font-mono tracking-widest focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  CVV (3 or 4 digits)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  placeholder="•••"
                  value={setupForm.cardCvv}
                  onChange={(e) => setSetupForm({ ...setupForm, cardCvv: e.target.value.replace(/\D/g, "") })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white font-mono tracking-widest focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 100000"
                  value={setupForm.cardLimit}
                  onChange={(e) => setSetupForm({ ...setupForm, cardLimit: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Current Outstanding (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 5420"
                  value={setupForm.cardOutstanding}
                  onChange={(e) => setSetupForm({ ...setupForm, cardOutstanding: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Partner & Love */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2 text-brand-red font-mono font-bold text-xs">
              <Heart className="w-4 h-4 fill-brand-red" />
              <span>3. RELATIONSHIP &amp; PARTNER PROFILE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Partner Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Partner Name"
                  value={setupForm.partnerName}
                  onChange={(e) => setSetupForm({ ...setupForm, partnerName: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Sweet Nickname
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meri Jaan / Babu ❤️"
                  value={setupForm.partnerNickname}
                  onChange={(e) => setSetupForm({ ...setupForm, partnerNickname: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  WhatsApp Phone Number (with Country Code)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +919876543210"
                  value={setupForm.partnerPhone}
                  onChange={(e) => setSetupForm({ ...setupForm, partnerPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white font-mono focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Anniversary Date
                </label>
                <InputDate
                  value={setupForm.partnerAnniversary}
                  onChange={(e) => setSetupForm({ ...setupForm, partnerAnniversary: e.target.value })}
                  placeholder="Pick anniversary date..."
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Birthday
                </label>
                <InputDate
                  value={setupForm.partnerBirthday}
                  onChange={(e) => setSetupForm({ ...setupForm, partnerBirthday: e.target.value })}
                  placeholder="Pick birthday..."
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Preferences &amp; Favorites
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dark chocolate, tulips, surprise dates"
                  value={setupForm.partnerPreferences}
                  onChange={(e) => setSetupForm({ ...setupForm, partnerPreferences: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Tasks & Habits */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center gap-2 text-brand-red font-mono font-bold text-xs">
              <CheckSquare className="w-4 h-4" />
              <span>4. INITIAL TASKS &amp; DAILY HABITS</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Priority Tasks (One per line or comma-separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="Review quarterly targets&#10;Deploy production hotfix&#10;Pay electricity bill"
                  value={setupForm.taskTitles}
                  onChange={(e) => setSetupForm({ ...setupForm, taskTitles: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red text-xs"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
                  Daily Habits / Routines (One per line or comma-separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="Morning Meditation&#10;Gym Workout (45m)&#10;Zero Sugar Diet&#10;Deep Work Block (90m)"
                  value={setupForm.routineNames}
                  onChange={(e) => setSetupForm({ ...setupForm, routineNames: e.target.value })}
                  className="w-full px-3 py-2 bg-black/60 border border-white/10 rounded-xl text-white focus:outline-none focus:border-brand-red text-xs"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="glass"
              onClick={() => setIsSetupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="red"
              isLoading={setupSubmitting}
              className="shadow-glow-red font-bold"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-white" />
              <span>Save &amp; Feed Everything</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Master PIN Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinError("");
          setPinSuccess(false);
        }}
        title="Change 4-Digit Master PIN"
      >
        <form onSubmit={handleUpdatePin} className="space-y-4 font-sans text-xs">
          {pinError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-brand-red font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pinError}</span>
            </div>
          )}

          {pinSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Master PIN successfully updated!</span>
            </div>
          )}

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Current Master PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              New 4-Digit Master PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-mono uppercase text-[10px]">
              Confirm New 4-Digit PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-brand-red"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="glass"
              onClick={() => setIsPinModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="red"
              isLoading={isUpdatingPin}
              disabled={isUpdatingPin || newPin.length !== 4 || confirmPin.length !== 4}
            >
              Save New PIN
            </Button>
          </div>
        </form>
      </Modal>

      {/* High-Security Wipe All Portal Data Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmWipeOpen}
        onClose={() => setIsConfirmWipeOpen(false)}
        onConfirm={handleExecuteWipeData}
        isLoading={clearing}
        title="Purge & Wipe All Portal Data"
        message="This is a catastrophic destructive operation. All tasks, routines, habit history, credit cards, bank accounts, partner details, and discipline XP will be permanently deleted from the database. This action CANNOT be undone."
        confirmText="Wipe All Data"
        requireText="DELETE"
        confirmVariant="red"
        iconType="skull"
      />

      {/* Biometric Credential Removal Confirmation */}
      <ConfirmDialog
        isOpen={isConfirmRemoveBioOpen}
        onClose={() => setIsConfirmRemoveBioOpen(false)}
        onConfirm={handleExecuteRemoveBiometrics}
        isLoading={bioLoading}
        title="Remove Biometric Authentication"
        message="Are you sure you want to remove fingerprint / biometric credentials for this device? You will need to use your 4-digit PIN to access Everything."
        confirmText="Remove Biometrics"
        confirmVariant="red"
        iconType="warning"
      />

      {/* Profile Switcher Modal */}
      <ProfileSwitcherModal
        isOpen={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />
    </div>
  );
}
