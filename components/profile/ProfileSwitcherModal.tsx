"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { Lock, ArrowLeft, AlertCircle, CheckCircle2, ShieldCheck, Delete } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface ProfileItem {
  id: string;
  name: string;
  gender: "MALE" | "FEMALE";
  role: "PRIMARY" | "PARTNER";
  email: string;
  accentColor: string;
}

interface ProfileSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  currentUserName?: string;
}

export function ProfileSwitcherModal({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
}: ProfileSwitcherModalProps) {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [targetProfile, setTargetProfile] = useState<ProfileItem | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSwitching, setIsSwitching] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTargetProfile(null);
      setPin("");
      setError("");
      setSuccess(false);
      return;
    }

    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles && Array.isArray(data.profiles)) {
          setProfiles(data.profiles);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const handleSelectTarget = (profile: ProfileItem) => {
    if (profile.id === currentUserId || profile.name === currentUserName) return;
    haptics.impactMedium();
    setTargetProfile(profile);
    setPin("");
    setError("");
  };

  const handleVerifySwitch = async (pinToVerify: string) => {
    if (!targetProfile || pinToVerify.length !== 4) return;

    setIsSwitching(true);
    setError("");

    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetProfile.id,
          pin: pinToVerify,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        haptics.success();
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
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
          setIsSwitching(false);
        }, 600);
      }
    } catch {
      setError("Connection error. Please try again.");
      setIsSwitching(false);
    }
  };

  const handlePressDigit = (digit: string) => {
    if (pin.length < 4 && !isSwitching) {
      haptics.impactLight();
      const nextPin = pin + digit;
      setPin(nextPin);
      setError("");
      if (nextPin.length === 4) {
        handleVerifySwitch(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    if (!isSwitching && pin.length > 0) {
      haptics.impactLight();
      setPin((prev) => prev.slice(0, -1));
      setError("");
    }
  };

  const handleLockOS = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const isTargetFemale =
    targetProfile?.gender === "FEMALE" ||
    targetProfile?.name.toLowerCase().includes("mradul");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Workspace">
      <div className="space-y-6 pb-6 sm:pb-2">
        {!targetProfile ? (
          /* ============================================================
             1. PRIME VIDEO DUAL PROFILE SELECTION CARDS
             ============================================================ */
          <div className="flex flex-col items-center text-center">
            <p className="text-xs text-zinc-400 font-mono mb-6">
              Who is using KunalOS? Select a profile to switch:
            </p>

            {/* Two Circular Profile Cards */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full max-w-sm py-2">
              {profiles.map((profile) => {
                const isCurrent =
                  profile.id === currentUserId || profile.name === currentUserName;
                const isFemale =
                  profile.gender === "FEMALE" ||
                  profile.name.toLowerCase().includes("mradul");

                return (
                  <div
                    key={profile.id}
                    onClick={() => !isCurrent && handleSelectTarget(profile)}
                    className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-between group ${
                      isCurrent
                        ? isFemale
                          ? "bg-rose-950/20 border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                          : "bg-red-950/20 border-brand-red/40 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                        : "bg-white/[0.03] border-white/10 hover:border-white/25 hover:bg-white/[0.06] cursor-pointer hover:scale-105 active:scale-95"
                    }`}
                  >
                    <ProfileAvatar
                      name={profile.name}
                      gender={profile.gender}
                      size="lg"
                      isSelected={isCurrent}
                      showLabel
                    />

                    <div className="mt-3">
                      {isCurrent ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-mono text-zinc-300 font-bold tracking-wider uppercase">
                          Active Now
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold tracking-wider uppercase group-hover:bg-emerald-500/25">
                          Tap to Switch
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Lock OS Action */}
            <div className="pt-6 mt-6 border-t border-white/10 w-full flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-500">Leaving device?</span>
              <Button
                variant="glass"
                size="sm"
                onClick={handleLockOS}
                className="text-xs gap-1.5 text-zinc-400 hover:text-brand-red"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Portal</span>
              </Button>
            </div>
          </div>
        ) : (
          /* ============================================================
             2. INTEGRATED PIN VERIFICATION KEYPAD (OPTION A)
             ============================================================ */
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Header: Back to circles */}
            <div className="w-full flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  setTargetProfile(null);
                  setPin("");
                  setError("");
                }}
                className="px-2 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-zinc-400 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                {targetProfile.role} WORKSPACE
              </span>
            </div>

            {/* Selected Profile Avatar */}
            <div className="mb-2">
              <ProfileAvatar
                name={targetProfile.name}
                gender={targetProfile.gender}
                size="md"
                isSelected
              />
            </div>

            <h3 className="text-lg font-bold text-white font-sans">
              Switch to {targetProfile.name}
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 mb-4">
              Enter {targetProfile.name}&apos;s 4-digit PIN:
            </p>

            {/* 4 PIN Dots Indicator */}
            <div
              className={`flex items-center justify-center gap-3.5 my-3 py-1 transition-transform duration-200 ${
                shake ? "animate-shake" : ""
              }`}
            >
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pin.length > index;
                return (
                  <div
                    key={index}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                      success
                        ? "bg-white border-white scale-125 shadow-[0_0_12px_#ffffff]"
                        : isFilled
                        ? isTargetFemale
                          ? "bg-rose-500 border border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] scale-110"
                          : "bg-brand-red border border-brand-red shadow-glow-red scale-110"
                        : "bg-white/5 border border-white/20"
                    }`}
                  />
                );
              })}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-3 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-brand-red text-xs font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Keypad Grid (3 columns) */}
            <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px] my-2 pb-6 sm:pb-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePressDigit(digit)}
                  disabled={isSwitching}
                  className="h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-lg font-bold font-mono text-white flex items-center justify-center transition-all disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}

              {/* Bottom Row */}
              <div className="h-12 flex items-center justify-center text-zinc-600">
                <ShieldCheck className="w-4 h-4" />
              </div>

              <button
                type="button"
                onClick={() => handlePressDigit("0")}
                disabled={isSwitching}
                className="h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-lg font-bold font-mono text-white flex items-center justify-center transition-all disabled:opacity-50"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleBackspace}
                disabled={isSwitching || pin.length === 0}
                className="h-12 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all disabled:opacity-30"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
