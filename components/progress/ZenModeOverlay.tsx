"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
  Sparkles,
  Maximize2,
  Minimize2,
  Flame,
  Plus,
  Target,
  Waves,
  CloudRain,
  Radio,
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import clsx from "clsx";

export type AmbientSoundType = "OFF" | "BROWN" | "RAIN" | "WHITE";

interface ZenModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  focusMode: "STOPWATCH" | "TIMER";
  status: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";
  displayTime: string;
  totalSeconds: number;
  remainingSeconds: number;
  activeSeconds: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onFinishSave: () => void;
  onAddMinutes?: (mins: number) => void;
  projectOrTopic?: string;
}

export function ZenModeOverlay({
  isOpen,
  onClose,
  focusMode,
  status,
  displayTime,
  totalSeconds,
  remainingSeconds,
  activeSeconds,
  onStart,
  onPause,
  onResume,
  onReset,
  onFinishSave,
  onAddMinutes,
  projectOrTopic,
}: ZenModeOverlayProps) {
  // Session Intent state
  const [sessionIntent, setSessionIntent] = useState("");
  const [isEditingIntent, setIsEditingIntent] = useState(false);
  const intentInputRef = useRef<HTMLInputElement>(null);

  // Sound generator state
  const [activeSound, setActiveSound] = useState<AmbientSoundType>("OFF");
  const [volume, setVolume] = useState<number>(0.5);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isChimePlayedRef = useRef<boolean>(false);

  // Load persisted session intent
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("kunal_os_zen_session_intent");
      if (stored) setSessionIntent(stored);
    }
  }, []);

  const handleSaveIntent = (val: string) => {
    setSessionIntent(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("kunal_os_zen_session_intent", val);
    }
    setIsEditingIntent(false);
  };

  // Keyboard shortcut listener (Space = play/pause, Esc = close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "Escape") {
        onClose();
      } else if (e.code === "Space") {
        e.preventDefault();
        if (status === "RUNNING") {
          onPause();
        } else if (status === "PAUSED") {
          onResume();
        } else if (status === "IDLE") {
          onStart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, status, onPause, onResume, onStart, onClose]);

  // Audio completion chime when timer hits 0
  useEffect(() => {
    if (status === "COMPLETED" && !isChimePlayedRef.current) {
      isChimePlayedRef.current = true;
      playCompletionChime();
      haptics.success();
    } else if (status !== "COMPLETED") {
      isChimePlayedRef.current = false;
    }
  }, [status]);

  // Web Audio Synthesizer
  const initAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playCompletionChime = () => {
    try {
      const ctx = initAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // 528 Hz harmonic chime
      const osc1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(528, now);
      g1.gain.setValueAtTime(0.25, now);
      g1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc1.connect(g1);
      g1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // 660 Hz secondary chime
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(660, now + 0.18);
      g2.gain.setValueAtTime(0.2, now + 0.18);
      g2.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 1.5);
    } catch (e) {
      console.warn("Chime failed:", e);
    }
  };

  // Generate synthetic looped noise buffers
  const generateNoiseBuffer = (ctx: AudioContext, type: AmbientSoundType): AudioBuffer => {
    const bufferSize = ctx.sampleRate * 5; // 5-second seamless loop buffer
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === "WHITE") {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
    } else if (type === "BROWN") {
      // 1/f^2 Brownian filter
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 1.5;
      }
    } else if (type === "RAIN") {
      // Rain texture: Brownian low rumble + randomized droplet pops
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        const droplet = Math.random() > 0.998 ? (Math.random() - 0.5) * 0.4 : 0;
        data[i] = lastOut * 0.8 + droplet;
      }
    }

    return buffer;
  };

  const stopCurrentSound = () => {
    if (soundSourceRef.current) {
      try {
        soundSourceRef.current.stop();
        soundSourceRef.current.disconnect();
      } catch {}
      soundSourceRef.current = null;
    }
  };

  const playAmbientSound = (type: AmbientSoundType, vol: number) => {
    stopCurrentSound();
    if (type === "OFF") return;

    try {
      const ctx = initAudioContext();
      if (!ctx) return;

      const buffer = generateNoiseBuffer(ctx, type);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.35, ctx.currentTime);
      gainNodeRef.current = gain;

      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      soundSourceRef.current = source;
    } catch (e) {
      console.warn("Failed to play ambient sound:", e);
    }
  };

  const handleSelectSound = (type: AmbientSoundType) => {
    haptics.selection();
    setActiveSound(type);
    playAmbientSound(type, volume);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(newVol * 0.35, audioCtxRef.current.currentTime);
    }
  };

  // Clean up audio on unmount or close
  useEffect(() => {
    return () => {
      stopCurrentSound();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const toggleFullscreen = () => {
    haptics.impactLight();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  const isTimer = focusMode === "TIMER";
  const progressPercent = isTimer
    ? Math.min(100, Math.max(0, ((totalSeconds - remainingSeconds) / Math.max(1, totalSeconds)) * 100))
    : 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col justify-between p-4 sm:p-8 select-none overflow-hidden animate-in fade-in duration-200">
      {/* Subtle Ambient Breathing Radial Glow */}
      <div
        className={clsx(
          "absolute inset-0 pointer-events-none transition-all duration-1000",
          status === "RUNNING"
            ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent animate-pulse"
            : status === "COMPLETED"
            ? "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-600/15 via-transparent to-transparent animate-pulse"
            : "bg-transparent"
        )}
      />

      {/* Top Header Bar */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
            <Radio className="w-4 h-4 text-brand-red animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-white">
              <span>Zen Flow</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono">
              {projectOrTopic ? projectOrTopic : "Deep Work Immersion"}
            </p>
          </div>
        </div>

        {/* Top Right Controls (Sound, Fullscreen, Exit) */}
        <div className="flex items-center gap-2">
          {/* Ambient Sound Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                haptics.selection();
                setShowSoundMenu(!showSoundMenu);
              }}
              className={clsx(
                "h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono transition-all",
                activeSound !== "OFF"
                  ? "bg-brand-red/20 border-brand-red/50 text-white shadow-glow-red-subtle"
                  : "bg-white/[0.04] border-white/10 text-zinc-400 hover:text-white"
              )}
              title="Ambient Sound Synthesizer"
            >
              {activeSound === "OFF" ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-brand-red animate-pulse" />
              )}
              <span className="text-[10px] hidden xs:inline">
                {activeSound === "OFF" ? "Sound: Off" : activeSound}
              </span>
            </button>

            {/* Sound Selector Popover */}
            {showSoundMenu && (
              <div className="absolute right-0 mt-2 w-48 p-2 rounded-2xl bg-zinc-950/95 backdrop-blur-xl border border-white/15 shadow-2xl z-30 space-y-1.5 animate-in fade-in duration-100">
                <span className="text-[9px] font-mono text-zinc-400 uppercase block px-2 py-0.5">
                  Focus Soundscapes
                </span>
                {[
                  { id: "OFF", label: "Mute / Silent", icon: VolumeX },
                  { id: "BROWN", label: "Brown Noise (Deep)", icon: Waves },
                  { id: "RAIN", label: "Gentle Rain", icon: CloudRain },
                  { id: "WHITE", label: "White Noise (Air)", icon: Volume2 },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      handleSelectSound(item.id as AmbientSoundType);
                      setShowSoundMenu(false);
                    }}
                    className={clsx(
                      "w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-all",
                      activeSound === item.id
                        ? "bg-brand-red text-white font-bold"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.05]"
                    )}
                  >
                    <span>{item.label}</span>
                    {activeSound === item.id && <span className="text-white text-[10px]">✓</span>}
                  </button>
                ))}

                {activeSound !== "OFF" && (
                  <div className="pt-2 px-2 border-t border-white/10">
                    <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 mb-1">
                      <span>Volume</span>
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full accent-brand-red h-1 bg-white/20 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Exit Zen Mode */}
          <button
            type="button"
            onClick={() => {
              haptics.selection();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
            title="Exit Zen Mode (Keeps Session Running)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Focus Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto px-4 max-w-xl mx-auto w-full">
        {/* Session Intent Banner */}
        <div className="mb-6 w-full max-w-md">
          {isEditingIntent ? (
            <div className="flex items-center gap-2 bg-white/[0.04] border border-brand-red/50 rounded-2xl p-1.5 px-3">
              <Target className="w-4 h-4 text-brand-red shrink-0" />
              <input
                ref={intentInputRef}
                type="text"
                value={sessionIntent}
                onChange={(e) => setSessionIntent(e.target.value)}
                onBlur={() => handleSaveIntent(sessionIntent)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveIntent(sessionIntent);
                  if (e.key === "Escape") setIsEditingIntent(false);
                }}
                placeholder="What is your victory condition for this session?"
                className="w-full bg-transparent text-xs font-mono text-white placeholder-zinc-500 focus:outline-none"
                autoFocus
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                setIsEditingIntent(true);
              }}
              className="group mx-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-brand-red/40 transition-all text-xs font-mono text-zinc-300"
              title="Click to set or edit session intent"
            >
              <Target className="w-3.5 h-3.5 text-brand-red group-hover:scale-110 transition-transform" />
              <span className="truncate max-w-xs">
                {sessionIntent ? sessionIntent : "Set session victory condition..."}
              </span>
            </button>
          )}
        </div>

        {/* Large Digital Display with Pulsing Aura */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Subtle breathing border aura */}
          <div
            className={clsx(
              "absolute -inset-4 sm:-inset-8 rounded-full blur-2xl opacity-25 transition-all duration-700 pointer-events-none",
              status === "RUNNING"
                ? "bg-brand-red"
                : status === "COMPLETED"
                ? "bg-emerald-500"
                : "bg-transparent"
            )}
          />

          <div
            className={clsx(
              "font-mono font-black tracking-tight text-white select-none transition-colors duration-300",
              "text-6xl sm:text-8xl md:text-9xl",
              status === "COMPLETED" && "text-emerald-400 animate-pulse"
            )}
          >
            {displayTime}
          </div>
        </div>

        {/* Laser Progress Bar for Timer Mode */}
        {isTimer && (
          <div className="w-full max-w-xs sm:max-w-sm h-1.5 bg-white/10 rounded-full overflow-hidden mt-2 mb-3">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-300",
                status === "COMPLETED" ? "bg-emerald-400 shadow-glow-emerald" : "bg-brand-red shadow-glow-red"
              )}
              style={{ width: `${Math.max(3, progressPercent)}%` }}
            />
          </div>
        )}

        {/* Status Text & Telemetry */}
        <div className="text-xs font-mono text-zinc-400 flex items-center justify-center gap-2.5 flex-wrap">
          {status === "COMPLETED" ? (
            <span className="text-emerald-300 font-bold flex items-center gap-1.5 animate-pulse">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              Focus Goal Achieved! Finish &amp; Save session below.
            </span>
          ) : status === "RUNNING" ? (
            <span className="flex items-center gap-1.5 text-red-300">
              <span className="w-2 h-2 rounded-full bg-brand-red animate-ping" />
              <span>Flow State Active • Eliminate all distractions</span>
            </span>
          ) : status === "PAUSED" ? (
            <span className="text-amber-400">Session Paused • Press spacebar to resume</span>
          ) : (
            <span className="text-zinc-500">Ready to enter flow state</span>
          )}
        </div>
      </div>

      {/* Bottom Controls Deck */}
      <div className="relative z-10 w-full max-w-md mx-auto pt-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-3">
          {/* Main Action Button */}
          {status === "IDLE" ? (
            <button
              type="button"
              onClick={() => {
                haptics.impactMedium();
                onStart();
              }}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-brand-red hover:bg-brand-redDark text-white font-mono font-bold text-sm shadow-glow-red flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Session</span>
            </button>
          ) : status === "COMPLETED" ? (
            <button
              type="button"
              onClick={() => {
                haptics.success();
                onFinishSave();
              }}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-sm shadow-glow-emerald flex items-center justify-center gap-2 active:scale-95 transition-all animate-pulse"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Finish &amp; Save Victory</span>
            </button>
          ) : (
            <>
              {status === "RUNNING" ? (
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    onPause();
                  }}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white font-mono font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Pause className="w-4 h-4 fill-white" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactMedium();
                    onResume();
                  }}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-brand-red hover:bg-brand-redDark text-white font-mono font-bold text-sm shadow-glow-red flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume</span>
                </button>
              )}

              {/* Add 5 Mins Bump Button */}
              {isTimer && onAddMinutes && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    onAddMinutes(5);
                  }}
                  className="h-12 px-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                  title="Add +5 Minutes to current session"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>5m</span>
                </button>
              )}

              {/* Finish & Save Button */}
              <button
                type="button"
                onClick={() => {
                  haptics.impactMedium();
                  onFinishSave();
                }}
                className="py-3.5 px-5 rounded-2xl bg-brand-red/20 hover:bg-brand-red/30 border border-brand-red/50 text-red-200 font-mono font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-glow-red-subtle"
                title="End & Save current session"
              >
                <Square className="w-3.5 h-3.5 fill-red-300" />
                <span>Save</span>
              </button>

              {/* Reset Button */}
              <button
                type="button"
                onClick={() => {
                  haptics.warning();
                  onReset();
                }}
                className="w-12 h-12 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
                title="Reset session timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
