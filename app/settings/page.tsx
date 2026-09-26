"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  Upload,
  FileCheck,
  Droplets,
  Activity,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Database,
  Sliders,
  Check,
  Zap,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { enrollDeviceBiometrics, checkDeviceBiometrics } from "@/lib/biometrics";
import { autoLock } from "@/lib/autoLock";
import { haptics } from "@/lib/haptics";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  scheduleCoreDailyNotifications,
  cancelCoreNotifications,
  sendTestNotification,
  areCoreNotificationsActive,
  checkExactAlarmPermission,
  requestExactAlarmPermission,
  scheduleWaterReminders,
  cancelWaterReminders,
  sendTestWaterNotification,
  areWaterNotificationsActive,
  getLiveNotificationDiagnostics,
  LiveNotificationDiagnostic,
} from "@/lib/notifications";

export default function SettingsPage() {
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [waterNotifLoading, setWaterNotifLoading] = useState(false);
  const [hasExactAlarms, setHasExactAlarms] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  // Live Alarms Diagnostics Modal States
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [liveDiagnostics, setLiveDiagnostics] = useState<LiveNotificationDiagnostic | null>(null);

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

  // Auto-Lock State
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(1);
  const [autoLockSavedMessage, setAutoLockSavedMessage] = useState("");

  // Backup & Restore State
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreFilePayload, setRestoreFilePayload] = useState<any | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Active Category Filter Tab
  type SettingsTab = "all" | "security" | "alarms" | "vault" | "danger";
  const [activeTab, setActiveTab] = useState<SettingsTab>("all");

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
        }

        const setRes = await fetch("/api/settings");
        if (setRes.ok) {
          const setData = await setRes.json();
          if (setData.settings?.vaultAutoLockMinutes !== undefined) {
            setAutoLockMinutes(setData.settings.vaultAutoLockMinutes);
          }
        }

        const isCoreActive = await areCoreNotificationsActive();
        setNotificationsEnabled(isCoreActive);
        const isWaterActive = await areWaterNotificationsActive();
        setWaterRemindersEnabled(isWaterActive);
        const exactOk = await checkExactAlarmPermission();
        setHasExactAlarms(exactOk);
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
          fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notificationsEnabled: true }),
          }).catch(() => {});
        } else {
          setNotifMessage("Notification permission was denied or not supported on this device.");
          haptics.warning();
        }
      } else {
        await cancelCoreNotifications();
        setNotificationsEnabled(false);
        setNotifMessage("Daily device alarms disabled.");
        haptics.impactLight();
        fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationsEnabled: false }),
        }).catch(() => {});
      }
      const exactOk = await checkExactAlarmPermission();
      setHasExactAlarms(exactOk);
    } finally {
      setNotifLoading(false);
    }
  };

  const handleToggleWaterNotifications = async () => {
    setWaterNotifLoading(true);
    setNotifMessage(null);
    try {
      if (!waterRemindersEnabled) {
        const success = await scheduleWaterReminders(2, 9, 21);
        if (success) {
          setWaterRemindersEnabled(true);
          setNotifMessage("✓ Scheduled: 2h Hydration Reminders (9:00 AM – 9:00 PM)!");
          haptics.success();
        } else {
          setNotifMessage("⚠️ Notification permission denied or not supported.");
          haptics.warning();
        }
      } else {
        await cancelWaterReminders();
        setWaterRemindersEnabled(false);
        setNotifMessage("Hydration reminders cancelled.");
        haptics.impactLight();
      }
      const exactOk = await checkExactAlarmPermission();
      setHasExactAlarms(exactOk);
    } finally {
      setWaterNotifLoading(false);
    }
  };

  const handleRequestExactAlarms = async () => {
    haptics.impactLight();
    const granted = await requestExactAlarmPermission();
    setHasExactAlarms(granted);
    if (granted) {
      setNotifMessage("Exact alarm permission enabled!");
      haptics.success();
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

  const handleTestWaterNotification = async () => {
    haptics.impactLight();
    const sent = await sendTestWaterNotification();
    if (sent) {
      setNotifMessage("💧 Test water alert scheduled! Check your notification tray in 2 seconds.");
      haptics.success();
    } else {
      setNotifMessage("Test water notification failed. Ensure notification permissions are granted.");
      haptics.warning();
    }
  };

  const handleOpenDiagnostics = async () => {
    haptics.impactLight();
    setDiagnosticsLoading(true);
    setIsDiagnosticsModalOpen(true);
    try {
      const data = await getLiveNotificationDiagnostics();
      setLiveDiagnostics(data);
    } catch (err) {
      console.error("Failed to fetch diagnostics:", err);
    } finally {
      setDiagnosticsLoading(false);
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

      // Sync cached profiles in localStorage immediately
      try {
        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          if (data?.profiles) {
            localStorage.setItem("kunal_os_cached_profiles", JSON.stringify(data.profiles));
          }
        }
      } catch {}
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

        // Sync cached profiles in localStorage immediately
        try {
          const res = await fetch("/api/auth/status");
          if (res.ok) {
            const data = await res.json();
            if (data?.profiles) {
              localStorage.setItem("kunal_os_cached_profiles", JSON.stringify(data.profiles));
            }
          }
        } catch {}
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

  const handleUpdateAutoLock = async (val: string) => {
    const mins = parseInt(val, 10);
    setAutoLockMinutes(mins);
    autoLock.setMinutes(mins);
    haptics.selection();
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vaultAutoLockMinutes: mins }),
      });
      setAutoLockSavedMessage("Auto-lock schedule updated");
      setTimeout(() => setAutoLockSavedMessage(""), 2500);
    } catch {
      // Ignore
    }
  };

  const handleExportBackup = async () => {
    setExportingBackup(true);
    setRestoreMessage(null);
    haptics.selection();
    try {
      const res = await fetch("/api/backup?download=true");
      if (!res.ok) throw new Error("Failed to generate backup");
      const text = await res.text();
      const fileName = `everything-backup-${new Date().toISOString().split("T")[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        // Native Android APK export using Capacitor Filesystem & Share
        let fileResult;
        try {
          fileResult = await Filesystem.writeFile({
            path: fileName,
            data: text,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
          });
        } catch {
          fileResult = await Filesystem.writeFile({
            path: fileName,
            data: text,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });
        }

        haptics.success();

        // Open Android Native Share / Save Sheet (Save to Downloads, Drive, Files, etc.)
        try {
          const canShare = await Share.canShare();
          if (canShare.value) {
            await Share.share({
              title: "Everything OS Backup",
              text: `Cryptographic backup file: ${fileName}`,
              url: fileResult.uri,
              dialogTitle: "Save Everything OS Backup",
            });
          } else {
            setRestoreMessage({
              text: `✓ Backup successfully saved to Documents: ${fileName}`,
              error: false,
            });
          }
        } catch (shareErr: any) {
          // If user dismisses share dialog, file is still safely saved
          setRestoreMessage({
            text: `✓ Backup file saved to device: ${fileName}`,
            error: false,
          });
        }
      } else {
        // Standard Web browser download
        const blob = new Blob([text], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        haptics.success();
        setRestoreMessage({
          text: `✓ Backup downloaded: ${fileName}`,
          error: false,
        });
      }
    } catch (err: any) {
      console.error("Backup export failed:", err);
      setRestoreMessage({
        text: err.message || "Failed to download backup",
        error: true,
      });
      haptics.warning();
    } finally {
      setExportingBackup(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !parsed.data) {
        alert("Invalid backup file: missing required data envelope.");
        return;
      }
      // Dry-run verification with API
      const dryRunRes = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: parsed, dryRun: true }),
      });
      const dryRunData = await dryRunRes.json();
      if (!dryRunRes.ok) {
        alert(dryRunData.error || "Failed to verify backup file.");
        return;
      }
      setRestoreFilePayload(parsed);
      setRestorePreview(dryRunData);
      haptics.selection();
    } catch (err: any) {
      alert("Failed to parse backup JSON file: " + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!restoreFilePayload) return;
    setRestoringBackup(true);
    haptics.warning();
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup: restoreFilePayload, dryRun: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore backup");

      haptics.success();
      setRestorePreview(null);
      setRestoreFilePayload(null);
      setRestoreMessage({ text: "Zero-loss restore completed successfully!" });
      window.dispatchEvent(new CustomEvent("kunal-os-refresh"));
      setTimeout(() => {
        setRestoreMessage(null);
        window.location.reload();
      }, 1200);
    } catch (err: any) {
      alert(err.message || "Restore failed");
    } finally {
      setRestoringBackup(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
      {/* Elite Control Center Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-red/15 border border-brand-red/30 text-brand-red shadow-glow-red-subtle">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight font-mono uppercase flex items-center gap-2">
                <span>System Control &amp; Security</span>
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Local cryptographic keys, native Android AlarmManager, dual profiles &amp; data vault
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <Button
            variant="glass"
            size="sm"
            onClick={handleLockNow}
            className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            <span>Lock Now</span>
          </Button>
        </div>
      </div>

      {/* Cyber Telemetry Status Deck (3 Pods) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Master Security */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-brand-red/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400 mb-1">
            <span>Security Gate</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="font-bold text-white font-mono text-base">
            PIN Protected
          </div>
          <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${hasBiometrics ? "bg-emerald-400" : "bg-zinc-500"}`} />
            <span>{hasBiometrics ? "Biometrics Active" : "PIN Only"}</span>
          </div>
        </div>

        {/* 2. Hardware Alarms */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-brand-red/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400 mb-1">
            <span>Alarm Engine</span>
            <Bell className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="font-bold text-cyan-400 font-mono text-base">
            {notificationsEnabled && waterRemindersEnabled
              ? "9 Alarms Armed"
              : notificationsEnabled
              ? "2 Alarms Armed"
              : waterRemindersEnabled
              ? "7 Alarms Armed"
              : "Standby"}
          </div>
          <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${hasExactAlarms ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span>{hasExactAlarms ? "Exact Android Alarm" : "Inexact Mode"}</span>
          </div>
        </div>

        {/* 3. Data Vault */}
        <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-brand-red/30 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400 mb-1">
            <span>Data Vault</span>
            <Database className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="font-bold text-white font-mono text-base">
            SHA-256 Vault
          </div>
          <div className="mt-2 text-[10px] font-mono text-zinc-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{Capacitor.isNativePlatform() ? "Android Storage" : "Web Local Sync"}</span>
          </div>
        </div>
      </div>

      {/* Settings Module Dropdown Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 shadow-glow-red-subtle">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-brand-red/10 border border-brand-red/25 text-brand-red">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-white font-mono text-xs uppercase tracking-wider block">
              Settings Menu
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">
              Switch configuration module via dropdown
            </span>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <Select
            value={activeTab}
            onValueChange={(val) => {
              haptics.selection();
              setActiveTab(val as SettingsTab);
            }}
          >
            <SelectTrigger className="w-full h-10 rounded-xl bg-black border-brand-red/30 hover:border-brand-red/70 text-xs text-white font-mono shadow-glow-red-subtle">
              <SelectValue placeholder="Select Settings Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">📑 All Settings &amp; Modules</SelectItem>
              <SelectItem value="security">🛡️ Master PIN &amp; Biometrics</SelectItem>
              <SelectItem value="alarms">🔔 Hardware Alarms &amp; Notifications</SelectItem>
              <SelectItem value="vault">💾 Data Vault &amp; Backups</SelectItem>
              <SelectItem value="danger">⚠️ Danger Zone (Wipe &amp; Reset)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 1. Device Lock & Biometrics */}
      {(activeTab === "all" || activeTab === "security") && (
        <Card glow="red" className="transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-red/10 border border-brand-red/20 text-brand-red">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <CardTitle>Master PIN &amp; Biometric Security</CardTitle>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Local device encryption keys, biometric sensors, and autonomous timeouts
                </p>
              </div>
            </div>
            <Badge variant="red" size="sm">
              Lock Screen Armed
            </Badge>
          </CardHeader>

          <div className="space-y-4 text-xs pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 4-Digit PIN Status Card */}
              <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/10 flex flex-col justify-between hover:border-brand-red/30 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                      Master 4-Digit PIN
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active &amp; Protected
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] font-mono mb-3">
                    Cryptographic PIN required on boot, after auto-lock timeout, and when switching profiles.
                  </p>
                </div>
                <div>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => {
                      haptics.selection();
                      setIsPinModalOpen(true);
                    }}
                    className="w-full text-xs gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5 text-brand-red" />
                    <span>Change Master PIN</span>
                  </Button>
                </div>
              </div>

              {/* Biometric Status Card */}
              <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/10 flex flex-col justify-between hover:border-brand-red/30 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-400 font-mono uppercase text-[10px] tracking-wider">
                      Fingerprint / Biometrics
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        hasBiometrics
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border-white/10"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          hasBiometrics ? "bg-emerald-400" : "bg-zinc-500"
                        }`}
                      />
                      {hasBiometrics ? "Enrolled & Ready" : "Not Configured"}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] font-mono mb-3">
                    Native Android hardware biometric sensor (fingerprint / Face Unlock) for rapid entry.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleRegisterBiometrics}
                    isLoading={bioLoading}
                    className="flex-1 text-xs gap-1.5"
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

            {/* Autonomous Auto-Lock Controller */}
            <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-zinc-400 font-mono block mb-0.5 uppercase text-[10px] tracking-wider">
                  Autonomous Auto-Lock &amp; Inactivity Timeout
                </span>
                <p className="text-xs text-zinc-400 font-mono">
                  Automatically lock Everything OS when the app is backgrounded on mobile or left idle.
                </p>
                {autoLockSavedMessage && (
                  <span className="text-[10px] font-mono text-emerald-400 mt-1 block">
                    ✓ {autoLockSavedMessage}
                  </span>
                )}
              </div>
              <div className="w-full sm:w-56 flex-shrink-0">
                <Select
                  value={autoLockMinutes.toString()}
                  onValueChange={handleUpdateAutoLock}
                >
                  <SelectTrigger className="w-full h-9 rounded-xl bg-black border-white/10 text-xs text-white font-mono">
                    <SelectValue placeholder="Select Auto-Lock Timer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">⚡ Immediate (On App Background)</SelectItem>
                    <SelectItem value="1">⏱️ 1 Minute (Default)</SelectItem>
                    <SelectItem value="5">⏱️ 5 Minutes</SelectItem>
                    <SelectItem value="15">⏱️ 15 Minutes</SelectItem>
                    <SelectItem value="30">⏱️ 30 Minutes</SelectItem>
                    <SelectItem value="-1">🛡️ Never (Manual Lock Only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Panic Lock Bar */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
              <span className="text-zinc-400 font-mono text-[11px]">
                Immediate lockdown — close session and require Master PIN / Fingerprint:
              </span>
              <Button variant="red" size="sm" onClick={handleLockNow} className="shadow-glow-red">
                <Lock className="w-3.5 h-3.5 mr-1" />
                <span>Lock Everything Now</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 3. Smart Device Alarms & Notifications */}
      {(activeTab === "all" || activeTab === "alarms") && (
        <Card glow="red" className="transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <CardTitle>Autonomous Hardware Alarms &amp; Notifications</CardTitle>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Native Android AlarmManager scheduling directly on device CPU with zero cloud latency
                </p>
              </div>
            </div>
            <Badge variant={notificationsEnabled || waterRemindersEnabled ? "red" : "outline"} size="sm">
              {notificationsEnabled && waterRemindersEnabled
                ? "9 Alarms Armed"
                : notificationsEnabled
                ? "2 Core Alarms Active"
                : waterRemindersEnabled
                ? "7 Water Alarms Active"
                : "All Disabled"}
            </Badge>
          </CardHeader>

          <div className="space-y-4 text-xs pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Morning Focus */}
              <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-brand-red flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white font-mono block">Morning Focus (8:00 AM)</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">
                      Daily priority call: review tasks, routines, and strategic objectives.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Status:</span>
                  <span className={notificationsEnabled ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                    {notificationsEnabled ? "✓ Armed (8:00 AM)" : "Off"}
                  </span>
                </div>
              </div>

              {/* Streak Defender */}
              <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-white/10 flex flex-col justify-between hover:border-white/20 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red flex-shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white font-mono block">Streak Defender (9:00 PM)</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">
                      Monk integrity alert: guarantees clean diet and purity streaks stay unbroken.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                  <span>Status:</span>
                  <span className={notificationsEnabled ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                    {notificationsEnabled ? "✓ Armed (9:00 PM)" : "Off"}
                  </span>
                </div>
              </div>

              {/* Hydration Reminders */}
              <div className="p-3.5 bg-white/[0.02] rounded-2xl border border-cyan-500/25 flex flex-col justify-between hover:border-cyan-500/40 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white font-mono block">Hydration Patrol (Every 2h)</span>
                    <p className="text-zinc-400 text-[11px] mt-0.5 font-mono">
                      7 recurring alarms (9 AM – 9 PM) ensuring water intake and +30 XP rewards.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold ${waterRemindersEnabled ? "text-cyan-400" : "text-zinc-500"}`}>
                    {waterRemindersEnabled ? "7 Alarms Armed" : "Disabled"}
                  </span>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={handleToggleWaterNotifications}
                    isLoading={waterNotifLoading}
                    className="text-[10px] h-6 px-2 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    <span>{waterRemindersEnabled ? "Disable" : "Enable 2h"}</span>
                  </Button>
                </div>
              </div>
            </div>

            {notifMessage && (
              <div className="p-3 rounded-xl bg-brand-red/10 border border-brand-red/30 text-xs font-mono text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-red flex-shrink-0" />
                  <span>{notifMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifMessage(null)}
                  className="text-zinc-400 hover:text-white p-0.5 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {!hasExactAlarms && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Exact alarm permission is disabled on your device. Alarms may be delayed by Android Doze mode.</span>
                </div>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleRequestExactAlarms}
                  className="text-amber-400 border-amber-500/30 text-[11px] self-start sm:self-auto"
                >
                  Enable in Settings
                </Button>
              </div>
            )}

            {/* Diagnostic Action Toolbar */}
            <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleOpenDiagnostics}
                  className="text-xs text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                  title="Inspect real alarms registered in Android AlarmManager"
                >
                  <Activity className="w-3.5 h-3.5 text-cyan-400 mr-1 animate-pulse" />
                  <span>Verify Live Alarms</span>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleTestWaterNotification}
                  className="text-xs text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/10"
                >
                  <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                  <span>Test Water (2s)</span>
                </Button>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={handleTestNotification}
                  className="text-xs"
                >
                  <Bell className="w-3.5 h-3.5 mr-1 text-brand-red" />
                  <span>Test Core (3s)</span>
                </Button>
                <Button
                  variant={notificationsEnabled ? "glass" : "red"}
                  size="sm"
                  onClick={handleToggleNotifications}
                  isLoading={notifLoading}
                  className="text-xs"
                >
                  <span>{notificationsEnabled ? "Disable Core Alarms" : "Enable Core Alarms"}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Data Vault, Backup & Fast Setup */}
      {(activeTab === "all" || activeTab === "vault") && (
        <Card glow="red" className="transition-all">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <CardTitle>Data Vault, Backup &amp; Fast Feeder</CardTitle>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Full cryptographic JSON backups, zero-loss schema restores &amp; unified setup onboarding
                </p>
              </div>
            </div>
            <Badge variant="outline" size="sm">
              SHA-256 Tamper-Proof
            </Badge>
          </CardHeader>

          <div className="space-y-4 text-xs pt-1">
            {/* Export Backup Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/10 hover:border-brand-red/30 transition-all">
              <div>
                <p className="font-semibold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-brand-red" />
                  <span>Download Cryptographic Backup</span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                    SHA-256 Verified
                  </span>
                </p>
                <p className="text-zinc-400 text-[11px] font-mono mt-1">
                  Export complete encrypted vault, tasks, habits, finances, cards, and relationship logs. On Android APK, automatically opens native device save/share sheet.
                </p>
              </div>
              <Button
                variant="red"
                size="sm"
                onClick={handleExportBackup}
                isLoading={exportingBackup}
                className="shadow-glow-red whitespace-nowrap self-start sm:self-auto"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                <span>Export Full Backup</span>
              </Button>
            </div>

            {/* Zero-Loss Restore Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/[0.02] rounded-2xl border border-white/10 hover:border-brand-red/30 transition-all">
              <div>
                <p className="font-semibold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Zero-Loss Atomic Restore</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Dry-Run Verified
                  </span>
                </p>
                <p className="text-zinc-400 text-[11px] font-mono mt-1">
                  Import a previous Everything OS backup JSON. Atomic database transaction prevents corrupted writes with automated schema preview.
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="glass"
                  size="sm"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  <span>Select Backup File</span>
                </Button>
              </div>
            </div>

            {restoreMessage && (
              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-mono ${
                  restoreMessage.error
                    ? "bg-red-500/10 border-red-500/30 text-brand-red"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                }`}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{restoreMessage.text}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* 5. High-Security Danger Zone */}
      {(activeTab === "all" || activeTab === "danger") && (
        <Card className="border-red-500/30 bg-gradient-to-b from-red-950/20 via-black to-red-950/15 shadow-[0_0_25px_rgba(239,68,68,0.12)]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-red-400">High-Security Quarantine: Danger Zone</CardTitle>
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Irreversible destructive operations — requires explicit typed security authorization
                </p>
              </div>
            </div>
          </CardHeader>

          <div className="space-y-4 text-xs pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-red-500/[0.04] rounded-2xl border border-red-500/20">
              <div>
                <p className="font-bold text-red-400 flex items-center gap-2 text-sm">
                  <span>Purge &amp; Wipe All Portal Data</span>
                </p>
                <p className="text-zinc-400 text-[11px] font-mono mt-1 leading-relaxed">
                  Permanently wipe all tasks, routines, habit history, credit cards, bank accounts, partner details, and monk discipline XP. This action <strong className="text-white">CANNOT</strong> be undone.
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
                className="whitespace-nowrap bg-red-600 hover:bg-red-700 shadow-glow-red self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
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
      )}

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

      {/* Zero-Loss Restore Preview Modal */}
      <Modal
        isOpen={!!restorePreview}
        onClose={() => {
          setRestorePreview(null);
          setRestoreFilePayload(null);
        }}
        title="📥 Confirm Zero-Loss Restore"
      >
        <div className="space-y-4 text-xs font-mono">
          <p className="text-zinc-300">
            A valid backup has been parsed and verified. Review the items to be synchronized:
          </p>

          <div className="grid grid-cols-2 gap-2 p-3 bg-white/[0.03] border border-white/10 rounded-xl">
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Tasks</span>
              <span className="font-bold text-white">{restorePreview?.counts?.tasks ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Routines</span>
              <span className="font-bold text-white">{restorePreview?.counts?.routines ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Bank Accounts</span>
              <span className="font-bold text-white">{restorePreview?.counts?.accounts ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Credit Cards</span>
              <span className="font-bold text-white">{restorePreview?.counts?.creditCards ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Debit Cards</span>
              <span className="font-bold text-white">{restorePreview?.counts?.debitCards ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Daily Diary Entries</span>
              <span className="font-bold text-white">{restorePreview?.counts?.dailyDiaries ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Important Dates</span>
              <span className="font-bold text-white">{restorePreview?.counts?.importantDates ?? 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-black/40 rounded-lg">
              <span className="text-zinc-400">Work Sessions</span>
              <span className="font-bold text-white">{restorePreview?.counts?.workSessions ?? 0}</span>
            </div>
          </div>

          {restorePreview?.exportDate && (
            <p className="text-[11px] text-zinc-500">
              Backup created on: {new Date(restorePreview.exportDate).toLocaleString()}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="glass"
              onClick={() => {
                setRestorePreview(null);
                setRestoreFilePayload(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="red"
              isLoading={restoringBackup}
              onClick={handleConfirmRestore}
              className="shadow-glow-red font-bold"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              <span>Confirm &amp; Restore</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* Live Alarm Diagnostics & Hardware Verification Modal */}
      <Modal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        title="🔔 Android AlarmManager Verification"
      >
        <div className="space-y-4 text-xs font-mono">
          <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-white font-bold">Hardware Alarm Inspector</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {liveDiagnostics?.isNative ? "Android Native OS" : "Web / PWA Mode"}
            </span>
          </div>

          <p className="text-zinc-300 text-[11px] leading-relaxed">
            Directly interrogating Android's native <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">AlarmManager</code> via <code className="text-cyan-300 bg-black/40 px-1 py-0.5 rounded">LocalNotifications.getPending()</code>. These alarms wake the CPU and trigger alerts even when Everything OS is completely closed.
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-zinc-500 text-[10px] block">TOTAL PENDING ALARMS</span>
              <span className="text-lg font-bold text-white">
                {diagnosticsLoading ? "..." : liveDiagnostics?.totalPending ?? 0}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-zinc-500 text-[10px] block">EXACT ALARM PERMISSION</span>
              <span className={`text-sm font-bold ${liveDiagnostics?.hasExactAlarms ? "text-emerald-400" : "text-amber-400"}`}>
                {liveDiagnostics?.hasExactAlarms ? "✓ Granted (Exact)" : "⚠️ Inexact / Doze"}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-zinc-500 text-[10px] block">CORE DAILY ALARMS</span>
              <span className="text-sm font-bold text-brand-red">
                {liveDiagnostics?.coreAlarmsActive ? "2 Active (8 AM, 9 PM)" : "0 Inactive"}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/10">
              <span className="text-zinc-500 text-[10px] block">HYDRATION REMINDERS</span>
              <span className="text-sm font-bold text-cyan-400">
                {liveDiagnostics?.waterAlarmsCount ? `${liveDiagnostics.waterAlarmsCount} Active (Every 2h)` : "0 Inactive"}
              </span>
            </div>
          </div>

          {/* Detailed Alarms List */}
          <div>
            <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-wider block mb-2">
              Registered Alarms in OS Queue:
            </span>
            {diagnosticsLoading ? (
              <div className="p-4 text-center text-zinc-500">Querying AlarmManager...</div>
            ) : liveDiagnostics?.notifications && liveDiagnostics.notifications.length > 0 ? (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {liveDiagnostics.notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-2 rounded-lg bg-white/[0.02] border border-white/5 flex items-start justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-zinc-400 text-[10px] font-mono">#{notif.id}</span>
                        <span className="font-semibold text-white text-[11px]">{notif.title}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{notif.scheduleDesc}</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
                <p className="text-amber-300 text-xs">No pending alarms found in Android OS.</p>
                <p className="text-zinc-400 text-[10px]">
                  Turn on Hydration Reminders or Daily Core Alarms above to register hardware alarms.
                </p>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={async () => {
                    await handleToggleWaterNotifications();
                    await handleOpenDiagnostics();
                  }}
                  className="text-xs text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/10"
                >
                  Schedule Hydration Alarms Now
                </Button>
              </div>
            )}
          </div>

          {/* ADB Terminal Verification Instruction */}
          <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 space-y-1">
            <span className="text-zinc-500 text-[9px] block">VERIFY VIA ADB TERMINAL:</span>
            <code className="text-emerald-400 text-[10px] block select-all">
              adb shell dumpsys alarm | grep com.kunal.everything
            </code>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={handleOpenDiagnostics}
              isLoading={diagnosticsLoading}
              className="text-xs text-zinc-300"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Refresh</span>
            </Button>
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => setIsDiagnosticsModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
