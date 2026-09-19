"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProfileAvatar } from "@/components/ui/ProfileAvatar";
import { Button } from "@/components/ui/Button";
import { Lock, ArrowRight, AlertCircle, CheckCircle2, Shield } from "lucide-react";
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
    if (profile.id === currentUserId) return;
    haptics.impactMedium();
    setTargetProfile(profile);
    setPin("");
    setError("");
  };

  const handleSwitchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfile || pin.length !== 4) {
      setError("Please enter a 4-digit PIN");
      return;
    }

    setIsSwitching(true);
    setError("");

    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: targetProfile.id,
          pin,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        haptics.success();
        setSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        haptics.warning();
        setError(data.error || "Incorrect PIN");
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPin("");
          setIsSwitching(false);
        }, 600);
      }
    } catch {
      setError("Connection error");
      setIsSwitching(false);
    }
  };

  const handleLockOS = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Switch Profile">
      <div className="space-y-6">
        {!targetProfile ? (
          /* Step 1: Prime Video Style Profile Circles */
          <div className="flex flex-col items-center text-center">
            <p className="text-xs text-zinc-400 font-mono mb-6">
              Select a profile to switch workspaces (PIN required)
            </p>

            <div className="flex items-center justify-center gap-8 py-2 w-full">
              {profiles.map((profile) => {
                const isCurrent = profile.id === currentUserId || profile.name === currentUserName;
                return (
                  <div
                    key={profile.id}
                    className={`flex flex-col items-center transition-all ${
                      isCurrent ? "opacity-90" : "cursor-pointer hover:scale-105"
                    }`}
                    onClick={() => !isCurrent && handleSelectTarget(profile)}
                  >
                    <ProfileAvatar
                      name={profile.name}
                      gender={profile.gender}
                      size="lg"
                      isSelected={isCurrent}
                      showLabel
                    />
                    {isCurrent ? (
                      <span className="text-[10px] font-mono text-zinc-500 mt-1">Current Active</span>
                    ) : (
                      <span className="text-[10px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                        <span>Switch</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Lock OS Option */}
            <div className="pt-6 mt-6 border-t border-white/10 w-full flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">Done for now?</span>
              <Button
                variant="glass"
                size="sm"
                onClick={handleLockOS}
                className="text-xs gap-1.5 text-zinc-300 hover:text-brand-red"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Portal</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Step 2: PIN Verification for Target Profile (Option A) */
          <form onSubmit={handleSwitchSubmit} className="flex flex-col items-center text-center">
            <div className="mb-3">
              <ProfileAvatar
                name={targetProfile.name}
                gender={targetProfile.gender}
                size="md"
                isSelected
              />
            </div>

            <h3 className="text-base font-bold text-white font-sans">
              Switch to {targetProfile.name}
            </h3>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 mb-5">
              Enter {targetProfile.name}&apos;s 4-digit PIN to switch
            </p>

            {/* PIN Input with Shake */}
            <div className={`mb-4 w-full max-w-[200px] ${shake ? "animate-shake" : ""}`}>
              <input
                type="password"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (val.length <= 4) {
                    setPin(val);
                    setError("");
                  }
                }}
                placeholder="••••"
                className="w-full text-center tracking-[1em] text-2xl font-mono py-2.5 px-4 rounded-xl bg-white/[0.05] border border-white/15 text-white focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all"
              />
            </div>

            {error && (
              <div className="mb-4 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-brand-red text-xs font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Switching workspace...</span>
              </div>
            )}

            <div className="flex items-center gap-2 w-full pt-4 border-t border-white/10 justify-end">
              <Button
                variant="glass"
                size="sm"
                type="button"
                onClick={() => {
                  setTargetProfile(null);
                  setPin("");
                  setError("");
                }}
              >
                Back
              </Button>
              <Button
                variant="red"
                size="sm"
                type="submit"
                disabled={pin.length !== 4 || isSwitching}
              >
                {isSwitching ? "Verifying..." : "Confirm & Switch"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
