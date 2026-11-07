"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { haptics } from "@/lib/haptics";

export interface FocusPersistedState {
  mode: "STOPWATCH" | "TIMER";
  status: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";
  startTimeMs: number | null;
  lastResumeTimeMs: number | null;
  accumulatedSeconds: number;
  startClock: string;
  timerTotalSeconds?: number;
  timerRemainingSeconds?: number;
  targetEndTimeMs?: number | null;
}

export const STOPWATCH_STORAGE_KEY = "everything_study_stopwatch";

export interface UseFocusTimerOptions {
  onBroadcast?: (
    status: "RUNNING" | "PAUSED" | "COMPLETED" | "IDLE",
    remSecs?: number,
    totSecs?: number
  ) => void;
}

export function useFocusTimer({ onBroadcast }: UseFocusTimerOptions = {}) {
  const [focusMode, setFocusMode] = useState<"STOPWATCH" | "TIMER">("STOPWATCH");
  const [swStatus, setSwStatus] = useState<"IDLE" | "RUNNING" | "PAUSED" | "COMPLETED">("IDLE");
  const [swActiveSeconds, setSwActiveSeconds] = useState<number>(0);
  const [swStartTimeMs, setSwStartTimeMs] = useState<number | null>(null);
  const [swLastResumeTimeMs, setSwLastResumeTimeMs] = useState<number | null>(null);
  const [swAccumulatedSecs, setSwAccumulatedSecs] = useState<number>(0);
  const [swStartClock, setSwStartClock] = useState<string>("");

  // Timer Specific State
  const [timerPreset, setTimerPreset] = useState<number>(25);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState<number>(25 * 60);
  const [timerRemainingSeconds, setTimerRemainingSeconds] = useState<number>(25 * 60);
  const [timerTargetEndTimeMs, setTimerTargetEndTimeMs] = useState<number | null>(null);
  const [isCustomTimer, setIsCustomTimer] = useState<boolean>(false);
  const [customTimerHours, setCustomTimerHours] = useState<string>("0");
  const [customTimerMins, setCustomTimerMins] = useState<string>("25");

  const saveUnifiedState = useCallback((next: Partial<FocusPersistedState>) => {
    if (typeof window === "undefined") return;
    const current: FocusPersistedState = {
      mode: next.mode !== undefined ? next.mode : focusMode,
      status: next.status !== undefined ? next.status : swStatus,
      startTimeMs: next.startTimeMs !== undefined ? next.startTimeMs : swStartTimeMs,
      lastResumeTimeMs: next.lastResumeTimeMs !== undefined ? next.lastResumeTimeMs : swLastResumeTimeMs,
      accumulatedSeconds: next.accumulatedSeconds !== undefined ? next.accumulatedSeconds : swAccumulatedSecs,
      startClock: next.startClock !== undefined ? next.startClock : swStartClock,
      timerTotalSeconds: next.timerTotalSeconds !== undefined ? next.timerTotalSeconds : timerTotalSeconds,
      timerRemainingSeconds: next.timerRemainingSeconds !== undefined ? next.timerRemainingSeconds : timerRemainingSeconds,
      targetEndTimeMs: next.targetEndTimeMs !== undefined ? next.targetEndTimeMs : timerTargetEndTimeMs,
    };
    localStorage.setItem(STOPWATCH_STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new CustomEvent("everything-stopwatch-update"));
  }, [focusMode, swStatus, swStartTimeMs, swLastResumeTimeMs, swAccumulatedSecs, swStartClock, timerTotalSeconds, timerRemainingSeconds, timerTargetEndTimeMs]);

  const saveStopwatchState = useCallback((
    status: "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED",
    startTimeMs: number | null,
    lastResumeTimeMs: number | null,
    accumulatedSeconds: number,
    startClock: string
  ) => {
    saveUnifiedState({
      mode: "STOPWATCH",
      status,
      startTimeMs,
      lastResumeTimeMs,
      accumulatedSeconds,
      startClock,
      targetEndTimeMs: null,
    });
  }, [saveUnifiedState]);

  const syncStopwatchTick = useCallback(() => {
    if (focusMode === "TIMER") {
      if (swStatus === "RUNNING" && timerTargetEndTimeMs) {
        const now = Date.now();
        const rem = Math.max(0, Math.ceil((timerTargetEndTimeMs - now) / 1000));
        setTimerRemainingSeconds(rem);
        const elapsed = Math.max(0, timerTotalSeconds - rem);
        setSwActiveSeconds(elapsed);
        if (rem <= 0) {
          setSwStatus("COMPLETED");
          setTimerRemainingSeconds(0);
          setSwActiveSeconds(timerTotalSeconds);
          haptics.success();
          saveUnifiedState({
            mode: "TIMER",
            status: "COMPLETED",
            startTimeMs: swStartTimeMs,
            lastResumeTimeMs: null,
            accumulatedSeconds: timerTotalSeconds,
            startClock: swStartClock,
            timerTotalSeconds,
            timerRemainingSeconds: 0,
            targetEndTimeMs: null,
          });
        }
      } else if (swStatus === "PAUSED") {
        setTimerRemainingSeconds((prev) => prev);
      } else if (swStatus === "IDLE") {
        setTimerRemainingSeconds(timerTotalSeconds);
        setSwActiveSeconds(0);
      }
    } else {
      if (swStatus === "RUNNING" && swLastResumeTimeMs) {
        const now = Date.now();
        const currentChunkSecs = Math.max(0, Math.floor((now - swLastResumeTimeMs) / 1000));
        setSwActiveSeconds(swAccumulatedSecs + currentChunkSecs);
      } else if (swStatus === "PAUSED") {
        setSwActiveSeconds(swAccumulatedSecs);
      } else if (swStatus === "IDLE") {
        setSwActiveSeconds(0);
      }
    }
  }, [focusMode, swStatus, timerTargetEndTimeMs, timerTotalSeconds, swLastResumeTimeMs, swAccumulatedSecs, swStartTimeMs, swStartClock, saveUnifiedState]);

  // Load focus state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STOPWATCH_STORAGE_KEY);
      if (raw) {
        const parsed: FocusPersistedState = JSON.parse(raw);
        const mode = parsed.mode || "STOPWATCH";
        setFocusMode(mode);
        setSwStatus(parsed.status || "IDLE");
        setSwStartTimeMs(parsed.startTimeMs);
        setSwLastResumeTimeMs(parsed.lastResumeTimeMs);
        setSwAccumulatedSecs(parsed.accumulatedSeconds || 0);
        setSwStartClock(parsed.startClock || "");

        const totalSecs = parsed.timerTotalSeconds || 25 * 60;
        setTimerTotalSeconds(totalSecs);
        setTimerPreset(Math.round(totalSecs / 60));

        if (mode === "TIMER") {
          setTimerTargetEndTimeMs(parsed.targetEndTimeMs || null);
          if (parsed.status === "RUNNING" && parsed.targetEndTimeMs) {
            const now = Date.now();
            const rem = Math.max(0, Math.ceil((parsed.targetEndTimeMs - now) / 1000));
            setTimerRemainingSeconds(rem);
            setSwActiveSeconds(Math.max(0, totalSecs - rem));
            if (rem <= 0) {
              setSwStatus("COMPLETED");
              setTimerRemainingSeconds(0);
              setSwActiveSeconds(totalSecs);
            }
          } else if (parsed.status === "PAUSED") {
            const rem = parsed.timerRemainingSeconds ?? totalSecs;
            setTimerRemainingSeconds(rem);
            setSwActiveSeconds(Math.max(0, totalSecs - rem));
          } else if (parsed.status === "COMPLETED") {
            setTimerRemainingSeconds(0);
            setSwActiveSeconds(totalSecs);
          } else {
            setTimerRemainingSeconds(totalSecs);
            setSwActiveSeconds(0);
          }
        } else {
          if (parsed.status === "RUNNING" && parsed.lastResumeTimeMs) {
            const now = Date.now();
            const currentChunk = Math.max(0, Math.floor((now - parsed.lastResumeTimeMs) / 1000));
            setSwActiveSeconds((parsed.accumulatedSeconds || 0) + currentChunk);
          } else {
            setSwActiveSeconds(parsed.accumulatedSeconds || 0);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load focus state:", e);
    }
  }, []);

  // Tick loop
  useEffect(() => {
    if (swStatus !== "RUNNING") return;

    syncStopwatchTick();
    const interval = setInterval(syncStopwatchTick, 500);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncStopwatchTick();
      }
    };
    const handleFocus = () => syncStopwatchTick();

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pageshow", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pageshow", handleFocus);
    };
  }, [swStatus, syncStopwatchTick]);

  const handleSwitchFocusMode = (newMode: "STOPWATCH" | "TIMER") => {
    if (newMode === focusMode) return;
    haptics.selection();
    setSwStatus("IDLE");
    setSwActiveSeconds(0);
    setSwAccumulatedSecs(0);
    setSwStartTimeMs(null);
    setSwLastResumeTimeMs(null);
    setSwStartClock("");
    setFocusMode(newMode);
    if (newMode === "TIMER") {
      setTimerRemainingSeconds(timerTotalSeconds);
      setTimerTargetEndTimeMs(null);
    }
    saveUnifiedState({
      mode: newMode,
      status: "IDLE",
      startTimeMs: null,
      lastResumeTimeMs: null,
      accumulatedSeconds: 0,
      startClock: "",
      timerTotalSeconds,
      timerRemainingSeconds: timerTotalSeconds,
      targetEndTimeMs: null,
    });
  };

  const handleSelectTimerPreset = (mins: number) => {
    if (swStatus !== "IDLE") return;
    haptics.selection();
    const secs = mins * 60;
    setTimerPreset(mins);
    setIsCustomTimer(false);
    setCustomTimerHours(String(Math.floor(mins / 60)));
    setCustomTimerMins(String(mins % 60));
    setTimerTotalSeconds(secs);
    setTimerRemainingSeconds(secs);
    saveUnifiedState({
      mode: "TIMER",
      status: "IDLE",
      timerTotalSeconds: secs,
      timerRemainingSeconds: secs,
      targetEndTimeMs: null,
    });
  };

  const handleUpdateCustomTimer = (hoursStr: string, minsStr: string) => {
    setCustomTimerHours(hoursStr);
    setCustomTimerMins(minsStr);
    const h = Math.max(0, parseInt(hoursStr, 10) || 0);
    const m = Math.max(0, parseInt(minsStr, 10) || 0);
    const totalMinutes = h * 60 + m;
    if (totalMinutes > 0 && totalMinutes <= 720) {
      const secs = totalMinutes * 60;
      setTimerPreset(totalMinutes);
      setTimerTotalSeconds(secs);
      setTimerRemainingSeconds(secs);
      saveUnifiedState({
        mode: "TIMER",
        status: "IDLE",
        timerTotalSeconds: secs,
        timerRemainingSeconds: secs,
        targetEndTimeMs: null,
      });
    }
  };

  const handleAdjustCustomTimer = (deltaMinutes: number) => {
    const currentH = Math.max(0, parseInt(customTimerHours, 10) || 0);
    const currentM = Math.max(0, parseInt(customTimerMins, 10) || 0);
    const currentTotal = currentH * 60 + currentM;
    const nextTotal = Math.max(5, Math.min(720, currentTotal + deltaMinutes));
    const nextH = Math.floor(nextTotal / 60);
    const nextM = nextTotal % 60;
    handleUpdateCustomTimer(String(nextH), String(nextM));
  };

  const handleStartTimer = () => {
    haptics.impactMedium();
    const now = Date.now();
    const nowClock = format(new Date(), "HH:mm");
    const totalSecs = timerTotalSeconds || 25 * 60;
    const targetEnd = now + totalSecs * 1000;
    setSwStatus("RUNNING");
    setSwStartTimeMs(now);
    setSwLastResumeTimeMs(now);
    setSwAccumulatedSecs(0);
    setSwActiveSeconds(0);
    setSwStartClock(nowClock);
    setTimerRemainingSeconds(totalSecs);
    setTimerTargetEndTimeMs(targetEnd);
    onBroadcast?.("RUNNING", totalSecs, totalSecs);
    saveUnifiedState({
      mode: "TIMER",
      status: "RUNNING",
      startTimeMs: now,
      lastResumeTimeMs: now,
      accumulatedSeconds: 0,
      startClock: nowClock,
      timerTotalSeconds: totalSecs,
      timerRemainingSeconds: totalSecs,
      targetEndTimeMs: targetEnd,
    });
  };

  const handlePauseTimer = () => {
    haptics.selection();
    if (swStatus !== "RUNNING") return;
    const now = Date.now();
    const rem = timerTargetEndTimeMs ? Math.max(0, Math.ceil((timerTargetEndTimeMs - now) / 1000)) : timerRemainingSeconds;
    const elapsed = Math.max(0, timerTotalSeconds - rem);
    setSwStatus("PAUSED");
    setTimerRemainingSeconds(rem);
    setSwActiveSeconds(elapsed);
    setSwAccumulatedSecs(elapsed);
    setTimerTargetEndTimeMs(null);
    setSwLastResumeTimeMs(null);
    onBroadcast?.("PAUSED", rem, timerTotalSeconds);
    saveUnifiedState({
      mode: "TIMER",
      status: "PAUSED",
      startTimeMs: swStartTimeMs,
      lastResumeTimeMs: null,
      accumulatedSeconds: elapsed,
      startClock: swStartClock,
      timerTotalSeconds,
      timerRemainingSeconds: rem,
      targetEndTimeMs: null,
    });
  };

  const handleResumeTimer = () => {
    haptics.selection();
    if (swStatus !== "PAUSED") return;
    const now = Date.now();
    const targetEnd = now + timerRemainingSeconds * 1000;
    setSwStatus("RUNNING");
    setSwLastResumeTimeMs(now);
    setTimerTargetEndTimeMs(targetEnd);
    onBroadcast?.("RUNNING", timerRemainingSeconds, timerTotalSeconds);
    saveUnifiedState({
      mode: "TIMER",
      status: "RUNNING",
      startTimeMs: swStartTimeMs,
      lastResumeTimeMs: now,
      accumulatedSeconds: swAccumulatedSecs,
      startClock: swStartClock,
      timerTotalSeconds,
      timerRemainingSeconds,
      targetEndTimeMs: targetEnd,
    });
  };

  const handleResetTimer = () => {
    haptics.warning();
    setSwStatus("IDLE");
    setTimerRemainingSeconds(timerTotalSeconds);
    setSwActiveSeconds(0);
    setSwAccumulatedSecs(0);
    setSwStartTimeMs(null);
    setSwLastResumeTimeMs(null);
    setTimerTargetEndTimeMs(null);
    setSwStartClock("");
    onBroadcast?.("IDLE", timerTotalSeconds, timerTotalSeconds);
    saveUnifiedState({
      mode: "TIMER",
      status: "IDLE",
      startTimeMs: null,
      lastResumeTimeMs: null,
      accumulatedSeconds: 0,
      startClock: "",
      timerTotalSeconds,
      timerRemainingSeconds: timerTotalSeconds,
      targetEndTimeMs: null,
    });
  };

  const handleAddTimerMinutes = (mins: number) => {
    haptics.impactLight();
    const addSecs = mins * 60;
    const newTotal = timerTotalSeconds + addSecs;
    const newRemaining = timerRemainingSeconds + addSecs;
    setTimerTotalSeconds(newTotal);
    setTimerRemainingSeconds(newRemaining);
    let newEndMs = timerTargetEndTimeMs;
    if (timerTargetEndTimeMs) {
      newEndMs = timerTargetEndTimeMs + addSecs * 1000;
      setTimerTargetEndTimeMs(newEndMs);
    }
    saveUnifiedState({
      timerTotalSeconds: newTotal,
      timerRemainingSeconds: newRemaining,
      targetEndTimeMs: newEndMs,
    });
  };

  const handleStartStopwatch = () => {
    haptics.impactMedium();
    const now = Date.now();
    const nowClock = format(new Date(), "HH:mm");
    setSwStatus("RUNNING");
    setSwStartTimeMs(now);
    setSwLastResumeTimeMs(now);
    setSwAccumulatedSecs(0);
    setSwActiveSeconds(0);
    setSwStartClock(nowClock);
    saveStopwatchState("RUNNING", now, nowClock ? now : null, 0, nowClock);
  };

  const handlePauseStopwatch = () => {
    haptics.selection();
    if (swStatus !== "RUNNING" || !swLastResumeTimeMs) return;
    const now = Date.now();
    const chunkSecs = Math.max(0, Math.floor((now - swLastResumeTimeMs) / 1000));
    const newTotal = swAccumulatedSecs + chunkSecs;
    setSwStatus("PAUSED");
    setSwAccumulatedSecs(newTotal);
    setSwActiveSeconds(newTotal);
    setSwLastResumeTimeMs(null);
    saveStopwatchState("PAUSED", swStartTimeMs, null, newTotal, swStartClock);
  };

  const handleResumeStopwatch = () => {
    haptics.selection();
    if (swStatus !== "PAUSED") return;
    const now = Date.now();
    setSwStatus("RUNNING");
    setSwLastResumeTimeMs(now);
    saveStopwatchState("RUNNING", swStartTimeMs, now, swAccumulatedSecs, swStartClock);
  };

  const handleResetStopwatch = () => {
    haptics.warning();
    setSwStatus("IDLE");
    setSwActiveSeconds(0);
    setSwAccumulatedSecs(0);
    setSwStartTimeMs(null);
    setSwLastResumeTimeMs(null);
    setSwStartClock("");
    saveStopwatchState("IDLE", null, null, 0, "");
  };

  const resetAfterSave = (mode: "STOPWATCH" | "TIMER") => {
    setSwStatus("IDLE");
    setSwActiveSeconds(0);
    setSwAccumulatedSecs(0);
    setSwStartTimeMs(null);
    setSwLastResumeTimeMs(null);
    setSwStartClock("");
    setTimerRemainingSeconds(timerTotalSeconds);
    setTimerTargetEndTimeMs(null);
    saveUnifiedState({
      mode,
      status: "IDLE",
      startTimeMs: null,
      lastResumeTimeMs: null,
      accumulatedSeconds: 0,
      startClock: "",
      timerTotalSeconds,
      timerRemainingSeconds: timerTotalSeconds,
      targetEndTimeMs: null,
    });
  };

  const swElapsedWallSecs =
    swStartTimeMs && swStatus !== "IDLE"
      ? Math.max(1, Math.floor((Date.now() - swStartTimeMs) / 1000))
      : 0;
  const swEfficiencyPercent =
    swElapsedWallSecs > 0 && swActiveSeconds > 0
      ? Math.min(100, Math.round((swActiveSeconds / swElapsedWallSecs) * 100))
      : 100;

  return {
    focusMode,
    setFocusMode,
    swStatus,
    setSwStatus,
    swActiveSeconds,
    swStartTimeMs,
    swLastResumeTimeMs,
    swAccumulatedSecs,
    setSwAccumulatedSecs,
    setSwActiveSeconds,
    swStartClock,
    timerPreset,
    setTimerPreset,
    timerTotalSeconds,
    setTimerTotalSeconds,
    timerRemainingSeconds,
    setTimerRemainingSeconds,
    timerTargetEndTimeMs,
    isCustomTimer,
    setIsCustomTimer,
    customTimerHours,
    setCustomTimerHours,
    customTimerMins,
    setCustomTimerMins,
    swElapsedWallSecs,
    swEfficiencyPercent,
    saveUnifiedState,
    saveStopwatchState,
    handleSwitchFocusMode,
    handleSelectTimerPreset,
    handleUpdateCustomTimer,
    handleAdjustCustomTimer,
    handleAddTimerMinutes,
    handleStartTimer,
    handlePauseTimer,
    handleResumeTimer,
    handleResetTimer,
    handleStartStopwatch,
    handlePauseStopwatch,
    handleResumeStopwatch,
    handleResetStopwatch,
    resetAfterSave,
  };
}
