"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Settings,
  Shield,
  Moon,
  Globe,
  Download,
  RotateCcw,
  Smartphone,
  Key,
  CheckCircle2,
  Lock,
  Fingerprint,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { generateEmergencyRecoveryKey } from "@/lib/crypto/vault";
import { registerWebAuthnCredential, isBiometricsAvailable } from "@/lib/webauthn";

export default function SettingsPage() {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  const handleClearAllData = async () => {
    if (!confirm("⚠️ Are you sure you want to completely purge and clear ALL data inside Everything? This will wipe all tasks, habits, cards, accounts, and discipline logs for a fresh start.")) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/seed", { method: "DELETE" });
      if (res.ok) {
        setClearSuccess(true);
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

  // Biometrics
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioMessage, setBioMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Fetch initial security status
  useEffect(() => {
    async function loadSecurityStatus() {
      try {
        const supported = await isBiometricsAvailable();
        setBiometricsSupported(supported);

        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          setHasBiometrics(!!data.hasBiometrics);
        }
      } catch {
        // Silently handle
      }
    }
    loadSecurityStatus();
  }, []);

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
      await registerWebAuthnCredential("Kunal");
      setHasBiometrics(true);
      setBioMessage({ text: "Fingerprint / Biometric credential enrolled successfully!" });
    } catch (err: any) {
      setBioMessage({ text: err.message || "Failed to enroll biometrics", error: true });
    } finally {
      setBioLoading(false);
    }
  };

  const handleRemoveBiometrics = async () => {
    if (!confirm("Are you sure you want to remove biometric authentication for this device?")) {
      return;
    }
    setBioLoading(true);
    try {
      const res = await fetch("/api/auth/biometrics", { method: "DELETE" });
      if (res.ok) {
        setHasBiometrics(false);
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

  const handleReSeed = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      if (res.ok) {
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
      }
    } finally {
      setSeeding(false);
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
          System Settings & Vault Controls
        </h2>
        <p className="text-xs text-zinc-400 font-mono mt-1">
          App configuration, PIN & biometric lock, zero-knowledge encryption parameters, and full-stack data backups
        </p>
      </div>

      {/* Device Lock & Biometrics (NEW) */}
      <Card glow="red">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-red" />
            <CardTitle>Master PIN & Biometric Lock Security</CardTitle>
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
                  Active (Default: 1234)
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
                    onClick={handleRemoveBiometrics}
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
            <span className="text-zinc-400">Lock your Everything session immediately:</span>
            <Button variant="red" size="sm" onClick={handleLockNow}>
              <Lock className="w-3.5 h-3.5" />
              <span>Lock Everything Now</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Theme & Display */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-brand-red" />
            <CardTitle>Theme & Visual Architecture</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            Pitch Black Tri-Color
          </Badge>
        </CardHeader>

        <div className="space-y-3 text-xs text-zinc-300 leading-relaxed font-sans">
          <p>
            Everything is rendered in an ultra-pure tri-color palette: pure pitch black (
            <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">#000000</code>
            ), crisp frosted glass white (
            <code className="text-white font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">#FFFFFF</code>
            ), and vivid scarlet red (
            <code className="text-brand-red font-mono bg-white/[0.04] px-1.5 py-0.5 rounded">#EF4444</code>
            ) with multi-layered <code className="text-zinc-200 font-mono">backdrop-blur-2xl</code> frosted glass surfaces.
          </p>
        </div>
      </Card>

      {/* Regional & Financial Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-red" />
            <CardTitle>Localization & Financial Formatting</CardTitle>
          </div>
        </CardHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10">
            <span className="text-zinc-500 font-mono block mb-1 uppercase text-[10px]">Default Currency</span>
            <span className="font-bold text-white font-mono text-sm">
              INR (₹) — Indian Rupee Lakhs/Crores Format
            </span>
          </div>
          <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/10">
            <span className="text-zinc-500 font-mono block mb-1 uppercase text-[10px]">Timezone</span>
            <span className="font-bold text-white font-mono text-sm">
              Asia/Kolkata (IST • UTC+5:30)
            </span>
          </div>
        </div>
      </Card>

      {/* Vault Security Parameters */}
      <Card glow="red">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-red" />
            <CardTitle>Zero-Knowledge Vault Parameters</CardTitle>
          </div>
          <Badge variant="red" size="sm">
            AES-256-GCM Active
          </Badge>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10">
              <span className="text-zinc-500 font-mono block mb-1 uppercase text-[10px]">
                Clipboard Auto-Purge
              </span>
              <span className="font-bold text-white font-mono text-sm">
                30 Seconds Countdown
              </span>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10">
              <span className="text-zinc-500 font-mono block mb-1 uppercase text-[10px]">
                Encryption Standard
              </span>
              <span className="font-bold text-brand-red font-mono text-sm">
                PBKDF2-SHA256 (100k) + AES-GCM
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
            <span className="text-zinc-300">Generate 24-character Emergency Recovery Kit:</span>
            <Button
              variant="glass"
              size="sm"
              onClick={() => {
                const key = generateEmergencyRecoveryKey();
                setRecoveryKey(key);
              }}
            >
              <Key className="w-3.5 h-3.5 text-brand-red" />
              <span>Generate Recovery Key</span>
            </Button>
          </div>

          {recoveryKey && (
            <div className="p-4 bg-brand-red/5 border border-brand-red/30 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-zinc-400 uppercase font-mono block tracking-wider">
                Emergency Zero-Knowledge Master Recovery Token
              </span>
              <span className="font-mono font-bold text-brand-red text-base select-all tracking-widest block">
                {recoveryKey}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                Store offline in a secure physical location.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Backup & Presets */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-brand-red" />
            <CardTitle>Data Backup & Preset Seeding</CardTitle>
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

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/[0.02] rounded-xl border border-white/10">
            <div>
              <p className="font-semibold text-white">Re-seed Preset Indian Financial Data</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Populate default Indian card presets (HDFC Millennia, ICICI Amazon Pay), habits, and templates.
              </p>
            </div>
            <Button
              variant="glass"
              size="sm"
              onClick={handleReSeed}
              isLoading={seeding}
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-red" />
              <span>Re-seed Data</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-500/[0.03] rounded-xl border border-red-500/20">
            <div>
              <p className="font-semibold text-red-400">Purge & Wipe All Portal Data</p>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Clear all tasks, routines, credit cards, bank accounts, and reward logs for a clean personal start.
              </p>
            </div>
            <Button
              variant="red"
              size="sm"
              onClick={handleClearAllData}
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

          {seedSuccess && (
            <div className="p-3 bg-white/[0.04] border border-brand-red/30 rounded-xl flex items-center justify-center gap-2 text-xs text-brand-red font-mono">
              <CheckCircle2 className="w-4 h-4 text-brand-red" />
              <span>Presets and sample records successfully initialized!</span>
            </div>
          )}
        </div>
      </Card>


      {/* APK & Mobile PWA */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-brand-red" />
            <CardTitle>Mobile PWA & Android APK Deployment</CardTitle>
          </div>
        </CardHeader>

        <div className="space-y-3 text-xs text-zinc-300">
          <p>
            Everything is ready for instant PWA home screen installation or native packaging via Capacitor.
          </p>
          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10 font-mono text-[11px] text-zinc-300">
            <code>npx cap add android && npx cap copy && npx cap open android</code>
          </div>
        </div>
      </Card>

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
              placeholder="e.g. 1234"
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
    </div>
  );
}
