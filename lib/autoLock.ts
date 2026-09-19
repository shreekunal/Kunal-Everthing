"use client";

import { App as CapacitorApp } from "@capacitor/app";

const STORAGE_KEY_MINUTES = "kunal_os_autolock_minutes";
const STORAGE_KEY_BG_TS = "kunal_os_background_timestamp";

class AutoLockManager {
  private inactivityTimer: NodeJS.Timeout | null = null;
  private autoLockMinutes = 1; // Default 1 min
  private isInitialized = false;

  public getMinutes(): number {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY_MINUTES);
      if (stored !== null) {
        const val = parseInt(stored, 10);
        if (!isNaN(val)) return val;
      }
    }
    return this.autoLockMinutes;
  }

  public setMinutes(minutes: number): void {
    this.autoLockMinutes = minutes;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_MINUTES, minutes.toString());
    }
    this.resetInactivityTimer();
  }

  public async lockPortal(): Promise<void> {
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Auto-lock logout error:", err);
    } finally {
      window.location.href = "/login";
    }
  }

  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    const minutes = this.getMinutes();
    // If <= 0 (Immediate or Never), web inactivity timer is disabled or handled via background
    if (minutes <= 0) return;

    const timeoutMs = minutes * 60 * 1000;
    this.inactivityTimer = setTimeout(() => {
      this.lockPortal();
    }, timeoutMs);
  }

  public init(): () => void {
    if (typeof window === "undefined" || this.isInitialized) return () => {};
    this.isInitialized = true;

    // 1. Initial sync with server settings
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.settings?.vaultAutoLockMinutes !== undefined) {
          this.setMinutes(data.settings.vaultAutoLockMinutes);
        }
      })
      .catch(() => {});

    // 2. Setup user activity listeners (Web Inactivity)
    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      this.resetInactivityTimer();
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleActivity, { passive: true });
    });
    this.resetInactivityTimer();

    // 3. Mobile / Capacitor appStateChange Listener
    let nativeListener: any = null;
    try {
      CapacitorApp.addListener("appStateChange", (state) => {
        const minutes = this.getMinutes();

        if (!state.isActive) {
          // App went into background or screen locked
          const now = Date.now();
          localStorage.setItem(STORAGE_KEY_BG_TS, now.toString());

          // 0 minutes = Immediate lock on app background
          if (minutes === 0) {
            this.lockPortal();
          }
        } else {
          // App returned to foreground
          const bgTsStr = localStorage.getItem(STORAGE_KEY_BG_TS);
          if (bgTsStr && minutes > 0) {
            const bgTs = parseInt(bgTsStr, 10);
            const elapsedMs = Date.now() - bgTs;
            const thresholdMs = minutes * 60 * 1000;

            if (elapsedMs >= thresholdMs) {
              localStorage.removeItem(STORAGE_KEY_BG_TS);
              this.lockPortal();
              return;
            }
          }
          localStorage.removeItem(STORAGE_KEY_BG_TS);
          this.resetInactivityTimer();
        }
      })
        .then((h) => {
          nativeListener = h;
        })
        .catch(() => {});
    } catch {
      // Capacitor not available
    }

    // 4. Web Visibility Change fallback
    const handleVisibilityChange = () => {
      const minutes = this.getMinutes();
      if (document.hidden) {
        localStorage.setItem(STORAGE_KEY_BG_TS, Date.now().toString());
        if (minutes === 0) {
          this.lockPortal();
        }
      } else {
        const bgTsStr = localStorage.getItem(STORAGE_KEY_BG_TS);
        if (bgTsStr && minutes > 0) {
          const bgTs = parseInt(bgTsStr, 10);
          const elapsedMs = Date.now() - bgTs;
          if (elapsedMs >= minutes * 60 * 1000) {
            localStorage.removeItem(STORAGE_KEY_BG_TS);
            this.lockPortal();
            return;
          }
        }
        localStorage.removeItem(STORAGE_KEY_BG_TS);
        this.resetInactivityTimer();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      this.isInitialized = false;
      if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (nativeListener && typeof nativeListener.remove === "function") {
        nativeListener.remove();
      }
    };
  }
}

export const autoLock = new AutoLockManager();
