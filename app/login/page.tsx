"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Fingerprint,
  Delete,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { authenticateWithBiometrics, isBiometricsAvailable } from "@/lib/webauthn";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";


  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [biometricsSupported, setBiometricsSupported] = useState(false);

  // Check biometric availability and system status
  useEffect(() => {
    async function checkStatus() {
      try {
        const supported = await isBiometricsAvailable();
        setBiometricsSupported(supported);

        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          setHasBiometrics(!!data.hasBiometrics);

          // If already authenticated, redirect to target
          if (data.authenticated) {
            router.push(redirectUrl);
          }
        }
      } catch {
        // Silently handle
      }
    }
    checkStatus();
  }, [redirectUrl, router]);

  // Handle PIN verification
  const handleVerifyPin = useCallback(
    async (pinToVerify: string) => {
      if (pinToVerify.length !== 4 || isVerifying) return;

      setIsVerifying(true);
      setError("");

      try {
        const res = await fetch("/api/auth/pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinToVerify }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setSuccess(true);
          // Small delay for smooth visual feedback before transition
          setTimeout(() => {
            router.push(redirectUrl);
            router.refresh();
          }, 400);
        } else {
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
    [isVerifying, redirectUrl, router]
  );

  // Handle number input
  const handlePressDigit = useCallback(
    (digit: string) => {
      if (pin.length < 4 && !isVerifying) {
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
      setPin((prev) => prev.slice(0, -1));
      setError("");
    }
  }, [isVerifying, pin.length]);

  // Handle Biometric Unlock
  const handleBiometricAuth = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    setError("");

    try {
      const ok = await authenticateWithBiometrics();
      if (ok) {
        setSuccess(true);
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
      if (isVerifying) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handlePressDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPin("");
        setError("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleBackspace, handlePressDigit, isVerifying]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 selection:bg-brand-red selection:text-white">
      {/* Background Ambience Glow */}
      <div className="absolute inset-0 bg-radial-gradient from-brand-red/10 via-transparent to-transparent pointer-events-none opacity-40" />

      {/* Main Lock Container */}
      <div className="w-full max-w-sm relative z-10">
        <div className="bg-black/90 backdrop-blur-3xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-glass-panel flex flex-col items-center text-center">
          {/* Header Icon */}
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-glass-card">
              {success ? (
                <CheckCircle2 className="w-8 h-8 text-white animate-bounce" />
              ) : (
                <Lock className="w-8 h-8 text-brand-red animate-pulse" />
              )}
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-brand-red rounded-full border-2 border-black shadow-glow-red" />
          </div>

          {/* Title */}
          <h1 className="text-lg font-bold text-white tracking-widest font-mono uppercase">
            KunalOS
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            {success
              ? "Access Granted. Initializing Portal..."
              : "Portal Locked • Enter 4-Digit Master PIN"}
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
                      ? "bg-brand-red border border-brand-red shadow-glow-red scale-110"
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
                className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-brand-red/20 active:border-brand-red/50 border border-white/10 text-xl font-bold font-mono text-white flex items-center justify-center transition-all duration-150 transform active:scale-95 disabled:opacity-50"
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
                hasBiometrics || biometricsSupported
                  ? "bg-white/[0.06] hover:bg-brand-red/20 hover:border-brand-red/40 border-white/15 text-brand-red shadow-glow-red-subtle"
                  : "bg-white/[0.02] border-white/5 text-zinc-600 cursor-not-allowed"
              }`}
            >
              <Fingerprint className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => handlePressDigit("0")}
              disabled={isVerifying}
              className="h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-brand-red/20 active:border-brand-red/50 border border-white/10 text-xl font-bold font-mono text-white flex items-center justify-center transition-all duration-150 transform active:scale-95 disabled:opacity-50"
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
          {hasBiometrics && (
            <button
              type="button"
              onClick={handleBiometricAuth}
              disabled={isVerifying}
              className="mt-6 w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-brand-red/15 border border-brand-red/30 text-xs font-mono text-white flex items-center justify-center gap-2 transition-colors shadow-glow-red-subtle group"
            >
              <Fingerprint className="w-4 h-4 text-brand-red group-hover:scale-110 transition-transform" />
              <span>Tap for Biometric Fingerprint Unlock</span>
            </button>
          )}

          {/* Subtle Master PIN Helper */}
          <div className="mt-6 pt-4 border-t border-white/10 w-full flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              AES-256 Vault Guard
            </span>
            <span className="text-zinc-500">Default PIN: <strong className="text-zinc-300 font-mono">1234</strong></span>
          </div>
        </div>
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

