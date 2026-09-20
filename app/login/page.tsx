"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fingerprint,
  Delete,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { authenticateDeviceBiometrics, checkDeviceBiometrics } from "@/lib/biometrics";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { haptics } from "@/lib/haptics";
import { backButton } from "@/lib/backButton";

interface ProfileItem {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE";
  role: "PRIMARY" | "PARTNER";
  email: string;
  hasPin: boolean;
  hasBiometrics: boolean;
  accentColor: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";

  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<ProfileItem | null>(null);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Check biometric availability, load available profiles, and check status
  useEffect(() => {
    async function checkStatus() {
      try {
        const bioStatus = await checkDeviceBiometrics();
        setBiometricsSupported(bioStatus.isAvailable);

        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          if (data.profiles && Array.isArray(data.profiles)) {
            setProfiles(data.profiles);

            // AUTO-LOCK ENHANCEMENT:
            // If arriving from auto-lock or a locked user exists, open their PIN pad directly
            const targetUserId =
              searchParams.get("userId") ||
              (typeof window !== "undefined"
                ? localStorage.getItem("kunal_os_locked_user_id") ||
                  localStorage.getItem("kunal_os_current_user_id")
                : null);

            if (targetUserId && !data.authenticated) {
              const matched = data.profiles.find((p: ProfileItem) => p.id === targetUserId);
              if (matched) {
                setSelectedProfile(matched);
                // Auto-prompt fingerprint if biometric is enrolled
                if (matched.hasBiometrics && bioStatus.isAvailable) {
                  setTimeout(() => {
                    handleBiometricAuth(matched);
                  }, 350);
                }
              }
            }
          }
          setHasBiometrics(!!data.hasBiometrics);

          // If already authenticated, redirect to target
          if (data.authenticated) {
            router.push(redirectUrl);
          }
        }
      } catch (err) {
        console.error("Auth status error:", err);
      } finally {
        setLoadingProfiles(false);
      }
    }
    checkStatus();
  }, [redirectUrl, router]);

  // Handle Profile Selection (Prime Video style)
  const handleSelectProfile = (profile: ProfileItem) => {
    haptics.impactMedium();
    setSelectedProfile(profile);
    setPin("");
    setError("");
    setShake(false);
  };

  const handleBackToProfiles = () => {
    haptics.impactLight();
    setSelectedProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("kunal_os_locked_user_id");
    }
    setPin("");
    setError("");
  };

  // Back Button integration: if PIN pad is open, return to profile selector
  useEffect(() => {
    if (!selectedProfile) return;
    return backButton.register(() => {
      handleBackToProfiles();
      return true;
    });
  }, [selectedProfile]);

  // Handle PIN verification for selected profile
  const handleVerifyPin = useCallback(
    async (pinToVerify: string) => {
      if (pinToVerify.length !== 4 || isVerifying || !selectedProfile) return;

      setIsVerifying(true);
      setError("");

      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pin: pinToVerify,
            userId: selectedProfile.id,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          haptics.success();
          setSuccess(true);
          if (typeof window !== "undefined") {
            localStorage.removeItem("kunal_os_locked_user_id");
            localStorage.setItem("kunal_os_current_user_id", selectedProfile.id);
            localStorage.setItem("kunal_os_current_user_name", selectedProfile.name);
          }
          // Smooth transition to dashboard
          setTimeout(() => {
            router.push(redirectUrl);
            router.refresh();
          }, 400);
        } else {
          haptics.warning();
          setError(data.error || "Incorrect PIN");
          setShake(true);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(200);
          }
          setTimeout(() => {
            setShake(false);
            setPin("");
            setIsVerifying(false);
          }, 600);
        }
      } catch {
        setError("Connection error. Please try again.");
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
          setIsVerifying(false);
        }, 600);
      }
    },
    [isVerifying, redirectUrl, router, selectedProfile]
  );

  // Handle number input
  const handlePressDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4 && !isVerifying) {
        haptics.impactLight();
        const nextPin = pin + digit;
        setPin(nextPin);
        setError("");
        if (nextPin.length === 4) {
          handleVerifyPin(nextPin);
        }
      }
    },
    [handleVerifyPin, isVerifying, pin]
  );

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (!isVerifying && pin.length > 0) {
      haptics.impactLight();
      setPin((prev) => prev.slice(0, -1));
      setError("");
    }
  }, [isVerifying, pin.length]);

  // Handle Biometric Unlock
  const handleBiometricAuth = async (profileOverride?: ProfileItem | React.MouseEvent) => {
    if (isVerifying) return;
    const target = (profileOverride && "id" in profileOverride) ? profileOverride : selectedProfile;
    const isEnrolled = target ? target.hasBiometrics : hasBiometrics;
    if (!isEnrolled) {
      const name = target ? target.name : "this profile";
      setError(`No fingerprint enrolled yet for ${name}. Enter PIN, then enroll in Settings.`);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setIsVerifying(true);
    setError("");

    try {
      const ok = await authenticateDeviceBiometrics(target?.id);
      if (ok) {
        haptics.success();
        setSuccess(true);
        if (typeof window !== "undefined") {
          localStorage.removeItem("kunal_os_locked_user_id");
          if (target?.id) {
            localStorage.setItem("kunal_os_current_user_id", target.id);
            localStorage.setItem("kunal_os_current_user_name", target.name);
          }
        }
        setTimeout(() => {
          router.push(redirectUrl);
          router.refresh();
        }, 400);
      }
    } catch (err: any) {
      setError(err.message || "Biometric authentication failed");
      setIsVerifying(false);
    }
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isVerifying || !selectedProfile) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePressDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleBackToProfiles();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBackspace, handlePressDigit, isVerifying, selectedProfile]);

  const isMradulSelected = selectedProfile?.gender === "FEMALE" || selectedProfile?.name.toLowerCase().includes("mradul");

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-brand-red selection:text-white relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div
        className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40 transition-all duration-700"
        style={{
          background: isMradulSelected
            ? "radial-gradient(circle at center, rgba(244, 63, 94, 0.15) 0%, transparent 70%)"
            : "radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {!selectedProfile ? (
          /* ============================================================
             1. PRIME VIDEO STYLE: "Who is using KunalOS?" Screen
             ============================================================ */
          <div className="bg-black/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-8 sm:p-10 shadow-glass-panel flex flex-col items-center text-center animate-in fade-in duration-300">
            {/* Minimal Brand Badge */}
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-[0.3em] text-zinc-400 uppercase">
                EVERYTHING OS
              </span>
            </div>

            {/* Prime Video Header */}
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-sans mb-2">
              Who is using KunalOS?
            </h1>
            <p className="text-xs text-zinc-400 font-mono mb-10">
              Select your profile to access your private workspace
            </p>

            {/* Two Circular Avatars (Mradul & Kunal) */}
            <div className="flex items-center justify-center gap-8 sm:gap-14 my-4 w-full">
              {loadingProfiles ? (
                <div className="flex items-center justify-center gap-8 py-8">
                  <div className="w-28 h-28 rounded-full border-2 border-white/10 animate-pulse bg-white/5" />
                  <div className="w-28 h-28 rounded-full border-2 border-white/10 animate-pulse bg-white/5" />
                </div>
              ) : (
                profiles.map((profile) => (
                  <ProfileAvatar
                    key={profile.id}
                    name={profile.name}
                    gender={profile.gender}
                    size="xl"
                    showLabel
                    onClick={() => handleSelectProfile(profile)}
                    className="hover:scale-105 active:scale-95 transition-transform"
                  />
                ))
              )}
            </div>

            {/* Hint & Security Badge */}
            <div className="mt-10 pt-4 border-t border-white/10 w-full flex items-center justify-center gap-2 text-[11px] font-mono text-zinc-500">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>PIN-protected private profiles</span>
            </div>
          </div>
        ) : (
          /* ============================================================
             2. PIN PAD SCREEN: Enter PIN for Selected Profile
             ============================================================ */
          <div className="bg-black/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-glass-panel flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Top Bar: Switch Profile Back Action */}
            <div className="w-full flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handleBackToProfiles}
                className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Switch Profile</span>
              </button>

              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                {selectedProfile.role} PROFILE
              </span>
            </div>

            {/* Selected Profile Avatar */}
            <div className="relative mb-3">
              <ProfileAvatar
                name={selectedProfile.name}
                gender={selectedProfile.gender}
                size="md"
                isSelected
              />
            </div>

            {/* Greeting */}
            <h2 className="text-xl font-bold text-white tracking-wide font-sans">
              Welcome back, {selectedProfile.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              {success
                ? "Access Granted. Initializing Workspace..."
                : `Enter 4-Digit PIN for ${selectedProfile.name}`}
            </p>

            {/* 4 PIN Dots Indicator */}
            <div
              className={`flex items-center justify-center gap-4 my-6 py-2 transition-transform duration-200 ${
                shake ? "animate-shake" : ""
              }`}
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      success
                        ? "bg-white border-white scale-125 shadow-[0_0_12px_#ffffff]"
                        : isFilled
                        ? isMradulSelected
                          ? "bg-rose-500 border border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] scale-110"
                          : "bg-brand-red border border-brand-red shadow-glow-red scale-110"
                        : "bg-white/5 border border-white/20"
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-brand-red text-xs font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Keypad Grid (3 columns) */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePressDigit(digit)}
                  disabled={isVerifying}
                  className={`h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xl font-bold font-mono text-white flex items-center justify-center transition-all duration-150 transform active:scale-95 disabled:opacity-50 ${
                    isMradulSelected
                      ? "active:bg-rose-500/20 active:border-rose-500/50"
                      : "active:bg-brand-red/20 active:border-brand-red/50"
                  }`}
                >
                  {digit}
                </button>
              ))}

              {/* Bottom Row: Biometrics, 0, Backspace */}
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isVerifying}
                title="Unlock with Fingerprint / Biometrics"
                className={`h-14 rounded-2xl border flex items-center justify-center transition-all duration-150 transform active:scale-95 disabled:opacity-50 ${
                  (selectedProfile ? selectedProfile.hasBiometrics : hasBiometrics)
                    ? isMradulSelected
                      ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400"
                      : "bg-white/[0.06] hover:bg-brand-red/20 hover:border-brand-red/40 border-white/15 text-brand-red shadow-glow-red-subtle"
                    : "bg-white/[0.02] border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Fingerprint className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={() => handlePressDigit("0")}
                disabled={isVerifying}
                className={`h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xl font-bold font-mono text-white flex items-center justify-center transition-all duration-150 transform active:scale-95 disabled:opacity-50 ${
                  isMradulSelected
                    ? "active:bg-rose-500/20 active:border-rose-500/50"
                    : "active:bg-brand-red/20 active:border-brand-red/50"
                }`}
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                disabled={isVerifying || pin.length === 0}
                title="Delete Digit"
                className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.15] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all duration-150 transform active:scale-95 disabled:opacity-30"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Biometrics Button if configured */}
            {(selectedProfile ? selectedProfile.hasBiometrics : hasBiometrics) && (
              <button
                type="button"
                onClick={handleBiometricAuth}
                disabled={isVerifying}
                className={`mt-6 w-full py-2.5 px-4 rounded-xl border text-xs font-mono text-white flex items-center justify-center gap-2 transition-colors group ${
                  isMradulSelected
                    ? "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30"
                    : "bg-white/[0.04] hover:bg-brand-red/15 border-brand-red/30 shadow-glow-red-subtle"
                }`}
              >
                <Fingerprint
                  className={`w-4 h-4 group-hover:scale-110 transition-transform ${
                    isMradulSelected ? "text-rose-400" : "text-brand-red"
                  }`}
                />
                <span>Tap for Biometric Unlock</span>
              </button>
            )}

            {/* Subtle Security Guard Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck
                  className={`w-3.5 h-3.5 ${
                    isMradulSelected ? "text-rose-400" : "text-brand-red"
                  }`}
                />
                <span>{selectedProfile.name} Workspace</span>
              </span>
              <span className="text-zinc-500">PIN Protected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-red border-t-transparent animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
